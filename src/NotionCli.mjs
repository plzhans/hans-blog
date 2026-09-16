import "dotenv/config";
import fs from "fs";
import yaml from "js-yaml";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { Client } from "@notionhq/client";
import { NotionApiClient } from "./clients/NotionApiClient.mjs";
import { NotionExportService } from "./services/NotionExportService.mjs";
import { LinkedInApiClient } from "./clients/LinkedInApiClient.mjs";
import { LinkedInShareService } from "./services/LinkedInShareService.mjs";
import { readSession, assertUsable } from "./utils/LinkedInSession.mjs";

/**
 * YAML 설정 파일을 로드하여 객체로 반환
 * @param {string} [filePath="notion.yml"] - 설정 파일 경로
 * @returns {Object} 파싱된 설정 객체 (파일이 없으면 빈 객체)
 */
function loadConfig(filePath = "notion.yml") {
  if (!fs.existsSync(filePath)) return {};
  return yaml.load(fs.readFileSync(filePath, "utf-8")) || {};
}

/**
 * NotionExportService 인스턴스를 생성
 * @returns {NotionExportService} 설정이 적용된 서비스 인스턴스
 */
function createService() {
  const config = loadConfig();
  const notionClient = new Client({
    auth: process.env.NOTION_API_TOKEN,
  });
  const notionApiClient = new NotionApiClient(notionClient, process.env.NOTION_API_TOKEN);
  return new NotionExportService(notionApiClient, notionClient, config.propertyKeys, config.statusValues, config.hugoBaseUrl);
}

/**
 * LinkedInShareService 인스턴스를 생성
 * @returns {LinkedInShareService} 설정이 적용된 서비스 인스턴스
 */
function createLinkedInService() {
  const config = loadConfig();
  const notionClient = new Client({ auth: process.env.NOTION_API_TOKEN });
  const notionApiClient = new NotionApiClient(notionClient, process.env.NOTION_API_TOKEN);

  // 토큰과 URN 은 인증하면서 생기는 파생값이라 .env 가 아니라 세션에 산다.
  // 로컬은 .linkedin-session.json, CI 는 같은 내용을 담은 LINKEDIN_SESSION_JSON 시크릿이다.
  // readSession 이 둘을 가려주므로 여기서는 구분하지 않는다.
  const session = readSession() || {};
  assertUsable(session);

  const linkedInApiClient = new LinkedInApiClient({
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    personUrn: session.personUrn,
    // 앱 자격증명은 성격이 다르다. 만료되지 않고 사람이 한 번 넣는 값이라 .env 에 둔다.
    clientId: process.env.LINKEDIN_CLIENT_ID,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
    apiVersion: process.env.LINKEDIN_API_VERSION,
  });
  return new LinkedInShareService(notionApiClient, linkedInApiClient, config.propertyKeys);
}

yargs(hideBin(process.argv))
  .command(
    "database",
    "Notion database commands",
    (y) => y
      .command(
        "view [database_id]",
        "View pages info in a Notion database",
        (yargs) =>
          yargs.positional("database_id", {
            type: "string",
            default: process.env.NOTION_DATABASE_ID,
            describe: "Notion database ID (default: NOTION_DATABASE_ID env)",
          }),
        async (argv) => {
          if (!argv.database_id) {
            throw new Error(
              "database_id is required (argument or NOTION_DATABASE_ID env)"
            );
          }          
          const service = createService();
          await service.showPulishRequestPagesByDatabase(argv.database_id);
        }
      )
      .command(
        "sync [database_id]",
        "Export all pages from a Notion database",
        (yargs) =>
          yargs
            .positional("database_id", {
              type: "string",
              default: process.env.NOTION_DATABASE_ID,
              describe: "Notion database ID (default: NOTION_DATABASE_ID env)",
            })
            .option("draft", {
              type: "boolean",
              default: false,
              describe: "Include draft pages",
            }),
        async (argv) => {
          if (!argv.database_id) {
            throw new Error(
              "database_id is required (argument or NOTION_DATABASE_ID env)"
            );
          }
          const outDir = process.env.HUGO_CONTENT_DIR || "content/posts";
          const service = createService();
          await service.syncPulishByDatabase(argv.database_id, outDir, argv.draft);
        }
      )
      .demandCommand(1, "Please specify a database subcommand")
  )
  .command(
    "page",
    "Notion page commands",
    (y) => y
      .command(
        "sync [page_id]",
        "Export a Notion page",
        (yy) =>
          yy.positional("page_id", {
            type: "string",
            describe: "Notion page ID",
          }),
        async (argv) => {
          if (!argv.page_id) {
            throw new Error(
              "page_id is required"
            );
          }
          const outDir = process.env.HUGO_CONTENT_DIR || "content/posts";
          const service = createService();
          await service.syncPublishPage(argv.page_id, outDir);
        }
      )
      .demandCommand(1, "Please specify a page subcommand")
  )
  .command(
    "linkedin",
    "LinkedIn share commands",
    (y) => y
      .command(
        "post [page_id]",
        "Share a Notion page to LinkedIn",
        (yy) =>
          yy
            .positional("page_id", {
              type: "string",
              describe: "Notion page ID",
            })
            .option("dry-run", {
              type: "boolean",
              default: false,
              describe: "Verify only - print what would be posted without posting",
            })
            .option("test", {
              type: "boolean",
              default: false,
              describe: "Post without feed distribution, then delete after confirmation",
            })
            .option("image", {
              type: "array",
              default: [],
              describe: "Image file(s) to attach - note this removes the link preview card",
            })
            .option("alt", {
              type: "array",
              default: [],
              describe: "Alt text for each --image, in the same order",
            })
            ,
        async (argv) => {
          if (!argv.page_id) {
            throw new Error("page_id is required");
          }
          // yargs 의 conflicts() 는 기본값이 채워진 것도 "지정됨" 으로 봐서
          // --dry-run 만 줘도 충돌로 판정한다. 그래서 직접 본다.
          if (argv.dryRun && argv.test) {
            throw new Error("--dry-run and --test cannot be used together");
          }
          // alt 는 --image 와 순서로 짝지운다. 모자라면 빈 값으로 두고,
          // 남으면 짝이 밀렸다는 뜻이므로 조용히 넘기지 않는다.
          if (argv.alt.length > argv.image.length) {
            throw new Error(
              `--alt (${argv.alt.length}) cannot outnumber --image (${argv.image.length})`
            );
          }
          const images = argv.image.map((p, i) => ({
            path: String(p),
            altText: argv.alt[i] ? String(argv.alt[i]) : undefined,
          }));

          const service = createLinkedInService();
          const result = await service.postByPageId(argv.page_id, {
            dryRun: argv.dryRun,
            test: argv.test,
            images,
          });
          // 게시하지 않았으면 0 으로 끝내지 않는다. CI 가 성공으로 보면
          // 실패한 게시가 조용히 묻힌다.
          if (!result.ok) process.exit(1);
        }
      )
      .demandCommand(1, "Please specify a linkedin subcommand")
  )
  .demandCommand(1, "Please specify a command: page, database or linkedin")
  .strict()
  .help()
  .parse();
