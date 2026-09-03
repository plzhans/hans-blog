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
lastmod: 2026-09-03T08:50:00.000Z
toc: true
draft: false
---


## 개요


이 블로그 자체가 이 순서대로 구축됐다. Notion에서 글을 쓰고 Markdown으로 변환해 Hugo로 빌드하고 GitHub Pages로 배포하는 파이프라인부터, 커스텀 도메인 연결, 다국어 지원, 보안 헤더까지 순서대로 정리했다.


## 구축 순서

1. 기본 블로그부터 만든다 → [Hugo + Github 블로그 만들기](../94-hugo-github-blog/)
2. 내 도메인을 연결한다 → [Github pages 커스텀 도메인 사용하기](../86-github-pages-custom-domain/)
3. 여러 언어로 확장한다 → [hugo site 다국어 지원하기](../93-hugo-multilingual-seo-setup/)
4. 보안 헤더로 마무리한다 → [SEO 감사가 지적한 보안 헤더 4개, Cloudflare에서 코드 없이 적용하기](../120-cloudflare-security-headers-hsts-csp/)

## Hugo + GitHub 블로그 만들기 — 기본 파이프라인


Notion→Markdown→Hugo 빌드→GitHub Pages 배포 흐름 전체를 정리했다. Hugo 설치, m10c 테마 적용, GitHub Actions 자동 배포, baseURL 설정에서 흔히 나는 실수까지 다룬다.


→ [Hugo + Github 블로그 만들기](../94-hugo-github-blog/)


## GitHub Pages 커스텀 도메인 — 내 도메인 연결하기


CNAME·A/AAAA 레코드 설정, GitHub Pages의 Custom domain 적용 절차, Actions 배포와 브랜치 배포의 CNAME 파일 처리 차이, CAA 레코드 때문에 Enforce HTTPS가 안 켜지는 원인까지 정리했다.


→ [Github pages 커스텀 도메인 사용하기](../86-github-pages-custom-domain/)


## Hugo 다국어 지원 — SEO까지 챙기기


다국어 블로그에서 baseURL, sitemap, robots, JSON-LD, Open Graph, meta description을 설정하고 hreflang·canonical로 중복 콘텐츠 문제를 막는 방법을 정리했다.


→ [hugo site 다국어 지원하기](../93-hugo-multilingual-seo-setup/)


## 보안 헤더 — SEO 감사가 지적하는 이유


HSTS·CSP·X-Content-Type-Options·Referrer-Policy를 SEO 감사가 왜 지적하는지, 값이 고정된 헤더는 Cloudflare Transform Rules로 자주 바뀌는 CSP는 HTML meta 태그로 나눠 관리하는 방법을 정리했다.


→ [SEO 감사가 지적한 보안 헤더 4개, Cloudflare에서 코드 없이 적용하기](../120-cloudflare-security-headers-hsts-csp/)

