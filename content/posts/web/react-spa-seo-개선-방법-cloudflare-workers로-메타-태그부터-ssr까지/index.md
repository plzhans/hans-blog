---
id: "128"
translationKey: "128"
slug: "128-react-spa-seo-cloudflare-workers-ssr"
title: "React SPA SEO 개선 방법 - Cloudflare Workers로 메타 태그부터 SSR까지"
description: "React SPA 를 정적 호스팅에 올리면 원본 HTML 이 빈 껍데기다. 서버를 새로 세우지 않고 Cloudflare Workers 만으로 단계적으로 개선한 과정."
categories:
  - "web"
tags:
  - "cloudflare"
  - "react"
  - "seo"
  - "ssr"
  - "workers"
date: 2026-09-11T13:01:00.000Z
lastmod: 2026-09-11T13:01:00.000Z
toc: true
draft: false
images:
  - "assets/1_3d822a0f-7e83-8126-8051-dfd669349a3e.png"
---


![비어 있던 HTML 이 엣지를 지나며 채워지고 크롤러가 그 결과를 읽는 흐름을 나타낸 대표 이미지](./assets/1_3d822a0f-7e83-8126-8051-dfd669349a3e.png)


## 개요

> 이 글은 [Cloudflare Workers 정적 사이트 가이드 - 배포부터 SEO까지](../124-cloudflare-workers-static-site-guide/) 시리즈의 일부다.

React 로 만든 SPA 를 정적 호스팅에 올려 두고 쓰는 경우가 많다. 배포가 단순하고 서버가 없으니 운영할 것도 없다. 비용도 거의 안 든다.


그런데 검색을 신경 쓰기 시작하면 곧 벽을 만난다. <strong>서버가 내보내는 원본 HTML 에 검색엔진이 읽을 것이 하나도 없기 때문</strong>이다.


이 글은 그 문제를 **백엔드 서버를 새로 세우지 않고** Cloudflare Workers 만으로 풀어 간 기록이다. 세 단계로 나눠 다룬다. 뒤로 갈수록 얻는 것이 크고 손이 많이 간다.


**0단계 — 아무것도 안 함.** 원본 HTML 이 빈 껍데기다. 대부분의 SPA 가 여기 있다.


**1단계 — Workers 로 메타를 채운다.** 제목·설명·OG·구조화 데이터가 응답 HTML 에 들어간다. 작업량이 적고 효과가 분명하다.


**2단계 — Workers 로 본문까지 그린다.** 실제 화면을 서버에서 렌더해 넣는다. 손이 가장 많이 가지만 크롤러가 읽을 내용이 생긴다.


### 이 글에서 다루는 것

- 구글이 JS 를 렌더링하는데도 왜 직접 넣는 편이 나은지
- Workers 로 `<head>` 를 채우는 방법과 그때의 함정
- `entry-client` / `entry-server` 분리와 `vite build --ssr`
- 서버가 받은 데이터를 브라우저로 넘겨 API 왕복을 늘리지 않는 방법
- 실제로 달라진 수치와 밟았던 함정들

### 다루지 않는 것

- **각 메타 항목을 무엇으로 채울지** — SEO 쪽 주제다. SEO 최적화 글 참고
- **wrangler 사용법·요청 흐름·배포** — [Cloudflare Workers 정적 사이트 호스팅 - 요청 흐름과 과금 기준](../125-cloudflare-workers-static-assets-routing-billing/) · [wrangler 사용법 - Cloudflare Workers 로컬 개발과 배포](../126-cloudflare-workers-wrangler-dev-deploy/)
- **엣지 캐시·Tiered Cache** — [Cloudflare Workers 캐시 설정 방법 - 엣지 캐시와 Tiered Cache](../127-cloudflare-workers-cache-tiered-cache/)

### 전제


Cloudflare 에 정적 사이트를 올려 본 적이 있고 `wrangler` 로 로컬에서 워커를 띄워 본 적이 있다고 가정한다. 처음이라면 위의 배포 글을 먼저 읽는 편이 낫다.


---


## 문제 — 원본 HTML 에 검색엔진이 읽을 내용이 없다


빌드된 SPA 의 HTML 을 그대로 받아 보자.


```bash
curl -s https://example.com/products/1234
```


```html
<!doctype html>
<html lang="ko">
  <head>
    <title>My Service</title>
    <meta name="description" content="A generic site description" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/assets/index-a1b2c3.js"></script>
  </body>
</html>
```


