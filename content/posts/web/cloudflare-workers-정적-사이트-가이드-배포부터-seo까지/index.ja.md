---
id: "124"
translationKey: "124"
slug: "124-cloudflare-workers-static-site-guide"
title: "Cloudflare Workers 静的サイトガイド - デプロイからSEOまで"
description: "静的サイトをCloudflareに載せ、その前にコードを一枚重ねてSEOを改善するまで。4編に分けて整理したシリーズの案内板。"
categories:
  - "web"
tags:
  - "cloudflare"
  - "seo"
  - "workers"
date: 2026-09-11T13:01:00.000Z
lastmod: 2026-09-11T13:01:00.000Z
toc: true
draft: false
images:
  - "assets/1_3d822a0f-7e83-818c-8060-c230fe8eebe7.png"
---


![Cloudflare Workersのエッジノードを中央に置き、ホスティング・ローカル開発・キャッシュ・SEOの4編がつながるシリーズ代表画像](./assets/1_3d822a0f-7e83-818c-8060-c230fe8eebe7.png)


## 概要


ReactやVueで作ったSPA、Hugoで生成した静的サイトを、そのままCDNに載せて使うケースが多いです。デプロイが単純で、サーバーがないので運用するものもありません。


ところが少し経つと、**「レスポンスに手を入れたいのにサーバーがない」**という瞬間が来ます。ページごとに異なるメタタグを入れたいときや、クローラーに本文を見せたいとき、レスポンスヘッダーを一つ付けたいときです。


Cloudflareを使っているなら、**サーバーを新しく立てずに**それができます。静的アセットの前にコードを一枚重ねるのです。このシリーズは、その過程を4編に分けて整理したものです。


## 読む順序

1. [Cloudflare Workers 静的サイトホスティング - リクエストの流れと課金基準](../125-cloudflare-workers-static-assets-routing-billing/) — 構造とリクエストの流れ。いつWorkerが動き、いつ課金されるのか
2. [wrangler 使い方 - Cloudflare Workers のローカル開発とデプロイ](../126-cloudflare-workers-wrangler-dev-deploy/) — ローカルで立ち上げてデプロイする方法
3. [Cloudflare Workers キャッシュ設定方法 - エッジキャッシュとTiered Cache](../127-cloudflare-workers-cache-tiered-cache/) — 外部APIを呼び始めたなら
4. [React SPA SEO 改善方法 - Cloudflare WorkersでメタタグからSSRまで](../128-react-spa-seo-cloudflare-workers-ssr/) — メタタグの注入からサーバーレンダリングまで

1番は概念、2番はツールです。この2つは順番に読む方がよいです。3・4番は必要なときに選んで読めば大丈夫です。


## なぜWorkersなのか


**追加インフラが0です。** すでにCloudflareがアセットをサービングしているなら、そこにコードを重ねるだけです。デプロイ対象が増えることもなく、落ちたらサイトが落ちるサーバーがもう一つ増えることもありません。


**無料プランで始められます。** 1日10万リクエストまで無料で、静的アセットのリクエストはそもそも課金対象ではありません。


**エッジで動きます。** ユーザーに近いデータセンターで実行されるため、オリジンへの往復がありません。


もちろん万能ではありません。リクエストあたりCPU 10ms（無料プラン）といった制約があるので、重い計算には向きません。その境界がどこにあるのかもシリーズで扱います。


## 各編で扱うこと


### 1編 - 静的サイトホスティング


Workers Static Assetsとは何か、そして<strong>リクエストがどの順序で流れるのか</strong>をシーケンス図で整理しました。


核心は**「アセットがあればWorkerは動かない」**という基本ルールと、それを覆す `run_worker_first` です。課金がどこで発生するのかもここで扱います — 静的アセットは無料で、Workerが実行されたリクエストだけがカウントされるので、Workerを通す経路を狭く取ることがそのままコストになります。


→ [Cloudflare Workers 静的サイトホスティング - リクエストの流れと課金基準](../125-cloudflare-workers-static-assets-routing-billing/)


### 2編 - wrangler 使い方


`wrangler` のインストールからデプロイまで。ランタイム依存は増えないということ、Workerコードの<strong>型設定を分離</strong>すべき理由、そして最も紛らわしいもの一つ。


**`wrangler dev` はフロントエンドの開発サーバーではありません。<strong>プロダクションと同じランタイム（`workerd`）をローカルに立ち上げるものなので、ソースではなく</strong>ビルド成果物**を読み込みます。これを知らないと「確かに直したのになぜそのままなのか」を繰り返すことになります。


→ [wrangler 使い方 - Cloudflare Workers のローカル開発とデプロイ](../126-cloudflare-workers-wrangler-dev-deploy/)


### 3編 - キャッシュ設定方法


Workerが外部APIを呼び始めるとキャッシュが必要になります。かけなければオリジンの負荷がページビューの分だけ増えます。


かける方法は2つですが、**選ぶ基準があります。<strong>そしてエッジキャッシュが</strong>データセンターごとに別**という点は、知ってしまえば当然ですが、知らなければ「なぜキャッシュが当たらないのか」としばらく悩むことになります。


→ [Cloudflare Workers キャッシュ設定方法 - エッジキャッシュとTiered Cache](../127-cloudflare-workers-cache-tiered-cache/)


### 4編 - React SPA SEO 改善方法


このシリーズの目的地です。SPAを静的ホスティングに載せると、**サーバーが返すHTMLに検索エンジンが読むものがありません。**


GoogleはJSをレンダリングしてくれますが、それで十分かは検討すべき問題であり、Googleのドキュメント自身がSSRを勧めています。この編では、その問題を<strong>0 → 1 → 2段階</strong>に分けて解きます。メタタグだけを埋める軽い方法から、`entry-client` / `entry-server` を分離して本文までサーバーで描く方法までです。


→ [React SPA SEO 改善方法 - Cloudflare WorkersでメタタグからSSRまで](../128-react-spa-seo-cloudflare-workers-ssr/)


## 扱わないこと


KV・R2・D1のようなストレージバインディング、Durable Objects、Cron Triggersはこのシリーズの範囲外です。静的サイトの前に薄い層を一つ置くところまでを扱います。
