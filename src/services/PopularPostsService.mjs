import fs from "fs";
import path from "node:path";
import yaml from "js-yaml";

const CONTENT_DIR = path.resolve("content/notion");
const OUTPUT_DIR = path.resolve("data/popular");

// 언어 코드 → 파일 suffix 매핑
const LANG_FILE_SUFFIX = {
  ko: "",
  en: ".en",
  ja: ".ja",
};

// 언어 코드 → URL 접두사 매핑 (한국어는 루트)
const LANG_URL_PREFIX = {
  ko: "",
  en: "/en",
  ja: "/ja",
};

/**
 * front matter (---...---) 파싱
 * @param {string} content
 * @returns {object}
 */
function parseFrontMatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  try {
    return yaml.load(match[1]) || {};
  } catch {
    return {};
  }
}

/**
 * content/notion 하위 index.{suffix}.md 전체 스캔 → slug 기준 맵 반환
 * @param {string} lang - 언어 코드 ('ko' | 'en' | 'ja')
 * @returns {Map<string, object>}
 */
function scanContentDir(lang) {
  const suffix = LANG_FILE_SUFFIX[lang] ?? "";
  const fileName = `index${suffix}.md`;
  const urlPrefix = LANG_URL_PREFIX[lang] ?? "";
  const map = new Map();

  function walk(currentDir) {
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name === fileName) {
        const raw = fs.readFileSync(fullPath, "utf-8");
        const fm = parseFrontMatter(raw);
        if (fm.slug) {
          const postUrl = `${urlPrefix}/posts/${fm.slug}/`;
          const firstImage = fm.images && fm.images.length ? fm.images[0] : null;
          // 이미지는 한국어 기준 경로 (원본 파일에 있음)
          const koPostUrl = `/posts/${fm.slug}/`;
          map.set(fm.slug, {
            slug: fm.slug,
            title: fm.title || "",
            description: fm.description || "",
            date: fm.date ? new Date(fm.date).toISOString() : "",
            categories: fm.categories || [],
            url: postUrl,
            image: firstImage ? `${koPostUrl}${firstImage}` : null,
          });
        }
      }
    }
  }

  walk(CONTENT_DIR);
  return map;
}

export class PopularPostsService {
  constructor() {
    this.contentMaps = {};
  }

  _ensureContentMap(lang) {
    if (!this.contentMaps[lang]) {
      this.contentMaps[lang] = scanContentDir(lang);
    }
  }

  /**
   * GA4 결과와 content/notion 게시글 매칭
   * 번역 파일이 없으면 한국어 콘텐츠로 폴백 (URL은 한국어 기준)
   * @param {Array<{slug:string, count:number}>} ga4Results
   * @param {string} [lang='ko']
   * @returns {Array<object>}
   */
  matchPosts(ga4Results, lang = "ko") {
    this._ensureContentMap(lang);
    this._ensureContentMap("ko");
    const contentMap = this.contentMaps[lang];
    const koMap = this.contentMaps["ko"];

    const matched = [];
    let rank = 1;

    for (const { slug, count } of ga4Results) {
      const post = contentMap.get(slug) ?? koMap.get(slug);
      if (post) {
        matched.push({ rank: rank++, ...post, count });
      } else {
        console.warn(`  [경고] slug 매칭 실패 (${lang}): ${slug}`);
      }
    }

    return matched;
  }

  /**
   * 인기글 데이터를 JSON 파일로 저장
   * @param {Array<object>} posts
   * @param {{start_date:string, end_date:string}} period
   * @param {string} [lang='ko']
   */
  exportJson(posts, period, lang = "ko") {
    const output = {
      generated_at: new Date().toISOString(),
      lang,
      period,
      posts,
    };

    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    const outputPath = path.join(OUTPUT_DIR, `${lang}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), "utf-8");
    console.log(`  JSON 저장: ${outputPath} (${posts.length}개)`);
  }
}
