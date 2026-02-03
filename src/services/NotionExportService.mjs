import fs from "fs";
import path from "node:path";
import crypto from "node:crypto";
import { NotionToMarkdown } from "notion-to-md";
import { slugify } from "../utils/TextUtils.mjs";
import { downloadToFile } from "../utils/WebUtils.mjs";
import { ensureDir } from "../utils/FileUtils.mjs";
import { finished } from "stream/promises";

/**
 * Notion 데이터를 Markdown 파일로 export 하는 서비스
 */
export class NotionExportService {
  /**
   * @param {import("../clients/NotionApiClient.mjs").NotionApiClient} notionApiClient
   * @param {import("@notionhq/client").Client} notionClient
   * @param {{ status?: string, category?: string, tags?: string, uniqueId?: string }} [propertyKeys]
   * @param {{ publishRequest?: string, publish?: string }} [statusValues]
   */
  constructor(notionApiClient, notionClient, propertyKeys, statusValues) {
    this.notionApiClient = notionApiClient;
    this.notionClient = notionClient;
    this.propertyKeys = {
      status: "상태",
      category: "카테고리",
      tags: "태그",
      uniqueId: "ID",
      ...propertyKeys,
    };
    this.statusValues = {
      publishRequest: "발행 요청",
      publish: "발행",
      published: "발행 완료",
      ...statusValues,
    };
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

  /** 데이터베이스에서 페이지 목록 조회 (필터 선택적 적용, 페이징 처리) */
  async getPagesByDatabase(databaseId, filter) {
    let results = [];
    let cursor = undefined;
    let pageNum = 0;

    while (true) {
      const params = {};
      if (filter) params.filter = filter;
      if (cursor) params.start_cursor = cursor;

      const resp = await this.notionApiClient.queryDatabase(databaseId, params);
      const items = resp.results || [];
      results = results.concat(items);
      pageNum++;
      console.log(`📄 Page ${pageNum} loaded: ${items.length} items (total: ${results.length})`);

      if (!resp.has_more) break;
      cursor = resp.next_cursor;
    }
    return results;
  }

  /** 데이터베이스의 전체 페이지를 동기화(export) */
  async syncPulishByDatabase(databaseId, outDir, includeDraft = false) {
    const existsPageMap = this.#findLocalNotionPagesInDir(outDir);

    const pages = await this.getPagesByDatabase(databaseId);
    for (const page of pages) {
      await this.#internalSyncPage(page, existsPageMap, outDir, includeDraft);
    }
  }

  /** 단일 페이지를 Markdown으로 export */
  async syncPublishPage(pageId, outDir) {
    // notion 에서 pageId로 페이지 정보를 가져옴
    const page = await this.notionApiClient.retrievePage(pageId);
    if (!page) {  
      throw new Error(`Page not found: ${pageId}`);
    }
    const existsPageMap = this.#findLocalNotionPagesInDir(outDir);
    await this.#internalSyncPage(page, existsPageMap, outDir);
  }

  // ── 내부 동기화 로직 ──

  /** "발행 요청" 또는 "발행 완료" 상태 필터 객체 생성 */
  #makeFilterForPulishRequest(){
    const filter = {
      or: [
        { property: this.propertyKeys.status, status: { equals: this.statusValues.publishRequest } },
        { property: this.propertyKeys.status, status: { equals: this.statusValues.published } },
      ],
    };
    return filter;
  }

