/**
 * 노션 페이지를 링크드인에 게시하는 서비스
 *
 * 게시는 되돌릴 수 없다. 글을 지우고 다시 올리면 반응이 전부 날아가고, OG 카드는
 * 게시 시점에 굳어서 나중에 제목을 고쳐도 그대로다. 그래서 언제 올릴지는 사람이
 * 노션 버튼으로 정하고, 이 서비스는 "정말 올려도 되는 상태인가" 만 확인한다.
 */

import fs from "node:fs";
import path from "node:path";

// 링크드인 Images API 가 받는 형식은 이 셋뿐이다. webp/avif 는 안 된다.
const MIME_BY_EXT = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
};

/**
 * 게시 결과
 * @typedef {Object} ShareResult
 * @property {boolean} ok - 게시 성공 여부
 * @property {string} [url] - 게시된 링크드인 게시물 URL
 * @property {string} [reason] - 실패했다면 그 사유
 */

export class LinkedInShareService {
  /**
   * @param {import("../clients/NotionApiClient.mjs").NotionApiClient} notionApiClient
   * @param {import("../clients/LinkedInApiClient.mjs").LinkedInApiClient} linkedInApiClient
   * @param {Object} propertyKeys - notion.yml 의 propertyKeys
   */
  constructor(notionApiClient, linkedInApiClient, propertyKeys) {
    this.notionApiClient = notionApiClient;
    this.linkedInApiClient = linkedInApiClient;
    this.propertyKeys = {
      publishUrl: "발행 URL",
      linkedinText: "링크드인 문구",
      linkedinUrl: "링크드인 URL",
      linkedinResult: "링크드인 결과",
      // 선택 프로퍼티. notion.yml 에서 비우면 게시일을 기록하지 않는다
      linkedinDate: "",
      ...propertyKeys,
    };
  }

  /**
   * 노션 페이지 하나를 링크드인에 게시
   *
   * @param {string} pageId - 노션 페이지 ID
   * @param {Object} [options]
   * @param {boolean} [options.dryRun=false] - 실제로 올리지 않고 판정과 본문만 출력
   * @param {boolean} [options.test=false] - 피드 배포를 끄고 올린 뒤 확인받고 지운다.
   *   노션에는 아무것도 쓰지 않는다
   * @param {Array<{path: string, altText?: string}>} [options.images=[]] - 붙일 이미지.
   *   **이미지를 붙이면 링크 미리보기 카드는 안 붙는다**
   * @returns {Promise<ShareResult>}
   */
  async postByPageId(pageId, { dryRun = false, test = false, images = [] } = {}) {
    // 테스트 게시는 지워질 것이므로 노션에 성공으로 남기면 안 된다.
    // 남기면 "링크드인 URL" 이 채워져서 진짜 게시가 영영 막힌다.
    const skipNotionWrite = dryRun || test;
    const page = await this.notionApiClient.retrievePage(pageId);
    const title = extractTitle(page);
    console.log(`페이지: ${title} (${pageId})`);

    // ── 게시해도 되는 상태인지 확인 ──

    const alreadyPosted = extractUrl(page, this.propertyKeys.linkedinUrl);
    if (alreadyPosted) {
      return this.#reject(page, `이미 게시된 글입니다 (${alreadyPosted})`, skipNotionWrite);
    }

    const commentary = extractText(page, this.propertyKeys.linkedinText);
    if (!commentary) {
      return this.#reject(page, `"${this.propertyKeys.linkedinText}" 가 비어 있습니다`, skipNotionWrite);
    }

    const publishUrl = extractUrl(page, this.propertyKeys.publishUrl);
    if (!publishUrl) {
      return this.#reject(page, `"${this.propertyKeys.publishUrl}" 가 비어 있습니다`, skipNotionWrite);
    }

    // 본문에 블로그 링크가 없으면 링크드인이 카드를 못 만든다. 링크 없는 글은
    // 유입이 0 이라 올리는 의미가 없으므로 막는다.
    if (!commentary.includes(publishUrl)) {
      return this.#reject(page, `문구에 발행 URL(${publishUrl})이 없습니다`, skipNotionWrite);
    }

    const live = await this.#verifyLive(publishUrl, title);
    if (!live.ok) {
      return this.#reject(page, live.reason, skipNotionWrite);
    }

    // ── 게시 ──

    // 이미지는 한 장이라도 올리기 전에 전부 검사한다. 업로드 루프 안에서 걸리면
    // 앞의 것들은 이미 링크드인에 올라간 뒤라 정리할 방법이 없다.
    const imageProblem = checkImages(images);
    if (imageProblem) {
      return this.#reject(page, imageProblem, skipNotionWrite);
    }

    if (dryRun) {
      console.log("\n[dry-run] 아래 내용으로 게시합니다:\n");
      console.log("─".repeat(60));
      console.log(commentary);
      console.log("─".repeat(60));
      console.log(`\n본문 ${commentary.length}자 · 검증 통과 · 실제로는 올리지 않았습니다.`);
      if (images.length) {
        console.log(`\n첨부 이미지 ${images.length}장:`);
        for (const img of images) {
          console.log(`  - ${img.path}`);
          console.log(`    alt: ${img.altText || "(없음)"}`);
        }
        console.log("\n이미지가 붙으므로 링크 미리보기 카드는 표시되지 않습니다.");
      }
      return { ok: true };
    }

    const uploaded = await this.#uploadImages(images);

    if (test) {
      return this.#postAndDelete(commentary, uploaded);
    }

    const { url } = await this.linkedInApiClient.createPost({ commentary, images: uploaded });
    await this.#recordSuccess(page, url);
    console.log(`✅ 게시 완료: ${url}`);
    return { ok: true, url };
  }

