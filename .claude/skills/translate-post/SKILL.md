---
name: translate-post
description: hans-blog 의 발행된 글을 영어(index.en.md)와 일본어(index.ja.md)로 번역한다. 동기화 뒤 번역 대상을 골라 일괄 처리하거나 특정 글 하나만 번역할 때 쓴다. 사용자가 "번역해줘", "en/ja 만들어줘", "번역 대상 찾아줘" 라고 하거나 /translate-post 를 부르면 사용한다.
---

# 블로그 글 번역

`content/posts/**/index.md` 는 Notion 에서 동기화된 한국어 원문이다. 같은 디렉터리에
`index.en.md` 와 `index.ja.md` 를 만든다.

**원문을 고치지 않는다.** `index.md` 는 생성물이라 다음 동기화에 덮어써진다. 원문이 잘못됐으면
번역을 멈추고 Notion 을 고친 뒤 다시 동기화한다. 이때 **상태를 `발행 요청` 으로 되돌려야 한다.**
`발행 완료` 인 글은 동기화 대상에서 빠진다.

## 1단계 · 대상 고르기

인자로 글이 지정되면 그 글만 한다. 아니면 아래 조건을 모두 만족하는 글을 찾는다.

- 같은 디렉터리의 `notion_*.json` 에서 `properties["AI_번역"].checkbox` 가 `true`
- `index.en.md` 또는 `index.ja.md` 가 아직 없다

```bash
for j in content/posts/*/*/notion_*.json; do
  d=$(dirname "$j")
  on=$(python3 -c "import json,sys;print(json.load(open('$j'))['properties'].get('AI_번역',{}).get('checkbox',False))")
  [ "$on" = "True" ] || continue
  [ -f "$d/index.en.md" ] && [ -f "$d/index.ja.md" ] && continue
  echo "$d"
done
```

`false` 는 의도적 제외다. 한국 한정 서비스를 다루는 글이 여기 해당한다(예: 공공데이터포털).
체크박스를 임의로 켜지 않는다.

이미 있는 번역본은 건드리지 않는다. 한쪽만 있으면 없는 쪽만 만든다.

대상을 사람에게 알리고 시작한다.

## 2단계 · 번역

대상이 여럿이면 **한 메시지에서 Write 를 병렬로 호출한다.** 번역은 오래 걸리므로 순차로
돌리지 않는다. 글이 아주 많으면 스크립트로 묶는 편이 빠를 수 있다.

### 그대로 두는 것

- 코드 블록 안의 모든 것. 명령어, 설정, 출력, 변수명, 함수명
- 이미지 경로 (`assets/1_....jpg`)
- 상호 링크 경로 (`../134-garage-docker-install-s3-object-storage/`). 경로는 언어 공용이다
- front matter 의 `id` · `translationKey` · `slug` · `date` · `lastmod` · `categories` · `tags` · `toc` · `draft` · `images`
- 원문에 있는 영어 기술 용어. 굳이 옮기지 않는다

### 번역하는 것

- 본문 한국어 전부. 문단, 표, 목록, 인용
- front matter 의 `title` 과 `description`
- **이미지 alt 텍스트.** 대괄호 안의 캡션이다. 비어 있으면(`![]`) 비운 채로 둔다
- 링크의 표시 텍스트. 경로는 그대로 두고 대괄호 안만 옮긴다
- mermaid 코드 블록 안의 한국어. 코드 블록 예외의 유일한 예외다

### 언어별 문체

**영어** — 기술 문서로 자연스러운 영어. 직역이 어색하면 문장을 다시 쓴다. 한국어의
"~한다" 체를 억지로 옮기지 말고 평서문으로 간다.

**일본어** — です・ます체.

두 언어 모두 원문의 마크다운 구조를 그대로 보존한다. 문단을 합치거나 쪼개지 않는다.

## 3단계 · 검수

- front matter 필드 순서와 들여쓰기가 원문과 같은가
- 코드 블록의 내용과 언어 태그가 원문과 같은가
- 한국어가 남아 있지 않은가 (코드 블록과 고유명사 제외)
- 이미지 경로와 링크 경로가 원문과 같은가
- alt 텍스트가 번역됐는가. 빈 alt 를 채우지는 않았는가
- `AI_번역` 이 `true` 인 글만 건드렸는가

## 대표 이미지만 바뀐 경우

재번역하지 않는다. 번역본의 이미지 경로와 alt 한 줄만 고친다.
**단 확장자가 바뀌었으면(png → jpg) 번역본도 반드시 고친다.** 안 그러면 en/ja 에서 이미지가 깨진다.
