---
id: "126"
translationKey: "126"
slug: "126-cloudflare-workers-wrangler-dev-deploy"
title: "wrangler 사용법 - Cloudflare Workers 로컬 개발과 배포"
description: "wrangler 설치와 타입 설정, wrangler dev 로 workerd 를 띄우는 법, 그리고 배포. wrangler dev 가 프론트 개발 서버가 아니라는 점부터."
categories:
  - "web"
tags:
  - "build"
  - "cloudflare"
  - "workers"
date: 2026-09-11T13:01:00.000Z
lastmod: 2026-09-11T13:01:00.000Z
toc: true
draft: false
images:
  - "assets/1_3d822a0f-7e83-81f6-b43f-ee90a3347422.png"
---


![로컬에서 돌린 워커 런타임이 그대로 엣지 플랫폼으로 올라가는 과정을 나타낸 대표 이미지](./assets/1_3d822a0f-7e83-81f6-b43f-ee90a3347422.png)


## 개요

> 이 글은 [Cloudflare Workers 정적 사이트 가이드 - 배포부터 SEO까지](../124-cloudflare-workers-static-site-guide/) 시리즈의 일부다.

Cloudflare Workers 를 다루는 일은 사실상 <strong>`wrangler` 를 다루는 일</strong>이다. 로컬에서 띄우는 것도, 배포하는 것도 같은 CLI 다.


그런데 이름 때문에 오해가 하나 생긴다. **`wrangler dev` 는 프론트 개발 서버가 아니다.** 필자도 처음에 여기서 한참 헤맸다.


### 이 글에서 다루는 것

- 무엇을 설치해야 하는지 — 그리고 <strong>런타임 의존성은 늘지 않는다</strong>는 것
- 워커 코드의 <strong>타입 설정을 분리</strong>해야 하는 이유
- `wrangler dev` 가 실제로 무엇을 하는지 · `vite dev` 와의 차이
- 왜 <strong>정적 사이트 빌드가 먼저</strong>여야 하는지
- 워커가 응답을 고쳤는지 확인하는 방법
- 배포 — 환경별 값 주입 · CI 에서 돌릴 때 주의할 것

### 다루지 않는 것


Workers Static Assets 의 구조와 요청 흐름은 [Cloudflare Workers 정적 사이트 호스팅 - 요청 흐름과 과금 기준](../125-cloudflare-workers-static-assets-routing-billing/)에 있다.


### 전제


Cloudflare 계정이 있고 정적 사이트를 빌드할 수 있다는 것(`npm run build` → `dist/`) 외에 필요한 사전 지식은 없다.


---


## wrangler 설치


