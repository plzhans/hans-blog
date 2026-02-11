import "dotenv/config";
import fs from "fs";
import yaml from "js-yaml";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { Client } from "@notionhq/client";
import { NotionApiClient } from "./clients/NotionApiClient.mjs";
import { NotionExportService } from "./services/NotionExportService.mjs";

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
          const outDir = process.env.HUGO_CONTENT_DIR || "hugo/content/notion";
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
          const outDir = process.env.HUGO_CONTENT_DIR || "hugo/content/notion";
          const service = createService();
          await service.syncPublishPage(argv.page_id, outDir);
        }
      )
      .demandCommand(1, "Please specify a page subcommand")
  )
  .demandCommand(1, "Please specify a command: page or database")
  .strict()
  .help()
  .parse();
