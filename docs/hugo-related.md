
# Hugo 추천글(Related Content) 설정

이 문서는 Hugo의 Related Content 기능을 사용하여 게시글 하단에 추천글을 노출하는 방법을 설명한다.

## 동작 방식

게시글 하단에는 두 가지 추천 섹션이 순서대로 표시된다.

1. **카테고리의 다른 글** — 현재 글과 같은 카테고리의 최신글 최대 5개
2. **추천 글** — Hugo Related Content 알고리즘으로 선별한 관련글 최대 5개 (1번과 중복 제외)

## Hugo Related Content 설정

[`hugo/hugo.toml`](../hugo/hugo.toml)의 `[related]` 섹션에서 동작을 제어한다.

```toml
[related]
  includeNewer = true   # 현재 글보다 최신 글도 추천 대상에 포함
  threshold = 20        # 이 점수 이상인 글만 추천 (0~100)
  toLower = false       # 태그/카테고리 소문자 비교 여부

  [[related.indices]]
    name = "tags"
    weight = 100        # 태그 일치 시 가장 높은 점수 기여

  [[related.indices]]
    name = "categories"
    weight = 70         # 카테고리 일치 시 점수 기여

  [[related.indices]]
    name = "date"
    weight = 10         # 날짜 근접도에 따른 점수 기여
```

### threshold 기준

| threshold | 설명 |
|---|---|
| 0 | 모든 글 추천 (필터 없음) |
| 20 | 카테고리만 같아도 추천 (현재 설정) |
| 50 | 태그가 어느 정도 겹쳐야 추천 |
| 80 | 태그가 많이 겹치는 글만 추천 |

포스트 수가 적은 블로그 초기에는 낮은 값을 권장한다.

## 템플릿 구현

[`hugo/layouts/_default/single.html`](../hugo/layouts/_default/single.html)에서 두 섹션을 순서대로 렌더링한다.

### 포인트

- `where .Site.RegularPages "Language.Lang" $currentLang` — 현재 언어의 글만 대상으로 검색
- `complement $categoryPosts $hugoRelatedAll` — 이미 카테고리 섹션에 표시된 글은 제외
- `.Related .`는 현재 글 자신을 자동으로 제외한다

## 추천글이 표시되지 않는 경우

Hugo Related는 태그·카테고리·날짜 점수 합산이 `threshold` 미만이면 결과를 반환하지 않는다.

**주요 원인:**

- 해당 언어의 포스트 수가 적음 (영어·일본어 번역글)
- 태그·카테고리가 다른 글과 전혀 겹치지 않음 (신규 주제 첫 글)

**대응 방법:**

1. `threshold` 값을 낮춘다
2. 태그를 더 일반적인 단어로 추가하여 늘린다.
3. 포스트가 쌓이면 자연스럽게 해결된다