  async #internalSyncPage(page, existsPageMap, outDir, includeDraft = false) {
    const updated = await this.#notion2hugoContent(page, existsPageMap, outDir, includeDraft);
    if(updated){
      const currentStatus = page.properties[this.propertyKeys.status]?.status?.name;
      if(currentStatus === this.statusValues.publishRequest){
        await this.#notionPageStatusPublished(page.id);
      }
    }
  }

  #findLocalNotionPagesInDir(baseDir) {
    const existsPageMap = new Map();
    if (!fs.existsSync(baseDir)) {
      return existsPageMap;
    }

    const files = fs.globSync("**/notion_*.json", { cwd: baseDir });
    for (const file of files) {
      const name = path.basename(file);
      const pageId = name.slice(7, -5); // "notion_" 제거 및 ".json" 제거
      existsPageMap.set(pageId, path.join(baseDir, path.dirname(file)));
    }
    return existsPageMap;
  }

  /** Notion 페이지를 Markdown 파일로 변환하여 저장 (이미지 다운로드 포함) */
  async #notion2hugoContent(page, existsPageMap, baseOutDir, includeDraft = false) {
    if (!page || !page.id) {
      throw new Error(`Invalid page: page or page.id is missing.`);
    };
    const pageId = page.id;
    const title = this.#extractPageTitle(page);
    const currentStatus = page.properties[this.propertyKeys.status]?.status?.name;
    const draft = !(currentStatus === this.statusValues.publishRequest || currentStatus === this.statusValues.published);
    const prevPageDir = existsPageMap.get(pageId);

    // draft이고 로컬 파일이 없으면 무시
    if (draft && !includeDraft && !prevPageDir) {
      return false;
    }

    console.log(`\n🔄 Processing: ${title} (${pageId})`);

    const uniqueId = this.#getNotionPageUniqueId(page, this.propertyKeys.uniqueId);
    const slug = slugify(title);
    const categoryLower = this.#extractPageCategory(page.properties, this.propertyKeys.category)
      .map(c => slugify(c))
      .join("/") || "etc";

    const finalPageDir = path.join(baseOutDir, categoryLower, slug);

    if (prevPageDir && prevPageDir !== finalPageDir) {
      await ensureDir(path.dirname(finalPageDir));
      fs.renameSync(prevPageDir, finalPageDir);
      existsPageMap.set(pageId, finalPageDir);
      console.log(`📂 Moved page directory: ${prevPageDir} -> ${finalPageDir}`);
    }

    const assetsDir = path.join(finalPageDir, "assets");
    const mdFilePath = path.join(finalPageDir, `index.md`);
    const metaFilePath = path.join(finalPageDir, `notion_${pageId}.json`);

    const createdTime = new Date(page.created_time);
    const lastEditedTime = new Date(page.last_edited_time);

    // meta.json 비교: 변경 없고 index.md 존재하면 sk
    if (fs.existsSync(metaFilePath) && fs.existsSync(mdFilePath)) {
      if (draft && !includeDraft) {
        fs.rmSync(finalPageDir, { recursive: true, force: true });
        console.log(`  🗑️ Deleted (draft) (status: ${currentStatus})`);
        return false;
      }
      try {
        const prevMeta = JSON.parse(fs.readFileSync(metaFilePath, "utf-8"));
        if (prevMeta.last_edited_time === page.last_edited_time) {
          if (currentStatus !== this.statusValues.published) {
            console.log(`  ⏭️ Skipped (not modified), status update needed`);
            return true;
          }
          console.log(`  ⏭️ Skipped (not modified) (status: ${currentStatus}, last_edited: ${page.last_edited_time})`);
          return false;
        }
      } catch (e) {
        console.error(`❌ Failed to parse meta.json: ${metaFilePath}`, e);
        throw e;
      }
    } else {
      if (draft && !includeDraft) {
        return false;
      }
      await ensureDir(finalPageDir);
    }

    const n2m = new NotionToMarkdown({
      notionClient: this.notionClient,
      config: {
        separateChildPage: true,
      },
    });

    // 이미지 블록을 로컬 다운로드 + 링크 치환으로 커스텀
    let imageIndex = 0;
    n2m.setCustomTransformer("image", (block) => this.#transformImageBlock(block, assetsDir, ++imageIndex));

    await ensureDir(assetsDir);

    const mdBlocks = await n2m.pageToMarkdown(pageId);
    const mdStringObj = n2m.toMarkdownString(mdBlocks);

    let ws;
    try {
      ws = fs.createWriteStream(mdFilePath, { encoding: "utf-8" });

      this.#wirteHugoHeader(ws, page, uniqueId, title, draft);
      ws.write("\n");

      if (mdStringObj.parent) {
        ws.write(mdStringObj.parent);
      }

      ws.end();
      await finished(ws);
      this.#trySetFileTime(mdFilePath, createdTime, lastEditedTime);
    } catch (e) {
      if (ws) ws.destroy(e);
      throw e;
    }

    fs.writeFileSync(metaFilePath, JSON.stringify(page, null, 2), { encoding: "utf-8" });
    this.#trySetFileTime(metaFilePath, createdTime, lastEditedTime);

    console.log(`  ✅ Exported: ${mdFilePath}`);

    return true;
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
    // rich_text에 넣는 경우도 대비
    if (prop.type === "rich_text") {
      const v = (prop.rich_text ?? []).map((t) => t.plain_text).join("").trim();
      return v ? v.split(",").map(s => s.trim()).filter(Boolean) : [];
    }
    return [];
  }

  /** Notion 속성에서 unique_id number를 반환, 없으면 page.id 반환 */
  #getNotionPageUniqueId(page, key) {
    const prop = page?.properties?.[key];
    if (prop?.type === "unique_id") {
      return prop.unique_id?.number ?? page.id;
    }
    return page.id;
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

  // ── 파일 헬퍼 ──

  /** 파일 시간(atime, mtime) 설정 (실패 시 경고만 출력) */
  #trySetFileTime(filePath, atime, mtime) {
    try {
      fs.utimesSync(filePath, atime, mtime);
    } catch (e) {
      console.warn(`⚠️ Failed to set file time: ${e.message}`);
    }
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
  #wirteHugoHeader(ws, page, uniqueId, title, draft = false) {
    const tags = this.#extractPageTags(page.properties, this.propertyKeys.tags);
    const category = this.#extractPageCategory(page.properties, this.propertyKeys.category);
    ws.write("---\n");
    ws.write(`id: "${uniqueId}"\n`);
    ws.write(`url: "/notion/${uniqueId}"\n`);
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

  async #notionPageStatusPublished(pageId) {
    const properties = {
      [this.propertyKeys.status]: {
        status: {
          name: this.statusValues.published,
        },
      },
    };
    await this.notionApiClient.updatePageProperties(pageId, properties);
  }
}
