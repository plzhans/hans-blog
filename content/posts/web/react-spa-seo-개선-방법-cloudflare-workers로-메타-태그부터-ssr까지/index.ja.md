---
id: "128"
translationKey: "128"
slug: "128-react-spa-seo-cloudflare-workers-ssr"
title: "React SPA SEO 改善方法 - Cloudflare WorkersでメタタグからSSRまで"
description: "React SPAを静的ホスティングに載せると、生のHTMLは空の殻です。サーバーを新しく立てず、Cloudflare Workersだけで段階的に改善した過程。"
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


![空だったHTMLがエッジを通りながら埋められ、クローラーがその結果を読む流れを表した代表画像](./assets/1_3d822a0f-7e83-8126-8051-dfd669349a3e.png)


## 概要

> この記事は [Cloudflare Workers 静的サイトガイド - デプロイからSEOまで](../124-cloudflare-workers-static-site-guide/) シリーズの一部です。

Reactで作ったSPAを静的ホスティングに載せて使うケースが多いです。デプロイが単純で、サーバーがないので運用するものもありません。コストもほとんどかかりません。


ところが検索を気にし始めると、すぐに壁にぶつかります。<strong>サーバーが返す生のHTMLに、検索エンジンが読むものが一つもないから</strong>です。


この記事は、その問題を**バックエンドサーバーを新しく立てずに**Cloudflare Workersだけで解いていった記録です。3つの段階に分けて扱います。後ろに行くほど得られるものが大きく、手間もかかります。


**0段階 — 何もしない。** 生のHTMLが空の殻です。ほとんどのSPAがここにいます。


**1段階 — Workersでメタを埋める。** タイトル・説明・OG・構造化データがレスポンスのHTMLに入ります。作業量が少なく効果が明確です。


**2段階 — Workersで本文まで描く。** 実際の画面をサーバーでレンダリングして入れます。最も手間がかかりますが、クローラーが読む内容ができます。


### この記事で扱うこと

- GoogleがJSをレンダリングするのに、なぜ自分で入れる方がよいのか
- Workersで `<head>` を埋める方法と、そのときの罠
- `entry-client` / `entry-server` の分離と `vite build --ssr`
- サーバーが受け取ったデータをブラウザに渡し、APIの往復を増やさない方法
- 実際に変わった数値と、踏んだ罠

### 扱わないこと

- **各メタ項目を何で埋めるか** — SEO側のテーマです。SEO最適化の記事を参照
- **wranglerの使い方・リクエストの流れ・デプロイ** — [Cloudflare Workers 静的サイトホスティング - リクエストの流れと課金基準](../125-cloudflare-workers-static-assets-routing-billing/) · [wrangler 使い方 - Cloudflare Workers のローカル開発とデプロイ](../126-cloudflare-workers-wrangler-dev-deploy/)
- **エッジキャッシュ・Tiered Cache** — [Cloudflare Workers キャッシュ設定方法 - エッジキャッシュとTiered Cache](../127-cloudflare-workers-cache-tiered-cache/)

### 前提


Cloudflareに静的サイトを載せたことがあり、`wrangler` でローカルにWorkerを立ち上げたことがあると仮定します。初めてなら、上のデプロイの記事を先に読む方がよいです。


---


## 問題 — 生のHTMLに検索エンジンが読む内容がない


ビルドされたSPAのHTMLをそのまま受け取ってみましょう。


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


1.6KBほどの殻です。商品名も価格も説明もありません。すべてJSが実行され、APIのレスポンスが届いた後にはじめて作られます。


**人には何の問題もありません。<strong>ブラウザがJSを実行するからです。問題は</strong>読む側がJSを実行しないとき**です。

- カカオトーク・LINE・Xのリンクプレビューボット
- JavaScriptを実行しない検索エンジンのクローラー
- 各種AIクローラー

彼らにとってこのページは<strong>「My Service」というタイトルの空の文書</strong>です。数千の詳細ページがすべて同じタイトル・同じ説明を付けているということでもあります。


実際に筆者が扱ったサービスでは、詳細ページ8万件がすべて同一の `<title>` で、`<div id="root">` の中は<strong>0文字</strong>でした。


---


## 「Googleはレンダリングしてくれるらしいけど？」


その通りです。これは事実です。


