/**
 * 링크드인 액세스 토큰 발급 스크립트 (일회용)
 *
 * 링크드인은 액세스 토큰이 60일이라 만료되면 이 스크립트를 다시 돌려야 한다.
 * 리프레시 토큰이 같이 나오는 계정이면 LinkedInApiClient 가 자동으로 갱신하므로
 * 그때는 다시 돌릴 일이 없다 - 어느 쪽인지는 실제로 받아봐야 알 수 있어서,
 * 이 스크립트가 결과에 그 판정을 같이 찍는다.
 *
 * 사용법:
 *   node src/LinkedInAuthCli.mjs
 *
 * 출력된 URL 을 브라우저에서 열고 동의하면 로컬 서버가 콜백을 받아
 * .env 에 넣을 값을 찍어준다.
 */

import "dotenv/config";
import http from "node:http";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import { buildSession, writeSession, SESSION_FILE, SESSION_ENV } from "./utils/LinkedInSession.mjs";

const AUTHORIZE_URL = "https://www.linkedin.com/oauth/v2/authorization";
const TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const USERINFO_URL = "https://api.linkedin.com/v2/userinfo";

// openid/profile 은 내 person URN 을 얻는 용도, w_member_social 이 글을 올리는 권한이다.
// email 은 쓰지 않지만 Sign In with LinkedIn 제품이 기본으로 묶어 내보내므로 같이 요청한다.
const SCOPES = ["openid", "profile", "email", "w_member_social"];

// 링크드인 앱 Auth 탭에 등록한 값과 한 글자도 다르면 안 된다 (포트·경로·슬래시 포함).
const REDIRECT_URI = process.env.LINKEDIN_REDIRECT_URI || "http://localhost:3000/callback";

async function main() {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET are required in .env");
  }

  const state = crypto.randomBytes(16).toString("hex");
  const authorizeUrl = buildAuthorizeUrl(clientId, state);

  console.log("\n브라우저에서 아래 URL 을 열고 동의하세요:\n");
  console.log(authorizeUrl);
  console.log("\n콜백 대기 중... (Ctrl+C 로 취소)\n");

  const code = await waitForCallback(state);
  console.log("✅ 인증 코드 수신. 토큰으로 교환합니다.\n");

  const token = await exchangeCode(code, clientId, clientSecret);
  const personUrn = await fetchPersonUrn(token.access_token);

  const session = saveAndReport(token, personUrn);
  await syncGithubSecrets(session);
}

/**
 * 동의 화면 URL 을 만든다
 * @param {string} clientId - 링크드인 앱 Client ID
 * @param {string} state - CSRF 방지용 난수. 콜백에서 같은 값인지 확인한다
 * @returns {string} 브라우저로 열 URL
 */
function buildAuthorizeUrl(clientId, state) {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    state,
    scope: SCOPES.join(" "),
  });
  return `${AUTHORIZE_URL}?${params}`;
}

/**
 * 로컬 서버를 띄워 리다이렉트로 돌아오는 인증 코드를 받는다
 *
 * 코드를 콘솔에 복붙하는 방식보다 이쪽이 실수가 적다. 링크드인이 code 를
 * 쿼리스트링에 담아 REDIRECT_URI 로 보내므로 그 경로만 받으면 된다.
 *
 * @param {string} expectedState - buildAuthorizeUrl 에 넘긴 state
 * @returns {Promise<string>} 인증 코드
 */
function waitForCallback(expectedState) {
  const { port, pathname } = new URL(REDIRECT_URI);

  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, `http://localhost:${port}`);
      if (url.pathname !== pathname) {
        res.writeHead(404).end("Not found");
        return;
      }

      const error = url.searchParams.get("error");
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");

      // 브라우저에 결과를 먼저 그려주고 서버를 닫는다. 순서를 바꾸면
      // 소켓이 끊겨서 사용자는 빈 화면만 본다.
      const ok = !error && code && state === expectedState;
      res.writeHead(ok ? 200 : 400, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(ok ? "완료. 터미널로 돌아가세요." : `실패: ${error || "invalid code/state"}`);
      server.close();

      if (error) return reject(new Error(`LinkedIn authorization failed: ${error}`));
      if (!code) return reject(new Error("LinkedIn callback had no authorization code"));
      if (state !== expectedState) return reject(new Error("state mismatch (CSRF check failed)"));
      resolve(code);
    });

    server.on("error", reject);
    server.listen(Number(port));
  });
}

/**
 * 인증 코드를 액세스 토큰으로 교환
 * @param {string} code - waitForCallback 이 받은 인증 코드
 * @param {string} clientId - 링크드인 앱 Client ID
 * @param {string} clientSecret - 링크드인 앱 Client Secret
 * @returns {Promise<Object>} 토큰 응답 (access_token, expires_in, scope, refresh_token?)
 */
async function exchangeCode(code, clientId, clientSecret) {
  // 이 엔드포인트는 JSON 이 아니라 form-urlencoded 를 받는다.
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: REDIRECT_URI,
    }),
  });

  const body = await res.text();
  if (!res.ok) {
    throw new Error(`Token exchange failed: ${res.status} ${body.slice(0, 500)}`);
  }
  return JSON.parse(body);
}

/**
 * 토큰으로 내 person URN 을 조회
 *
 * 글을 올릴 때 author 로 쓰는 값이다. 예전 /v2/me 는 폐기됐고 지금은
 * OpenID Connect 의 userinfo 가 돌려주는 sub 를 쓴다.
 *
 * @param {string} accessToken - 액세스 토큰
 * @returns {Promise<string>} urn:li:person:xxxx 형태의 식별자
 */
