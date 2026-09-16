/**
 * 링크드인 API 클라이언트
 *
 * 공식 JS 클라이언트(linkedin-api-client)가 있지만 2023년 이후 방치된 0.3.0 베타라
 * 쓰지 않는다. 우리가 부르는 엔드포인트는 userinfo 와 posts 둘뿐이고,
 * 무엇보다 LinkedIn-Version 헤더는 남이 정한 기본값이 아니라 우리가 쥐고 있어야 한다.
 * GeminiImageClient 가 구글 SDK 없이 fetch 로 REST 를 직접 부르는 것과 같은 이유다.
 */

const DEFAULT_BASE_URL = "https://api.linkedin.com";
const TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";

// 링크드인 버전 헤더(YYYYMM). 빠뜨리면 요청이 거부되고, 기본값이 적용되지도 않는다.
// 각 버전은 최소 1년 지원되므로 1년에 한 번은 올려야 한다.
// 배포가 "deprecated version" 으로 실패하면 이 값을 최신 릴리스로 올릴 것.
const DEFAULT_API_VERSION = "202609";

// little Text 형식의 예약 문자. 이스케이프하지 않으면 그 문자부터 뒤가 통째로
// 조용히 잘린다 - 특히 괄호가 그렇다. 에러가 아니라 성공 응답이 오고 본문만
// 날아가므로 반드시 여기서 막아야 한다.
const RESERVED_CHARS = /[\\|{}@\[\]()<>#*_~]/g;

// multiImage 는 최대 20장까지 받는다.
const MAX_IMAGES = 20;

export class LinkedInApiClient {
  /**
   * @param {Object} options
   * @param {string} [options.accessToken] - 액세스 토큰 (LINKEDIN_ACCESS_TOKEN)
   * @param {string} [options.refreshToken] - 리프레시 토큰. 있으면 매 호출마다
   *   액세스 토큰을 새로 발급받는다 (CI 에서 갱신한 토큰을 저장할 곳이 없기 때문)
   * @param {string} [options.clientId] - 리프레시에 필요
   * @param {string} [options.clientSecret] - 리프레시에 필요
   * @param {string} [options.personUrn] - 글쓴이 URN (urn:li:person:xxxx)
   * @param {string} [options.apiVersion] - LinkedIn-Version 헤더 값
   * @param {string} [options.baseUrl] - API base URL
   */
  constructor({
    accessToken,
    refreshToken,
    clientId,
    clientSecret,
    personUrn,
    apiVersion = DEFAULT_API_VERSION,
    baseUrl = DEFAULT_BASE_URL,
  } = {}) {
    // 자격 검증은 실제 호출 시점에 한다. 생성자에서 던지면 dry-run 처럼
    // 토큰이 필요 없는 경로까지 같이 죽는다.
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.personUrn = personUrn;
    this.apiVersion = apiVersion;
    this.baseUrl = baseUrl;
  }

  /**
   * 글을 게시
   * @param {Object} params
   * @param {string} params.commentary - 게시할 본문 (이스케이프 전 원문)
   * @param {string} [params.visibility="PUBLIC"] - PUBLIC | CONNECTIONS
   * @param {string} [params.feedDistribution="MAIN_FEED"] - MAIN_FEED | NONE.
   *   NONE 은 피드에 배포하지 않는다. 문서상 광고용 dark post 를 위한 값이라
   *   개인 글에서도 먹히는지는 확인된 바 없다 (테스트 게시에서만 쓴다)
   * @param {Array<{id: string, altText?: string}>} [params.images=[]] - 붙일 이미지.
   *   한 장이면 media, 두 장 이상이면 multiImage 로 나간다 (최대 20장).
   *   **이미지를 붙이면 링크 미리보기 카드는 안 붙는다** - content 는 한 자리다
   * @returns {Promise<{urn: string, url: string}>} 게시물 URN 과 사람이 볼 수 있는 URL
   * @throws {Error} 토큰이 없거나 API 응답이 실패한 경우
   */
  async createPost({
    commentary,
    visibility = "PUBLIC",
    feedDistribution = "MAIN_FEED",
    images = [],
  }) {
    if (!commentary?.trim()) {
      throw new Error("commentary is required");
    }
    const author = this.personUrn;
    if (!author) {
      throw new Error("LINKEDIN_PERSON_URN is required");
    }

    const token = await this.resolveAccessToken();
    const payload = {
      author,
      commentary: escapeLittleText(commentary),
      visibility,
      distribution: {
        feedDistribution,
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    };

    const content = buildImageContent(images);
    if (content) payload.content = content;

    const res = await fetch(`${this.baseUrl}/rest/posts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "LinkedIn-Version": this.apiVersion,
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(payload),
    });

    const body = await res.text();
    if (!res.ok) {
      throw new Error(`LinkedIn post failed: ${res.status} ${body.slice(0, 500)}`);
    }

    // 게시물 URN 은 본문이 아니라 x-restli-id 헤더로 온다.
    const urn = res.headers.get("x-restli-id");
    if (!urn) {
      throw new Error(`LinkedIn post succeeded but returned no id: ${body.slice(0, 300)}`);
    }
    return { urn, url: postUrlFromUrn(urn) };
  }

  /**
   * 이미지를 업로드하고 URN 을 받는다
   *
   * 두 단계다. initializeUpload 로 업로드 자리를 잡아 uploadUrl 과 URN 을 받고,
   * 그 URL 로 파일을 PUT 한다. URN 은 PUT 전에 이미 발급되므로 게시할 때 그대로 쓴다.
   *
   * w_member_social 은 쓰기 전용이라 업로드는 되지만 GET 으로 처리 상태를 조회할 수
   * 없다. 그래서 AVAILABLE 이 될 때까지 기다리지 않고 바로 게시한다.
   *
   * @param {Buffer} data - 이미지 바이트
   * @param {string} [contentType="image/png"] - MIME 타입 (JPG/GIF/PNG 만 지원)
   * @returns {Promise<string>} urn:li:image:xxxx
   * @throws {Error} 토큰이 없거나 업로드가 실패한 경우
   */
  async uploadImage(data, contentType = "image/png") {
    const owner = this.personUrn;
    if (!owner) {
      throw new Error("LINKEDIN_PERSON_URN is required");
    }
    const token = await this.resolveAccessToken();

    const initRes = await fetch(`${this.baseUrl}/rest/images?action=initializeUpload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "LinkedIn-Version": this.apiVersion,
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify({ initializeUploadRequest: { owner } }),
    });

    const initBody = await initRes.text();
    if (!initRes.ok) {
      throw new Error(`LinkedIn image init failed: ${initRes.status} ${initBody.slice(0, 500)}`);
    }

    const { value } = JSON.parse(initBody);
    if (!value?.uploadUrl || !value?.image) {
      throw new Error(`LinkedIn image init returned no upload URL: ${initBody.slice(0, 300)}`);
    }

    const putRes = await fetch(value.uploadUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": contentType,
      },
      body: data,
    });
    if (!putRes.ok) {
      const body = await putRes.text();
      throw new Error(`LinkedIn image upload failed: ${putRes.status} ${body.slice(0, 500)}`);
    }

    return value.image;
  }

  /**
   * 게시물을 삭제
   *
   * 테스트용이다. 링크드인은 생성 시 lifecycleState 를 PUBLISHED 만 받아서
   * 초안으로 올려볼 방법이 없다. 그래서 올렸다가 지우는 것이 유일한 실물 검증 경로다.
   * 삭제는 멱등이라 이미 지운 것을 또 지워도 204 가 온다.
   *
   * @param {string} urn - 게시물 URN (urn:li:share:123)
   * @returns {Promise<void>}
   */
  async deletePost(urn) {
    const token = await this.resolveAccessToken();
    // URL 에 들어가는 URN 은 콜론까지 인코딩해야 한다. 안 하면 404 가 온다.
    const res = await fetch(`${this.baseUrl}/rest/posts/${encodeURIComponent(urn)}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "LinkedIn-Version": this.apiVersion,
        "X-Restli-Protocol-Version": "2.0.0",
        "X-RestLi-Method": "DELETE",
      },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`LinkedIn post delete failed: ${res.status} ${body.slice(0, 500)}`);
    }
  }

  /**
   * 토큰으로 내 person URN 을 조회
   * @returns {Promise<string>} urn:li:person:xxxx
   */
  async fetchPersonUrn() {
    const token = await this.resolveAccessToken();
    const res = await fetch(`${this.baseUrl}/v2/userinfo`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.text();
    if (!res.ok) {
      throw new Error(`LinkedIn userinfo failed: ${res.status} ${body.slice(0, 500)}`);
    }
    const { sub } = JSON.parse(body);
    if (!sub) throw new Error(`LinkedIn userinfo had no sub: ${body.slice(0, 300)}`);
    return `urn:li:person:${sub}`;
  }

  /**
   * 이번 호출에 쓸 액세스 토큰을 확보
   *
   * 리프레시 토큰이 있으면 그때그때 새로 발급받는다. CI 는 발급받은 토큰을
   * 어디에도 저장할 수 없어서(잡이 끝나면 사라진다) 저장 없이 매번 새로 받는 편이
   * 만료 걱정이 없다. 리프레시 토큰은 1년짜리다.
   *
   * @returns {Promise<string>} 액세스 토큰
   */
  async resolveAccessToken() {
    if (!this.refreshToken) {
      if (!this.accessToken) {
        throw new Error("LINKEDIN_ACCESS_TOKEN or LINKEDIN_REFRESH_TOKEN is required");
      }
      return this.accessToken;
    }
    if (!this.clientId || !this.clientSecret) {
      throw new Error("LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET are required to refresh");
    }

    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: this.refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
    });

    const body = await res.text();
    if (!res.ok) {
      throw new Error(
        `LinkedIn token refresh failed: ${res.status} ${body.slice(0, 500)}\n` +
          "리프레시 토큰이 만료됐다면 node src/LinkedInAuthCli.mjs 를 다시 돌리세요."
      );
    }

    const json = JSON.parse(body);
    // 링크드인이 리프레시 토큰을 새 값으로 바꿔 돌려주는 경우가 있다. 저장해둔 값이
    // 낡으면 다음 실행이 통째로 실패하므로 조용히 넘기지 않고 알린다.
    if (json.refresh_token && json.refresh_token !== this.refreshToken) {
      console.warn("⚠️  새 리프레시 토큰이 발급됐습니다. LINKEDIN_REFRESH_TOKEN 을 갱신하세요.");
    }
    return json.access_token;
  }
}

/**
 * 이미지 목록을 게시물 content 필드로 조립
 *
 * 한 장은 media, 두 장 이상은 multiImage 다. 링크드인이 둘을 다른 타입으로 다뤄서
 * 한 장짜리를 multiImage 로 보내면 거부된다 (multiImage 는 최소 2장).
 *
 * @param {Array<{id: string, altText?: string}>} images - 업로드된 이미지 목록
 * @returns {Object|null} content 객체. 이미지가 없으면 null
 */
function buildImageContent(images) {
  if (!images?.length) return null;
  if (images.length > MAX_IMAGES) {
    throw new Error(`LinkedIn allows at most ${MAX_IMAGES} images (got ${images.length})`);
  }
  if (images.length === 1) {
    const [only] = images;
    return { media: { id: only.id, ...(only.altText ? { altText: only.altText } : {}) } };
  }
  return {
    multiImage: {
      images: images.map((img) => ({
        id: img.id,
        ...(img.altText ? { altText: img.altText } : {}),
      })),
    },
  };
}

/**
 * little Text 예약 문자를 백슬래시로 이스케이프
 *
 * 링크드인 Posts API 의 commentary 는 평문이 아니라 little Text 형식이다.
 * 예약 문자를 그대로 보내면 400 이 아니라 201 이 돌아오고 본문만 잘려나가서
 * 노션에는 성공으로 기록되는데 링크드인에는 반 토막이 올라가는 사고가 난다.
 *
 * 주의: # 도 예약 문자라 이스케이프되면 해시태그가 아니라 그냥 글자로 보인다.
 * 본문이 통째로 잘리는 것보다는 낫다는 판단이다.
 *
 * @param {string} text - 원문
 * @returns {string} 이스케이프된 문자열
 */
export function escapeLittleText(text) {
  return String(text).replace(RESERVED_CHARS, (ch) => `\\${ch}`);
}

/**
 * 게시물 URN 을 사람이 열 수 있는 URL 로 바꾼다
 * @param {string} urn - urn:li:share:123 또는 urn:li:ugcPost:123
 * @returns {string} 게시물 URL
 */
export function postUrlFromUrn(urn) {
  return `https://www.linkedin.com/feed/update/${urn}/`;
}