  /**
   * 로컬 이미지 파일들을 링크드인에 올리고 URN 목록을 돌려준다
   *
   * @param {Array<{path: string, altText?: string}>} images - 올릴 이미지
   * @returns {Promise<Array<{id: string, altText?: string}>>} 게시에 쓸 이미지 목록
   */
  async #uploadImages(images) {
    const uploaded = [];
    for (const [i, img] of images.entries()) {
      console.log(`이미지 업로드 ${i + 1}/${images.length}: ${path.basename(img.path)}`);
      const data = await fs.promises.readFile(img.path);
      const id = await this.linkedInApiClient.uploadImage(data, mimeTypeOf(img.path));
      uploaded.push({ id, altText: img.altText });
    }
    return uploaded;
  }

  /**
   * 테스트 게시. 올리고, 확인받고, 지운다
   *
   * 링크드인은 생성 시 lifecycleState 를 PUBLISHED 만 받아서 초안으로 올려볼 수 없다.
   * 노출을 막는 수단은 feedDistribution: NONE 하나뿐이다. 피드에 배포하지 않으므로
   * 아무의 타임라인에도 뜨지 않고 URL 을 아는 사람만 볼 수 있다.
   *
   * **이게 유일한 방어선이다.** 문서가 이 값을 광고용 dark post 맥락으로만 설명해서
   * 개인 글에도 먹히는지는 확인된 바 없다. 조용히 MAIN_FEED 로 떨어지면 그냥 전체
   * 공개 게시물이 된다. visibility 를 CONNECTIONS 로 낮추는 건 안전망이 못 된다 -
   * 이 글을 보이고 싶지 않은 상대가 애초에 1촌이기 때문이다.
   *
   * 그래서 올리기 전에 사람에게 한 번 묻는다.
   *
   * @param {string} commentary - 게시할 본문
   * @returns {Promise<ShareResult>}
   */
  async #postAndDelete(commentary, images = []) {
    console.log("\n[test] feedDistribution: NONE 으로 올립니다 (피드에 배포하지 않음).");
    console.log("⚠️  이 값이 개인 글에 먹히는지는 확인된 바 없습니다.");
    console.log("    안 먹히면 전체 공개 게시물로 나갑니다. 삭제해도 그 사이 노출은 되돌릴 수 없습니다.");

    // 프롬프트를 두 번 띄우므로 readline 은 하나만 열어 재사용한다.
    // 매번 열고 닫으면 첫 close() 가 stdin 을 끝내서 두 번째 질문이 영영 안 온다.
    return withPrompt(async (rl) => {
      // 되돌릴 수 없는 게시를 무인 환경에서 자동 진행시키지 않는다.
      if (!rl) {
        console.error("비대화형 환경에서는 테스트 게시를 하지 않습니다.");
        return { ok: false, reason: "테스트 게시에는 터미널이 필요합니다" };
      }

      const go = await rl.question("\n계속할까요? (y/N) ");
      if (!/^y(es)?$/i.test(go.trim())) {
        console.log("취소했습니다. 아무것도 올리지 않았습니다.");
        return { ok: false, reason: "사용자가 테스트 게시를 취소했습니다" };
      }

      const { urn, url } = await this.linkedInApiClient.createPost({
        commentary,
        feedDistribution: "NONE",
        images,
      });

      console.log(`\n게시됨: ${url}`);
      console.log("카드와 본문이 제대로 나오는지, 그리고 피드에 안 뜨는지 확인하세요.");

      // 지우기 전에 사람이 눈으로 확인할 시간을 준다. 바로 지우면 카드가 어떻게
      // 렌더되는지 볼 수 없어서 테스트한 의미가 없다.
      await rl.question("\n확인했으면 Enter 를 누르세요. 게시물을 삭제합니다... ");

      await this.linkedInApiClient.deletePost(urn);
      console.log(`🗑️  삭제했습니다 (${urn})`);
      console.log("노션에는 아무것도 기록하지 않았습니다.");
      return { ok: true, url };
    });
  }

  /**
   * 발행 URL 이 실제로 살아 있고 최신 내용인지 확인
   *
   * 배포 전에 버튼을 눌렀거나 캐시가 아직 안 퍼진 상태에서 올리면 링크드인이
   * 빈 카드를 만들어 굳혀버린다. 게시 전에 실물을 한 번 받아보는 이유다.
   * og:title 이 노션 제목과 다르면 아직 이전 판본이 서빙되고 있다는 뜻이다.
   *
   * @param {string} url - 확인할 발행 URL
   * @param {string} expectedTitle - 노션의 현재 제목
   * @returns {Promise<{ok: boolean, reason?: string}>}
   */
  async #verifyLive(url, expectedTitle) {
    let res;
    try {
      res = await fetch(url, { redirect: "follow" });
    } catch (err) {
      return { ok: false, reason: `발행 URL 에 접속할 수 없습니다: ${err.message}` };
    }
    if (!res.ok) {
      return { ok: false, reason: `발행 URL 이 ${res.status} 를 반환했습니다 (${url})` };
    }

    const html = await res.text();
    const ogTitle = extractOgTitle(html);
    if (!ogTitle) {
      return { ok: false, reason: `발행 URL 에 og:title 이 없습니다 (${url})` };
    }
    if (normalize(ogTitle) !== normalize(expectedTitle)) {
      return {
        ok: false,
        reason:
          `배포된 제목이 노션과 다릅니다. 아직 배포가 안 끝났을 수 있습니다.\n` +
          `  노션: ${expectedTitle}\n  배포: ${ogTitle}`,
      };
    }
    return { ok: true };
  }

  /**
   * 게시 결과를 노션에 되쓴다
   *
   * 링크드인 URL 이 곧 "게시됨" 상태다. 이 값이 채워지면 다음 실행이 재게시를 막는다.
   *
   * @param {Object} page - 노션 페이지 객체
   * @param {string} url - 게시된 링크드인 게시물 URL
   */
  async #recordSuccess(page, url) {
    const now = new Date().toISOString();
    const properties = {
      [this.propertyKeys.linkedinUrl]: { url },
      [this.propertyKeys.linkedinResult]: {
        rich_text: [{ text: { content: `✅ 게시 완료 (${now})` } }],
      },
    };
    // 선택 프로퍼티라 노션에 없을 수 있다. 키가 비어 있으면 건드리지 않는다.
    if (this.propertyKeys.linkedinDate) {
      properties[this.propertyKeys.linkedinDate] = { date: { start: now } };
    }
    await this.notionApiClient.updatePageProperties(page.id, properties);
  }

  /**
   * 게시를 거부하고 사유를 콘솔과 노션에 기록
   *
   * CI 가 무인으로 돌아 콘솔을 볼 수 없으므로 노션에도 남긴다.
   * NotionExportService 의 #rejectPublish 와 같은 이유, 같은 방식이다.
   *
   * @param {Object} page - 노션 페이지 객체
   * @param {string} reason - 거부 사유
   * @param {boolean} skipNotionWrite - dry-run 이나 test 면 노션에 쓰지 않는다
   * @returns {Promise<ShareResult>}
   */
  async #reject(page, reason, skipNotionWrite) {
    console.error(`❌ 게시하지 않습니다: ${reason}`);
    if (!skipNotionWrite) {
      const now = new Date().toISOString();
      await this.notionApiClient.updatePageProperties(page.id, {
        [this.propertyKeys.linkedinResult]: {
          rich_text: [{ text: { content: `❌ 실패 (${now}): ${reason}` } }],
        },
      });
    }
    return { ok: false, reason };
  }
}

