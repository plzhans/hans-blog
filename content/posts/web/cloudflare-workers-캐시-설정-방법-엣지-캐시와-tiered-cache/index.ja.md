---
id: "127"
translationKey: "127"
slug: "127-cloudflare-workers-cache-tiered-cache"
title: "Cloudflare Workers キャッシュ設定方法 - エッジキャッシュとTiered Cache"
description: "Workerが外部APIを呼ぶときにキャッシュをかける2つの方法と、知らなければ必ず踏む罠3つ。データセンターごとのキャッシュ・Tiered Cache・キャッシュキー。"
categories:
  - "web"
tags:
  - "cache"
  - "cloudflare"
  - "workers"
date: 2026-09-11T13:01:00.000Z
lastmod: 2026-09-11T13:01:00.000Z
toc: true
draft: false
images:
  - "assets/1_3d822a0f-7e83-8170-a661-c0a4f4df8698.png"
---


![複数のエッジノードが上位階層の一箇所を経由してオリジンに到達するTiered Cache構成を表した代表画像](./assets/1_3d822a0f-7e83-8170-a661-c0a4f4df8698.png)


## 概要

> この記事は [Cloudflare Workers 静的サイトガイド - デプロイからSEOまで](../124-cloudflare-workers-static-site-guide/) シリーズの一部です。

Workerが外部APIを呼び始めると、すぐにキャッシュが必要になります。かけなければ**オリジンの負荷がページビューの分だけ増えます。**


かけること自体は1行で済みますが、その後に知らなければ必ず踏む罠がいくつかあります。特に<strong>エッジキャッシュが全世界で共有されない</strong>という点は、知ってしまえば当然ですが、知らなければ「なぜキャッシュが当たらないのか」としばらく悩むことになります。


### この記事で扱うこと

- キャッシュをかける2つの方法 — `fetch()` の `cf` オプションとCache API
- エッジキャッシュが<strong>データセンターごとに別</strong>であることと、その対応
- Tiered Cacheでオリジンへのリクエストを減らす方法・そのとき `cache.put()` が使えない理由
- 同じURLがヘッダーによって異なるレスポンスを返す場合のキャッシュキーの問題

### 扱わないこと


Workers Static Assetsの構造とデプロイは [Cloudflare Workers 静的サイトホスティング - リクエストの流れと課金基準](../125-cloudflare-workers-static-assets-routing-billing/)、ローカル開発は [wrangler 使い方 - Cloudflare Workers のローカル開発とデプロイ](../126-cloudflare-workers-wrangler-dev-deploy/) にあります。


KV・R2・D1のようなストレージは範囲外です。この記事は<strong>HTTPレスポンスキャッシュ</strong>のみを扱います。


---


## キャッシュをかける2つの方法


**① `fetch()` の `cf` オプション** — レスポンスをCloudflareのエッジキャッシュに任せます（[Request ドキュメント](https://developers.cloudflare.com/workers/runtime-apis/request/)）。


```typescript
await fetch(url, {
  cf: { cacheTtl: 3600, cacheEverything: true },
});
```


**②** [**Cache API**](https://developers.cloudflare.com/workers/runtime-apis/cache/) — 自分で入れて取り出します。


```typescript
const cache = caches.default;
const hit = await cache.match(key);
if (hit) return hit;
// ...
ctx.waitUntil(cache.put(key, response.clone()));
```


## 知っておくべきこと3つ


**エッジキャッシュはデータセンターごとに別です。** ドキュメントの表現そのままです。

> The contents of the cache **do not replicate outside of the originating data center.**  
>   
> — [Cache API](https://developers.cloudflare.com/workers/runtime-apis/cache/)

ソウルでキャッシュしたものを東京は知りません。全世界から入ってくるトラフィックを相手にすると、同じURLがデータセンターの数だけオリジンを叩きます。


[**Tiered Cache<strong>](https://developers.cloudflare.com/cache/how-to/tiered-cache/) </strong>がそれを減らしてくれます。<strong>下位のデータセンターがミスしたとき、オリジンではなく</strong>上位のデータセンター**に先に問い合わせます。全プラン無料です。ただし、**`cache.put()` で入れたものはTiered Cacheの対象外です** — そのため①の方式を使う方がよいです。


**キャッシュキーはURLです。** 同じURLがリクエストヘッダーによって異なるレスポンスを返す場合（`Accept-Language` など）、そのままにしておくと先に埋めた方が全員に返されます。`cf.cacheKey` でキーを変える方法がありますが<strong>Enterprise専用</strong>なので、それ以下のプランでは区別する値をURLのクエリに入れる必要があります。


---


## まとめ

- Workerが外部APIを呼ぶなら**キャッシュは選択ではありません。** かけなければオリジンがページビューの分だけ叩かれます。
- かける方法は2つ。**`cf.cacheTtl` の方をデフォルトにする方がよいです** — `cache.put()` で入れたものはTiered Cacheに乗れません。
- エッジキャッシュは<strong>データセンターごとに別</strong>です。全世界のトラフィックなら [Tiered Cache](https://developers.cloudflare.com/cache/how-to/tiered-cache/) を有効にしましょう。全プラン無料です。
- 同じURLがヘッダーによって異なるレスポンスを返すなら、**区別する値をURLに入れる必要があります。** `cf.cacheKey` はEnterprise専用です。

### 参考

- [Cache API](https://developers.cloudflare.com/workers/runtime-apis/cache/)
- [Request `cf` オプション](https://developers.cloudflare.com/workers/runtime-apis/request/) — `cacheTtl` · `cacheEverything` · `cacheKey`
- [Tiered Cache](https://developers.cloudflare.com/cache/how-to/tiered-cache/)
- [Cloudflare Workers 静的サイトホスティング - リクエストの流れと課金基準](../125-cloudflare-workers-static-assets-routing-billing/)