1.6KB 남짓의 껍데기다. 제품 이름도 가격도 설명도 없다. 전부 JS 가 실행되고 API 응답이 도착한 뒤에야 만들어진다.


**사람에게는 아무 문제가 없다.<strong> 브라우저가 JS 를 실행하니까. 문제는 </strong>읽는 쪽이 JS 를 실행하지 않을 때**다.

- 카카오톡·라인·X 의 링크 미리보기 봇
- JS 를 실행하지 않는 검색엔진 크롤러
- 각종 AI 크롤러

이들에게 이 페이지는 <strong>"My Service" 라는 제목의 빈 문서</strong>다. 수천 개 상세 페이지가 전부 같은 제목·같은 설명을 달고 있는 셈이기도 하다.


실제로 필자가 다룬 서비스에서는 상세 페이지 8만 개가 전부 동일한 `<title>` 이었고 `<div id="root">` 안은 <strong>0자</strong>였다.


---


## "구글은 렌더링해준다던데?"


맞다. 이건 사실이다.


구글 공식 문서는 Googlebot 이 **크롤링 → 렌더링 → 색인** 세 단계를 거치며 렌더링 단계에서 헤드리스 Chromium 으로 JS 를 실행한다고 명시한다. SPA 라고 색인이 안 되는 시대는 지났다.


그런데 같은 문서에 이런 문장들이 있다.

> Googlebot queues all pages with a `200` HTTP status code for rendering (...) the page may stay on this queue for **a few seconds, but it can take longer than that**.  
>   
> server-side or pre-rendering is still a great idea because it makes your website faster for users and crawlers, and **not all bots can run JavaScript**.

읽어 보면 세 가지다.

1. **구글은 실행한다** — 맞다
2. **렌더링은 큐에 들어간다** — 크롤 즉시가 아니라 자원이 날 때다. "몇 초일 수도 있고 더 걸릴 수도 있다"
3. **구글 문서 자신이 SSR/프리렌더를 권한다** — 이유로 "모든 봇이 JS 를 실행할 수 있는 건 아니다"를 든다

3번이 핵심이다. 검색 트래픽의 상대는 구글만이 아니고 **다른 봇들이 JS 를 실행하는지는 대부분 공개된 근거가 없다.**

> 한국이라면 네이버 Yeti 가 궁금할 텐데 필자는 Yeti 의 JS 실행 여부에 대한 **공식 문서를 찾지 못했다.** "실행하지 않는다"는 말이 널리 퍼져 있지만 근거를 확인하지 못했으므로 여기서는 단정하지 않는다. 확인된 사실만으로도 개선할 이유는 충분하다.

그리고 하나 더. 구글이 결국 읽어 준다 해도 **링크 미리보기 봇은 기다려 주지 않는다.** 공유한 링크에 제목이 안 붙는 건 색인과 별개의 손해다.


그래서 결론은 **"구글이 해 주니까 괜찮다"가 아니라 "HTML 에 직접 있는 편이 낫다"** 다.


---


## 1단계 — Workers 로 메타 태그 채우기


### 아이디어


본문을 전부 그리는 건 손이 많이 간다. 그런데 **제목·설명·OG·구조화 데이터만 채워도** 얻는 게 꽤 크다.

- 검색 결과에 뜨는 제목·설명이 페이지마다 달라진다
- 링크 미리보기가 제대로 붙는다
- JSON-LD 로 "이 페이지의 사실"을 구조화해서 넘길 수 있다 — 본문 없이도

그리고 이건 **정적 자산 앞에 얇은 층을 하나 두는 것만으로** 된다.


### 워커를 어디에 태울지 정한다


개요에서 말한 전제 중 이 단계에 직접 걸리는 것이 하나 있다. **기본 규칙은 "자산이 있으면 워커는 안 돈다"** 는 것이다([라우팅 문서](https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/)). `/` 처럼 `index.html` 이 실제로 존재하는 경로는 그냥 두면 워커를 안 탄다.


그래서 태울 경로를 지정해 준다.


```json
// wrangler.jsonc
{
  "main": "./cloudflare/workers/main.ts",
  "assets": {
    "binding": "ASSETS",
    "not_found_handling": "single-page-application",

    // HTML routes only. Never `true` - static asset requests are free,
    // but anything routed through the worker becomes billable.
    "run_worker_first": ["/", "/products/*"]
  }
}
```


워커는 자산을 **대신 주는 게 아니라 받아서 고쳐** 준다. `env.ASSETS.fetch(request)` 로 HTML 껍데기를 꺼내 와 가공한 뒤 내보내는 구조다.


### 워커 코드


