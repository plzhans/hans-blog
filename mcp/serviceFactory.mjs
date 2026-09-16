/**
 * 도구가 쓸 서비스를 조립한다
 *
 * 여기에 비즈니스 로직은 없다. 로직은 src/services/ 에 있고 이 파일은
 * 환경변수를 읽어 클라이언트를 만들고 서비스에 주입하는 일만 한다.
 */
import "dotenv/config";
import { Client } from "@notionhq/client";
import { NotionApiClient } from "../src/clients/NotionApiClient.mjs";
import { GeminiImageClient } from "../src/clients/GeminiImageClient.mjs";
import { FeaturedImageService } from "../src/services/FeaturedImageService.mjs";

/**
 * 대표 이미지 생성 결과를 쌓아두는 디렉터리
 * @type {string}
 */
export const FEATURED_IMAGE_DIR = process.env.FEATURED_IMAGE_DIR || "tmp/featured-images";

/**
 * FeaturedImageService 인스턴스를 생성
 *
 * 서버 기동 시점이 아니라 도구 호출 시점에 만든다. 키가 하나 비었다고
 * 서버 전체가 죽으면 그 키를 안 쓰는 도구까지 같이 사라지기 때문이다.
 *
 * @returns {FeaturedImageService} 설정이 적용된 서비스 인스턴스
 */
export function createFeaturedImageService() {
  const notionClient = new Client({ auth: process.env.NOTION_API_TOKEN });
  const notionApiClient = new NotionApiClient(notionClient, process.env.NOTION_API_TOKEN);
  const imageClient = new GeminiImageClient(process.env.GEMINI_API_KEY, {
    model: process.env.GEMINI_IMAGE_MODEL,
  });
  return new FeaturedImageService(imageClient, notionApiClient, FEATURED_IMAGE_DIR);
}
