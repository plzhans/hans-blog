import fsp from "node:fs/promises";

/** 디렉터리가 없으면 재귀적으로 생성 */
export async function ensureDir(p) {
  await fsp.mkdir(p, { recursive: true });
}
