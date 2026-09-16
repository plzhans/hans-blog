/**
 * MCP 도구 결과 헬퍼
 *
 * 도구마다 content 배열을 직접 조립하면 모양이 조금씩 어긋난다. 여기로 모은다.
 */

/**
 * 텍스트 한 덩어리를 담은 성공 결과를 만든다
 * @param {string} text - 도구가 돌려줄 텍스트
 * @returns {Object} MCP 도구 결과
 */
export function textResult(text) {
  return { content: [{ type: "text", text }] };
}

/**
 * 텍스트와 이미지를 함께 담은 성공 결과를 만든다
 * @param {string} text - 이미지에 대한 설명 (경로, 모델, 크기 등)
 * @param {string} base64 - base64 로 인코딩된 이미지 내용
 * @param {string} mimeType - 이미지 MIME 타입
 * @returns {Object} MCP 도구 결과
 */
export function imageResult(text, base64, mimeType) {
  return {
    content: [
      { type: "text", text },
      { type: "image", data: base64, mimeType },
    ],
  };
}

/**
 * 도구 실행 중 난 예외를 MCP 오류 결과로 변환
 *
 * 예외를 그대로 던지면 MCP 프로토콜 오류가 되어 모델이 사유를 못 읽는다.
 * isError 결과로 내려보내 모델이 보고 고칠 수 있게 한다.
 *
 * @param {Error} error - 발생한 예외
 * @returns {Object} isError 가 설정된 MCP 도구 결과
 */
export function toolError(error) {
  return { isError: true, content: [{ type: "text", text: error.message }] };
}