/**
 * 첨부할 이미지들이 올릴 수 있는 상태인지 한꺼번에 검사
 *
 * @param {Array<{path: string}>} images - 검사할 이미지
 * @returns {string|null} 문제가 있으면 사유, 없으면 null
 */
function checkImages(images) {
  const missing = images.filter((img) => !fs.existsSync(img.path)).map((img) => img.path);
  if (missing.length) {
    return `이미지 파일이 없습니다: ${missing.join(", ")}`;
  }
  const badExt = images
    .filter((img) => !MIME_BY_EXT[path.extname(img.path).toLowerCase()])
    .map((img) => img.path);
  if (badExt.length) {
    return `PNG·JPG·GIF 만 올릴 수 있습니다: ${badExt.join(", ")}`;
  }
  return null;
}

/**
 * 파일 확장자로 MIME 타입을 정한다
 *
 * 링크드인은 JPG/GIF/PNG 만 받는다. 다른 확장자는 여기서 막아야 업로드가
 * 절반쯤 진행된 뒤에 실패하는 일이 없다.
 *
 * @param {string} filePath - 이미지 파일 경로
 * @returns {string} MIME 타입
 * @throws {Error} 지원하지 않는 확장자인 경우
 */
function mimeTypeOf(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mime = MIME_BY_EXT[ext];
  if (!mime) {
    throw new Error(
      `LinkedIn does not accept ${ext || "(no extension)"} - use PNG, JPG or GIF (${filePath})`
    );
  }
  return mime;
}

