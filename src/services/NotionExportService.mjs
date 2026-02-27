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
   * @param {{ status?: string, category?: string, tags?: string, uniqueId?: string, createdDate?: string, publishUrl?: string }} [propertyKeys]
   * @param {{ publishRequest?: string, publish?: string }} [statusValues]
   * @param {string} [hugoBaseUrl]
   */
  constructor(notionApiClient, notionClient, propertyKeys, statusValues, hugoBaseUrl) {
    this.notionApiClient = notionApiClient;
    this.notionClient = notionClient;
    this.hugoBaseUrl = (hugoBaseUrl || "").replace(/\/+$/, "");
    this.propertyKeys = {
      status: "상태",
      category: "카테고리",
      tags: "태그",
      uniqueId: "ID",
      summary: "요약",
      slug: "slug",
      createdDate: "생성일",
      publishedDate: "발행일",
      publishUrl: "발행 URL",
      toc: "toc",
      modifiedDate: "수정일",
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
        await this.#notionPageStatusPublished(page);
      }
    }
  }

  /**
   * Notion 페이지 상태를 "발행 완료"로 변경
   * @param {Object} page - Notion 페이지 객체
   */
  async #notionPageStatusPublished(page) {
    const now = new Date().toISOString();
    const postId = this.#extractPagePostId(page, this.propertyKeys.uniqueId);
    const slug = this.#extractTextProperty(page.properties, this.propertyKeys.slug);
    const properties = {
      [this.propertyKeys.status]: {
        status: {
          name: this.statusValues.published,
        },
      },
    };
    if (!this.#extractDateValue(page.properties, this.propertyKeys.publishedDate)) {
      properties[this.propertyKeys.publishedDate] = {
        date: {
          start: now,
        },
      };
    }

    if (this.hugoBaseUrl && slug) {
      properties[this.propertyKeys.publishUrl] = {
        url: `${this.hugoBaseUrl}/posts/${postId}-${slug}/`,
      };
    }

    const res = await this.notionApiClient.updatePageProperties(page.id, properties);
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

    // 발행 요청 시 slug 검증
    if (currentStatus === this.statusValues.publishRequest) {
      if (!this.#hasTextProperty(page.properties, this.propertyKeys.slug)) {
        console.error(`❌ Publish request rejected: slug property is empty for page "${title}" (${pageId})`);
        return false;
      }
    }

    // draft이고 로컬 파일이 없으면 무시
    if (draft && !includeDraft && !prevPageDir) {
      return false;
    }

    console.log(`🔄 Processing: ${title} (${pageId})`);

    const postId = this.#extractPagePostId(page, this.propertyKeys.uniqueId);
    const titleSlug = slugify(title);
    const categoryLower = this.#extractPageCategory(page.properties, this.propertyKeys.category)
      .map(c => slugify(c))
      .join("/") || "etc";

    const finalPageDir = path.join(baseOutDir, categoryLower, titleSlug);

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

        // 수정일 프로퍼티 우선, 없으면 last_edited_time 폴백
        const currentModified = this.#extractModifiedTime(page);
        const prevModified = this.#extractModifiedTime(prevMeta);

        // 수정일 프로퍼티가 비어 있으면 last_edited_time 값으로 Notion에 업데이트
        if (!this.#extractDateValue(page.properties, this.propertyKeys.modifiedDate)) {
          await this.notionApiClient.updatePageProperties(page.id, {
            [this.propertyKeys.modifiedDate]: {
              date: { start: page.last_edited_time },
            },
          });
          console.log(`  📅 Updated modifiedDate property: ${page.last_edited_time}`);
        }

        // 수정일이 동일한 경우: 변경 없음
        if (prevModified === currentModified) {
          // 아직 발행 완료가 아니면 상태 업데이트만 필요 (컨텐츠 재생성은 스킵)
          if (currentStatus !== this.statusValues.published) {
            console.log(`  ⏭️ Skipped (not modified), status update needed`);
            return true;
          }
          // 이미 발행 완료 상태면 아무 작업도 필요 없음
          console.log(`  ⏭️ Skipped (not modified) (status: ${currentStatus}, modified: ${currentModified})`);
          return false;
        } else {
          // 수정일이 다른 경우: 변경 있음
          // 발행 완료 후 Notion에 상태를 "발행 완료"로 업데이트하면
          // last_edited_time과 status가 변경되어 다음 sync 에서 수정된 것으로 인식됨.
          // 이전/현재 모두 발행 완료 상태라면 이 변경은 상태 업데이트에 의한 것이므로 스킵.
          const prevStatus = prevMeta.properties[this.propertyKeys.status]?.status?.name;
          if (prevStatus === this.statusValues.published && currentStatus === this.statusValues.published) {
            console.log(`  ⏭️ Skipped (already published) (status: ${currentStatus}, modified: ${prevModified} -> ${currentModified})`);
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
    n2m.setCustomTransformer("callout", async (block) => {
      const blockData = block.callout;

      // callout 자체 텍스트 추출 (annotations 포함)
      let calloutText = "";
      const richTexts = blockData.text || blockData.rich_text || [];
      for (const content of richTexts) {
        if (content.type === "equation") {
          calloutText += `$${content.equation.expression}$`;
          continue;
        }
        let plain_text = content.plain_text;
        plain_text = n2m.annotatePlainText(plain_text, content.annotations);
        if (content.href) plain_text = `[${plain_text}](${content.href})`;
        calloutText += plain_text;
      }

      if (!block.has_children) {
        return this.#formatCalloutMd(calloutText, blockData.icon);
      }

      // 자식 블록 조회 및 마크다운 변환 (toggle의 <details> 포함)
      const resp = await this.notionClient.blocks.children.list({
        block_id: block.id,
        page_size: 100,
      });
      const childMdBlocks = await n2m.blocksToMarkdown(resp.results);
      const childMdStr = n2m.toMarkdownString(childMdBlocks);

      let fullContent = calloutText;
      if (childMdStr.parent?.trim()) {
        fullContent += "\n" + childMdStr.parent.trim();
      }

      // <details> 내부의 quote("> text") prefix를 제거
      // #formatCalloutMd가 모든 줄에 "> "를 추가하므로 이중 prefix 방지
      const processedContent = this.#stripQuoteMarkerInDetails(fullContent.trim());
      return this.#formatCalloutMd(processedContent, blockData.icon);
    });
    n2m.setCustomTransformer("paragraph", async (block) => {
      return this.transformCommonBlock(block, existsPageMap);
    });
    n2m.setCustomTransformer("link_to_page", async (block) => {
      const linkData = block.link_to_page;
      if (!linkData || linkData.type !== "page_id") return false;
      const resolved = this.#resolvePageByRawId(linkData.page_id.replace(/-/g, ''), existsPageMap);
      if (!resolved) return false;
      return `[${resolved.title}](${resolved.url})`;
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

      const toc = page.properties[this.propertyKeys.toc]?.checkbox === true;
      this.#wirteHugoHeader(ws, page, postId, title, titleSlug, toc, draft, firstImagePath);
      ws.write("\n");

      if (mdStringObj.parent) {
        let md = mdStringObj.parent;
        md = this.#convertDetailsToShortcode(md);
        md = this.#fixMarkdownTables(md);
        md = this.#fixKoreanBoldItalic(md);
        ws.write(md);
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
    const dateValue = this.#extractDateValue(page?.properties, this.propertyKeys.createdDate);
    if (dateValue) return dateValue;
    const prop = page?.properties?.[this.propertyKeys.createdDate];
    if (prop?.type === "created_time" && prop.created_time) {
      return prop.created_time;
    }
    return page.created_time;
  }

  /**
   * 페이지에서 발행일을 추출 (발행일 프로퍼티 우선, 없으면 생성일 폴백)
   * @param {Object} page - Notion 페이지 객체
   * @returns {string} ISO 8601 형식의 발행일 문자열
   */
  #extractPublishedDate(page) {
    return this.#extractDateValue(page?.properties, this.propertyKeys.publishedDate)
      || this.#extractCreatedTime(page);
  }

  /**
   * 페이지에서 수정일을 추출 (수정일 프로퍼티 우선, 없으면 last_edited_time 폴백)
   * @param {Object} page - Notion 페이지 객체
   * @returns {string} ISO 8601 형식의 수정일 문자열
   */
  #extractModifiedTime(page) {
    const dateValue = this.#extractDateValue(page?.properties, this.propertyKeys.modifiedDate);
    if (dateValue) return dateValue;
    const prop = page?.properties?.[this.propertyKeys.modifiedDate];
    if (prop?.type === "last_edited_time" && prop.last_edited_time) {
      return prop.last_edited_time;
    }
    return page.last_edited_time;
  }

  /**
   * Notion 속성에서 date 값을 추출
   * @param {Object} properties - Notion 페이지 속성 객체
   * @param {string} key - 날짜 속성 키
   * @returns {string|null} ISO 8601 형식의 날짜 문자열 또는 null
   */
  #extractDateValue(properties, key) {
    const prop = properties?.[key];
    if (prop?.type === "date" && prop.date?.start) {
      return prop.date.start;
    }
    return null;
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
   * Notion 속성이 존재하고 값이 비어있지 않은지 확인 (rich_text 지원)
   * @param {Object} properties - Notion 페이지 속성 객체
   * @param {string} key - 텍스트 속성 키
   * @returns {boolean} 속성이 존재하고 값이 비어있지 않으면 true, 속성이 없거나 빈 문자열이면 false
   */
  #hasTextProperty(properties, key) {
    const value = this.#extractTextProperty(properties, key);
    return !!value;
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

  // ── 링크 치환 헬퍼 ──

  /**
   * 공통 블록 변환 — rich_text 내 Notion 링크를 Hugo 상대 경로로 치환
   * @param {object} block - Notion 블록 객체
   * @param {Map<string, string>} existsPageMap - pageId → 디렉토리 경로 맵
   * @returns {object} 변환된 블록
   */
  transformCommonBlock(block, existsPageMap) {
    const blockData = block?.[block.type];
    const richTexts = blockData?.rich_text;
    if (!richTexts) return block;

    // 노션 링크가 existsPageMap 에 있는 페이지인 경우 최종 링크로 대체하기
    for (const rt of richTexts) {
      if (rt.href && rt.href.includes("notion.so/")){
        const resolved = this.#resolveNotionPageUrl(rt.href, existsPageMap);
        if (resolved) {
          rt.href = resolved;
          if (rt.text?.link) {
            rt.text.link.url = resolved;
          }
        }
      }
    }
    return block;
  }

  /**
   * rawId(대시 제거된 페이지 ID)로 existsPageMap을 조회해 페이지 메타 정보를 반환
   * @param {string} rawId - 대시가 제거된 Notion 페이지 ID
   * @param {Map<string, string>} existsPageMap - pageId → 디렉토리 경로 맵
   * @returns {{ postId: string, slug: string, title: string, url: string } | null} 성공 시 메타 정보, 실패 시 null
   */
  #resolvePageByRawId(rawId, existsPageMap) {
    let pageId = null;
    let pageDir = null;
    for (const [key, dir] of existsPageMap) {
      if (key.replace(/-/g, '') === rawId) {
        pageId = key;
        pageDir = dir;
        break;
      }
    }
    if (!pageDir) return null;

    const metaFilePath = path.join(pageDir, `notion_${pageId}.json`);
    if (!fs.existsSync(metaFilePath)) return null;

    try {
      const meta = JSON.parse(fs.readFileSync(metaFilePath, "utf-8"));
      const postId = this.#extractPagePostId(meta, this.propertyKeys.uniqueId);
      const slug = this.#extractTextProperty(meta.properties, this.propertyKeys.slug);
      if (!slug) return null;
      const titleProp = Object.values(meta.properties || {}).find(p => p.type === "title");
      const title = titleProp?.title?.map(t => t.plain_text).join("").trim() || slug;
      return { postId, slug, title, url: `../${postId}-${slug}/` };
    } catch (e) {
      console.warn(`⚠️ Failed to resolve Notion page: ${rawId}`, e);
      return null;
    }
  }

  /**
   * notion.so URL에서 페이지 ID를 추출해 Hugo 상대 경로로 변환
   * @param {string} url - notion.so를 포함한 URL
   * @param {Map<string, string>} existsPageMap - pageId → 디렉토리 경로 맵
   * @returns {string | null} Hugo 상대 경로 (예: `../123-slug/`), 실패 시 null
   */
  #resolveNotionPageUrl(url, existsPageMap) {
    const rawId = url.split("notion.so/").pop().replace(/-/g, '');
    if (!rawId) return null;
    return this.#resolvePageByRawId(rawId, existsPageMap)?.url ?? null;
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

  // ── callout 포맷 헬퍼 ──

  /**
   * <details> 내부 인용절("> text")에 빈 줄을 추가해 Goldmark가 blockquote로 처리하게 함.
   * "> " prefix는 유지 → #formatCalloutMd가 "> "를 추가해 "> > text"가 되고,
   * Goldmark가 외부 blockquote의 "> "를 제거하면 "> text"(markdown blockquote)로 렌더링됨.
   * 빈 줄이 없으면 <summary> HTML 블록에 흡수되어 raw text로 출력되므로 빈 줄 필수.
   */
  #stripQuoteMarkerInDetails(content) {
    const lines = content.split("\n");
    let depth = 0;
    const result = [];
    let inQuoteGroup = false;

    for (const line of lines) {
      const trimmed = line.trim();
      if (/<details(\s|>)/.test(trimmed)) depth++;

      if (depth > 0 && line.startsWith("> ")) {
        // 인용 그룹 시작 전 빈 줄 (HTML 블록에서 분리)
        if (!inQuoteGroup && result.length > 0 && result[result.length - 1] !== "") {
          result.push("");
        }
        inQuoteGroup = true;
        result.push(line); // "> " prefix 유지
      } else {
        // 인용 그룹 종료 후 빈 줄
        if (inQuoteGroup && result.length > 0 && result[result.length - 1] !== "") {
          result.push("");
        }
        inQuoteGroup = false;
        result.push(line);
      }

      if (trimmed === "</details>") depth--;
    }

    return result.join("\n");
  }


  /**
   * notion-to-md의 md.callout과 동일한 포맷으로 callout 마크다운 생성
   * @param {string} text - callout 내용 (자식 블록 포함)
   * @param {Object} icon - Notion icon 객체
   * @returns {string} 마크다운 blockquote 문자열
   */
  #formatCalloutMd(text, icon) {
    let emoji;
    if (icon?.type === "emoji") {
      emoji = icon.emoji;
    }
    const formattedText = text.replace(/\n/g, "  \n> ");
    const formattedEmoji = emoji ? emoji + " " : "";
    const headingMatch = formattedText.match(/^(#{1,6})\s+([.*\s\S]+)/);
    if (headingMatch) {
      const headingLevel = headingMatch[1].length;
      const headingContent = headingMatch[2];
      return `> ${"#".repeat(headingLevel)} ${formattedEmoji}${headingContent}`;
    }
    return `> ${formattedEmoji}${formattedText}`;
  }

  // ── 마크다운 후처리 ──
  
  /**
   * CommonMark 스펙상 닫는 ** 앞이 punctuation이고 뒤가 한글 letter이면
   * right-flanking 조건 미충족으로 bold/italic이 렌더링되지 않는 문제를 해결.
   * **text**한글 → <strong>text</strong>한글 로 변환해 마크다운 파싱을 우회한다.
   * Hugo goldmark.renderer.unsafe = true 이므로 인라인 HTML이 허용됨.
   */
  #fixKoreanBoldItalic(markdown) {
    // **text**한글 → <strong>text</strong>한글 (<strong>과 ** 결과 동일, 한글 뒤따를 때 파싱 우회)
    return markdown
      .replace(/\*\*([^*\n]+)\*\*([\uAC00-\uD7A3])/g, '<strong>$1</strong>$2')
      .replace(/(?<!\*)\*(?!\*)([^*\n]+)\*(?!\*)([\uAC00-\uD7A3])/g, '<em>$1</em>$2');
  }

  /**
   * notion-to-md가 toggle 블록을 <details>/<summary> HTML로 출력하면
   * Hugo(Goldmark)가 내부 마크다운을 파싱하지 않는 문제를 해결.
   * <details> HTML을 Hugo shortcode {{< details >}} 로 변환한다.
   */
  #convertDetailsToShortcode(markdown) {
    return markdown.replace(
      /<details>\n<summary>(.*?)<\/summary>\n([\s\S]*?)<\/details>/g,
      (_, summary, content) => {
        return `{{< details summary="${summary.replace(/"/g, '\\"')}" >}}\n${content.trim()}\n{{< /details >}}`;
      }
    );
  }

  /**
   * 마크다운 테이블 셀 내 줄바꿈을 <br>로 치환
   * notion-to-md가 테이블 셀에 실제 줄바꿈을 넣어 마크다운 테이블이 깨지는 문제를 수정
   * @param {string} markdown - 마크다운 문자열
   * @returns {string} 수정된 마크다운 문자열
   */
  #fixMarkdownTables(markdown) {
    const lines = markdown.split('\n');
    const result = [];
    let pendingRow = null;

    for (const line of lines) {
      if (pendingRow !== null) {
        pendingRow += '<br>' + line.trim();
        if (line.trimEnd().endsWith('|')) {
          result.push(pendingRow);
          pendingRow = null;
        }
      } else if (line.trimStart().startsWith('|') && !line.trimEnd().endsWith('|')) {
        pendingRow = line;
      } else {
        result.push(line);
      }
    }

    if (pendingRow !== null) {
      result.push(pendingRow);
    }

    return result.join('\n');
  }

  // ── Hugo 출력 헬퍼 ──

  /**
   * Hugo front-matter(YAML 헤더)를 WriteStream에 작성
   * @param {fs.WriteStream} ws - 쓰기 스트림
   * @param {Object} page - Notion 페이지 객체
   * @param {string} uniqueId - 페이지 고유 ID
   * @param {string} title - 페이지 제목
   * @param {string} titleSlug - 페이지 slug
   * @param {boolean} 목차(TOC) 표시 여부
   * @param {boolean} draft 여부
   * @param {string} 대표 이미지 경로
   */
  #wirteHugoHeader(ws, page, uniqueId, title, titleSlug, toc, draft, firstImagePath) {
    const tags = this.#extractPageTags(page.properties, this.propertyKeys.tags);
    const category = this.#extractPageCategory(page.properties, this.propertyKeys.category);
    const summary = this.#extractTextProperty(page.properties, this.propertyKeys.summary);
    const publishedDate = this.#extractPublishedDate(page);
    const slug = this.#extractTextProperty(page.properties, this.propertyKeys.slug) || titleSlug;
    const modifiedDate = this.#extractModifiedTime(page);
    const lastmod = new Date(modifiedDate) >= new Date(publishedDate) ? modifiedDate : publishedDate;
    ws.write("---\n");
    ws.write(`id: "${uniqueId}"\n`);
    ws.write(`translationKey: "${uniqueId}"\n`);
    ws.write(`slug: "${uniqueId}-${slug}"\n`);
    ws.write(`title: "${title.replace(/"/g, '\\"')}"\n`);
    if(summary){
      ws.write(`description: "${summary.replace(/"/g, '\\"')}"\n`);
    }
    ws.write("categories:\n");
    if(category.length > 0){
      for(const cat of category){
        ws.write(`  - "${cat.toLowerCase().replace(/"/g, '\\"')}"\n`);
      }
    } else {
      ws.write(`  - etc\n`);
    }
    const uniqueTags = [...new Set(tags)].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
    if(uniqueTags.length > 0){
      ws.write("tags:\n");
      for(const tag of uniqueTags){
        ws.write(`  - "${tag.replace(/"/g, '\\"')}"\n`);
      }
    }
    ws.write(`date: ${new Date(publishedDate).toISOString()}\n`);
    ws.write(`lastmod: ${new Date(lastmod).toISOString()}\n`);
    ws.write(`toc: ${toc}\n`);
    ws.write(`draft: ${draft}\n`);
    if(firstImagePath){
      ws.write("images:\n");
      ws.write(`  - "${firstImagePath}"\n`);
    }
    ws.write("---\n");
  }
}
