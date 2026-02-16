---
id: "93"
translationKey: "93"
slug: "93-hugo-multilingual-seo-setup"
title: "hugo site 다국어 지원하기"
description: "Hugo 정적 사이트 생성기로 다국어 블로그를 구축할 때 필요한 SEO 최적화 및 다국어 설정 방법을 설명합니다. sitemap.xml, robots.txt, Schema.org JSON-LD, Open Graph, meta description 등 검색 엔진 최적화 설정을 자동화하고, HTML lang 속성, hreflang 태그, canonical URL을 통해 다국어 콘텐츠의 중복 문제를 방지하는 방법을 다룹니다. hugo.toml에서 defaultContentLanguageInSubdir 설정, translationKey로 언어 간 연결, 테마 baseof.html 오버라이드를 통한 SEO 태그 추가 방법을 설명하며, url 대신 slug 사용으로 언어별 URL 충돌을 해결하는 실전 트러블슈팅을 제공합니다."
categories:
  - "infra"
tags:
  - "hugo"
  - "seo"
date: 2026-02-11T09:55:00.000Z
lastmod: 2026-02-11T09:55:00.000Z
toc: true
draft: false
---


## 목표


Hugo 블로그에 다국어 지원과 SEO 최적화를 적용하여 검색 엔진 노출을 극대화하고 다국어 사용자에게 적절한 언어 버전을 제공한다.


---


## SEO 설정


SEO(Search Engine Optimization, 검색 엔진 최적화)는 Google 등 검색 엔진이 사이트의 콘텐츠를 잘 이해하고 검색 결과에 노출시킬 수 있도록 사이트 구조와 메타데이터를 최적화하는 작업이다. 


이 문서는 블로그에 적용된 SEO 설정을 정리한다.


### 1. 절대 URL - Hugo baseURL 설정

