/**
 * Gemini 이미지 생성 API 클라이언트
 *
 * SVG 를 손으로 그리는 대신 이미지 모델에 직접 프롬프트를 보내 PNG 를 받는다.
 * 엔드포인트는 Gemini 의 interactions API 를 쓴다.
 */

const DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_MODEL = "gemini-3.1-flash-image";

export class GeminiImageClient {
  /**
   * @param {string} apiKey - Gemini API 키 (GEMINI_API_KEY)
   * @param {Object} [options]
   * @param {string} [options.model] - 기본 모델 이름
   * @param {string} [options.baseUrl] - API base URL
   */
  constructor(apiKey, { model = DEFAULT_MODEL, baseUrl = DEFAULT_BASE_URL } = {}) {
    // 키 검증은 generateImage 에서 한다. 생성자에서 던지면 이미지를 만들지 않는
    // 도구까지 이 클라이언트를 조립하다 같이 죽는다.
    this.apiKey = apiKey;
    this.model = model;
    this.baseUrl = baseUrl;
  }

  /**
   * 프롬프트로 이미지를 생성
   * @param {Object} params
   * @param {string} params.prompt - 이미지 생성 프롬프트
   * @param {string} [params.aspectRatio="16:9"] - 가로세로 비율
   * @param {string} [params.imageSize="2K"] - 해상도 등급 (1K/2K/4K)
   * @param {string} [params.model] - 이 호출에만 쓸 모델 이름
   * @param {string} [params.mimeType="image/jpeg"] - 출력 MIME 타입.
   *   interactions 엔드포인트는 현재 image/jpeg 만 받는다
   * @returns {Promise<{data: Buffer, mimeType: string, model: string}>}
   * @throws {Error} HTTP 응답이 실패했거나 응답에 이미지가 없는 경우
   */
  async generateImage({
    prompt,
    aspectRatio = "16:9",
    imageSize = "2K",
    model = this.model,
    mimeType = "image/jpeg",
  }) {
    if (!this.apiKey) {
      throw new Error("GEMINI_API_KEY is required");
    }
    if (!prompt?.trim()) {
      throw new Error("prompt is required");
    }

    const res = await fetch(`${this.baseUrl}/interactions`, {
      method: "POST",
      headers: {
        "x-goog-api-key": this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: [{ type: "text", text: prompt }],
        response_format: {
          type: "image",
          mime_type: mimeType,
          aspect_ratio: aspectRatio,
          image_size: imageSize,
        },
      }),
    });

    const body = await res.text();
    if (!res.ok) {
      throw new Error(`Gemini image generation failed: ${res.status} ${body.slice(0, 500)}`);
    }

    let json;
    try {
      json = JSON.parse(body);
    } catch {
      throw new Error(`Gemini returned non-JSON response: ${body.slice(0, 500)}`);
    }

    const image = findImagePart(json);
    if (!image) {
      // 모델이 이미지 대신 텍스트로 답하는 경우가 있다. 응답 본문 앞부분을 찍으면 id·status 만
      // 보여서 원인을 알 수 없으므로, 모델이 실제로 한 말을 뽑아서 보여준다.
      const said = collectText(json).trim();
      throw new Error(
        said
          ? `Gemini returned text instead of an image: ${said.slice(0, 600)}`
          : `Gemini response contained no image: ${body.slice(0, 300)}`
      );
    }

    return { data: Buffer.from(image.data, "base64"), mimeType: image.mimeType ?? mimeType, model };
  }
}

/**
 * 응답 트리를 훑어 base64 이미지 조각을 찾는다.
 *
 * interactions API 는 이미지를 steps[].content[] 아래에 중첩해 돌려주고,
 * 구형 generateContent 는 candidates[].content.parts[].inlineData 에 둔다.
 * 응답 모양에 맞춰 경로를 하드코딩하는 대신 두 형태를 모두 받는다.
 *
 * @param {unknown} node - 탐색할 JSON 노드
 * @returns {{data: string, mimeType?: string}|null} 찾은 이미지 또는 null
 */
function findImagePart(node) {
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findImagePart(item);
      if (found) return found;
    }
    return null;
  }
  if (!node || typeof node !== "object") return null;

  const inline = node.inlineData ?? node.inline_data;
  if (inline?.data) {
    return { data: inline.data, mimeType: inline.mimeType ?? inline.mime_type };
  }
  if (node.type === "image" && typeof node.data === "string") {
    return { data: node.data, mimeType: node.mimeType ?? node.mime_type };
  }

  for (const value of Object.values(node)) {
    const found = findImagePart(value);
    if (found) return found;
  }
  return null;
}

/**
 * 응답 트리에서 모델이 낸 텍스트를 모은다
 *
 * 이미지가 없을 때 이유를 보여주는 용도다. thought 단계의 signature 처럼 사람이 읽을 수 없는
 * 거대한 문자열은 건너뛴다.
 *
 * @param {unknown} node - 탐색할 JSON 노드
 * @returns {string} 모아진 텍스트
 */
function collectText(node) {
  if (Array.isArray(node)) return node.map(collectText).join("");
  if (!node || typeof node !== "object") return "";
  let out = "";
  if (node.type === "text" && typeof node.text === "string") out += node.text + " ";
  else if (typeof node.text === "string" && node.text.length < 2000) out += node.text + " ";
  for (const [key, value] of Object.entries(node)) {
    if (key === "signature" || key === "data" || key === "text") continue;
    out += collectText(value);
  }
  return out;
}
