import {writeFile} from "fs/promises";

/** URL에서 파일을 다운로드하여 로컬 경로에 저장 */
export async function downloadToFile(url, filepath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download: ${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(filepath, buf);
}
