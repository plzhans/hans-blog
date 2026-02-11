# SEO 설정

SEO(Search Engine Optimization, 검색 엔진 최적화)는 Google 등 검색 엔진이 사이트의 콘텐츠를 잘 이해하고 검색 결과에 노출시킬 수 있도록 사이트 구조와 메타데이터를 최적화하는 작업이다. 

이 문서는 블로그에 적용된 SEO 설정을 정리한다.

## 1. 절대 URL - Hugo baseURL 설정
- **파일**: `hugo/hugo.toml`
- **내용**: `baseURL = 'https://blog.plzhans.com'`
- sitemap.xml, RSS 피드, Open Graph 등에서 올바른 절대 URL이 생성됨
- Sitemap (`sitemap.xml`), RSS 피드 (`index.xml`)는 Hugo가 자동 생성
- `hugo server` (개발)에서는 자동으로 `localhost:1313`을 사용하므로 별도 처리 불필요

## 2. robots.txt 자동 생성
- **파일**: `hugo/hugo.toml`
- **내용**: `enableRobotsTXT = true`
- Hugo 빌드 시 `robots.txt` 자동 생성 (모든 크롤러 허용 + Sitemap URL 포함)

## 3. Schema.org 구조화 데이터 (JSON-LD)
- **파일**: `hugo/layouts/_default/single.html`
- 글 페이지(`type != "page"`)에 `BlogPosting` JSON-LD 삽입
- 포함 항목: headline, datePublished, dateModified, author, description, mainEntityOfPage
- Google 검색 결과에서 리치 스니펫(작성자, 날짜 등) 표시 가능

## 4. og:image (대표 이미지) / Open Graph
- **파일**: `src/services/NotionExportService.mjs`
- Notion 동기화 시 콘텐츠의 첫 번째 이미지를 감지하여 front matter `images` 필드에 자동 추가
- Open Graph 메타 태그는 Hugo 내장 템플릿(`_internal/opengraph.html`)으로 출력되며, `images`를 `og:image`로 사용

## 5. meta description / Twitter Card
- **파일**: `src/services/NotionExportService.mjs`
- Notion의 "요약" 프로퍼티를 front matter `description` 필드로 출력
- Hugo 내장 opengraph/twitter_cards 템플릿 및 baseof.html의 meta description에서 사용
- Twitter Card 메타 태그는 Hugo 내장 템플릿(`_internal/twitter_cards.html`)으로 출력
- 기타 메타 태그(author, viewport)도 테마에서 기본 제공

## 6. Canonical URL
- **파일**: `hugo/layouts/_default/baseof.html`
- 테마(`m10c`)의 `baseof.html`을 오버라이드하여 `<link rel="canonical">` 태그 추가
- `.Permalink`을 canonical URL로 사용
- 다국어 hreflang 태그도 함께 포함 (번역 페이지 존재 시 `alternate` + `x-default` 출력)

## 7. Google Analytics (GA4)
- 테마(`m10c`)에서 기본 제공
- Google Search Console 인증 시 GA 연동으로 인증 가능
