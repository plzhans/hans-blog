# SEO 설정

## 적용 완료

### 1. baseURL 설정
- **파일**: `hugo/hugo.toml`
- **내용**: `baseURL = 'https://blog.plzhans.com'`
- sitemap.xml, RSS 피드, Open Graph 등에서 올바른 절대 URL이 생성됨
- `hugo server` (개발)에서는 자동으로 `localhost:1313`을 사용하므로 별도 처리 불필요

### 2. robots.txt 자동 생성
- **파일**: `hugo/hugo.toml`
- **내용**: `enableRobotsTXT = true`
- Hugo 빌드 시 `robots.txt` 자동 생성 (모든 크롤러 허용 + Sitemap URL 포함)

### 3. Schema.org 구조화 데이터 (JSON-LD)
- **파일**: `hugo/layouts/_default/single.html`
- 글 페이지(`type != "page"`)에 `BlogPosting` JSON-LD 삽입
- 포함 항목: headline, datePublished, dateModified, author, description, mainEntityOfPage
- Google 검색 결과에서 리치 스니펫(작성자, 날짜 등) 표시 가능

### 4. Google Search Console 인증
- Google Analytics(GA4)가 이미 설정되어 있으므로 GA 연동으로 인증 가능
- 별도 파일 방식 사용 시: Google 제공 HTML 파일을 `hugo/static/`에 배치

### 5. og:image (대표 이미지)
- **파일**: `src/services/NotionExportService.mjs`
- Notion 동기화 시 콘텐츠의 첫 번째 이미지를 감지하여 front matter `images` 필드에 자동 추가
- Hugo 내장 opengraph 템플릿이 `images`를 `og:image`로 출력

### 6. meta description
- **파일**: `src/services/NotionExportService.mjs`
- Notion의 "요약" 프로퍼티를 front matter `description` 필드로 출력
- Hugo 내장 opengraph/twitter_cards 템플릿 및 baseof.html의 meta description에서 사용

## 기존 설정 (테마 내장)

- Google Analytics (GA4)
- Open Graph 메타 태그 (`_internal/opengraph.html`)
- Twitter Card 메타 태그 (`_internal/twitter_cards.html`)
- Sitemap 자동 생성 (`sitemap.xml`)
- RSS 피드 (`index.xml`)
- 메타 태그: author, description, viewport

## 미적용 (참고)

### Canonical URL
- 테마(`m10c`)의 `baseof.html`에 확장 포인트(`block`)가 없어서 추가하려면 전체 파일 오버라이드 필요
- 테마 업데이트 시 수동 동기화 부담이 있어 보류
