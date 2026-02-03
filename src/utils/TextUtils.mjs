/** 문자열을 URL-safe slug로 변환 (최대 80자) */
export function slugify(s) {
  return (s || "untitled")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}
