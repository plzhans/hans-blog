import { generateFeaturedImage } from "./generateFeaturedImage.mjs";
import { attachFeaturedImageToNotion } from "./attachFeaturedImageToNotion.mjs";

/**
 * MCP 서버가 등록할 도구 목록
 *
 * 도구를 추가할 때는 tools/ 아래에 파일을 하나 만들고 여기에만 더한다.
 * server.mjs 는 손대지 않는다.
 *
 * @type {Array<{name: string, config: Object, handler: Function}>}
 */
export const tools = [generateFeaturedImage, attachFeaturedImageToNotion];
