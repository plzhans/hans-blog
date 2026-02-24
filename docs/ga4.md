

# Google Analytics (GA4) 기반 인기글 파이프라인

이 문서는 GA4 맞춤 이벤트를 수집하고 `ga4:export` 스크립트로 언어별 인기 글 데이터를 생성하는 전체 흐름을 설명한다.

## 1. GA4 사전 설정

### 맞춤 측정기준 등록

관리 → 속성 설정 → 데이터 표시 → 맞춤 정의 → 맞춤 측정기준 만들기  
- 이름: `post_view`  
- 범위: `이벤트`

### 지표 확인 경로
  
Google Analytics → 탐색(Explore)에서 `post_view` 이벤트와 매개변수를 확인한다.

## 2. 사이트 계측 (single.html)

게시글이 렌더될 때 `post_view` 이벤트를 발송하도록 템플릿을 수정한다.

```html
<script>
  gtag('event', 'post_view', {
    post_id: '{{ .Params.id }}',
    post_slug: '{{ .Params.slug }}'
  });
</script>
```

## 3. 데이터 집계

- `ga4:export`는 Google Analytics Data API에서 `post_view` 커스텀 이벤트를 가져와 언어·슬러그별로 집계한다.
- API 호출과 데이터 정리는 [`GoogleAnalyticsService`](../src/services/GoogleAnalyticsService.mjs)에서 처리한다.
- 결과를 언어별 JSON으로 저장하는 역할은 [`PopularPostsService`](../src/services/PopularPostsService.mjs)가 담당한다.

**실행 순서**
1. [`config.yml`](../config.yml)의 `googleAnalytics.propertyId`로 조회 대상을 결정한다.
2. 측정기준 `post_slug`, 측정항목(조회수)을 포함해 GA Data API를 호출한다.
3. `PopularPostsService`가 응답을 `data/popular/ko.json`, `en.json`, `ja.json`에 기록한다.
4. 인증을 위해 [`config/google_service_account.json`](../config/google_service_account.json)에 서비스 계정 키가 필요하며, GitHub Actions에서는 동일 키를 시크릿으로 제공한다.

로컬 실행 예시
```bash
npm run ga4:export
```

## 4. 자동 실행

`ga4:export`는 [GitHub Action ga4-popular-posts 워크플로](../.github/workflows/ga4-popular-posts.yml)에 의해 주기적으로 실행되어 최신 인기 글 데이터를 자동 갱신한다.


## 5. 주의 사항 및 모범 사례

- GA4 커스텀 파라미터 dimension 형식: `customEvent:파라미터명`
- 데이터 수집 후 **24~48시간** 이후부터 API 조회가 가능하다.
- 서비스 계정 JSON 키는 절대 Git에 커밋하지 않으며 `.gitignore`에 반드시 포함한다.