Cloudflare 의 CLI 다. 로컬 실행과 배포를 모두 담당한다. 명령 목록은 [Commands 문서](https://developers.cloudflare.com/workers/wrangler/commands/)에 있다.


### 설치하지 않는 선택지


`wrangler` 는 **배포 도구지 애플리케이션 코드가 아니다.** 그래서 의존성에 넣지 않고 필요할 때만 내려받아 쓸 수 있다.


```bash
# As a devDependency
npm i -D wrangler
npx wrangler dev

# Or without installing - pin the major version
npx wrangler@4 dev
pnpm dlx wrangler@4 dev
```


후자의 장점은 **로컬과 CI 가 같은 버전을 쓰고**, 앱의 `package.json` 에 배포 도구가 안 들어간다는 것이다. 단점은 매번 내려받는 시간이 조금 든다는 것.


어느 쪽이든 **런타임 의존성은 늘지 않는다.** 워커는 Cloudflare 가 실행한다.


### 타입은 별도 패키지다


`Fetcher`·`HTMLRewriter`·`ExecutionContext`·`caches` 같은 Workers 전역은 타입 패키지에서 온다.


```bash
npm i -D @cloudflare/workers-types
```


**타입 설정을 분리해야 하는 이유**


**한 프로젝트 안에 실행 환경이 둘이라서 생기는 문제다.**


```plain text
src/                  브라우저에서 돈다       document 있음 · HTMLRewriter 없음
cloudflare/workers/   workerd 에서 돈다      document 없음 · HTMLRewriter 있음
```


쓸 수 있는 전역이 <strong>서로 반대</strong>인데, TypeScript 는 파일만 보고는 어느 쪽인지 알지 못한다. tsconfig 에 적어 준 것만 안다. 그래서 "어느 폴더가 어느 환경인지" 를 알려 줘야 하고, 그러려면 설정이 둘이어야 한다.

> 참고로 Workers 는 Node 가 아니다. `fs`·`process` 같은 Node API 도 없고 브라우저의 `document` 도 없는 제3의 런타임이다. 그래서 기존 Node 용 설정을 그대로 쓸 수도 없다.

설정이 하나뿐이면 대개 브라우저 기준이다. 그 설정으로 워커 코드까지 검사하면 아래 코드가 **컴파일을 통과한다.**


```typescript
export default {
  async fetch(request: Request): Promise<Response> {
    // There is no document in a Worker. This still type-checks.
    const el = document.getElementById('root');
    return new Response(el?.textContent ?? '');
  },
};
```


배포하면 `document is not defined` 로 죽는다. **타입 검사가 잡아 줬어야 할 것을 런타임까지 미룬 셈이다.**


반대 방향도 있다. `@cloudflare/workers-types` 를 넣지 않으면 `HTMLRewriter`·`ExecutionContext`·`caches` 가 전부 "이름을 찾을 수 없음" 이 된다.


**한 설정에 둘 다 욱여넣는 것도 답이 아니다.<strong> DOM 과 Workers 타입을 함께 넣으면 `Request`·`Response`·`caches` 처럼 </strong>양쪽에 같은 이름이 다른 모양으로 있는 것들**이 섞여 엉뚱한 타입이 잡힌다.


그래서 설정을 나누고 project reference 로 묶는다. 각 설정이 정하는 것은 셋이다.


|           | 정하는 것                                                             |
| --------- | ----------------------------------------------------------------- |
| `include` | 이 규칙을 **어느 폴더에** 적용할지                                             |
| `lib`     | 표준 환경에 뭐가 있다고 칠지 (`"DOM"` → `window`·`document`)                  |
| `types`   | 추가 전역 패키지 (`@cloudflare/workers-types` → `HTMLRewriter`·`caches`) |


```json
// tsconfig.worker.json
{
  "extends": "./tsconfig.node.json",
  "compilerOptions": {
    // No DOM. Workers globals instead.
    "types": ["@cloudflare/workers-types"]
  },
  "include": ["src/worker"]
}
```


```json
// tsconfig.json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.worker.json" }
  ]
}
```


---


## 로컬에서 띄우기 — 제일 헷갈리는 부분


### `wrangler dev` 는 프론트 개발 서버가 아니다


이름이 `dev` 라서 `vite dev` 같은 것으로 오해하기 쉬운데 하는 일이 전혀 다르다.


[`wrangler dev`](https://developers.cloudflare.com/workers/development-testing/) 는 **Cloudflare 엣지와 똑같은 런타임(`workerd`)을 로컬에 웹서버로 띄운다.** 실제 배포되면 Cloudflare 데이터센터에서 돌아갈 그 프로그램을 내 컴퓨터에서 그대로 돌리는 것이다. `HTMLRewriter`·`caches`·`env.ASSETS` 가 전부 프로덕션과 같은 구현이다.


즉 **"프로덕션의 축소판을 로컬에 세우는 것"** 이지 소스를 감시하며 변환해 주는 도구가 아니다.


|       | `vite dev`    | `wrangler dev`          |
| ----- | ------------- | ----------------------- |
| 무엇인가  | 프론트 **개발 서버<strong> | 프로덕션 </strong>런타임 복제본**        |
| 입력    | `src/` 소스     | **빌드 산출물(`dist/`)**     |
| 소스 변경 | HMR 로 즉시 반영   | 반영 안 됨 — **다시 빌드해야 한다** |
| 워커    | 존재하지 않음       | 돈다                      |


### 그래서 정적 사이트 빌드가 먼저다


`env.ASSETS` 는 **"배포된 정적 자산 더미"** 를 가리킨다. 그 더미가 없으면 워커가 꺼내 올 것이 없다.


로컬에서 그 더미를 어디서 읽을지 알려 주는 것이 `--assets` 다.


```bash
npx wrangler@4 dev --assets dist
#                            ^^^^ build output, not src/
```


순서는 항상 이렇다.


```bash
# 1. Build the static site first -> dist/
npm run build

# 2. Boot workerd with dist/ as its asset store
npx wrangler@4 dev --assets dist
```


```plain text
⛅️ wrangler 4.x
Ready on http://localhost:8787
```


**화면 코드를 고쳤으면 1번부터 다시 해야 한다.** `wrangler dev` 는 `dist/` 만 보고 있어서 `src/` 를 고쳐도 모른다. "분명히 고쳤는데 왜 그대로지?" 의 대부분이 이것이다.


스크립트로 묶어 두면 편하다.


```json
// package.json
{
  "scripts": {
    // cf- prefix: plain "worker" collides with Web Worker / Service Worker / worker_threads
    "preview:cf-worker": "npm run build && wrangler dev --assets dist"
  }
}
```


포트는 설정에 못 박을 수 있다.


```json
// wrangler.jsonc
{ "dev": { "port": 6173 } }
```


### 작업 흐름


두 서버를 다 띄워 놓고 쓰는 게 아니다.

- <strong>화면을 만드는 동안</strong>은 `vite dev`. 워커는 안 돈다.
- **워커를 건드렸을 때만** 빌드 후 `wrangler dev` 로 확인한다.

### 확인은 "원본 응답"으로 한다


워커가 응답을 고치는 코드라면 **렌더된 화면을 보면 안 된다.** 화면은 JS 가 만든 결과라 워커가 한 일과 브라우저가 한 일이 섞인다. 워커를 아예 안 태워도 화면은 똑같이 멀쩡해 보인다.


**브라우저 소스 보기**


```plain text
view-source:http://localhost:6173/products/1234
```


개발자도구의 **Elements 패널은 여기 쓸 수 없다** — 그건 현재 DOM 이라 이미 JS 가 실행된 뒤다.


**개발자도구 Network 탭** — 문서 요청을 고르고 Response 를 보면 받은 본문 그대로가 나온다. 응답 헤더까지 볼 수 있어 제일 정확하다.


**curl** — 원하는 것만 뽑거나 스크립트로 돌릴 때 편하다.


```bash
curl -s http://localhost:6173/products/1234 | head -20
curl -s -D - -o /dev/null http://localhost:6173/products/1234   # headers only
```


값이 안 바뀌었다면 <strong>워커를 안 탄 것</strong>이다. `run_worker_first` 에 그 경로가 들어 있는지 먼저 확인하자.


---


## 배포


로컬에서 확인됐으면 같은 CLI 로 올린다.


```bash
npx wrangler@4 deploy --assets dist
```


### 환경마다 달라지는 값


사이트 주소·API 주소·키처럼 환경에 따라 달라지는 값은 **설정 파일에 박지 말고 CLI 로 넘기는** 편이 낫다([환경변수 문서](https://developers.cloudflare.com/workers/configuration/environment-variables/)). 파일에 적으면 환경별로 갈리고 어긋나도 조용히 잘못 동작한다.


```bash
npx wrangler@4 deploy --assets dist \
  --name "prod-my-site" \
  --var SITE_URL:"https://example.com" \
  --var API_BASE_URL:"https://api.example.com"
```


CLI 값이 설정 파일을 이기므로 **같은 값을 두 군데 적어 둘 일이 없다.**


```typescript
export interface Env {
  ASSETS: Fetcher;
  SITE_URL: string;
  API_BASE_URL: string;
}
```


### 배포 이력 남기기


`--tag` 와 `--message` 는 Worker 버전에 붙는 라벨이다. 대시보드에서 "지금 떠 있는 게 어느 커밋인가"를 답하게 해 준다.


```bash
npx wrangler@4 deploy --assets dist \
  --tag "$GIT_SHA" \
  --message "ref: $GIT_BRANCH"
```


없으면 롤백할 때 눈으로 맞춰야 한다.


### CI 에서 돌릴 때


`wrangler` 는 배포 끝에 이것저것 물어본다(텔레메트리 동의 등). CI 에는 답할 사람이 없어 거기서 멈춘다.


```bash
CI=true WRANGLER_SEND_METRICS=false npx wrangler@4 deploy --assets dist
```


인증은 환경변수로 넘긴다. wrangler 가 이 이름을 직접 읽으므로 따로 export 할 필요가 없다.


```plain text
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
```


### 없는 Worker 에 배포하지 않기


`wrangler deploy --name X` 는 X 가 없으면 **만들고<strong>, 있으면 덮어쓴다. 편해 보이지만 </strong>이름을 잘못 준 배포가 조용히 "성공"** 한다. 엉뚱한 Worker 가 새로 생기고 정작 보고 있는 사이트는 안 바뀐다.


CI 라면 배포 전에 존재 확인을 한 번 하는 편이 안전하다. API 로 그 이름을 조회해서 **상태 코드만** 보면 된다.


```bash
# -o /dev/null  discard the body - we only want the status
# -w            print just the status code
code=$(curl -s -o /dev/null -w '%{http_code}' \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/scripts/$NAME")

case "$code" in
  2[0-9][0-9]) ;;                                  # exists - go ahead
  404) echo "no such Worker: $NAME" >&2; exit 1 ;; # typo, or first-ever deploy
  401|403) echo "token lacks Workers permission" >&2; exit 1 ;;
  *) echo "check failed (HTTP $code)" >&2; exit 1 ;;
esac
```


**2xx 를 통째로 받아야 한다.** 이 엔드포인트는 스크립트 본문을 돌려주는데, 정적 자산만 담은 Worker 는 본문이 비어서 **204** 가 온다. `200` 만 확인하면 두 번째 배포부터 전부 막힌다.


그리고 **"없음"(404)과 "권한 없음"(401·403)을 반드시 갈라야 한다.** 둘을 뭉뚱그리면 토큰 권한이 모자란 상황에서 "처음 만드는 거니 생성을 허용하라" 는 엉뚱한 안내를 하게 되고, 그 말을 따르면 배포가 인증에서 다시 죽는다.


---


## 정리

- 런타임 의존성은 **늘지 않는다.** 워커는 Cloudflare 가 실행한다. 개발용으로 `@cloudflare/workers-types` 와 `wrangler` 만 있으면 된다.
- `wrangler` 는 **설치하지 않고** `npx wrangler@4` 로 쓸 수도 있다. 버전을 못 박으면 로컬과 CI 가 같은 것을 쓴다.
- 워커 코드는 <strong>타입 설정을 분리</strong>한다. 한 tsconfig 로 검사하면 워커에서 `document` 를 써도 통과하고, 배포 후에야 깨진다.
- <strong>`wrangler dev` 는 프로덕션 런타임의 로컬 복제본</strong>이지 프론트 개발 서버가 아니다. `dist/` 를 먼저 빌드해야 하고, 화면 코드를 고쳤으면 다시 빌드해야 한다.
- 워커가 응답을 고쳤는지는 <strong>원본 응답</strong>으로 확인한다. 렌더된 화면이나 DevTools Elements 패널로는 구분이 안 된다.
- 환경별 값은 **CLI `--var`** 로 넘긴다. 설정 파일에 박으면 같은 값이 두 군데 생기고 환경별로 갈린다.
- 없는 Worker 에 배포하면 <strong>조용히 성공</strong>한다. CI 라면 존재 확인을 한 번 하자.

### 참고

- [Local development](https://developers.cloudflare.com/workers/development-testing/) — `wrangler dev`
- [Wrangler commands](https://developers.cloudflare.com/workers/wrangler/commands/)
- [Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)
- [Environment variables](https://developers.cloudflare.com/workers/configuration/environment-variables/) — `--var`
- [Cloudflare Workers 정적 사이트 호스팅 - 요청 흐름과 과금 기준](../125-cloudflare-workers-static-assets-routing-billing/)
