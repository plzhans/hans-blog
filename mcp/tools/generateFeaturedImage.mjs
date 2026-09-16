import { z } from "zod";
import { createFeaturedImageService } from "../serviceFactory.mjs";
import { imageResult, toolError } from "../toolResult.mjs";

/**
 * 대표 이미지 생성 도구
 *
 * 프롬프트를 이미지 모델에 보내 PNG 를 받는다. 저장 경로와 함께 이미지를 그대로
 * 돌려주므로 모델이 결과를 직접 보고 다시 생성할지 판단할 수 있다.
 *
 * @type {{name: string, config: Object, handler: Function}}
 */
export const generateFeaturedImage = {
  name: "generate_featured_image",
  config: {
    title: "Generate featured image",
    description:
      "블로그 글의 대표 이미지를 Gemini 이미지 모델로 생성해 로컬에 저장하고, 생성된 이미지를 그대로 돌려준다. " +
      "블로그 공통 시각 스타일(prompts/featured-image-style.txt)은 자동으로 앞에 붙으므로 " +
      "prompt 에는 이 글에만 해당하는 장면만 적는다. 배경색·조명·아이소메트릭 같은 스타일은 다시 적지 말 것. " +
      "작업 순서와 검수 기준은 prompts/generate-featured-image.md 를 따를 것. " +
      "결과 이미지를 확인한 뒤 attach_featured_image_to_notion 으로 Notion 에 올린다.",
    inputSchema: z.object({
      prompt: z
        .string()
        .min(1)
        .describe(
          "이 글에만 해당하는 장면 묘사. 영어로 쓴다. 공통 스타일은 자동으로 붙으므로 " +
            "무엇을 그릴지(사물·배치·연결·라벨)만 적는다"
        ),
      name: z.string().optional().describe("저장 파일 이름 접두사. 보통 글 슬러그를 쓴다"),
      aspectRatio: z
        .enum(["16:9", "4:3", "1:1", "3:2", "21:9"])
        .optional()
        .describe("가로세로 비율. 대표 이미지는 16:9 (기본값)"),
      imageSize: z.enum(["1K", "2K", "4K"]).optional().describe("해상도 등급. 기본 2K"),
      model: z
        .string()
        .optional()
        .describe("사용할 Gemini 이미지 모델. 기본 gemini-3.1-flash-image"),
      useStyle: z
        .boolean()
        .optional()
        .describe("공통 스타일 프롬프트를 붙일지 여부. 기본 true. 일부러 다른 결로 뽑을 때만 false"),
    }),
  },

  /**
   * @param {Object} args - 도구 입력
   * @returns {Promise<Object>} 생성 정보 텍스트와 이미지를 담은 MCP 결과
   */
  async handler({ prompt, name, aspectRatio, imageSize, model, useStyle }) {
    try {
      const result = await createFeaturedImageService().generate({
        prompt,
        name,
        aspectRatio,
        imageSize,
        model,
        useStyle,
      });
      return imageResult(
        `Generated with ${result.model}\n` +
          `path: ${result.filePath}\n` +
          `size: ${(result.bytes / 1024).toFixed(0)} KB`,
        result.base64,
        result.mimeType
      );
    } catch (error) {
      return toolError(error);
    }
  },
};
