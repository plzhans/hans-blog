import { z } from "zod";
import { createFeaturedImageService } from "../serviceFactory.mjs";
import { imageResult, toolError } from "../toolResult.mjs";

/**
 * 대표 이미지 생성 도구
 *
 * 프롬프트를 이미지 모델에 보내 그림을 받고, pageId 를 주면 그 자리에서 Notion 에 올린다.
 * 사람이 노션에서 바로 보고 판단할 수 있어야 하므로 생성물을 쌓아두지 않고
 * 직전 후보를 지운 뒤 새것을 올린다.
 *
 * @type {{name: string, config: Object, handler: Function}}
 */
export const generateFeaturedImage = {
  name: "generate_featured_image",
  config: {
    title: "Generate featured image",
    description:
      "블로그 글의 대표 이미지를 Gemini 이미지 모델로 생성한다. " +
      "블로그 공통 시각 스타일(prompts/featured-image-style.txt)은 코드가 자동으로 앞에 붙이므로 " +
      "prompt 에는 이 글에만 해당하는 장면만 적는다. 배경색·조명·아이소메트릭 같은 스타일은 다시 적지 말 것. " +
      "pageId 와 caption 을 함께 주면 생성 직후 Notion 에 올리고 직전 후보는 지운다. " +
      "사람이 노션에서 보고 고르므로 올리기 전에 혼자 판단해 반려하지 말 것. " +
      "작업 순서와 검수 기준은 prompts/generate-featured-image.md 에 있다.",
    inputSchema: z.object({
      prompt: z
        .string()
        .min(1)
        .describe(
          "이 글에만 해당하는 장면 묘사. 영어로 쓴다. 공통 스타일은 자동으로 붙으므로 " +
            "무엇을 그릴지(사물·배치·연결·라벨)만 적는다. 금지 사항을 길게 나열하면 " +
            "모델이 그림 대신 텍스트로 답하므로, 없는 것을 적지 말고 있는 것을 묘사할 것"
        ),
      pageId: z
        .string()
        .optional()
        .describe("Notion 페이지 ID. 주면 생성 직후 올리고 직전 후보를 지운다"),
      caption: z
        .string()
        .optional()
        .describe(
          "이미지 캡션. Hugo 에서 alt 텍스트가 되므로 글 내용을 설명하는 한국어 문장으로 쓸 것. " +
            "pageId 를 줬다면 필수"
        ),
      mode: z
        .enum(["prepend", "replace_first", "append"])
        .optional()
        .describe(
          "prepend: 맨 위에 넣고 직전 후보를 지운다 (기본값) / " +
            "replace_first: 이미 대표 이미지가 있는 글에서 그 블록을 제자리 교체 / append: 맨 아래"
        ),
      name: z.string().optional().describe("저장 파일 이름 접두사. 보통 글 슬러그를 쓴다"),
      aspectRatio: z
        .enum(["16:9", "4:3", "1:1", "3:2", "21:9"])
        .optional()
        .describe("가로세로 비율. 대표 이미지는 16:9 (기본값)"),
      imageSize: z
        .enum(["1K", "2K", "4K"])
        .optional()
        .describe("해상도 등급. 기본 1K. 시안을 여러 장 볼 때는 1K 가 싸다"),
      model: z.string().optional().describe("사용할 Gemini 이미지 모델"),
      useStyle: z
        .boolean()
        .optional()
        .describe("공통 스타일을 붙일지 여부. 기본 true. 일부러 다른 결로 뽑을 때만 false"),
    }),
  },

  /**
   * @param {Object} args - 도구 입력
   * @returns {Promise<Object>} 생성 정보와 이미지를 담은 MCP 결과
   */
  async handler({ prompt, pageId, caption, mode, name, aspectRatio, imageSize, model, useStyle }) {
    try {
      if (pageId && !caption?.trim()) {
        throw new Error("pageId 를 주면 caption 도 필요하다 (Hugo 의 alt 텍스트가 된다)");
      }
      const service = createFeaturedImageService();
      const result = await service.generate({
        prompt,
        name,
        aspectRatio,
        imageSize,
        model,
        useStyle,
      });

      const lines = [
        `생성: ${result.model}`,
        `경로: ${result.filePath}`,
        `크기: ${(result.bytes / 1024).toFixed(0)} KB`,
      ];
      if (result.borderTrimmed) {
        lines.push("액자 테두리를 감지해 잘라냈다");
      }

      if (pageId) {
        const attached = await service.attachToNotion({
          pageId,
          filePath: result.filePath,
          caption,
          mode,
        });
        lines.push(
          `Notion 반영: ${pageId} (${attached.mode}${attached.replacedPrevious ? ", 직전 후보 교체" : ""})`,
          "사람이 노션에서 보고 고른다. 다시 뽑으려면 같은 pageId 로 한 번 더 호출하면 된다.",
          "확정 뒤에는 `node src/NotionCli.mjs database sync` 로 repo 에 내려받는다."
        );
      }

      return imageResult(lines.join("\n"), result.base64, result.mimeType);
    } catch (error) {
      return toolError(error);
    }
  },
};