- **파일**: `hugo/hugo.toml`
- **내용**: `baseURL = '`[`https://blog.plzhans.com`](https://blog.plzhans.com/)`'`
- sitemap.xml, RSS 피드, Open Graph 등에서 올바른 절대 URL이 생성됨
- Sitemap (`sitemap.xml`), RSS 피드 (`index.xml`)는 Hugo가 자동 생성
- `hugo server` (개발)에서는 자동으로 [`localhost:1313`](http://localhost:1313/)을 사용하므로 별도 처리 불필요

### 2. robots.txt 자동 생성

- **파일**: `hugo/hugo.toml`
- **내용**: `enableRobotsTXT = true`
- Hugo 빌드 시 `robots.txt` 자동 생성 (모든 크롤러 허용 + Sitemap URL 포함)

### 3. [Schema.org](http://schema.org/) 구조화 데이터 (JSON-LD)

- **파일**: `hugo/layouts/_default/single.html`
- 글 페이지(`type != "page"`)에 `BlogPosting` JSON-LD 삽입
- 포함 항목: headline, datePublished, dateModified, author, description, mainEntityOfPage
- Google 검색 결과에서 리치 스니펫(작성자, 날짜 등) 표시 가능

### 4. og:image (대표 이미지) / Open Graph

- **파일**: `src/services/NotionExportService.mjs`
- Notion 동기화 시 콘텐츠의 첫 번째 이미지를 감지하여 front matter `images` 필드에 자동 추가
- Open Graph 메타 태그는 Hugo 내장 템플릿(`_internal/opengraph.html`)으로 출력되며, `images`를 `og:image`로 사용

### 5. meta description / Twitter Card

- **파일**: `src/services/NotionExportService.mjs`
- Notion의 "요약" 프로퍼티를 front matter `description` 필드로 출력
- Hugo 내장 opengraph/twitter_cards 템플릿 및 baseof.html의 meta description에서 사용
- Twitter Card 메타 태그는 Hugo 내장 템플릿(`_internal/twitter_cards.html`)으로 출력
- 기타 메타 태그(author, viewport)도 테마에서 기본 제공

### 6. Canonical URL

- **파일**: `hugo/layouts/_default/baseof.html`
- 테마(`m10c`)의 `baseof.html`을 오버라이드하여 `<link rel="canonical">` 태그 추가
- `.Permalink`을 canonical URL로 사용
- 다국어 hreflang 태그도 함께 포함 (번역 페이지 존재 시 `alternate` + `x-default` 출력)

### 7. Google Analytics (GA4)

- 테마(`m10c`)에서 기본 제공
- Google Search Console 인증 시 GA 연동으로 인증 가능

---


## 다국어 SEO 핵심 요소


### HTML lang 속성


페이지 언어를 명시하여 검색 엔진과 스크린 리더에 언어 정보를 제공한다.


```html
<html lang="ko">
```


### link rel alternate hreflang


각 언어별 페이지 URL을 검색 엔진에 알려 중복 콘텐츠 문제를 방지한다.


```html
<link rel="alternate" hreflang="ko" href="https://blog.plzhans.com/ko/post/example/">
<link rel="alternate" hreflang="en" href="https://blog.plzhans.com/en/post/example/">
<link rel="alternate" hreflang="ja" href="https://blog.plzhans.com/ja/post/example/">
<link rel="alternate" hreflang="x-default" href="https://blog.plzhans.com/ko/post/example/">
```


### Canonical URL (다국어)


각 언어를 전문 번역으로 작성했다면 canonical을 생략하여 모든 언어 버전을 독립 원본으로 인정받을 수 있다.


```html
<link rel="canonical" href="https://blog.plzhans.com/ko/post/example/">
```


---


## Hugo 다국어 구현


### 1. 테마 다국어 지원 확인


**lang 속성 확인** (`themes/{테마}/layouts/_default/baseof.html`)


```html
<!doctype html>
<html lang=" .Site.Language.Lang ">
```


**relLangURL 지원 확인**


홈 링크가 언어별 URL을 유지하는지 확인한다. 미지원 시 baseof.html을 오버라이딩한다.


```html
<body>
  <header class="app-header">
    <a href=" .Site.Home.RelPermalink "><img class="app-header-avatar" src="..." alt="..." /></a>
```


### 2. hugo.toml 다국어 설정


```toml
# 기본 콘텐츠 언어
defaultContentLanguage = "ko"
# 기본 언어도 서브디렉토리에 포함 (/ko/)
defaultContentLanguageInSubdir = true

[languages]
  [languages.ko]
    weight = 1
    languageName = "한국어"

  [languages.en]
    weight = 2
    languageName = "English"

  [languages.ja]
    weight = 3
    languageName = "日本語"
```


### 3. canonical 태그 추가


테마가 미지원 시 baseof.html을 오버라이딩한다.


```html
<link rel="canonical" href=" .Permalink " />
```


### 4. hreflang 태그 생성


**콘텐츠 파일에 translationKey 설정**


```markdown
---
id: "80"
translationKey: "80"
slug: "80-redis-dump-vs-aof"
title: "Redis dump vs aof"
---
```


**baseof.html에 hreflang 추가** (테마 미지원 시 오버라이딩)


```html
<link rel="alternate" hreflang=" .Language.Lang " href=" .Permalink " />
<link rel="alternate" hreflang="x-default" href=" .Permalink " />
```


---


## 트러블슈팅


### URL 중복 충돌


Hugo에서 게시물 주소를 설정할 때 `url` 대신 `slug`를 사용해야 한다.


**원인**

- `slug`로 설정하면 `/ko/`, `/en/` 등 언어 접두사가 자동으로 추가됨
- `url`로 강제 지정하면 Hugo가 언어 코드를 자동으로 추가하지 않음
- `url` 사용 시 `/ko/post/example`, `/en/post/example`처럼 각 언어별로 url 자체에 언어 코드를 직접 넣어줘야 함
- `url`에 언어 코드 없이 동일한 경로를 지정하면 서로 다른 언어의 게시물이 동일한 URL을 가지게 되어 충돌 발생

**해결**

- `url` 대신 `slug` 사용으로 전환
- `hugo.toml`에서 `defaultContentLanguageInSubdir = true` 설정하여 기본 언어를 포함한 모든 언어가 서브디렉토리 구조를 갖도록 함

**참고**

- `slug`만 지정하면 언어 코드는 자동 추가되지만, slug 자체가 특정 언어로 작성된 경우 각 언어별로 번역해야 한다. slug는 영어로 작성하는 것을 권장한다.

### translationKey 추가했으나 hreflang 미생성


**원인**

- 테마가 hreflang 태그 생성을 지원하지 않음.

**해결**

- baseof.html에 hreflang 관련 코드를 오버라이딩하여 추가

---


## 참조

- [Multi-language Website SEO with Hugo](https://www.glukhov.org/de/post/2025/10/multi-language-website-seo-with-hugo/)
