import fs from "fs";
import path from "node:path";
import crypto from "node:crypto";
import { NotionToMarkdown } from "notion-to-md";
import { slugify } from "../utils/TextUtils.mjs";
import { downloadToFile } from "../utils/WebUtils.mjs";
import { ensureDir } from "../utils/FileUtils.mjs";

/**
 * Notion 데이터를 Markdown 파일로 export 하는 서비스
 */
export class NotionExportService {
  /**
   * @param {import("../clients/NotionApiClient.mjs").NotionApiClient} notionApiClient
   * @param {import("@notionhq/client").Client} notionClient
   * @param {string} outDir
   */
  constructor(notionApiClient, notionClient, outDir) {
    this.notionApiClient = notionApiClient;
    this.notionClient = notionClient;
    this.outDir = outDir;
  }

  /** 단일 페이지를 Markdown으로 export */
  async exportPage(pageId) {
    await this.notion2markdown(pageId, this.outDir, new Set());
  }

  /** "발행 요청" 상태 필터 객체 생성 */
  #makeFilterForPulishRequest(){
    const filter = {
        property: "상태",
        status: { equals: "발행 요청" },
    }
    return filter;
  }

  /** 데이터베이스에서 발행 요청 페이지 목록을 콘솔에 출력 */
  async showPulishRequestPagesByDatabase(databaseId) {
    console.log(`Datasbase id: ${databaseId}\n`);
    const filter = this.#makeFilterForPulishRequest();
    const pages = await this.getPulishRequestPagesByDatabase(databaseId, filter);
    console.log(`Total pages: ${pages.length}\n`);
    for (const page of pages) {
      const title = this.#extractPageTitle(page);
      console.log(`[${page.id}] ${title}`);
      console.log(`  id: ${page.id}`);
      console.log(`  created_time: ${page.created_time}`);
      console.log(`  last_edited_time: ${page.last_edited_time}`);
      console.log(`  url: ${page.url}`);
      for (const [key, prop] of Object.entries(page.properties || {})) {
        if (prop.type === "title") continue;
        const value = this.#formatPropertyValue(prop);
        if (value) console.log(`  ${key}: ${value}`);
      }
      console.log();
    }
  }

  /** 데이터베이스에서 발행 요청 페이지 목록 조회 */
  async getPulishRequestPagesByDatabase(databaseId, filter){
    return await this.getPagesByDatabase(databaseId, filter);
  }

  /** 데이터베이스에서 페이지 목록 조회 (필터 선택적 적용) */
  async getPagesByDatabase(databaseId, filter) {
    if(filter){
      return this.notionApiClient.queryDatabase(databaseId, {
        filter: filter
      });
    }
    return this.notionApiClient.queryDatabase(databaseId);
  }

  /** 데이터베이스의 발행 요청 페이지를 모두 동기화(export) */
  async syncPulishByDatabase(databaseId, draft = false) {
    const filter = draft ? undefined : this.#makeFilterForPulishRequest();
    const pages = await this.getPulishRequestPagesByDatabase(databaseId, filter);
    for (const page of pages) {
      await this.syncPage(page);
    }
  }

  /** 단일 페이지를 Markdown으로 동기화 */
  async syncPage(page) {
    await this.notion2markdown(page, this.outDir);
  }

  /** Notion 페이지를 Markdown 파일로 변환하여 저장 (이미지 다운로드 포함) */
  async notion2markdown(page, baseOutDir) {
    if (!page || !page.id) return;
    const pageId = page.id;
    const title = this.#extractPageTitle(page);
    const slug = slugify(title);
    const categoryLower = this.#extractPageCategory(page.properties, "카테고리")
      .join("/")
      .toLowerCase() || "etc";

    const pageDir = path.join(baseOutDir, categoryLower, slug);
    const assetsDir = path.join(pageDir, "assets");
    await ensureDir(assetsDir);
    await ensureDir(pageDir);

    // Notion -> Markdown 변환기
    const n2m = new NotionToMarkdown({
      notionClient: this.notionClient,
      config: {
        separateChildPage: true,
      },
    });

    // 이미지 블록을 "로컬 다운로드 + 링크 치환"으로 커스텀
    let imageIndex = 0;
    n2m.setCustomTransformer("image", (block) => this.#transformImageBlock(block, assetsDir, ++imageIndex));

    const pageFileName = path.join(pageDir, `index.md`);
    const ws = fs.createWriteStream(pageFileName, { encoding: "utf-8" });
    this.#wirteHugoHeader(ws, page, title);
    ws.write("\n");

    const mdBlocks = await n2m.pageToMarkdown(pageId);
    const mdStringObj = n2m.toMarkdownString(mdBlocks);

    // 변환
    if (mdStringObj.parent) {
      ws.write(mdStringObj.parent);
    }

    // 일단 하위 페이지믄 무시
    // // 하위 child page는 Notion 블록을 직접 훑어서 재귀로 export
    // const children = await this.notionApiClient.listAllChildren(pageId);
    // const childPages = children.filter((b) => b.type === "child_page");

    // for (const cp of childPages) {
    //   await this.#exportPageRecursive(cp.id, pageDir, visited);
    // }

    console.log(`✅ Exported: ${title} -> ${pageFileName}`);
  }
  // ── Notion 속성 헬퍼 ──

  /** Notion 속성 값을 문자열로 변환 (출력/로깅용) */
  #formatPropertyValue(prop) {
    switch (prop.type) {
      case "rich_text":
        return prop.rich_text?.map((t) => t.plain_text).join("") || "";
      case "number":
        return prop.number != null ? String(prop.number) : "";
      case "select":
        return prop.select?.name || "";
      case "multi_select":
        return prop.multi_select?.map((s) => s.name).join(", ") || "";
      case "date":
        return prop.date?.start || "";
      case "checkbox":
        return String(prop.checkbox);
      case "url":
        return prop.url || "";
      case "email":
        return prop.email || "";
      case "phone_number":
        return prop.phone_number || "";
      case "status":
        return prop.status?.name || "";
      default:
        return "";
    }
  }

  /** Notion 페이지에서 제목(title) 텍스트를 추출 */
  #extractPageTitle(page) {
    const prop = page?.properties?.title;
    if (prop?.type === "title") return prop.title?.[0]?.plain_text || "untitled";

    // 일반 페이지는 title 속성이 "Name" 등으로 올 수도 있어서 첫 title 타입을 찾아봄
    const firstTitleKey = Object.keys(page?.properties || {}).find(
      (k) => page.properties[k]?.type === "title"
    );
    if (firstTitleKey) return page.properties[firstTitleKey].title?.[0]?.plain_text || "untitled";

    return "untitled";
  }

  /** Notion 속성에서 태그 목록을 배열로 반환 (multi_select / select / rich_text 지원) */
  #extractPageTags(properties, key){
    const prop = properties[key];
    if (!prop) return [];

    if (prop.type === "multi_select") {
      return (prop.multi_select ?? []).map((x) => x.name);
    }
    if (prop.type === "select") {
      return prop.select?.name ? [prop.select.name] : [];
    }
    // 혹시 rich_text에 넣는 경우도 대비
    if (prop.type === "rich_text") {
      const v = (prop.rich_text ?? []).map((t) => t.plain_text).join("").trim();
      return v ? v.split(",").map(s => s.trim()).filter(Boolean) : [];
    }
    return [];
  }

  /** Notion 속성에서 카테고리 목록을 배열로 반환 (select / multi_select 지원) */
  #extractPageCategory(properties, key){
    const prop = properties[key];
    if (!prop) return [];

    if (prop.type === "select") {
      return prop.select?.name ? [prop.select.name] : [];
    }
    if (prop.type === "multi_select") {
      return (prop.multi_select ?? []).map((x) => x.name);
    }
    return [];
  }

  // ── Hugo 헬퍼 ──

  /** Notion 이미지 블록을 로컬에 다운로드하고 Markdown 이미지 문법으로 변환 */
  async #transformImageBlock(block, assetsDir, index) {
    const img = block?.image;
    if (!img) return false;

    const url =
      img?.type === "file" ? img?.file?.url :
      img?.type === "external" ? img?.external?.url :
      null;

    if (!url) return false;

    const u = new URL(url);
    const extFromPath = path.extname(u.pathname) || ".png";
    const hash = crypto.createHash("sha1").update(url).digest("hex").slice(0, 12);
    const filename = `${index}_${hash}${extFromPath}`;
    const localPath = path.join(assetsDir, filename);

    try {
      await downloadToFile(url, localPath);
      const caption =
        (img?.caption || [])
          .map((t) => t?.plain_text)
          .filter(Boolean)
          .join(" ") || "";

      return `![${caption}](./assets/${filename})`;
    } catch (e) {
      console.error(`Failed to download image: ${url} -> ${localPath}`, e);
      return `![](${url})`;
    }
  }

  /** Hugo front-matter(YAML 헤더)를 WriteStream에 작성 */
  #wirteHugoHeader(ws, page, title, draft = false) {
    const tags = this.#extractPageTags(page.properties, "태그");
    const category = this.#extractPageCategory(page.properties, "카테고리");
    ws.write("---\n");
    ws.write(`title: "${title.replace(/"/g, '\\"')}"\n`);
    if(tags.length > 0){
      ws.write("tags:\n");
      for(const tag of tags){
        ws.write(`  - "${tag.replace(/"/g, '\\"')}"\n`);
      }
    }
    if(category.length > 0){
      ws.write("categories:\n");
      for(const cat of category){
        ws.write(`  - "${cat.replace(/"/g, '\\"')}"\n`);
      }
    }
    ws.write(`date: ${page.created_time}\n`);
    ws.write(`lastmod: ${page.last_edited_time}\n`);
    ws.write(`draft: ${draft}\n`);
    ws.write("---\n");
  }

  
}
