import fsp from "node:fs/promises";

/**
 * 디렉터리가 없으면 재귀적으로 생성
 * @param {string} p - 생성할 디렉토리 경로
 * @returns {Promise<void>}
 */
export async function ensureDir(p) {
  await fsp.mkdir(p, { recursive: true });
}
