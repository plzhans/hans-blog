import { z } from "zod";
import { createFeaturedImageService } from "../serviceFactory.mjs";
import { textResult, toolError } from "../toolResult.mjs";

/**
 * 대표 이미지를 Notion 에 반영하는 도구
 *
 * Notion 이 원본이므로 content/posts 아래 index.md 를 직접 고치지 않는다.
 * 이미지를 Notion 에 올린 뒤 동기화로 repo 에 내려받는다.
 *
 * @type {{name: string, config: Object, handler: Function}}
 */
export const attachFeaturedImageToNotion = {
  name: "attach_featured_image_to_notion",
  config: {
    title: "Attach featured image to Notion",
    description:
      "생성된 이미지를 Notion 페이지에 업로드해 대표 이미지로 넣는다. Notion 이 원본이므로 " +
      "content/posts 아래 index.md 를 직접 고치지 않고 여기로 올린 뒤 `make notion-database-sync` 로 내려받는다. " +
      "Hugo 는 본문 첫 이미지 블록을 front matter 의 images 로 쓴다.",
    inputSchema: z.object({
      pageId: z.string().min(1).describe("대상 Notion 페이지 ID"),
      filePath: z.string().min(1).describe("generate_featured_image 가 돌려준 로컬 이미지 경로"),
      caption: z
        .string()
        .min(1)
        .describe("이미지 캡션. Hugo 에서 alt 텍스트가 되므로 글 내용을 설명하는 한국어 문장으로 쓸 것"),
      mode: z
        .enum(["prepend", "replace_first", "append"])
        .optional()
        .describe(
          "prepend: 페이지 맨 위에 새 이미지 블록 추가 (기본값) / " +
            "replace_first: 기존 첫 이미지 블록 내용을 교체 / append: 페이지 맨 아래에 추가"
        ),
    }),
  },

  /**
   * @param {Object} args - 도구 입력
   * @returns {Promise<Object>} 반영 결과 텍스트를 담은 MCP 결과
   */
  async handler({ pageId, filePath, caption, mode }) {
    try {
      const result = await createFeaturedImageService().attachToNotion({
        pageId,
        filePath,
        caption,
        mode,
      });
      return textResult(
        `Attached to Notion page ${pageId} (mode: ${result.mode})\n` +
          `block: ${result.blockId}\n` +
          "Run `make notion-database-sync` to pull it into content/posts."
      );
    } catch (error) {
      return toolError(error);
    }
  },
};
