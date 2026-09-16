#!/usr/bin/env node
/**
 * hans-blog MCP 서버 (stdio) — 실행 진입로
 *
 * AI 가 직접 호출할 수 있는 블로그 작업 도구를 노출한다.
 * 첫 도구는 대표 이미지 생성이다. SVG 를 손으로 그리면 결과가 조악해서
 * 이미지 모델 API 를 그대로 태우고, 결과를 Notion 에 되돌려 넣는다.
 *
 * 이 파일은 서버를 띄우는 일만 한다. 도구 구현은 tools/ 아래에 있다.
 * 등록은 .mcp.json (프로젝트 스코프) 이 한다.
 */
import { McpServer } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { FEATURED_IMAGE_DIR } from "./serviceFactory.mjs";
import { tools } from "./tools/index.mjs";

const server = new McpServer({ name: "hans-blog", version: "0.1.0" });

for (const tool of tools) {
  server.registerTool(tool.name, tool.config, tool.handler);
}

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(
  `hans-blog MCP server running on stdio ` +
    `(tools: ${tools.map((t) => t.name).join(", ")}; work dir: ${FEATURED_IMAGE_DIR})`
);
