import {writeFile} from "fs/promises";

/**
 * URL에서 파일을 다운로드하여 로컬 경로에 저장
 * @param {string} url - 다운로드할 URL
 * @param {string} filepath - 저장할 로컬 파일 경로
 * @returns {Promise<void>}
 * @throws {Error} HTTP 응답이 실패한 경우
 */
export async function downloadToFile(url, filepath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download: ${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(filepath, buf);
}
