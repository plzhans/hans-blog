/**
 * 링크드인 세션 파일 읽기/쓰기
 *
 * 액세스 토큰은 60일이면 죽는다. 리프레시 토큰은 승인받은 앱에만 나오는데 우리는 못 받았다.
 * 즉 이 값은 설정이 아니라 **주기적으로 갈리는 파생 상태**다. NOTION_API_TOKEN 처럼
 * 사람이 한 번 넣고 잊는 값과 성격이 다르다.
 *
 * .env 에 두면 갱신할 때마다 값을 복붙하고 .env.enc 까지 다시 만들어야 한다.
 * 복붙 한 번에 글자가 하나 더 붙어서 인증이 통째로 막힌 적도 있다.
 * 세션 파일로 빼면 인증 스크립트가 직접 써넣고 끝난다.
 *
 * 만료 시각도 같이 적어둔다. 덕분에 만료를 미리 경고할 수 있다 - 이게 없으면
 * 증상이 "게시 버튼을 눌렀는데 401" 로만 나타나서 원인을 짐작하기 어렵다.
 */

import fs from "node:fs";
import path from "node:path";

export const SESSION_FILE = ".linkedin-session.json";

// CI 에는 이 파일이 없다. 파일 내용을 통째로 담은 시크릿을 환경변수로 받아 같은 모양으로 쓴다.
// 필드별로 환경변수를 두면 필드를 늘릴 때마다 시크릿이 늘고 로컬과 CI 의 코드 경로가 갈린다.
export const SESSION_ENV = "LINKEDIN_SESSION";

// 만료가 이만큼 남았을 때부터 경고한다. 재인증은 브라우저를 열어야 해서
// 게시하려는 순간에 알게 되면 곤란하다.
const WARN_BEFORE_DAYS = 14;

/**
 * 세션을 읽는다. 파일이 없으면 환경변수를 본다
 *
 * 로컬은 파일, CI 는 환경변수(GitHub Secrets)다. 어느 쪽이든 같은 모양이 나오므로
 * 호출하는 쪽은 구분할 필요가 없다.
 *
 * @param {string} [file=SESSION_FILE] - 세션 파일 경로
 * @returns {Object|null} 세션 객체. 어느 쪽에서도 못 읽으면 null
 */
export function readSession(file = SESSION_FILE) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch {
    // 없는 것과 깨진 것을 굳이 나누지 않는다. 어느 쪽이든 다시 인증받아야 한다.
  }
  try {
    const raw = process.env[SESSION_ENV];
    return raw ? JSON.parse(raw) : null;
  } catch {
    throw new Error(`${SESSION_ENV} 값이 JSON 이 아닙니다. 시크릿을 다시 넣으세요.`);
  }
}

/**
 * 세션 파일을 쓴다
 *
 * 토큰이 든 파일이라 소유자만 읽을 수 있게 둔다.
 *
 * @param {Object} session - 저장할 세션
 * @param {string} [file=SESSION_FILE] - 세션 파일 경로
 */
export function writeSession(session, file = SESSION_FILE) {
  const dir = path.dirname(path.resolve(file));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(session, null, 2) + "\n", { mode: 0o600 });
  // 이미 있던 파일이면 writeFileSync 의 mode 가 무시되므로 따로 맞춘다.
  fs.chmodSync(file, 0o600);
}

/**
 * 토큰 응답과 URN 으로 세션 객체를 만든다
 * @param {Object} token - 토큰 엔드포인트 응답
 * @param {string} personUrn - urn:li:person:xxxx
 * @returns {Object} 저장할 세션
 */
export function buildSession(token, personUrn) {
  const now = Date.now();
  return {
    personUrn,
    accessToken: token.access_token,
    // 리프레시 토큰은 승인된 앱에만 나온다. 나오면 그때부터 자동 갱신이 된다.
    ...(token.refresh_token ? { refreshToken: token.refresh_token } : {}),
    scope: token.scope || "",
    obtainedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + (token.expires_in || 0) * 1000).toISOString(),
  };
}

/**
 * 세션 만료 상태를 본다
 * @param {Object|null} session - readSession 결과
 * @returns {{expired: boolean, days: number|null, warn: boolean}}
 */
export function checkExpiry(session) {
  if (!session?.expiresAt) return { expired: false, days: null, warn: false };
  const ms = new Date(session.expiresAt).getTime() - Date.now();
  const days = Math.floor(ms / 86400000);
  return { expired: ms <= 0, days, warn: ms > 0 && days <= WARN_BEFORE_DAYS };
}

/**
 * 만료가 가까우면 경고를, 이미 지났으면 에러를 던진다
 *
 * 리프레시 토큰이 있으면 자동 갱신되므로 아무 말도 하지 않는다.
 *
 * @param {Object|null} session - readSession 결과
 * @throws {Error} 토큰이 만료된 경우
 */
export function assertUsable(session) {
  if (!session || session.refreshToken) return;
  const { expired, days, warn } = checkExpiry(session);
  if (expired) {
    throw new Error(
      `링크드인 액세스 토큰이 만료됐습니다 (${session.expiresAt}). ` +
        `make linkedin-auth 를 다시 돌리세요.`
    );
  }
  if (warn) {
    console.warn(`⚠️  링크드인 토큰 만료까지 ${days}일 남았습니다. make linkedin-auth 로 갱신하세요.`);
  }
}
