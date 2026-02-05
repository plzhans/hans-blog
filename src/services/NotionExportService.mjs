import fs from "fs";
import path from "node:path";
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
   * @param {{ status?: string, category?: string, tags?: string, uniqueId?: string, createdDate?: string }} [propertyKeys]
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
      summary: "요약",
      createdDate: "생성일",
      publishedDate: "발행일",
      ...propertyKeys,
    };
    this.statusValues = {
      publishRequest: "발행 요청",
      publish: "발행",
      published: "발행 완료",
      ...statusValues,
    };
  }

  // ── 공개 API ──

  /**
   * 데이터베이스에서 발행 요청 페이지 목록을 콘솔에 출력
   * @param {string} databaseId - Notion 데이터베이스 ID
   */
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

  /**
   * 데이터베이스에서 발행 요청 페이지 목록 조회
   * @param {string} databaseId - Notion 데이터베이스 ID
   * @param {Object} filter - Notion API 필터 객체
   * @returns {Promise<Object[]>} 페이지 객체 배열
   */
  async getPulishRequestPagesByDatabase(databaseId, filter){
    return await this.getPagesByDatabase(databaseId, filter);
  }

  /**
   * 데이터베이스에서 페이지 목록 조회 (필터 선택적 적용, 페이징 처리)
   * @param {string} databaseId - Notion 데이터베이스 ID
   * @param {Object} [filter] - Notion API 필터 객체
   * @returns {Promise<Object[]>} 페이지 객체 배열
   */
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
      console.log(`📄 Page ${pageNum} loaded: ${items.length} items (total: ${results.length})\n`);

      if (!resp.has_more) break;
      cursor = resp.next_cursor;
    }
    return results;
  }

  /**
   * 데이터베이스의 전체 페이지를 동기화(export)
   * @param {string} databaseId - Notion 데이터베이스 ID
   * @param {string} outDir - 출력 디렉토리 경로
   * @param {boolean} [includeDraft=false] - draft 페이지 포함 여부
   */
  async syncPulishByDatabase(databaseId, outDir, includeDraft = false) {
    const existsPageMap = this.#findLocalNotionPagesInDir(outDir);

    const pages = await this.getPagesByDatabase(databaseId);
    for (const page of pages) {
      await this.#internalSyncPage(page, existsPageMap, outDir, includeDraft);
    }
  }

  /**
   * 단일 페이지를 Markdown으로 export
   * @param {string} pageId - Notion 페이지 ID
   * @param {string} outDir - 출력 디렉토리 경로
   */
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

  /**
   * "발행 요청" 또는 "발행 완료" 상태 필터 객체 생성
   * @returns {Object} Notion API 필터 객체
   */
  #makeFilterForPulishRequest(){
    const filter = {
      or: [
        { property: this.propertyKeys.status, status: { equals: this.statusValues.publishRequest } },
        { property: this.propertyKeys.status, status: { equals: this.statusValues.published } },
      ],
    };
    return filter;
  }

  /**
   * 단일 페이지를 동기화하고, 발행 요청 상태이면 발행 완료로 변경
   * @param {Object} page - Notion 페이지 객체
   * @param {Map<string, string>} existsPageMap - 기존 로컬 페이지 맵 (pageId → 디렉토리 경로)
   * @param {string} outDir - 출력 디렉토리 경로
   * @param {boolean} [includeDraft=false] - draft 페이지 포함 여부
   */
  async #internalSyncPage(page, existsPageMap, outDir, includeDraft = false) {
    const updated = await this.#notion2hugoContent(page, existsPageMap, outDir, includeDraft);
    if(updated){
      const currentStatus = page.properties[this.propertyKeys.status]?.status?.name;
      if(currentStatus === this.statusValues.publishRequest){
        await this.#notionPageStatusPublished(page.id);
      }
    }
  }

  /**
   * Notion 페이지 상태를 "발행 완료"로 변경
   * @param {string} pageId - Notion 페이지 ID
   */
  async #notionPageStatusPublished(pageId) {
    const now = new Date().toISOString();
    const properties = {
      [this.propertyKeys.status]: {
        status: {
          name: this.statusValues.published,
        },
      },
      [this.propertyKeys.publishedDate]: {
        date: {
          start: now,
        },
      },
    };
    const res =  await this.notionApiClient.updatePageProperties(pageId, properties);
    return res;
  }

  /**
   * Notion 페이지를 Hugo용 Markdown 파일로 변환하여 저장 (파일 다운로드 포함)
   * @param {Object} page - Notion 페이지 객체
   * @param {Map<string, string>} existsPageMap - 기존 로컬 페이지 맵 (pageId → 디렉토리 경로)
   * @param {string} baseOutDir - 출력 기본 디렉토리 경로
   * @param {boolean} [includeDraft=false] - draft 페이지 포함 여부
   * @returns {Promise<boolean>} 변환 성공 여부
   */
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

    console.log(`🔄 Processing: ${title} (${pageId})`);

    const postId = this.#extractPagePostId(page, this.propertyKeys.uniqueId);
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

    const createdTime = new Date(this.#extractCreatedTime(page));
    const lastEditedTime = new Date(page.last_edited_time);

    // meta.json 비교: 변경 없고 index.md 존재하면 sk
    if (fs.existsSync(metaFilePath) && fs.existsSync(mdFilePath)) {
      if (draft && !includeDraft) {
        fs.rmSync(finalPageDir, { recursive: true, force: true });
        console.log(`  🗑️ Deleted (draft) (status: ${currentStatus})`);
        return false;
      }
      try {
        const prevMetaRaw = fs.readFileSync(metaFilePath, "utf-8");
        const prevMeta = JSON.parse(prevMetaRaw);

        // 수정일이 동일한 경우: 변경 없음
        if (prevMeta.last_edited_time === page.last_edited_time) {
          // 아직 발행 완료가 아니면 상태 업데이트만 필요 (컨텐츠 재생성은 스킵)
          if (currentStatus !== this.statusValues.published) {
            console.log(`  ⏭️ Skipped (not modified), status update needed`);
            return true;
          }
          // 이미 발행 완료 상태면 아무 작업도 필요 없음
          console.log(`  ⏭️ Skipped (not modified) (status: ${currentStatus}, last_edited: ${page.last_edited_time})`);
          return false;
        } else {
          // 수정일이 다른 경우: 변경 있음
          // 발행 완료 후 Notion에 상태를 "발행 완료"로 업데이트하면
          // last_edited_time과 status가 변경되어 다음 sync 에서 수정된 것으로 인식됨.
          // 이전/현재 모두 발행 완료 상태라면 이 변경은 상태 업데이트에 의한 것이므로 스킵.
          const prevStatus = prevMeta.properties[this.propertyKeys.status]?.status?.name;
          if (prevStatus === this.statusValues.published && currentStatus === this.statusValues.published) {
            console.log(`  ⏭️ Skipped (already published) (status: ${currentStatus}, last_edited: ${prevMeta.last_edited_time} -> ${page.last_edited_time})`);
            return false;
          }
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


    // assetsDir 에 기존 파일 목록 수집
    const orphanedAssets = new Set(
      fs.existsSync(assetsDir) ? fs.readdirSync(assetsDir) : []
    );

    // 이미지 블록을 로컬 다운로드 + 링크 치환으로 커스텀
    let fileIndex = 0;
    let firstImagePath = null;
    n2m.setCustomTransformer("image", async (block) => {
      const result = await this.#transformFileBlock(block, assetsDir, ++fileIndex);
      if (!result) {
        return false;
      }
      orphanedAssets.delete(result.filename);
      if (!firstImagePath && result.type === "image") {
        firstImagePath = `assets/${result.filename}`;
      }
      return result.markdown;
    });

    const mdBlocks = await n2m.pageToMarkdown(pageId);

    // Notion에서 참조하지 않는 로컬 파일 삭제
    for (const file of orphanedAssets) {
      const filePath = path.join(assetsDir, file);
      fs.unlinkSync(filePath);
      console.log(`  🗑️ Removed orphan asset: ${file}`);
    }
    const mdStringObj = n2m.toMarkdownString(mdBlocks);

    let ws;
    try {
      ws = fs.createWriteStream(mdFilePath, { encoding: "utf-8" });

      this.#wirteHugoHeader(ws, page, postId, title, draft, firstImagePath);
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

  /**
   * Notion 페이지에서 제목(title) 텍스트를 추출
   * @param {Object} page - Notion 페이지 객체
   * @returns {string} 페이지 제목 (없으면 "untitled")
   */
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

  /**
   * Notion 속성에서 포스트 ID를 추출 (unique_id, number, rich_text, title 타입 지원)
   * 속성이 없거나 값이 비어 있으면 page.id를 fallback으로 반환
   * @param {Object} page - Notion 페이지 객체
   * @param {string} key - 포스트 ID 속성 키
   * @returns {number|string} 포스트 ID 또는 page.id
   */
  #extractPagePostId(page, key) {
    const prop = page?.properties?.[key];
    if (!prop) {
      return page.id;
    }
    switch (prop.type) {
      case "unique_id":
        return prop.unique_id?.number ?? page.id;
      case "number":
        return prop.number ?? page.id;
      case "rich_text":
        return prop.rich_text?.map((t) => t.plain_text).join("").trim() || page.id;
      case "title":
        return prop.title?.map((t) => t.plain_text).join("").trim() || page.id;
      default:
        return page.id;
    }
  }

  /**
   * Notion 속성에서 카테고리 목록을 배열로 반환 (select / multi_select 지원)
   * @param {Object} properties - Notion 페이지 속성 객체
   * @param {string} key - 카테고리 속성 키
   * @returns {string[]} 카테고리 문자열 배열
   */
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

  /**
   * Notion 속성에서 태그 목록을 배열로 반환 (multi_select / select / rich_text 지원)
   * @param {Object} properties - Notion 페이지 속성 객체
   * @param {string} key - 태그 속성 키
   * @returns {string[]} 태그 문자열 배열
   */
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

  /**
   * 페이지 프로퍼티에서 생성일을 추출, 없으면 page.created_time 사용
   * @param {Object} page - Notion 페이지 객체
   * @returns {string} ISO 8601 형식의 생성일 문자열
   */
  #extractCreatedTime(page) {
    const prop = page?.properties?.[this.propertyKeys.createdDate];
    if (prop) {
      if (prop.type === "date" && prop.date?.start) {
        return prop.date.start;
      }
      if (prop.type === "created_time" && prop.created_time) {
        return prop.created_time;
      }
    }
    return page.created_time;
  }

  /**
   * Notion 속성에서 텍스트 값을 문자열로 반환 (rich_text 지원)
   * @param {Object} properties - Notion 페이지 속성 객체
   * @param {string} key - 텍스트 속성 키
   * @returns {string} 텍스트 값 (없으면 빈 문자열)
   */
  #extractTextProperty(properties, key){
    const prop = properties[key];
    if (!prop) return "";
    if (prop.type === "rich_text") {
      return (prop.rich_text ?? []).map(t => t.plain_text).join("").trim();
    }
    return "";
  }

  /**
   * Notion 속성 값을 문자열로 변환 (출력/로깅용)
   * @param {Object} prop - Notion 속성 객체
   * @returns {string} 변환된 문자열
   */
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

  // ── 파일 헬퍼 ──

  /** URL에서 확장자를 추출할 수 없을 때 블록 타입별 기본 확장자 */
  static DEFAULT_EXT = { image: ".png", video: ".mp4", pdf: ".pdf", audio: ".mp3" };

  /**
   * Notion 파일 블록(image, file, pdf, video 등)을 로컬에 다운로드하고 Markdown 문법으로 변환
   * @param {Object} block - Notion 블록 객체
   * @param {string} assetsDir - 다운로드 대상 디렉토리 경로
   * @param {number} index - 파일 인덱스 (파일명 접두어)
   * @returns {Promise<{ markdown: string, filename: string, type: string } | null>} 성공 시 변환 결과, 실패 시 null
   */
  async #transformFileBlock(block, assetsDir, index) {
    const type = block.type;
    const content = block[type];
    if (!content) {
      return null;
    }

    const url =
      content?.type === "file" ? content?.file?.url :
      content?.type === "external" ? content?.external?.url :
      null;

    if (!url) {
      return null;
    }

    const u = new URL(url);
    const extFromPath = path.extname(u.pathname) || NotionExportService.DEFAULT_EXT[type] || ".bin";
    const filename = `${index}_${block.id}${extFromPath}`;
    const downloadPath = path.join(assetsDir, filename);
    const atime = block.created_time ? new Date(block.created_time) : new Date();
    const mtime = block.last_edited_time ? new Date(block.last_edited_time) : new Date();

    try {
      await ensureDir(assetsDir);

      await downloadToFile(url, downloadPath);
      this.#trySetFileTime(downloadPath, atime, mtime);

      const caption = content?.caption?.map((t) => t?.plain_text).join(" ") ?? "";
      let markdown;
      if (type === "image") {
        markdown = `![${caption}](./assets/${filename})`;
      } else {
        markdown = `[${caption || filename}](./assets/${filename})`;
      }
      return { markdown, filename, type };
    } catch (e) {
      console.error(`Failed to download file: ${url} -> ${downloadPath}`, e);
      return null;
    }
  }

  /**
   * 로컬 디렉토리에서 기존 Notion 페이지 메타 파일을 탐색하여 맵으로 반환
   * @param {string} baseDir - 탐색 대상 기본 디렉토리
   * @returns {Map<string, string>} pageId → 디렉토리 경로 맵
   */
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

  /**
   * 파일 시간(atime, mtime) 설정 (실패 시 경고만 출력)
   * @param {string} filePath - 대상 파일 경로
   * @param {Date} atime - 접근 시간
   * @param {Date} mtime - 수정 시간
   */
  #trySetFileTime(filePath, atime, mtime) {
    try {
      fs.utimesSync(filePath, atime, mtime);
    } catch (e) {
      console.warn(`⚠️ Failed to set file time: ${e.message}`);
    }
  }

  // ── Hugo 출력 헬퍼 ──

  /**
   * Hugo front-matter(YAML 헤더)를 WriteStream에 작성
   * @param {fs.WriteStream} ws - 쓰기 스트림
   * @param {Object} page - Notion 페이지 객체
   * @param {number|string} uniqueId - 페이지 고유 ID
   * @param {string} title - 페이지 제목
   * @param {boolean} [draft=false] - draft 여부
   * @param {string|null} [firstImagePath=null] - 대표 이미지 경로
   */
  #wirteHugoHeader(ws, page, uniqueId, title, draft = false, firstImagePath = null) {
    const tags = this.#extractPageTags(page.properties, this.propertyKeys.tags);
    const category = this.#extractPageCategory(page.properties, this.propertyKeys.category);
    const summary = this.#extractTextProperty(page.properties, this.propertyKeys.summary);
    const createdTime = this.#extractCreatedTime(page);
    ws.write("---\n");
    ws.write(`id: "${uniqueId}"\n`);
    ws.write(`url: "/notion/${uniqueId}"\n`);
    ws.write(`title: "${title.replace(/"/g, '\\"')}"\n`);
    if(summary){
      ws.write(`description: "${summary.replace(/"/g, '\\"')}"\n`);
    }
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
    ws.write(`date: ${createdTime}\n`);
    ws.write(`lastmod: ${page.last_edited_time}\n`);
    ws.write(`draft: ${draft}\n`);
    if(firstImagePath){
      ws.write("images:\n");
      ws.write(`  - "${firstImagePath}"\n`);
    }
    ws.write("---\n");
  }
}