/**
 * readline 인터페이스를 하나 열어 fn 에 넘기고, 끝나면 닫는다
 *
 * 터미널이 없으면(CI 등) fn 에 null 을 넘긴다. 호출부가 그 경우를 직접 정하게 해서,
 * 입력을 영영 기다리며 잡이 매달리는 일이 없게 한다.
 *
 * @template T
 * @param {(rl: import("node:readline/promises").Interface|null) => Promise<T>} fn
 * @returns {Promise<T>}
 */
async function withPrompt(fn) {
  if (!process.stdin.isTTY) return fn(null);
  const readline = await import("node:readline/promises");
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    return await fn({ question: (prompt) => question(rl, prompt) });
  } finally {
    rl.close();
  }
}

/**
 * 한 줄을 묻되, 입력이 끝나버렸으면 빈 문자열로 푼다
 *
 * 입력이 EOF 에 닿은 뒤 물으면 rl.question 은 영영 안 풀린다. 그대로 두면 프로세스가
 * 매달리므로 닫힘을 같이 기다린다. 빈 문자열은 양쪽 물음에서 안전한 쪽으로 해석된다 -
 * 게시 확인은 "아니오"가 되고, 삭제 확인은 그냥 진행이다.
 *
 * @param {import("node:readline/promises").Interface} rl
 * @param {string} prompt - 표시할 안내 문구
 * @returns {Promise<string>} 입력된 줄 (입력이 끝났으면 "")
 */
function question(rl, prompt) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    rl.once("close", () => finish(""));
    rl.question(prompt).then(finish, () => finish(""));
  });
}

/**
 * 페이지 제목을 추출
 * @param {Object} page - 노션 페이지 객체
 * @returns {string} 제목 (없으면 "untitled")
 */
function extractTitle(page) {
  const key = Object.keys(page?.properties || {}).find((k) => page.properties[k]?.type === "title");
  if (!key) return "untitled";
  return page.properties[key].title?.map((t) => t.plain_text).join("").trim() || "untitled";
}

/**
 * rich_text 프로퍼티의 평문을 추출
 * @param {Object} page - 노션 페이지 객체
 * @param {string} key - 프로퍼티 이름
 * @returns {string} 평문 (없으면 빈 문자열)
 */
function extractText(page, key) {
  const prop = page?.properties?.[key];
  if (!prop) return "";
  if (prop.type === "rich_text") {
    return prop.rich_text?.map((t) => t.plain_text).join("").trim() || "";
  }
  if (prop.type === "title") {
    return prop.title?.map((t) => t.plain_text).join("").trim() || "";
  }
  return "";
}

/**
 * url 프로퍼티 값을 추출
 * @param {Object} page - 노션 페이지 객체
 * @param {string} key - 프로퍼티 이름
 * @returns {string} URL (없으면 빈 문자열)
 */
function extractUrl(page, key) {
  const prop = page?.properties?.[key];
  if (prop?.type === "url") return prop.url?.trim() || "";
  if (prop?.type === "rich_text") return extractText(page, key);
  return "";
}

/**
 * HTML 에서 og:title 을 뽑는다
 *
 * property 와 content 의 순서가 뒤바뀐 경우까지 받는다. Hugo 템플릿이 바뀌면
 * 순서가 달라질 수 있는데 여기서 못 찾으면 게시가 통째로 막히기 때문이다.
 *
 * @param {string} html - 페이지 HTML
 * @returns {string} og:title 값 (없으면 빈 문자열)
 */
function extractOgTitle(html) {
  const patterns = [
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i,
    /<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:title["']/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) return decodeEntities(m[1]);
  }
  return "";
}

/**
 * 비교에 방해되는 HTML 엔티티를 되돌린다
 * @param {string} s - 원문
 * @returns {string} 디코딩된 문자열
 */
function decodeEntities(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

/**
 * 제목 비교용 정규화. 공백 차이로 오판하지 않도록 한다
 * @param {string} s - 원문
 * @returns {string} 정규화된 문자열
 */
function normalize(s) {
  return String(s).replace(/\s+/g, " ").trim();
}
