import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureDir } from "../utils/FileUtils.mjs";
import { trimGeneratedBorder } from "../utils/ImageUtils.mjs";

/**
 * 모든 대표 이미지에 공통으로 앞에 붙는 스타일 프롬프트 파일
 *
 * 글마다 스타일을 다시 적게 하면 결국 결과물이 제각각이 된다. 파일 하나로 모아 두고
 * 도구가 자동으로 붙인다. 스타일을 바꾸려면 이 파일만 고치면 된다.
 */
const STYLE_PROMPT_PATH = fileURLToPath(
  new URL("../../prompts/featured-image-style.txt", import.meta.url)
);

/**
 * 대표 이미지 생성 및 Notion 반영 서비스
 *
 * 생성과 업로드를 따로 노출한다. 이미지 모델은 한 번에 원하는 그림을 주지 않기 때문에,
 * 생성 결과를 눈으로 확인한 뒤 마음에 들 때만 Notion 에 올릴 수 있어야 한다.
 */
export class FeaturedImageService {
  /**
   * @param {import("../clients/GeminiImageClient.mjs").GeminiImageClient} imageClient - 이미지 생성 클라이언트
   * @param {import("../clients/NotionApiClient.mjs").NotionApiClient} notionApiClient - Notion API 클라이언트
   * @param {string} [workDir="tmp/featured-images"] - 생성 이미지를 쌓아둘 디렉터리
   */
  constructor(imageClient, notionApiClient, workDir = "tmp/featured-images") {
    this.imageClient = imageClient;
    this.notionApiClient = notionApiClient;
    this.workDir = workDir;
  }

  /**
   * 프롬프트로 이미지를 생성해 workDir 에 저장
   * @param {Object} params
   * @param {string} params.prompt - 이미지 생성 프롬프트
   * @param {string} [params.aspectRatio] - 가로세로 비율
   * @param {string} [params.imageSize] - 해상도 등급
   * @param {string} [params.model] - 사용할 모델
   * @param {string} [params.name] - 파일 이름 접두사
   * @param {boolean} [params.useStyle=true] - 공통 스타일 프롬프트를 앞에 붙일지 여부
   * @returns {Promise<{filePath: string, mimeType: string, model: string, bytes: number, base64: string, prompt: string}>}
   */
  async generate({ prompt, aspectRatio, imageSize, model, name = "featured", useStyle = true }) {
    const fullPrompt = useStyle ? `${await this.#loadStylePrompt()}\n${prompt}` : prompt;
    const { data: raw, mimeType, model: usedModel } = await this.imageClient.generateImage({
      prompt: fullPrompt,
      aspectRatio,
      imageSize,
      model,
    });

    // 모델이 가끔 액자 테두리를 그린다. 프롬프트로는 막히지 않아 후처리로 걷어낸다.
    const { data, cropped } = await trimGeneratedBorder(raw);

    await ensureDir(this.workDir);
    const ext = mimeType === "image/png" ? ".png" : ".jpg";
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filePath = path.join(this.workDir, `${sanitize(name)}_${stamp}${ext}`);
    await fsp.writeFile(filePath, data);

    return {
      filePath,
      mimeType,
      model: usedModel,
      bytes: data.length,
      base64: data.toString("base64"),
      prompt: fullPrompt,
      borderTrimmed: cropped,
    };
  }

  /**
   * 공통 스타일 프롬프트를 읽는다
   * @returns {Promise<string>} 스타일 프롬프트 본문
   * @throws {Error} 파일이 없는 경우
   */
  async #loadStylePrompt() {
    try {
      return (await fsp.readFile(STYLE_PROMPT_PATH, "utf-8")).trim();
    } catch {
      throw new Error(`Style prompt not found: ${STYLE_PROMPT_PATH}`);
    }
  }

  /**
   * 저장된 이미지를 Notion 페이지에 대표 이미지로 반영
   *
   * @param {Object} params
   * @param {string} params.pageId - Notion 페이지 ID
   * @param {string} params.filePath - 업로드할 로컬 이미지 경로
   * @param {string} params.caption - 이미지 캡션. Hugo 에서 alt 텍스트가 되므로 비우지 않는다
   * @param {"prepend"|"replace_first"|"append"} [params.mode="prepend"] - 반영 방식
   * @param {boolean} [params.replacePreviousCandidate=true] - prepend 일 때 직전 후보를 먼저 지울지 여부
   * @returns {Promise<{mode: string, blockId: string, fileUploadId: string, replacedPrevious: boolean}>}
   * @throws {Error} replace_first 인데 페이지에 이미지 블록이 없는 경우
   */
  async attachToNotion({ pageId, filePath, caption, mode = "prepend", replacePreviousCandidate = true }) {
    if (!caption?.trim()) {
      // 캡션이 비면 NotionExportService 가 alt 없는 이미지로 경고를 남긴다.
      throw new Error("caption is required (Hugo alt text)");
    }

    const data = await fsp.readFile(filePath);
    const mimeType = filePath.endsWith(".jpg") || filePath.endsWith(".jpeg")
      ? "image/jpeg"
      : "image/png";
    const fileUploadId = await this.notionApiClient.uploadFile(
      data,
      path.basename(filePath),
      mimeType
    );

    if (mode === "replace_first") {
      const existing = await this.notionApiClient.findFirstImageBlock(pageId);
      if (!existing) {
        throw new Error(`No existing image block on page ${pageId}; use mode "prepend" instead`);
      }
      const block = await this.notionApiClient.updateImageBlock(existing.id, fileUploadId, caption);
      return { mode, blockId: block.id, fileUploadId, replacedPrevious: true };
    }

    // 후보를 쌓아두지 않는다. 본문은 목차나 heading 으로 시작하므로 첫 블록이
    // 이미지면 직전에 올린 후보다. 본문 중간의 이미지는 건드리지 않는다.
    let replacedPrevious = false;
    if (mode === "prepend" && replacePreviousCandidate) {
      const children = await this.notionApiClient.listAllChildren(pageId);
      if (children[0]?.type === "image") {
        await this.notionApiClient.deleteBlock(children[0].id);
        replacedPrevious = true;
      }
    }

    const position = mode === "append" ? "end" : "start";
    const block = await this.notionApiClient.appendImageBlock(
      pageId,
      fileUploadId,
      caption,
      position
    );
    return { mode, blockId: block?.id, fileUploadId, replacedPrevious };
  }
}

/**
 * 파일 이름으로 쓸 수 있게 문자열을 정리
 * @param {string} value - 원본 문자열
 * @returns {string} 안전한 파일 이름 조각
 */
function sanitize(value) {
  return value.replace(/[^\w가-힣-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "featured";
}
