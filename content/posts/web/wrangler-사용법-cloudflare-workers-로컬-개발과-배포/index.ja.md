---
id: "126"
translationKey: "126"
slug: "126-cloudflare-workers-wrangler-dev-deploy"
title: "wrangler 使い方 - Cloudflare Workers のローカル開発とデプロイ"
description: "wranglerのインストールと型設定、wrangler devでworkerdを立ち上げる方法、そしてデプロイ。wrangler devがフロントエンドの開発サーバーではないという点から。"
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


![ローカルで動かしたWorkerランタイムがそのままエッジプラットフォームへ上がっていく過程を表した代表画像](./assets/1_3d822a0f-7e83-81f6-b43f-ee90a3347422.png)


## 概要

> この記事は [Cloudflare Workers 静的サイトガイド - デプロイからSEOまで](../124-cloudflare-workers-static-site-guide/) シリーズの一部です。

Cloudflare Workersを扱う仕事は、実質的に<strong>`wrangler` を扱う仕事</strong>です。ローカルで立ち上げるのも、デプロイするのも同じCLIです。


ところが名前のせいで誤解が一つ生まれます。**`wrangler dev` はフロントエンドの開発サーバーではありません。** 筆者も最初はここでしばらく悩みました。


### この記事で扱うこと

- 何をインストールすべきか — そして<strong>ランタイム依存は増えない</strong>ということ
- Workerコードの<strong>型設定を分離</strong>すべき理由
- `wrangler dev` が実際に何をするのか · `vite dev` との違い
- なぜ<strong>静的サイトのビルドが先</strong>でなければならないのか
- Workerがレスポンスを直したか確認する方法
- デプロイ — 環境ごとの値の注入 · CIで動かすときの注意点

### 扱わないこと


Workers Static Assetsの構造とリクエストの流れは [Cloudflare Workers 静的サイトホスティング - リクエストの流れと課金基準](../125-cloudflare-workers-static-assets-routing-billing/) にあります。


### 前提


Cloudflareのアカウントがあり、静的サイトをビルドできること（`npm run build` → `dist/`）以外に必要な事前知識はありません。


---


## wrangler のインストール


