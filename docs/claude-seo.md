# claude-seo 설정 가이드

[claude-seo](https://claude-seo.md/)는 Claude Code 플러그인으로, `/seo audit` 등의 명령으로 이 블로그의 SEO 상태를 감사한다. 이 문서는 감사 정확도를 높이기 위한 API 자격 증명 설정과, 이 프로젝트에서 채택한 계정 분리 방식을 정리한다.

## 1. 자격 증명 없이도 동작함

`/seo audit`은 API 키 없이도 기본 동작한다(로컬 랩 데이터 기반 추정치). 아래 설정은 랩 데이터 추정치를 실제 필드 데이터로 대체하기 위한 선택 사항이다.

## 2. Google API 설정 (PSI/CrUX + GSC + GA4)

### 2.1 무엇을 제공하는가
- **PageSpeed Insights / CrUX**: 실제 사용자 체감 Core Web Vitals(LCP/INP/CLS) 필드 데이터. 무료, API 키만 필요.
- **Google Search Console (GSC)**: 실제 색인 상태, 검색 노출/클릭 데이터. 서비스 계정 필요.
- **GA4 Data API**: 실제 트래픽/유입 경로 데이터. 서비스 계정 필요. ("Google Analytics Admin API"와는 다른 API이니 혼동 주의)

### 2.2 이 프로젝트의 서비스 계정 재사용
이 블로그는 [`ga4-popular-posts.yml`](../.github/workflows/ga4-popular-posts.yml) 워크플로에서 이미 GA4 조회용 서비스 계정(`hans-blog-server@hans-blog-488406.iam.gserviceaccount.com`)을 사용 중이다. claude-seo에도 동일 서비스 계정을 재사용했다. GSC 조회를 위해서는 [Search Console](https://search.google.com/search-console) → 설정 → 사용자 및 권한에서 이 서비스 계정 이메일을 별도로 추가해야 한다(GA4 권한과는 별개).

### 2.3 claude-seo 자격 증명 로딩 구조와 한계
claude-seo는 자격 증명을 `~/.config/claude-seo/google-api.json` 파일에서 읽고, 파일에 없는 필드만 환경변수(`GOOGLE_API_KEY`, `GOOGLE_APPLICATION_CREDENTIALS`, `GA4_PROPERTY_ID`, `GSC_PROPERTY`)로 채우는 fallback 구조다. **프로젝트별로 다른 값을 구분해서 관리하는 기능은 없다** — 사용자 홈 디렉토리 전역에 파일 하나만 존재하는 구조라서, 여러 사이트/계정을 다루면 실수로 다른 프로젝트의 계정이 섞여 쓰일 위험이 있다.

### 2.4 이 프로젝트에서 채택한 방식: 프로젝트 scoped 환경변수
전역 config 파일(`~/.config/claude-seo/google-api.json`)은 비워두고(`{}`), 이 프로젝트의 `.claude/settings.local.json`(git 미추적)의 `env` 필드로 자격 증명을 주입한다. 파일이 비어 있으므로 환경변수 fallback이 정상 작동하고, 다른 프로젝트에서는 이 값이 적용되지 않아 계정이 섞이지 않는다.

```json
// .claude/settings.local.json (git에 커밋되지 않음)
{
  "env": {
    "GOOGLE_API_KEY": "...",
    "GOOGLE_APPLICATION_CREDENTIALS": "/절대/경로/config/google_service_account.json",
    "GA4_PROPERTY_ID": "properties/522883402",
    "GSC_PROPERTY": "sc-domain:plzhans.com"
  }
}
```

> ⚠️ API 키/서비스 계정 경로 등 민감정보이므로 반드시 `settings.local.json`(git 미추적)에만 작성하고, 팀 공유용인 `settings.json`에는 절대 넣지 않는다.

### 2.5 검증 방법
```bash
claude-seo run google_auth.py --check   # Tier 2 (Full)이면 정상
claude-seo run gsc_query.py sites       # GSC 실제 조회 권한 확인
```

## 3. 백링크 API (Moz / Common Crawl)

Moz/Bing 키 없이도 Common Crawl 기반 기본 분석은 가능하나, 이 사이트는 아직 Common Crawl에 수집되지 않은 상태다. 관련 진행 상황은 GitHub 이슈로 추적한다:
- [#5 Common Crawl 백링크 데이터 미수집](https://github.com/plzhans/hans-blog/issues/5)
- [#6 Moz 무료 API 키 등록](https://github.com/plzhans/hans-blog/issues/6)

## 4. Drift 베이스라인 (변경 감지)

`/seo drift baseline`으로 현재 사이트의 SEO 핵심 요소(타이틀, 메타, canonical, 스키마 등) 스냅샷을 저장해두면, 이후 `/seo drift compare`로 배포 전후 회귀 여부를 자동 비교할 수 있다. 저장 위치는 `~/.cache/claude-seo/drift/baselines.db` (SQLite, 사용자 홈 캐시 — 이 저장소와 무관).

```bash
claude-seo run drift_baseline.py https://blog.plzhans.com
```

## 5. 감사 결과물

`/seo audit` 실행 결과는 `blog.plzhans.com-audit/`에 저장된다(`.gitignore` 처리됨, 재실행 시 덮어씀).
