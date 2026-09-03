---
id: "123"
translationKey: "123"
slug: "123-hugo-blog-guide"
title: "Hugo 블로그 만들기 - 시작부터 SEO까지"
description: "Notion→Hugo→GitHub Pages로 블로그를 만들고, 커스텀 도메인 연결, 다국어 지원, 보안 헤더 적용까지 순서대로 정리합니다."
categories:
  - "web"
tags:
  - "github-pages"
  - "hugo"
  - "seo"
date: 2026-09-03T00:00:00.000Z
lastmod: 2026-09-03T11:03:00.000Z
toc: true
draft: false
---


## 개요


이 블로그 자체가 이 순서대로 구축됐다. Notion에서 글을 쓰고 Markdown으로 변환해 Hugo로 빌드하고 GitHub Pages로 배포하는 파이프라인부터, 커스텀 도메인 연결, 다국어 지원, 보안 헤더까지 순서대로 정리했다.


## 왜 이 조합인가


정적 사이트는 서버를 따로 운영할 필요가 없고, GitHub Pages 같은 무료 호스팅에 올리면 그 자체로 빠르고 안정적이다. 문제는 "정적"이라는 말대로 글쓰기 경험이 불편해지기 쉽다는 점인데, Notion을 CMS로 쓰면 이 문제가 해결된다 — 평소 쓰던 에디터에서 글을 쓰고, API로 Notion 페이지를 그대로 Markdown으로 끌어와 빌드하면 된다. Hugo는 정적 사이트 생성기 중에서도 빌드 속도가 빠르고 테마 생태계가 갖춰져 있어 선택했다.


## 전체 아키텍처


Notion(글 작성) → 동기화 스크립트(Notion API로 Markdown 변환) → Hugo(정적 사이트 빌드) → GitHub Actions(커밋 시 자동 빌드·배포) → GitHub Pages(호스팅) → Cloudflare(CDN·보안 헤더) 순서로 이어진다. 글을 쓰고 "발행 요청" 상태로 바꾸기만 하면, 나머지는 자동화된 파이프라인이 처리한다.


## 구축 순서

1. 기본 블로그부터 만든다 → [Hugo + Github 블로그 만들기](../94-hugo-github-blog/)
2. 내 도메인을 연결한다 → [Github pages 커스텀 도메인 사용하기](../86-github-pages-custom-domain/)
3. 여러 언어로 확장한다 → [hugo site 다국어 지원하기](../93-hugo-multilingual-seo-setup/)
4. 보안 헤더로 마무리한다 → [SEO 감사가 지적한 보안 헤더 4개, Cloudflare에서 코드 없이 적용하기](../120-cloudflare-security-headers-hsts-csp/)

## Hugo + GitHub 블로그 만들기 — 기본 파이프라인


Notion→Markdown→Hugo 빌드→GitHub Pages 배포 흐름 전체를 정리했다. Hugo 설치, m10c 테마 적용, GitHub Actions 자동 배포, baseURL 설정에서 흔히 나는 실수까지 다룬다. 이 단계만 끝내도 글쓰기부터 배포까지 완전히 자동화된 파이프라인을 갖추게 된다.


→ [Hugo + Github 블로그 만들기](../94-hugo-github-blog/)


## GitHub Pages 커스텀 도메인 — 내 도메인 연결하기


CNAME·A/AAAA 레코드 설정, GitHub Pages의 Custom domain 적용 절차, Actions 배포와 브랜치 배포의 CNAME 파일 처리 차이, CAA 레코드 때문에 Enforce HTTPS가 안 켜지는 원인까지 정리했다. [github.io](http://github.io/) 서브도메인 대신 자기 도메인을 쓰면 브랜딩뿐 아니라 검색 엔진에도 더 일관된 신호를 준다.


→ [Github pages 커스텀 도메인 사용하기](../86-github-pages-custom-domain/)


## Hugo 다국어 지원 — SEO까지 챙기기


다국어 블로그에서 baseURL, sitemap, robots, JSON-LD, Open Graph, meta description을 설정하고 hreflang·canonical로 중복 콘텐츠 문제를 막는 방법을 정리했다. 언어별 sitemap을 따로 관리하지 않으면 색인 문제로 이어지기 쉬운 부분이라, 처음부터 구조를 잡아두는 게 중요하다.


→ [hugo site 다국어 지원하기](../93-hugo-multilingual-seo-setup/)


## 보안 헤더 — SEO 감사가 지적하는 이유


HSTS·CSP·X-Content-Type-Options·Referrer-Policy를 SEO 감사가 왜 지적하는지, 값이 고정된 헤더는 Cloudflare Transform Rules로, 자주 바뀌는 CSP는 HTML meta 태그로 나눠 관리하는 방법을 정리했다. 정적 사이트라 서버 설정 파일이 없는 만큼, 이런 헤더는 CDN이나 meta 태그 레벨에서 별도로 챙겨야 한다.


→ [SEO 감사가 지적한 보안 헤더 4개, Cloudflare에서 코드 없이 적용하기](../120-cloudflare-security-headers-hsts-csp/)


## 이 블로그가 실제로 겪은 문제들


"정적 사이트라 간단하다"는 가정과달리, 실제 운영하면서는 예상치 못한 문제들이 계속 나왔다.

- **구글 색인 지연** — 사이트맵을 제출해도 Googlebot이 재방문하지 않으면 새 글이 몇 주씩 색인되지 않는다. 사이트맵 재제출과 GSC URL 검사를 주기적으로 점검해야 한다.
- **이미지 로딩 우선순위** — 목록 페이지의 첫 카드 이미지는 LCP(최대 콘텐츠프리 페인트) 후보라 eager 로딩이 필요한데, "배열 인덱스 0번"과 "실제로 렌더링되는 첫 카드"가 항상 일치하지는 않는다(이미지 없는 글이 메인 목록 에 섞이면 어긍나간다).
- **메타 태그 길이** — 구글은 title·meta description을 글자 수가 아니라 고정 픽셀 폭(데스크톱 약 600~920px) 기준으로 자르는데, 한글 음절은 로마자보다 넣게 렌더링되어 같은 글자 수에도 더 일찍 잘린다.
- **다국어 lastmod 동기화** — 한국어 원본만 수정하고 번역본을 같이 손보지 않으면, 번역본 사이트맵의 lastmod가 실제 변경일과 어깋나면서 사이트맵 신뢰도가 떨어진다.

공통점은 하나다: 코드가 "논리적으로 정상"이라는 것과 "실제 라이브 사이트에서 의도대로 동작하는가"는 별개의 문제라서, 배포 후 반드시 라이브 페이지를 직접 확인하는 습관이 필요하다.


## 다음 단계


사이트가 자리잡은 뒤로는 Google Search Console 색인 관리, 사이트맵 커버리지 점검, 성능(Core Web Vitals) 최적화처럼 지속적인 SEO 운영이 더 중요해진다. 이 블로그도 실제로 그 과정에서 나온 문제들을 별도 포스트로 계속 정리하고 있다.

