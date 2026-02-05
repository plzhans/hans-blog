/**
 * 문자열을 URL-safe slug로 변환 (최대 80자)
 * @param {string} s - 변환할 문자열
 * @returns {string} slug 문자열 (없으면 "untitled")
 */
export function slugify(s) {
  return (s || "untitled")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}
