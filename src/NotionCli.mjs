import "dotenv/config";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { Client } from "@notionhq/client";
import { NotionApiClient } from "./clients/NotionApiClient.mjs";
import { NotionExportService } from "./services/NotionExportService.mjs";

if (!process.env.NOTION_API_TOKEN) throw new Error("NOTION_API_TOKEN is required (.env)");

function createService() {
  const outDir = process.env.HUGO_CONTENT_DIR || "hugo/content/notion";
  const notionClient = new Client({
    auth: process.env.NOTION_API_TOKEN,
  });
  const notionApiClient = new NotionApiClient(notionClient, process.env.NOTION_API_TOKEN);
  return new NotionExportService(notionApiClient, notionClient, outDir);
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
          const service = createService();
          await service.syncPulishByDatabase(argv.database_id, argv.draft);
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
            default: process.env.NOTION_PAGE_ID,
            describe: "Notion page ID (default: NOTION_PAGE_ID env)",
          }),
        async (argv) => {
          if (!argv.page_id) {
            throw new Error(
              "page_id is required (argument or NOTION_PAGE_ID env)"
            );
          }
          const service = createService();
          await service.exportPage(argv.page_id);
        }
      )
      .demandCommand(1, "Please specify a page subcommand")
  )
  .demandCommand(1, "Please specify a command: page or database")
  .strict()
  .help()
  .parse();
