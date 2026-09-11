---
id: "127"
translationKey: "127"
slug: "127-cloudflare-workers-cache-tiered-cache"
title: "Cloudflare Workers 캐시 설정 방법 - 엣지 캐시와 Tiered Cache"
description: "워커가 외부 API 를 부를 때 캐시를 거는 두 가지 방법과, 모르면 반드시 밟는 함정 셋. 데이터센터별 캐시·Tiered Cache·캐시 키."
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


![여러 엣지 노드가 상위 계층 한 곳을 거쳐 원본에 닿는 Tiered Cache 구성을 나타낸 대표 이미지](./assets/1_3d822a0f-7e83-8170-a661-c0a4f4df8698.png)


## 개요

> 이 글은 [Cloudflare Workers 정적 사이트 가이드 - 배포부터 SEO까지](../124-cloudflare-workers-static-site-guide/) 시리즈의 일부다.

워커가 외부 API 를 부르기 시작하면 곧 캐시가 필요해진다. 안 걸면 **원본 부하가 페이지뷰만큼 늘어난다.**


거는 것 자체는 한 줄이면 되는데, 그 뒤에 모르면 반드시 밟는 함정이 몇 개 있다. 특히 <strong>엣지 캐시가 전 세계에 공유되지 않는다</strong>는 점은 알고 나면 당연하지만 모르면 "왜 캐시가 안 맞지" 로 한참 헤맨다.


### 이 글에서 다루는 것

- 캐시를 거는 두 가지 방법 — `fetch()` 의 `cf` 옵션과 Cache API
- 엣지 캐시가 <strong>데이터센터마다 따로</strong>라는 것과 그 대응
- Tiered Cache 로 오리진 요청을 줄이는 법 · 그때 `cache.put()` 이 안 되는 이유
- 같은 URL 이 헤더에 따라 다른 응답을 줄 때의 캐시 키 문제

### 다루지 않는 것


Workers Static Assets 의 구조와 배포는 [Cloudflare Workers 정적 사이트 호스팅 - 요청 흐름과 과금 기준](../125-cloudflare-workers-static-assets-routing-billing/), 로컬 개발은 [wrangler 사용법 - Cloudflare Workers 로컬 개발과 배포](../126-cloudflare-workers-wrangler-dev-deploy/)에 있다.


KV·R2·D1 같은 저장소는 범위 밖이다. 이 글은 <strong>HTTP 응답 캐시</strong>만 다룬다.


---


## 캐시를 거는 두 가지 방법


**① `fetch()` 의 `cf` 옵션** — 응답을 Cloudflare 엣지 캐시에 맡긴다([Request 문서](https://developers.cloudflare.com/workers/runtime-apis/request/)).


```typescript
await fetch(url, {
  cf: { cacheTtl: 3600, cacheEverything: true },
});
```


**②** [**Cache API**](https://developers.cloudflare.com/workers/runtime-apis/cache/) — 직접 넣고 뺀다.


```typescript
const cache = caches.default;
const hit = await cache.match(key);
if (hit) return hit;
// ...
ctx.waitUntil(cache.put(key, response.clone()));
```


## 알아야 할 것 셋


**엣지 캐시는 데이터센터마다 따로다.** 문서 표현 그대로다.

> The contents of the cache **do not replicate outside of the originating data center.**  
>   
> — [Cache API](https://developers.cloudflare.com/workers/runtime-apis/cache/)

서울에서 캐시한 것을 도쿄는 모른다. 전 세계에서 들어오는 트래픽을 상대하면 같은 URL 이 데이터센터 수만큼 원본을 때린다.


[**Tiered Cache<strong>](https://developers.cloudflare.com/cache/how-to/tiered-cache/) </strong>가 그걸 줄여 준다.<strong> 하위 데이터센터가 미스일 때 오리진이 아니라 </strong>상위 데이터센터**에 먼저 묻는다. 전 플랜 무료다. 다만 **`cache.put()` 으로 넣은 것은 Tiered Cache 대상이 아니다** — 그래서 ①번 방식을 쓰는 편이 낫다.


**캐시 키는 URL 이다.** 같은 URL 이 요청 헤더에 따라 다른 응답을 준다면(`Accept-Language` 등) 그대로 두면 먼저 채운 쪽이 전부에게 나간다. `cf.cacheKey` 로 키를 바꾸는 방법이 있지만 <strong>Enterprise 전용</strong>이라, 그 아래 플랜에서는 구분값을 URL 쿼리에 넣어야 한다.


---


## 정리

- 워커가 외부 API 를 부른다면 **캐시는 선택이 아니다.** 안 걸면 원본이 페이지뷰만큼 맞는다.
- 거는 방법은 둘. **`cf.cacheTtl` 쪽을 기본으로 삼는 편이 낫다** — `cache.put()` 으로 넣은 것은 Tiered Cache 를 못 탄다.
- 엣지 캐시는 <strong>데이터센터마다 따로</strong>다. 전 세계 트래픽이라면 [Tiered Cache](https://developers.cloudflare.com/cache/how-to/tiered-cache/) 를 켜자. 전 플랜 무료다.
- 같은 URL 이 헤더에 따라 다른 응답을 준다면 **구분값을 URL 에 넣어야 한다.** `cf.cacheKey` 는 Enterprise 전용이다.

### 참고

- [Cache API](https://developers.cloudflare.com/workers/runtime-apis/cache/)
- [Request `cf` 옵션](https://developers.cloudflare.com/workers/runtime-apis/request/) — `cacheTtl` · `cacheEverything` · `cacheKey`
- [Tiered Cache](https://developers.cloudflare.com/cache/how-to/tiered-cache/)
- [Cloudflare Workers 정적 사이트 호스팅 - 요청 흐름과 과금 기준](../125-cloudflare-workers-static-assets-routing-billing/)