```typescript
// cloudflare/workers/main.ts
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Only touch HTML. Everything else passes through untouched.
    const asset = await env.ASSETS.fetch(request);
    if (!asset.headers.get('content-type')?.includes('text/html')) return asset;

    const path = new URL(request.url).pathname;
    const meta = await metaFor(path, env, ctx);
    // On failure, ship the shell unchanged. A generic title beats a broken one.
    if (!meta) return asset;

    return new HTMLRewriter()
      .on('title', {
        element(e) {
          e.setInnerContent(meta.title);
        },
      })
      .on('meta[name="description"]', {
        element(e) {
          e.setAttribute('content', meta.description);
        },
      })
      .on('head', {
        element(e) {
          e.append(headTags(meta), { html: true });
        },
      })
      .transform(asset);
  },
} satisfies ExportedHandler<Env>;
```


[`HTMLRewriter`](https://developers.cloudflare.com/workers/runtime-apis/html-rewriter/) 는 <strong>Workers 내장 스트리밍 HTML 파서</strong>다. 문자열을 통째로 읽어 치환하는 게 아니라 응답이 흐르는 도중에 태그를 갈아 끼운다. 메모리도 지연도 거의 안 든다.


넣는 값이 사람이 쓴 텍스트라면 이스케이프를 빼먹지 말자. 상품명에 & 나 " 가 들어오면 속성이 깨지고, JSON-LD 값에 가 들어오면 브라우저가 거기서 스크립트를 끊는다.

> 잔 함정 하나. 핸들러는 `void` 를 돌려줘야 하는데 `HTMLRewriter` 의 메서드는 체이닝하라고 `Element` 를 반환한다. `element: (e) => e.setInnerContent(...)` 처럼 화살표 축약형으로 쓰면 타입이 안 맞는다. 블록 본문으로 쓰거나 `void` 를 붙여야 한다.

### 데이터는 API 에서 가져온다


제목에 상품 이름을 넣으려면 값을 알아야 한다. 워커에서 API 를 부른다.

> 이 글의 예제는 필자가 운영하는 [console.plzhans.com](https://console.plzhans.com/) 의 공개 API 를 쓴 코드를 일반화한 것이다. 아래 코드에 `X-Client-Id` 와 `Origin` 이 같이 등장하는 것도 그 때문이다 — 그 API 는 <strong>(클라이언트 ID, 등록된 Origin) 쌍</strong>으로 호출을 확인한다. 쓰는 API 에 따라 이 부분은 `Authorization` 헤더 하나로 끝나기도 한다.

```typescript
/**
 * env comes from `wrangler deploy --var`, e.g.
 *   API_BASE_URL  https://api.example.com
 *   SITE_URL      https://example.com
 *   CLIENT_ID     pub_1a2b3c
 */
interface Env {
  ASSETS: Fetcher;
  API_BASE_URL: string;
  SITE_URL: string;
  CLIENT_ID: string;
}

async function fetchProduct(id: string, env: Env, ctx: ExecutionContext) {
  // https://api.example.com/products/1234
  const url = `${env.API_BASE_URL}/products/${id}`;

  try {
    const res = await fetch(url, {
      headers: {
        // Not a browser, so Origin is not set automatically.
        // Needed if the API validates (client id, Origin) as a pair.
        Origin: env.SITE_URL,
        'X-Client-Id': env.CLIENT_ID,
      },
      // Give up rather than delay the page.
      signal: AbortSignal.timeout(1500),
      // Edge-cache it. Most requests never reach the API.
      cf: { cacheTtl: 3600, cacheEverything: true },
    });
    if (!res.ok) return null;
    return (await res.json()) as Product;
  } catch {
    return null; // timeout or network error - fall back to the shell
  }
}
```


여기서 중요한 설계 원칙이 둘 있다.


**① 실패해도 페이지는 떠야 한다.** 메타를 붙이는 건 부속 기능이다. API 가 죽었다고 사이트가 죽으면 안 된다. 그래서 모든 실패 경로가 "껍데기를 그대로 내보낸다" 로 수렴한다.


`cf` 옵션으로 엣지 캐시를 거는 방법은 [Request 문서](https://developers.cloudflare.com/workers/runtime-apis/request/)에 정리돼 있다.


**② 타임아웃을 둔다.** 사람이 기다리는 건 캐시 미스일 때뿐이고 그때도 첫 바이트만 늦는다. 그래도 상한은 있어야 한다.


### 무엇을 붙일 것인가


`headTags()` 가 만들어 내는 문자열이 곧 붙는 내용이다. 무엇을 넣을지는 서비스마다 다르지만 이 자리에서 값어치가 큰 것들은 대체로 이렇다.

- **`canonical`** · 다국어면 **`hreflang`**
- **OG** (`og:title` · `og:description` · `og:image` · `og:url`) 와 **`twitter:card`**
- **JSON-LD** 구조화 데이터

특히 `canonical` 과 `hreflang` 은 여기서 붙일 이유가 분명하다. <strong>화면에서 JS 로 넣으면 봇에게는 없는 것과 같기 때문</strong>이다. JSON-LD 는 **본문이 없어도** 검색엔진에 사실을 넘길 수 있어서 본문을 아직 못 그리는 1단계에서 특히 값어치가 크다.

> 각 항목을 무엇으로 채우는 게 좋은지는 SEO 쪽 주제라 여기서는 다루지 않는다. 이 글의 관심사는 **"그것을 어디서 어떻게 끼워 넣느냐"** 다. 항목별 작성법은 SEO 최적화 글에 따로 정리해 두었다.

### 1단계로 얻는 것과 못 얻는 것


|        |                                                  |
| ------ | ------------------------------------------------ |
| 얻는 것   | 페이지별 제목·설명, 링크 미리보기, canonical·hreflang, 구조화 데이터 |
| 못 얻는 것 | **본문.** `<div id="root">` 는 여전히 비어 있다            |


작업량 대비 효과가 크다. 여기까지만 해도 괜찮은 선택이다.


다만 크롤러가 읽을 <strong>내용</strong>이 없는 건 그대로다. 상세 페이지 본문과 <strong>페이지끼리 잇는 내부 링크</strong>가 없다. 후자가 생각보다 크다 — 크롤러 입장에서 모든 상세 페이지가 서로 연결이 없는 섬이 된다.


---


## 2단계 — 본문까지 서버에서 그리기


### 아이디어


브라우저가 하던 렌더링을 **워커가 대신** 해서 HTML 에 넣는다. React 컴포넌트를 그대로 실행하므로 마크업을 손으로 옮길 필요가 없다. 스타일이 바뀌면 서버 HTML 도 자동으로 따라온다.


핵심은 <strong>진입점을 둘로 가르는 것</strong>이다.


```plain text
src/
  app/
    routes.tsx       라우트 정의만. 여기서 라우터를 만들지 않는다
    Providers.tsx    공용 껍데기 (StrictMode · i18n · QueryClient)
  entry-client.tsx   브라우저용 — hydrate
  entry-server.tsx   서버용 — renderToReadableStream
```


### Before — 진입점 하나


```typescript
// src/main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from '@/app/App';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
```


```typescript
// src/app/App.tsx
const router = createBrowserRouter(routes);   // routes are defined in this same file

export default function App() {
  return <RouterProvider router={router} />;
}
```


이 코드가 서버에서 못 도는 지점이 셋이다.


| 코드                                | 이유                                    |
| --------------------------------- | ------------------------------------- |
| `document.getElementById('root')` | 서버에 `document` 가 없다                   |
| `createBrowserRouter(...)`        | `history` API 를 쓴다. 요청 URL 이라는 개념이 없다 |
| 모듈 최상위의 `new QueryClient()`       | 프로세스에 하나뿐이라 **요청끼리 데이터가 섞인다**         |


세 번째가 가장 위험하다. 브라우저에서는 탭 하나에 사용자 하나라 전역 캐시가 옳지만 서버는 같은 인스턴스가 동시에 여러 요청을 처리한다. A 상품 데이터가 B 상품 응답에 섞여 나간다.


### After ① 라우트 정의를 라우터 생성에서 떼어낸다


```typescript
// src/app/routes.tsx
import type { RouteObject } from 'react-router-dom';

export const routes: RouteObject[] = [
  {
    element: <Root />,
    children: [
      { index: true, element: <Home /> },
      { path: 'products/:id', element: <ProductDetail /> },
    ],
  },
];
```


**라우터를 여기서 만들지 않는 것이 요점이다.<strong> 브라우저는 `createBrowserRouter`, 서버는 [`createStaticHandler`](https://reactrouter.com/api/data-routers/createStaticHandler) 로 서로 다른 라우터를 만들지만 </strong>라우트 배열은 같아야 한다.** 다르면 서버가 그린 화면과 브라우저의 첫 렌더가 어긋나 hydration 이 깨진다.


### After ② Provider 껍데기를 공유한다


```typescript
// src/app/Providers.tsx
export function Providers({
  queryClient,
  children,
}: {
  queryClient: QueryClient;
  children: ReactNode;
}) {
  return (
    <StrictMode>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </StrictMode>
  );
}

/**
 * A factory, not a module-level constant.
 * The server creates one per request and throws it away.
 */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
  });
}
```


i18n 을 쓴다면 같은 이유로 **인스턴스를 주입받게** 해야 한다. 전역 i18n 의 언어를 바꾸면 동시에 처리 중인 다른 언어 요청이 그 값을 같이 본다.


### After ③ 브라우저 진입점


```typescript
// src/entry-client.tsx
import { createRoot, hydrateRoot } from 'react-dom/client';
import { hydrate, type DehydratedState } from '@tanstack/react-query';
import { Providers, createQueryClient } from '@/app/Providers';
import App from '@/app/App';

const queryClient = createQueryClient();

// Data the server rendered with. Absent on non-SSR routes and in dev.
const ssrState = (window as { __RQ_STATE__?: DehydratedState }).__RQ_STATE__;
if (ssrState) hydrate(queryClient, ssrState);

const container = document.getElementById('root')!;
const tree = (
  <Providers queryClient={queryClient}>
    <App />
  </Providers>
);

/*
  Adopt existing markup if there is any, otherwise render fresh.
  hydrateRoot attaches events without repainting - no flash.
  Hydrating an empty container makes React discard it and re-render everything.
*/
if (container.firstElementChild) {
  hydrateRoot(container, tree);
} else {
  createRoot(container).render(tree);
}
```


[`hydrateRoot`](https://react.dev/reference/react-dom/client/hydrateRoot) 는 기존 마크업을 다시 그리지 않고 이벤트만 붙인다. 반대로 빈 컨테이너에 hydrate 하면 React 가 불일치로 보고 통째로 다시 그린다. 한 진입점이 세 상황(SSR 된 경로 / 안 된 경로 / 개발 서버)을 다 감당해야 해서 여기서 가른다.


### After ④ 서버 진입점


여기가 핵심이다.


```typescript
// src/entry-server.tsx
import { renderToReadableStream } from 'react-dom/server';
import {
  createStaticHandler,
  createStaticRouter,
  StaticRouterProvider,
} from 'react-router-dom';
import { dehydrate, type QueryClient } from '@tanstack/react-query';
import { Providers, createQueryClient } from '@/app/Providers';
import { routes } from '@/app/routes';

export type RenderResult = { html: string; state: string };

export async function render(
  url: string,
  seed: (queryClient: QueryClient) => void,
): Promise<RenderResult> {
  const queryClient = createQueryClient();
  seed(queryClient);

  const handler = createStaticHandler(routes);
  const context = await handler.query(new Request(url));
  if (context instanceof Response) {
    throw new Error(`unexpected Response: ${context.status}`);
  }
  const router = createStaticRouter(handler.dataRoutes, context);

  const stream = await renderToReadableStream(
    <Providers queryClient={queryClient}>
      <StaticRouterProvider router={router} context={context} hydrate={false} />
    </Providers>,
  );

  // Wait for React.lazy routes to resolve.
  await stream.allReady;

  return {
    html: await new Response(stream).text(),
    state: JSON.stringify(dehydrate(queryClient)),
  };
}
```


**여기서 알아야 할 네 가지**


**①** [**`react-dom/server`<strong>](https://react.dev/reference/react-dom/server) </strong>는 React 에 이미 들어 있다.** 별도 설치가 없다. `react-dom` 패키지의 서브경로다. 새로 도입할 프레임워크도 플러그인도 없다.


Workers 같은 웹 표준 런타임에서는 [`renderToReadableStream`](https://react.dev/reference/react-dom/server/renderToReadableStream) 을 쓴다 — Node 의 `renderToPipeableStream` 이 아니다. 어느 판본이 잡히느냐는 뒤에 나오는 Vite 설정이 정한다.


**② `renderToString` 이 아니라 스트리밍 렌더러를 쓰는 이유.** 라우트를 `React.lazy` 로 지연 로드하고 있으면 `renderToString` 은 Suspense fallback(로딩 스피너)만 그리고 끝난다. 스트리밍 렌더러는 lazy 가 해결될 때까지 기다릴 수 있다.


다만 스트리밍으로 흘려보내는 게 목적이 아니다. 우리가 원하는 건 **크롤러가 한 번에 읽을 완성된 HTML** 이므로 `await stream.allReady` 로 전부 끝나기를 기다린 뒤 문자열로 받는다.


③ `hydrate={false}`. StaticRouterProvider 는 기본적으로 loader 데이터를 담은


**④ `dehydrate` 로 데이터를 함께 넘긴다.** — 다음 절에서 자세히.


### 빌드 — `vite build --ssr`


[**Vite 에 내장된 기능<strong>](https://vite.dev/guide/ssr)</strong>이다.** 플러그인이 필요 없다.


```json
// package.json
{
  "scripts": {
    "build": "vite build && vite build --ssr src/entry-server.tsx --outDir dist-server"
  }
}
```


같은 소스에서 산출물이 둘 나온다.


```plain text
dist/         브라우저 번들 — 기존 그대로
dist-server/  서버 번들 — entry-server.js 한 덩어리
```


Vite 설정에는 두 줄이 필요하다([SSR options](https://vite.dev/config/ssr-options)).


```typescript
// vite.config.ts
export default defineConfig(({ isSsrBuild }) => ({
  ssr: {
    // Workers have no node_modules. Bundle every dependency in.
    // The default externalizes them, which fails at runtime with
    // "Cannot find package 'react'".
    noExternal: true,
    // Web-standard runtime, not Node. This is also what makes
    // react-dom/server resolve to the ReadableStream build.
    target: 'webworker',
  },
  build: {
    // The client build already copied public/. The server bundle does not need it.
    copyPublicDir: !isSsrBuild,
  },
}));
```


`noExternal: true` 가 빠지면 배포한 뒤에 `Cannot find package 'react'` 로 죽는다. Workers 에는 `node_modules` 가 없기 때문이다.


빌드 시간은 **1.7초** 늘었다. 서버 번들 1.7MB 는 워커에만 올라가고 사용자에게 내려가지 않는다.


### 워커에 연결하기


1단계의 워커에 두 줄이 늘어난다.


@@PLACEHOLDER_3@@


### API 왕복을 늘리지 않는 것이 중요하다


서버가 데이터를 받아 화면을 그렸는데 브라우저가 뜨자마자 같은 API 를 또 부르면 **SSR 로 얻은 것을 네트워크로 도로 잃는다.**


해결은 `setQueryData` + `dehydrate` 조합이다([TanStack Query SSR 가이드](https://tanstack.com/query/latest/docs/framework/react/guides/ssr)).


```typescript
// server: seed the cache directly - no fetch
queryClient.setQueryData(getProductQueryKey(id), product);
```


```typescript
// browser: adopt that cache as-is
if (window.__RQ_STATE__) hydrate(queryClient, window.__RQ_STATE__);
```


주의할 점이 둘이다.


**쿼리 키가 양쪽에서 정확히 같아야 한다.** 한 글자라도 다르면 캐시를 못 맞고 브라우저가 조용히 다시 부른다. 오류가 나지 않아 알아채기 어렵다. 키를 만드는 함수를 양쪽이 같이 쓰는 게 안전하다.


**`staleTime` 이 없으면 마운트 직후 refetch 가 돈다.**


```typescript
useQuery({ ...options, staleTime: 60_000 });
```


이 둘을 맞추고 나니 필자의 경우 상세·홈 모두 <strong>브라우저의 추가 API 호출이 0건</strong>이 됐다. SSR 을 붙이면서 네트워크 왕복이 오히려 줄었다.


---


## 결과


같은 URL 을 `curl` 로 받은 것이다.


|                      | 0단계       | 1단계(메타)  | 2단계(프리렌더)  |
| -------------------- | --------- | -------- | ---------- |
| `<title>`            | 전 페이지 동일  | **페이지별** | 페이지별       |
| OG·canonical         | 없음(JS 로만) | **있음**   | 있음         |
| JSON-LD              | 없음        | **있음**   | 있음         |
| `<div id="root">` 본문 | 0자        | 0자       | **1,745자** |
| 내부 링크                | 0개        | 0개       | **6개**     |
| 브라우저 추가 API 호출       | 1건        | 1건       | **0건**     |


### 렌더가 CPU 10ms 안에 들어가나


2단계에서 가장 신경 쓰이는 부분이다. 무료 플랜은 요청당 CPU 10ms 이고, 여기서 **API 를 기다리는 시간은 안 잡힌다** — 한도에 걸리는 건 React 가 트리를 그리는 동안 실제로 쓴 CPU 뿐이다. 무엇이 포함되고 어떻게 재는지는 [Cloudflare Workers 정적 사이트 호스팅 - 요청 흐름과 과금 기준](../125-cloudflare-workers-static-assets-routing-billing/)에 정리해 두었다.


그래서 재야 할 것은 렌더 자체의 비용이다. 데이터를 미리 넘겨 두고(=네트워크 없이) 렌더만 반복해 봤다.


```plain text
cpu       wall
1회차   53.1ms    49.0ms    (콜드 스타트)
2회차    6.8ms     5.5ms
3회차    7.1ms     5.5ms
4회차   12.7ms     5.1ms
5회차   12.1ms     4.7ms
```


**이 숫자를 그대로 믿으면 안 된다.<strong> 4·5회차를 보면 벽시계로 5ms 걸린 작업의 CPU 가 12ms 다. Node 의 `process.cpuUsage()` 가 </strong>모든 스레드의 CPU 를 합산**하기 때문이다(GC 등). 이 워크로드에는 I/O 가 없으니 실제 렌더 비용은 오히려 `wall` 쪽(**3~5ms**)에 가깝다. 게다가 Node 와 `workerd` 는 런타임도 GC 압력도 다르다. 자릿수를 가늠하는 용도로만 쓸 값이다.


배포 후 서로 다른 페이지 12개를 연속 요청했을 때 CPU 초과 오류(1102)는 나지 않았다. 다만 <strong>페이지 복잡도에 따라 각자 확인해야 하는 값</strong>이다. 추측하지 말고 Workers Logs 에 찍히는 실제 CPU time 을 보는 편이 낫다.


엣지 캐시가 적중하면 API 왕복이 없어져 응답이 **9.8ms** 로 끝난다. 이건 벽시계 시간이고 그중 CPU 는 렌더 몫뿐이다.


### hydration 이 정말 맞는지 확인하기


"경고가 안 나오니 맞겠지"는 근거가 약하다. <strong>프로덕션 빌드의 React 는 불일치 경고를 제거</strong>하고 React 19 는 어긋난 노드를 조용히 넘기기도 한다. 실제로 서버 HTML 에 `<i>` 하나를 몰래 끼워 넣어 봤더니 콘솔에 아무것도 찍히지 않았다.


더 확실한 방법은 <strong>두 경로의 DOM 을 직접 대조</strong>하는 것이다.

1. 배포된 그대로 열어 `#root` 의 `innerHTML` 을 뜬다
2. 응답에서 서버가 넣은 마크업만 지워 **브라우저 혼자 그리게** 한 뒤 같은 것을 뜬다
3. 둘을 비교한다

필자의 경우 <strong>1,118 노드 대 1,118 노드로 구조가 완전히 일치</strong>했다. 차이는 `style="top:var(--x)"` 와 `style="top: var(--x);"` 처럼 브라우저가 CSSOM 을 거쳐 재직렬화한 표기뿐이었다.


---


## 밟았던 함정들


### 소스 보기가 한 줄로 나온다


React 서버 렌더러에는 들여쓰기 옵션이 **없다**. 설치된 `react-dom` 에서 `renderToReadableStream` 이 읽는 옵션을 전부 뽑아 봐도 포맷 관련 항목이 하나도 없고 development 번들과 production 번들의 옵션 목록이 같다 — 디버그용 스위치가 숨어 있는 것도 아니다.


이건 게으름이 아니라 <strong>그럴 수 없기 때문</strong>이다. 들여쓰기용 공백은 진짜 텍스트 노드가 되어 hydration 대조를 깨뜨리고 인라인 요소 사이의 공백은 실제로 한 칸으로 렌더된다.


읽고 싶으면 받는 쪽에서 펴면 된다.


```bash
curl -s https://example.com/page | npx prettier --parser html | less
```


### 모듈 최상위에서 브라우저 전역을 만지는 코드


이펙트(`useEffect`) 안에 있는 것은 서버에서 안 돌므로 안전하다. 문제는 <strong>모듈 스코프</strong>다. 서버 번들을 불러오는 순간 죽는다.


```bash
grep -rnE "^(const|let|export const) .*(window|document|navigator|localStorage)" src
```


### 스테이징이 프로덕션과 중복 문서가 된다


SSR 을 붙이면 <strong>스테이징이 프로덕션과 같은 내용을 가진 완전한 사이트</strong>가 된다. 전에는 본문이 없어 색인돼도 피해가 적었지만 이제는 서로 경쟁한다.


```typescript
// Anything but production is excluded. Missing value fails closed.
if (env.APP_ENV !== 'production') {
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
}
```


`robots.txt` 의 `Disallow` 로 막으면 안 된다. 크롤 자체가 일어나지 않아 `noindex` 를 읽을 기회가 없고 이미 색인된 URL 은 그대로 남는다. **크롤은 열고 색인만 막는다.**


### 캐시를 반드시 같이 설계한다


SSR 은 **요청마다 API 를 부르게 만든다.** 엣지 캐시를 안 걸면 원본 부하가 페이지뷰만큼 늘어난다. 1단계에서는 메타 하나 붙이자고 부르는 것이라 넘어갈 수 있었지만 2단계에서는 그럴 수 없다.


거는 방법과 함정(데이터센터마다 캐시가 따로라는 것, Tiered Cache, `cache.put()` 과의 충돌)은 [Cloudflare Workers 캐시 설정 방법 - 엣지 캐시와 Tiered Cache](../127-cloudflare-workers-cache-tiered-cache/)에 정리해 두었다.


---


## 어디까지 할 것인가


전부 프리렌더할 필요는 없다.


| 경로    | 단계               | 이유                             |
| ----- | ---------------- | ------------------------------ |
| 상세    | 2단계              | 크롤러가 읽을 내용이 있다. 페이지 수도 많다      |
| 홈     | 2단계              | 크롤러가 가장 먼저 오는 곳이고 내부 링크의 출발점이다 |
| 검색·목록 | 1단계              | 결과가 사용자 입력에 달렸다. 캐시도 안 맞는다     |
| 약관·정책 | 1단계 또는 `noindex` | 색인 대상이 아니다                     |


**1단계에서 멈춰도 된다.** 작업량 대비 효과가 크고 링크 미리보기와 검색 결과 제목은 그것만으로 해결된다.


2단계는 "크롤러가 읽을 본문이 실제로 있는 페이지"에만 값어치가 있다. 그리고 내부 링크 — 상세끼리 잇는 링크가 HTML 에 없으면 크롤러에게는 모든 페이지가 고립된 섬이라는 점은 한 번 확인해 볼 만하다.


---


## 정리

- **구글은 JS 를 렌더링한다.** 하지만 큐에 들어가고 구글 문서 자신이 "모든 봇이 실행할 수 있는 건 아니다"며 SSR 을 권한다.
- **1단계**: Workers + `HTMLRewriter` 로 메타·OG·JSON-LD 를 채운다. 작업량이 적고 효과가 분명하다.
- **2단계**: `entry-client` / `entry-server` 로 진입점을 갈라 본문까지 서버에서 그린다.
- `react-dom/server` 는 **React 에 이미 들어 있고**, `vite build --ssr` 은 **Vite 에 이미 들어 있다.** 새로 도입할 프레임워크가 없다.
- 서버가 받은 데이터를 `dehydrate` 로 넘기면 **API 왕복이 늘지 않는다.**
- **백엔드 서버를 세우지 않아도 된다.** 이미 Cloudflare 에 정적 사이트를 올리고 있다면 추가 인프라가 0 이고 무료 플랜으로 시작할 수 있다.

### 참고

- [Cloudflare Workers 정적 사이트 호스팅 - 요청 흐름과 과금 기준](../125-cloudflare-workers-static-assets-routing-billing/) — wrangler·로컬 실행·배포
- SEO 최적화 — 무엇을 채울 것인가 — canonical·OG·JSON-LD 항목별 작성법
- [JavaScript SEO Basics — Google Search Central](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)

**Cloudflare**

- [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/) · [SPA 라우팅](https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/)
- [HTMLRewriter](https://developers.cloudflare.com/workers/runtime-apis/html-rewriter/)
- [Request `cf` 옵션](https://developers.cloudflare.com/workers/runtime-apis/request/) — `cacheTtl` · `cacheEverything`
- [Cache API](https://developers.cloudflare.com/workers/runtime-apis/cache/) · [Tiered Cache](https://developers.cloudflare.com/cache/how-to/tiered-cache/)
- [Limits](https://developers.cloudflare.com/workers/platform/limits/) — CPU · 서브요청

**React · Vite · 라이브러리**

- [Server Rendering APIs](https://react.dev/reference/react-dom/server) · [`renderToReadableStream`](https://react.dev/reference/react-dom/server/renderToReadableStream) · [`hydrateRoot`](https://react.dev/reference/react-dom/client/hydrateRoot)
- [Vite SSR](https://vite.dev/guide/ssr) · [SSR options](https://vite.dev/config/ssr-options)
- [React Router `createStaticHandler`](https://reactrouter.com/api/data-routers/createStaticHandler)
- [TanStack Query SSR](https://tanstack.com/query/latest/docs/framework/react/guides/ssr)
