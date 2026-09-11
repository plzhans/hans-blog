---
id: "124"
translationKey: "124"
slug: "124-cloudflare-workers-static-site-guide"
title: "Cloudflare Workers 정적 사이트 가이드 - 배포부터 SEO까지"
description: "정적 사이트를 Cloudflare 에 올리고, 그 앞에 코드를 한 겹 얹어 SEO 를 개선하기까지. 네 편으로 나눠 정리한 시리즈의 안내판."
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


![Cloudflare Workers 엣지 노드를 가운데 두고 호스팅·로컬 개발·캐시·SEO 네 편이 이어지는 시리즈 대표 이미지](./assets/1_3d822a0f-7e83-818c-8060-c230fe8eebe7.png)


## 개요


React 나 Vue 로 만든 SPA, Hugo 로 뽑은 정적 사이트를 그냥 CDN 에 올려 두고 쓰는 경우가 많다. 배포가 단순하고 서버가 없으니 운영할 것도 없다.


그런데 조금 지나면 **"응답을 손대고 싶은데 서버가 없네"** 하는 순간이 온다. 페이지마다 다른 메타 태그를 넣고 싶거나, 크롤러에게 본문을 보여주고 싶거나, 응답 헤더를 하나 붙이고 싶을 때다.


Cloudflare 를 쓰고 있다면 **서버를 새로 세우지 않고** 그 일을 할 수 있다. 정적 자산 앞에 코드를 한 겹 얹는 것이다. 이 시리즈는 그 과정을 네 편으로 나눠 정리한 것이다.


## 읽는 순서

1. [Cloudflare Workers 정적 사이트 호스팅 - 요청 흐름과 과금 기준](../125-cloudflare-workers-static-assets-routing-billing/) — 구조와 요청 흐름. 언제 워커가 돌고 언제 과금되나
2. [wrangler 사용법 - Cloudflare Workers 로컬 개발과 배포](../126-cloudflare-workers-wrangler-dev-deploy/) — 로컬에서 띄우고 올리는 법
3. [Cloudflare Workers 캐시 설정 방법 - 엣지 캐시와 Tiered Cache](../127-cloudflare-workers-cache-tiered-cache/) — 외부 API 를 부르기 시작했다면
4. [React SPA SEO 개선 방법 - Cloudflare Workers로 메타 태그부터 SSR까지](../128-react-spa-seo-cloudflare-workers-ssr/) — 메타 주입부터 서버 렌더링까지

1번은 개념, 2번은 도구다. 이 둘은 순서대로 읽는 편이 낫다. 3·4번은 필요할 때 골라 보면 된다.


## 왜 Workers 인가


**추가 인프라가 0 이다.** 이미 Cloudflare 가 자산을 서빙하고 있다면 거기에 코드만 얹는다. 배포 대상이 늘지 않고, 죽으면 사이트가 죽는 서버가 하나 더 생기지도 않는다.


**무료 플랜으로 시작할 수 있다.** 하루 10만 요청까지 무료이고, 정적 자산 요청은 아예 과금 대상이 아니다.


**엣지에서 돈다.** 사용자와 가까운 데이터센터에서 실행되므로 오리진 왕복이 없다.


물론 만능은 아니다. 요청당 CPU 10ms(무료 플랜) 같은 제약이 있어서, 무거운 계산은 맞지 않는다. 그 경계가 어디인지도 시리즈에서 다룬다.


## 각 편에서 다루는 것


### 1편 - 정적 사이트 호스팅


Workers Static Assets 가 무엇이고 <strong>요청이 어떤 순서로 흐르는지</strong>를 시퀀스 다이어그램으로 정리했다.


핵심은 **"자산이 있으면 워커는 안 돈다"** 는 기본 규칙과, 그것을 뒤집는 `run_worker_first` 다. 과금이 어디서 발생하는지도 여기서 다룬다 — 정적 자산은 무료이고 워커가 실행된 요청만 잡히므로, 워커를 태우는 경로를 좁게 잡는 것이 그대로 비용이 된다.


→ [Cloudflare Workers 정적 사이트 호스팅 - 요청 흐름과 과금 기준](../125-cloudflare-workers-static-assets-routing-billing/)


### 2편 - wrangler 사용법


`wrangler` 설치부터 배포까지. 런타임 의존성은 늘지 않는다는 것, 워커 코드의 <strong>타입 설정을 분리</strong>해야 하는 이유, 그리고 가장 헷갈리는 것 하나.


**`wrangler dev` 는 프론트 개발 서버가 아니다.<strong> 프로덕션과 같은 런타임(`workerd`)을 로컬에 띄우는 것이라, 소스가 아니라 </strong>빌드 산출물**을 먹는다. 이걸 모르면 "분명히 고쳤는데 왜 그대로지" 를 반복한다.


→ [wrangler 사용법 - Cloudflare Workers 로컬 개발과 배포](../126-cloudflare-workers-wrangler-dev-deploy/)


### 3편 - 캐시 설정 방법


워커가 외부 API 를 부르기 시작하면 캐시가 필요해진다. 안 걸면 원본 부하가 페이지뷰만큼 늘어난다.


거는 방법은 둘인데 **고르는 기준이 있다.<strong> 그리고 엣지 캐시가 </strong>데이터센터마다 따로**라는 점은 알고 나면 당연하지만 모르면 "왜 캐시가 안 맞지" 로 한참 헤맨다.


→ [Cloudflare Workers 캐시 설정 방법 - 엣지 캐시와 Tiered Cache](../127-cloudflare-workers-cache-tiered-cache/)


### 4편 - React SPA SEO 개선 방법


이 시리즈의 목적지다. SPA 를 정적 호스팅에 올리면 **서버가 내보내는 HTML 에 검색엔진이 읽을 것이 없다.**


구글은 JS 를 렌더링해 주지만 그것으로 충분한지는 따져 볼 문제이고, 구글 문서 자신이 SSR 을 권한다. 이 편에서는 그 문제를 <strong>0 → 1 → 2단계</strong>로 나눠 푼다. 메타 태그만 채우는 가벼운 방법부터, `entry-client` / `entry-server` 를 분리해 본문까지 서버에서 그리는 방법까지다.


→ [React SPA SEO 개선 방법 - Cloudflare Workers로 메타 태그부터 SSR까지](../128-react-spa-seo-cloudflare-workers-ssr/)


## 다루지 않는 것


KV·R2·D1 같은 저장소 바인딩, Durable Objects, Cron Triggers 는 이 시리즈 범위 밖이다. 정적 사이트 앞에 얇은 층을 하나 두는 것까지만 다룬다.

