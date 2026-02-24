import "dotenv/config";
import fs from "fs";
import yaml from "js-yaml";
import { GoogleAnalyticsService } from "./services/GoogleAnalyticsService.mjs";
import { PopularPostsService } from "./services/PopularPostsService.mjs";

function loadConfig(filePath = "config.yml") {
  if (!fs.existsSync(filePath)) return {};
  return yaml.load(fs.readFileSync(filePath, "utf-8")) || {};
}

const config = loadConfig();
const propertyId = config.googleAnalytics?.propertyId || process.env.GA4_PROPERTY_ID;

if (!propertyId) {
  console.error("오류: config.yml의 googleAnalytics.propertyId 또는 GA4_PROPERTY_ID 환경변수가 필요합니다.");
  process.exit(1);
}

const LANGUAGES = ["ko", "en", "ja"];

const period = { start_date: "30daysAgo", end_date: "today" };
const ga4Service = new GoogleAnalyticsService(propertyId);
const popularService = new PopularPostsService();

// 전체 언어 통합 기준으로 인기 랭킹 조회 (post_slug 커스텀 이벤트 기준)
console.log("GA4 인기글 조회 중... (기준: post_slug 커스텀 이벤트, 전체 언어)");
const ga4Results = await ga4Service.getTopPostSlugs({
  limit: 20,
  startDate: period.start_date,
  endDate: period.end_date,
});
console.log(`GA4 결과: ${ga4Results.length}개\n`);

// 각 언어별로 동일 랭킹 기준, 언어별 콘텐츠(제목/설명/URL)로 매칭
for (const lang of LANGUAGES) {
  console.log(`[${lang}] 콘텐츠 매칭 중...`);
  const posts = popularService.matchPosts(ga4Results, lang);
  console.log(`  매칭 성공: ${posts.length}개`);
  posts.forEach((p) => console.log(`    ${p.rank}. ${p.title}`));
  popularService.exportJson(posts, period, lang);
}

console.log("\n완료.");