async function fetchPersonUrn(accessToken) {
  const res = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const body = await res.text();
  if (!res.ok) {
    throw new Error(`userinfo failed: ${res.status} ${body.slice(0, 500)}`);
  }

  const { sub, name } = JSON.parse(body);
  if (!sub) throw new Error(`userinfo had no sub: ${body.slice(0, 300)}`);
  console.log(`인증된 계정: ${name || "(이름 없음)"}\n`);
  return `urn:li:person:${sub}`;
}

/**
 * 발급받은 값을 세션 파일에 저장하고 상태를 출력
 *
 * 값을 찍어서 사람이 .env 로 옮기게 하지 않는다. 옮기는 과정에서 글자가 하나
 * 더 붙어 인증이 통째로 막힌 적이 있고, 옮긴 뒤 .env.enc 재생성까지 따라붙는다.
 * 토큰과 URN 은 인증하면서 생기는 파생값이라 도구가 직접 들고 있는 게 맞다.
 *
 * @param {Object} token - exchangeCode 응답
 * @param {string} personUrn - fetchPersonUrn 결과
 */
function saveAndReport(token, personUrn) {
  const session = buildSession(token, personUrn);
  writeSession(session);

  console.log("─".repeat(60));
  console.log(`✅ ${SESSION_FILE} 에 저장했습니다.\n`);
  console.log(`  person URN : ${session.personUrn}`);
  console.log(`  스코프      : ${session.scope || "(응답에 없음)"}`);
  console.log(`  만료        : ${session.expiresAt} (${Math.round(token.expires_in / 86400)}일)`);
  console.log("─".repeat(60));

  if (session.refreshToken) {
    const days = Math.round((token.refresh_token_expires_in || 0) / 86400);
    console.log(`\n✅ 리프레시 토큰이 발급됐습니다 (${days}일). 이제 자동 갱신됩니다.`);
  } else {
    console.log("\n⚠️  리프레시 토큰이 없습니다. 만료되면 이 명령을 다시 돌리세요.");
  }

  if (!String(session.scope).includes("w_member_social")) {
    console.log("\n❌ w_member_social 이 스코프에 없습니다. 앱의 Products 탭에서");
    console.log("   'Share on LinkedIn' 이 활성화됐는지 확인하세요.");
  }

  // 이 파일은 추적하지 않는다. CI 는 GitHub Secrets 로 env 를 받아 쓴다.
  console.log(`\n${SESSION_FILE} 은 커밋되지 않습니다. .env 를 고치지 않았으니`);
  console.log(".env.enc 도 다시 만들 필요가 없습니다.");

  return session;
}

/**
 * 새 토큰을 GitHub Secrets 에도 밀어넣는다
 *
 * 로컬 세션 파일만 갱신하면 CI 는 옛 토큰을 계속 쓴다. 그 상태는 노션 버튼을
 * 누르기 전까지 드러나지 않으므로 여기서 같이 맞춘다.
 *
 * 값은 stdin 으로 넘긴다. 인자로 주면 ps 에 토큰이 그대로 보인다.
 *
 * @param {Object} session - 저장된 세션
 * @returns {Promise<void>}
 */
async function syncGithubSecrets(session) {
  if (!(await hasGh())) {
    console.log("\ngh 를 못 찾았거나 로그인돼 있지 않습니다. GitHub Secrets 는 건너뜁니다.");
    console.log(`CI 에서 쓰려면 ${SESSION_FILE} 내용을 ${SESSION_ENV} 시크릿에 그대로 넣으세요.`);
    return;
  }

  // 세션 파일 내용을 통째로 넣는다. 필드별로 쪼개면 필드를 늘릴 때마다 시크릿이 늘고
  // CI 와 로컬이 서로 다른 모양을 보게 된다.
  console.log(`\nGitHub Secrets(${SESSION_ENV}) 갱신 중...`);
  try {
    await runGh(["secret", "set", SESSION_ENV], JSON.stringify(session));
    console.log(`  ✅ ${SESSION_ENV}`);
  } catch (err) {
    console.log(`  ❌ ${SESSION_ENV} - ${err.message}`);
  }
}

/**
 * gh 가 있고 로그인돼 있는지 확인
 * @returns {Promise<boolean>}
 */
async function hasGh() {
  try {
    await runGh(["auth", "status"]);
    return true;
  } catch {
    return false;
  }
}

/**
 * gh 를 실행한다. 출력은 삼킨다 - 토큰이 섞여 나올 수 있다
 * @param {string[]} args - gh 인자
 * @param {string} [stdin] - 표준입력으로 넘길 값
 * @returns {Promise<void>}
 */
function runGh(args, stdin) {
  return new Promise((resolve, reject) => {
    const p = spawn("gh", args, { stdio: ["pipe", "ignore", "pipe"] });
    let stderr = "";
    p.stderr.on("data", (c) => (stderr += c));
    p.on("error", () => reject(new Error("gh 실행 실패")));
    p.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(stderr.trim().split("\n")[0] || `exit ${code}`))
    );
    if (stdin !== undefined) p.stdin.write(stdin);
    p.stdin.end();
  });
}

main().catch((err) => {
  console.error(`\n❌ ${err.message}`);
  process.exit(1);
});