Googleの公式ドキュメントは、Googlebotが**クロール → レンダリング → インデックス**の3段階を経て、レンダリング段階でヘッドレスChromiumでJSを実行すると明記しています。SPAだからインデックスされない時代は終わりました。


ところが同じドキュメントにこんな文章があります。

> Googlebot queues all pages with a `200` HTTP status code for rendering (...) the page may stay on this queue for **a few seconds, but it can take longer than that**.  
>   
> server-side or pre-rendering is still a great idea because it makes your website faster for users and crawlers, and **not all bots can run JavaScript**.

読んでみると3つです。

1. **Googleは実行する** — その通り
2. **レンダリングはキューに入る** — クロール直後ではなく、リソースが空いたときです。「数秒かもしれないし、それより長くかかることもある」
3. **Googleのドキュメント自身がSSR/プリレンダーを勧める** — 理由として「すべてのボットがJavaScriptを実行できるわけではない」を挙げています

3番が核心です。検索トラフィックの相手はGoogleだけではなく、**他のボットがJavaScriptを実行するかについては、ほとんど公開された根拠がありません。**

> 韓国ならNaverのYetiが気になるところですが、筆者はYetiのJS実行有無についての**公式ドキュメントを見つけられませんでした。**「実行しない」という話が広く出回っていますが、根拠を確認できなかったのでここでは断定しません。確認された事実だけでも改善する理由は十分です。

そしてもう一つ。Googleが結局読んでくれるとしても、**リンクプレビューボットは待ってくれません。** 共有したリンクにタイトルが付かないのは、インデックスとは別の損失です。


なので結論は**「Googleがやってくれるから大丈夫」ではなく「HTMLに直接ある方がよい」**です。


---


## 1段階 — Workersでメタタグを埋める


### アイデア


本文をすべて描くのは手間がかかります。ところが**タイトル・説明・OG・構造化データだけ埋めても**得られるものがかなり大きいです。

- 検索結果に出るタイトル・説明がページごとに変わる
- リンクプレビューがきちんと付く
- JSON-LDで「このページの事実」を構造化して渡せる — 本文がなくても

そしてこれは**静的アセットの前に薄い層を一つ置くだけで**できます。


### Workerをどこに通すか決める


概要で述べた前提のうち、この段階に直接関わるものが一つあります。**基本ルールは「アセットがあればWorkerは動かない」**ということです（[ルーティングドキュメント](https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/)）。`/` のように `index.html` が実際に存在するパスは、そのままにしておくとWorkerを通りません。


そこで通すパスを指定します。


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


Workerはアセットを**代わりに返すのではなく、受け取って直して**くれます。`env.ASSETS.fetch(request)` でHTMLの殻を取り出し、加工してから送り出す構造です。


### Workerのコード


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