CloudflareのCLIです。ローカル実行とデプロイの両方を担当します。コマンド一覧は [Commands ドキュメント](https://developers.cloudflare.com/workers/wrangler/commands/) にあります。


### インストールしないという選択肢


`wrangler` は**デプロイツールであってアプリケーションコードではありません。** そのため依存に入れず、必要なときだけダウンロードして使うこともできます。


```bash
# As a devDependency
npm i -D wrangler
npx wrangler dev

# Or without installing - pin the major version
npx wrangler@4 dev
pnpm dlx wrangler@4 dev
```


後者の利点は、**ローカルとCIが同じバージョンを使い**、アプリの `package.json` にデプロイツールが入らないことです。欠点は毎回ダウンロードの時間が少しかかることです。


どちらにせよ**ランタイム依存は増えません。** WorkerはCloudflareが実行します。


### 型は別パッケージです


`Fetcher`・`HTMLRewriter`・`ExecutionContext`・`caches` のようなWorkersのグローバルは型パッケージから来ます。


```bash
npm i -D @cloudflare/workers-types
```


**型設定を分離すべき理由**


**一つのプロジェクトの中に実行環境が2つあることで生じる問題です。**


```plain text
src/                  runs in the browser   has document · no HTMLRewriter
cloudflare/workers/   runs on workerd       no document · has HTMLRewriter
```


使えるグローバルが<strong>互いに正反対</strong>なのに、TypeScriptはファイルを見ただけではどちらなのか分かりません。tsconfigに書いたものしか知りません。そのため「どのフォルダがどの環境なのか」を教える必要があり、そのためには設定が2つ必要です。

> ちなみにWorkersはNodeではありません。`fs`・`process` のようなNode APIもなく、ブラウザの `document` もない第三のランタイムです。そのため既存のNode用設定をそのまま使うこともできません。

設定が一つだけなら、たいていはブラウザ基準です。その設定でWorkerコードまで検査すると、以下のコードが**コンパイルを通ってしまいます。**


```typescript
export default {
  async fetch(request: Request): Promise<Response> {
    // There is no document in a Worker. This still type-checks.
    const el = document.getElementById('root');
    return new Response(el?.textContent ?? '');
  },
};
```


デプロイすると `document is not defined` で落ちます。**型検査が捕まえるべきだったものを、ランタイムまで先送りしたことになります。**


逆方向もあります。`@cloudflare/workers-types` を入れなければ、`HTMLRewriter`・`ExecutionContext`・`caches` がすべて「名前が見つかりません」になります。


**一つの設定に両方を詰め込むのも答えではありません。<strong>DOMとWorkersの型を一緒に入れると、`Request`・`Response`・`caches` のように</strong>両側に同じ名前が違う形で存在するもの**が混ざり、見当違いの型が当たってしまいます。


そこで設定を分け、project referenceで束ねます。各設定が決めるのは3つです。


|           | 決めるもの                                                              |
| --------- | ------------------------------------------------------------------ |
| `include` | このルールを**どのフォルダに**適用するか                                            |
| `lib`     | 標準環境に何があるとみなすか（`"DOM"` → `window`・`document`）                      |
| `types`   | 追加のグローバルパッケージ（`@cloudflare/workers-types` → `HTMLRewriter`・`caches`） |


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


## ローカルで立ち上げる — 最も紛らわしい部分


### `wrangler dev` はフロントエンドの開発サーバーではありません


名前が `dev` なので `vite dev` のようなものと誤解しやすいのですが、やることがまったく違います。


[`wrangler dev`](https://developers.cloudflare.com/workers/development-testing/) は**Cloudflareのエッジとまったく同じランタイム（`workerd`）をローカルにWebサーバーとして立ち上げます。** 実際にデプロイされればCloudflareのデータセンターで動くそのプログラムを、自分のコンピューターでそのまま動かすのです。`HTMLRewriter`・`caches`・`env.ASSETS` がすべてプロダクションと同じ実装です。


つまり**「プロダクションの縮小版をローカルに立てること」**であって、ソースを監視して変換してくれるツールではありません。


|          | `vite dev`         | `wrangler dev`                |
| -------- | ------------------ | ----------------------------- |
| 何なのか     | フロントの**開発サーバー<strong> | プロダクション</strong>ランタイムの複製**      |
| 入力       | `src/` のソース        | **ビルド成果物（`dist/`）**           |
| ソースの変更   | HMRで即時反映           | 反映されない — **もう一度ビルドする必要がある**   |
| Worker   | 存在しない              | 動く                            |


### だから静的サイトのビルドが先です


`env.ASSETS` は**「デプロイされた静的アセットの束」**を指します。その束がなければWorkerが取り出すものがありません。


ローカルでその束をどこから読むかを教えるのが `--assets` です。


```bash
npx wrangler@4 dev --assets dist
#                            ^^^^ build output, not src/
```


順序は常にこうです。


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


**画面のコードを直したなら1番からやり直す必要があります。** `wrangler dev` は `dist/` だけを見ているので、`src/` を直しても気づきません。「確かに直したのになぜそのままなのか？」のほとんどがこれです。


スクリプトにまとめておくと便利です。


```json
// package.json
{
  "scripts": {
    // cf- prefix: plain "worker" collides with Web Worker / Service Worker / worker_threads
    "preview:cf-worker": "npm run build && wrangler dev --assets dist"
  }
}
```


ポートは設定に固定できます。


```json
// wrangler.jsonc
{ "dev": { "port": 6173 } }
```


### 作業の流れ


2つのサーバーを両方立ち上げたまま使うわけではありません。

- <strong>画面を作っている間</strong>は `vite dev`。Workerは動きません。
- **Workerを触ったときだけ**ビルドしてから `wrangler dev` で確認します。

### 確認は「生のレスポンス」で行います


Workerがレスポンスを直すコードなら、**レンダリングされた画面を見てはいけません。** 画面はJSが作った結果なので、Workerがやったこととブラウザがやったことが混ざります。Workerをまったく通さなくても、画面は同じようにきちんと見えます。


**ブラウザのソース表示**


```plain text
view-source:http://localhost:6173/products/1234
```


開発者ツールの**Elementsパネルはここでは使えません** — それは現在のDOMであり、すでにJSが実行された後だからです。


**開発者ツールのNetworkタブ** — ドキュメントのリクエストを選んでResponseを見ると、受け取った本文がそのまま出ます。レスポンスヘッダーまで見られるので最も正確です。


**curl** — 欲しいものだけ抜き出したり、スクリプトで回したりするときに便利です。


```bash
curl -s http://localhost:6173/products/1234 | head -20
curl -s -D - -o /dev/null http://localhost:6173/products/1234   # headers only
```


値が変わっていなければ<strong>Workerを通っていない</strong>ということです。`run_worker_first` にそのパスが入っているかをまず確認しましょう。


---


## デプロイ


ローカルで確認できたら、同じCLIでアップロードします。


```bash
npx wrangler@4 deploy --assets dist
```


### 環境ごとに変わる値


サイトのアドレス・APIのアドレス・キーのように環境によって変わる値は、**設定ファイルに埋め込まずCLIで渡す**方がよいです（[環境変数ドキュメント](https://developers.cloudflare.com/workers/configuration/environment-variables/)）。ファイルに書くと環境ごとに分かれ、食い違っても静かに誤動作します。


```bash
npx wrangler@4 deploy --assets dist \
  --name "prod-my-site" \
  --var SITE_URL:"https://example.com" \
  --var API_BASE_URL:"https://api.example.com"
```


CLIの値が設定ファイルに勝つので、**同じ値を2か所に書いておく必要がありません。**


```typescript
export interface Env {
  ASSETS: Fetcher;
  SITE_URL: string;
  API_BASE_URL: string;
}
```


### デプロイ履歴を残す


`--tag` と `--message` はWorkerのバージョンに付くラベルです。ダッシュボードで「今上がっているのはどのコミットなのか」に答えられるようにしてくれます。


```bash
npx wrangler@4 deploy --assets dist \
  --tag "$GIT_SHA" \
  --message "ref: $GIT_BRANCH"
```


なければロールバックのときに目視で突き合わせることになります。


### CIで動かすとき


`wrangler` はデプロイの最後にあれこれ尋ねてきます（テレメトリーの同意など）。CIには答える人がいないので、そこで止まります。


```bash
CI=true WRANGLER_SEND_METRICS=false npx wrangler@4 deploy --assets dist
```


認証は環境変数で渡します。wranglerがこの名前を直接読むので、別途exportする必要はありません。


```plain text
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
```


### 存在しないWorkerにデプロイしない


`wrangler deploy --name X` はXがなければ**作り<strong>、あれば上書きします。便利に見えますが、</strong>名前を間違えたデプロイが静かに「成功」します。** 見当違いのWorkerが新しく作られ、肝心の見ているサイトは変わりません。


CIならデプロイ前に存在確認を一度しておく方が安全です。APIでその名前を照会して**ステータスコードだけ**を見れば十分です。


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


**2xxを丸ごと受け取る必要があります。** このエンドポイントはスクリプトの本文を返しますが、静的アセットだけを含むWorkerは本文が空なので**204**が返ります。`200` だけを確認すると、2回目以降のデプロイがすべてブロックされます。


そして**「存在しない」（404）と「権限がない」（401・403）を必ず分ける必要があります。** 両者をひとまとめにすると、トークンの権限が足りない状況で「初めて作るのだから作成を許可せよ」という見当違いの案内をすることになり、その言葉に従うとデプロイが認証で再び落ちます。


---


## まとめ

- ランタイム依存は**増えません。** WorkerはCloudflareが実行します。開発用に `@cloudflare/workers-types` と `wrangler` だけあれば十分です。
- `wrangler` は**インストールせず** `npx wrangler@4` で使うこともできます。バージョンを固定すれば、ローカルとCIが同じものを使います。
- Workerコードは<strong>型設定を分離</strong>します。一つのtsconfigで検査すると、Workerで `document` を使っても通ってしまい、デプロイ後にはじめて壊れます。
- <strong>`wrangler dev` はプロダクションランタイムのローカル複製</strong>であって、フロントエンドの開発サーバーではありません。`dist/` を先にビルドする必要があり、画面のコードを直したならビルドし直す必要があります。
- Workerがレスポンスを直したかどうかは<strong>生のレスポンス</strong>で確認します。レンダリングされた画面やDevToolsのElementsパネルでは区別がつきません。
- 環境ごとの値は**CLIの `--var`** で渡します。設定ファイルに埋め込むと同じ値が2か所にでき、環境ごとに分かれます。
- 存在しないWorkerにデプロイすると<strong>静かに成功します</strong>。CIなら存在確認を一度しましょう。

### 参考

- [Local development](https://developers.cloudflare.com/workers/development-testing/) — `wrangler dev`
- [Wrangler commands](https://developers.cloudflare.com/workers/wrangler/commands/)
- [Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)
- [Environment variables](https://developers.cloudflare.com/workers/configuration/environment-variables/) — `--var`
- [Cloudflare Workers 静的サイトホスティング - リクエストの流れと課金基準](../125-cloudflare-workers-static-assets-routing-billing/)