[`HTMLRewriter`](https://developers.cloudflare.com/workers/runtime-apis/html-rewriter/) は<strong>Workers内蔵のストリーミングHTMLパーサー</strong>です。文字列を丸ごと読んで置換するのではなく、レスポンスが流れている途中でタグを差し替えます。メモリも遅延もほとんどかかりません。


入れる値が人の書いたテキストなら、エスケープを忘れないようにしましょう。商品名に & や " が入ると属性が壊れ、JSON-LDの値に が入るとブラウザがそこでスクリプトを切ってしまいます。

> 細かい罠を一つ。ハンドラーは `void` を返す必要がありますが、`HTMLRewriter` のメソッドはチェーンできるように `Element` を返します。`element: (e) => e.setInnerContent(...)` のようにアロー短縮形で書くと型が合いません。ブロック本体で書くか、`void` を付ける必要があります。

### データはAPIから取得する


タイトルに商品名を入れるには値を知る必要があります。WorkerからAPIを呼びます。

> この記事の例は、筆者が運営する [console.plzhans.com](https://console.plzhans.com/) の公開APIを使ったコードを一般化したものです。以下のコードに `X-Client-Id` と `Origin` が一緒に登場するのもそのためです — そのAPIは<strong>（クライアントID、登録されたOrigin）のペア</strong>で呼び出しを確認します。使うAPIによっては、この部分が `Authorization` ヘッダー一つで済むこともあります。

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


ここには重要な設計原則が2つあります。


**① 失敗してもページは表示されなければならない。** メタを付けるのは付属機能です。APIが落ちたからといってサイトが落ちてはいけません。そのため、すべての失敗経路が「殻をそのまま返す」に収束します。


`cf` オプションでエッジキャッシュをかける方法は [Request ドキュメント](https://developers.cloudflare.com/workers/runtime-apis/request/) に整理されています。


**② タイムアウトを置く。** 人が待つのはキャッシュミスのときだけで、そのときも最初の1バイトが遅れるだけです。それでも上限は必要です。


### 何を付けるか


`headTags()` が作り出す文字列が、そのまま付く内容です。何を入れるかはサービスごとに異なりますが、この場所で価値が大きいものはおおむね次の通りです。

- **`canonical`** · 多言語なら **`hreflang`**
- **OG**（`og:title` · `og:description` · `og:image` · `og:url`）と **`twitter:card`**
- **JSON-LD** 構造化データ

特に `canonical` と `hreflang` はここで付ける理由が明確です。<strong>画面からJSで入れると、ボットにとっては無いのと同じだから</strong>です。JSON-LDは**本文がなくても**検索エンジンに事実を渡せるので、本文をまだ描けない1段階では特に価値が大きいです。

> 各項目を何で埋めるのがよいかはSEO側のテーマなので、ここでは扱いません。この記事の関心事は**「それをどこでどう差し込むか」**です。項目別の書き方はSEO最適化の記事に別途まとめてあります。

### 1段階で得られるものと得られないもの


|            |                                                     |
| ---------- | --------------------------------------------------- |
| 得られるもの     | ページ別のタイトル・説明、リンクプレビュー、canonical・hreflang、構造化データ     |
| 得られないもの    | **本文。** `<div id="root">` は依然として空のまま                 |


作業量に対する効果が大きいです。ここまでで止めても十分よい選択です。


ただしクローラーが読む<strong>内容</strong>がないのはそのままです。詳細ページの本文と<strong>ページ同士をつなぐ内部リンク</strong>がありません。後者が思ったより大きいです — クローラーから見ると、すべての詳細ページが互いにつながりのない島になります。


---


## 2段階 — 本文までサーバーで描く


### アイデア


ブラウザがやっていたレンダリングを**Workerが代わりに**やってHTMLに入れます。Reactコンポーネントをそのまま実行するので、マークアップを手で移す必要がありません。スタイルが変わればサーバーのHTMLも自動的について来ます。


核心は<strong>エントリーポイントを2つに分けること</strong>です。


```plain text
src/
  app/
    routes.tsx       route definitions only. no router is created here
    Providers.tsx    shared shell (StrictMode · i18n · QueryClient)
  entry-client.tsx   for the browser — hydrate
  entry-server.tsx   for the server — renderToReadableStream
```


### Before — エントリーポイントが一つ


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


このコードがサーバーで動かない箇所が3つあります。


| コード                               | 理由                                        |
| --------------------------------- | ----------------------------------------- |
| `document.getElementById('root')` | サーバーに `document` がない                      |
| `createBrowserRouter(...)`        | `history` APIを使う。リクエストURLという概念がない          |
| モジュール最上位の `new QueryClient()`     | プロセスに一つしかないので**リクエスト同士でデータが混ざる**          |


3番目が最も危険です。ブラウザではタブ一つにユーザー一人なのでグローバルなキャッシュが正しいのですが、サーバーは同じインスタンスが同時に複数のリクエストを処理します。商品Aのデータが商品Bのレスポンスに混ざって出ていきます。


### After ① ルート定義をルーター生成から切り離す


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


**ルーターをここで作らないことが要点です。<strong>ブラウザは `createBrowserRouter`、サーバーは [`createStaticHandler`](https://reactrouter.com/api/data-routers/createStaticHandler) で互いに異なるルーターを作りますが、</strong>ルートの配列は同じでなければなりません。** 異なると、サーバーが描いた画面とブラウザの初回レンダリングが食い違い、hydrationが壊れます。


### After ② Providerの殻を共有する


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


i18nを使っているなら、同じ理由で**インスタンスを注入してもらう**必要があります。グローバルなi18nの言語を変えると、同時に処理中の別の言語のリクエストがその値を一緒に見てしまいます。


### After ③ ブラウザのエントリーポイント


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


[`hydrateRoot`](https://react.dev/reference/react-dom/client/hydrateRoot) は既存のマークアップを描き直さず、イベントだけを付けます。逆に空のコンテナにhydrateすると、Reactが不一致とみなして丸ごと描き直します。一つのエントリーポイントが3つの状況（SSRされた経路 / されていない経路 / 開発サーバー）をすべて引き受ける必要があるので、ここで分岐します。


### After ④ サーバーのエントリーポイント


ここが核心です。


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


**ここで知っておくべき4つのこと**


**①** [**`react-dom/server`<strong>](https://react.dev/reference/react-dom/server) </strong>はReactにすでに入っています。** 別途のインストールはありません。`react-dom` パッケージのサブパスです。新しく導入するフレームワークもプラグインもありません。


Workersのようなウェブ標準ランタイムでは [`renderToReadableStream`](https://react.dev/reference/react-dom/server/renderToReadableStream) を使います — Nodeの `renderToPipeableStream` ではありません。どの版が当たるかは、後で出てくるViteの設定が決めます。


**② `renderToString` ではなくストリーミングレンダラーを使う理由。** ルートを `React.lazy` で遅延ロードしていると、`renderToString` はSuspenseのfallback（ローディングスピナー）だけを描いて終わります。ストリーミングレンダラーはlazyが解決されるまで待つことができます。


ただしストリーミングで流し込むことが目的ではありません。私たちが欲しいのは**クローラーが一度に読める完成したHTML**なので、`await stream.allReady` ですべて終わるのを待ってから文字列として受け取ります。


③ `hydrate={false}`。StaticRouterProviderは基本的にloaderデータを入れた


**④ `dehydrate` でデータを一緒に渡す。** — 次の節で詳しく。


### ビルド — `vite build --ssr`


[**Viteに内蔵された機能<strong>](https://vite.dev/guide/ssr)</strong>です。** プラグインは不要です。


```json
// package.json
{
  "scripts": {
    "build": "vite build && vite build --ssr src/entry-server.tsx --outDir dist-server"
  }
}
```


同じソースから成果物が2つ出ます。


```plain text
dist/         browser bundle — unchanged
dist-server/  server bundle — a single entry-server.js chunk
```


Viteの設定には2行必要です（[SSR options](https://vite.dev/config/ssr-options)）。


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


`noExternal: true` が抜けると、デプロイした後に `Cannot find package 'react'` で落ちます。Workersには `node_modules` がないからです。


ビルド時間は**1.7秒**増えました。サーバーバンドルの1.7MBはWorkerにだけ上がり、ユーザーにはダウンロードされません。


### Workerにつなぐ


1段階のWorkerに2行が増えます。


@@PLACEHOLDER_3@@


### APIの往復を増やさないことが重要です


サーバーがデータを受け取って画面を描いたのに、ブラウザが立ち上がるなり同じAPIをまた呼ぶと、**SSRで得たものをネットワークで返してしまいます。**


解決は `setQueryData` + `dehydrate` の組み合わせです（[TanStack Query SSRガイド](https://tanstack.com/query/latest/docs/framework/react/guides/ssr)）。


```typescript
// server: seed the cache directly - no fetch
queryClient.setQueryData(getProductQueryKey(id), product);
```


```typescript
// browser: adopt that cache as-is
if (window.__RQ_STATE__) hydrate(queryClient, window.__RQ_STATE__);
```


注意する点が2つあります。


**クエリキーが両側で完全に同じでなければなりません。** 一文字でも違うとキャッシュに当たらず、ブラウザが静かに再度呼びます。エラーが出ないので気づきにくいです。キーを作る関数を両側で共用するのが安全です。


**`staleTime` がないとマウント直後にrefetchが走ります。**


```typescript
useQuery({ ...options, staleTime: 60_000 });
```


この2つを揃えたところ、筆者の場合は詳細・ホームともに<strong>ブラウザからの追加API呼び出しが0件</strong>になりました。SSRを付けながら、ネットワークの往復はむしろ減りました。


---


## 結果


同じURLを `curl` で受け取ったものです。


|                        | 0段階         | 1段階（メタ）    | 2段階（プリレンダー）   |
| ---------------------- | ----------- | ---------- | ------------- |
| `<title>`              | 全ページ同一      | **ページ別**   | ページ別          |
| OG・canonical           | なし（JSのみ）    | **あり**     | あり            |
| JSON-LD                | なし          | **あり**     | あり            |
| `<div id="root">` の本文  | 0文字         | 0文字        | **1,745文字**   |
| 内部リンク                  | 0個          | 0個         | **6個**        |
| ブラウザからの追加API呼び出し       | 1件          | 1件         | **0件**        |


### レンダリングはCPU 10msに収まるのか


2段階で最も気になる部分です。無料プランはリクエストあたりCPU 10msで、ここで**APIを待つ時間はカウントされません** — 上限に当たるのは、Reactがツリーを描く間に実際に使ったCPUだけです。何が含まれ、どう測るのかは [Cloudflare Workers 静的サイトホスティング - リクエストの流れと課金基準](../125-cloudflare-workers-static-assets-routing-billing/) にまとめてあります。


なので測るべきはレンダリング自体のコストです。データをあらかじめ渡しておき（＝ネットワークなしで）レンダリングだけを繰り返してみました。


```plain text
cpu       wall
1回目   53.1ms    49.0ms    (cold start)
2回目    6.8ms     5.5ms
3回目    7.1ms     5.5ms
4回目   12.7ms     5.1ms
5回目   12.1ms     4.7ms
```


**この数字をそのまま信じてはいけません。<strong>4・5回目を見ると、壁時計で5msかかった作業のCPUが12msです。Nodeの `process.cpuUsage()` が</strong>すべてのスレッドのCPUを合算する**ためです（GCなど）。このワークロードにはI/Oがないので、実際のレンダリングコストはむしろ `wall` の方（**3〜5ms**）に近いです。さらにNodeと `workerd` はランタイムもGC圧も異なります。桁を見積もる用途にだけ使う値です。


デプロイ後に互いに異なるページ12件を連続でリクエストしたとき、CPU超過エラー（1102）は出ませんでした。ただし<strong>ページの複雑度によって各自が確認すべき値</strong>です。推測せず、Workers Logsに記録される実際のCPU timeを見る方がよいです。


エッジキャッシュが当たればAPIの往復がなくなり、レスポンスは**9.8ms**で終わります。これは壁時計の時間で、そのうちCPUはレンダリング分だけです。


### hydrationが本当に合っているか確認する


「警告が出ないから合っているのだろう」は根拠が弱いです。<strong>プロダクションビルドのReactは不一致の警告を取り除き</strong>、React 19は食い違ったノードを静かに通すこともあります。実際にサーバーのHTMLに `<i>` を一つこっそり挟んでみたところ、コンソールには何も出ませんでした。


より確実な方法は<strong>2つの経路のDOMを直接突き合わせる</strong>ことです。

1. デプロイされたそのままで開き、`#root` の `innerHTML` を取る
2. レスポンスからサーバーが入れたマークアップだけを消して**ブラウザだけで描かせて**から、同じものを取る
3. 2つを比較する

筆者の場合は<strong>1,118ノード対1,118ノードで構造が完全に一致</strong>しました。違いは `style="top:var(--x)"` と `style="top: var(--x);"` のように、ブラウザがCSSOMを経て再シリアライズした表記だけでした。


---


## 踏んだ罠


### ソース表示が一行で出る


Reactのサーバーレンダラーにはインデントのオプションが**ありません**。インストールされた `react-dom` から `renderToReadableStream` が読むオプションをすべて洗い出しても、フォーマット関連の項目は一つもなく、developmentバンドルとproductionバンドルのオプション一覧も同じです — デバッグ用のスイッチが隠れているわけでもありません。


これは怠慢ではなく<strong>そうできないから</strong>です。インデント用の空白は本物のテキストノードになってhydrationの突き合わせを壊し、インライン要素の間の空白は実際に一マスとしてレンダリングされます。


読みたければ受け取る側で広げればよいです。


```bash
curl -s https://example.com/page | npx prettier --parser html | less
```


### モジュール最上位でブラウザのグローバルを触るコード


エフェクト（`useEffect`）の中にあるものはサーバーで動かないので安全です。問題は<strong>モジュールスコープ</strong>です。サーバーバンドルを読み込んだ瞬間に落ちます。


```bash
grep -rnE "^(const|let|export const) .*(window|document|navigator|localStorage)" src
```


### ステージングがプロダクションと重複文書になる


SSRを付けると<strong>ステージングがプロダクションと同じ内容を持つ完全なサイト</strong>になります。以前は本文がなかったのでインデックスされても被害が小さかったのですが、今は互いに競合します。


```typescript
// Anything but production is excluded. Missing value fails closed.
if (env.APP_ENV !== 'production') {
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
}
```


`robots.txt` の `Disallow` でブロックしてはいけません。クロール自体が起きないので `noindex` を読む機会がなく、すでにインデックスされたURLはそのまま残ります。**クロールは開き、インデックスだけをブロックします。**


### キャッシュを必ず一緒に設計する


SSRは**リクエストのたびにAPIを呼ばせます。** エッジキャッシュをかけなければ、オリジンの負荷がページビューの分だけ増えます。1段階ではメタを一つ付けるために呼ぶものだったので見過ごせましたが、2段階ではそうはいきません。


かける方法と罠（データセンターごとにキャッシュが別であること、Tiered Cache、`cache.put()` との衝突）は [Cloudflare Workers キャッシュ設定方法 - エッジキャッシュとTiered Cache](../127-cloudflare-workers-cache-tiered-cache/) にまとめてあります。


---


## どこまでやるか


すべてをプリレンダーする必要はありません。


| 経路      | 段階                | 理由                            |
| ------- | ----------------- | ----------------------------- |
| 詳細      | 2段階               | クローラーが読む内容がある。ページ数も多い          |
| ホーム     | 2段階               | クローラーが最初に来る場所であり、内部リンクの出発点である  |
| 検索・一覧   | 1段階               | 結果がユーザー入力に左右される。キャッシュも当たらない    |
| 規約・ポリシー | 1段階または `noindex`  | インデックスの対象ではない                 |


**1段階で止めても大丈夫です。** 作業量に対する効果が大きく、リンクプレビューと検索結果のタイトルはそれだけで解決します。


2段階は「クローラーが読む本文が実際にあるページ」にだけ価値があります。そして内部リンク — 詳細同士をつなぐリンクがHTMLになければ、クローラーにとってはすべてのページが孤立した島だという点は、一度確認してみる価値があります。


---


## まとめ

- **GoogleはJSをレンダリングします。** しかしキューに入り、Googleのドキュメント自身が「すべてのボットが実行できるわけではない」としてSSRを勧めています。
- **1段階**：Workers + `HTMLRewriter` でメタ・OG・JSON-LDを埋めます。作業量が少なく効果が明確です。
- **2段階**：`entry-client` / `entry-server` でエントリーポイントを分け、本文までサーバーで描きます。
- `react-dom/server` は**Reactにすでに入っており**、`vite build --ssr` は**Viteにすでに入っています。** 新しく導入するフレームワークはありません。
- サーバーが受け取ったデータを `dehydrate` で渡せば、**APIの往復は増えません。**
- **バックエンドサーバーを立てる必要はありません。** すでにCloudflareに静的サイトを載せているなら、追加インフラは0で、無料プランで始められます。

### 参考

- [Cloudflare Workers 静的サイトホスティング - リクエストの流れと課金基準](../125-cloudflare-workers-static-assets-routing-billing/) — wrangler・ローカル実行・デプロイ
- SEO最適化 — 何を埋めるか — canonical・OG・JSON-LDの項目別の書き方
- [JavaScript SEO Basics — Google Search Central](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)

**Cloudflare**

- [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/) · [SPAルーティング](https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/)
- [HTMLRewriter](https://developers.cloudflare.com/workers/runtime-apis/html-rewriter/)
- [Request `cf` オプション](https://developers.cloudflare.com/workers/runtime-apis/request/) — `cacheTtl` · `cacheEverything`
- [Cache API](https://developers.cloudflare.com/workers/runtime-apis/cache/) · [Tiered Cache](https://developers.cloudflare.com/cache/how-to/tiered-cache/)
- [Limits](https://developers.cloudflare.com/workers/platform/limits/) — CPU · サブリクエスト

**React · Vite · ライブラリ**

- [Server Rendering APIs](https://react.dev/reference/react-dom/server) · [`renderToReadableStream`](https://react.dev/reference/react-dom/server/renderToReadableStream) · [`hydrateRoot`](https://react.dev/reference/react-dom/client/hydrateRoot)
- [Vite SSR](https://vite.dev/guide/ssr) · [SSR options](https://vite.dev/config/ssr-options)
- [React Router `createStaticHandler`](https://reactrouter.com/api/data-routers/createStaticHandler)
- [TanStack Query SSR](https://tanstack.com/query/latest/docs/framework/react/guides/ssr)
