# hans-blog

Notion 에 글을 쓰면 Hugo 마크다운으로 변환해 Cloudflare 로 배포하는 개인 기술 블로그.

## 절대 규칙

**Notion 이 원본이다.** `content/posts/**/index.md` 를 직접 고치지 않는다. 글 내용을 바꾸려면
Notion API 로 해당 페이지를 고치고 동기화한다. 로컬 마크다운은 생성물이라 다음 동기화 때
덮어써진다.

```bash
node src/NotionCli.mjs database sync          # 발행 요청 상태인 글을 내려받는다
node src/NotionCli.mjs database sync --draft  # 초안까지 포함
```

번역본(`index.en.md` · `index.ja.md`)은 예외다. Notion 에 없으므로 직접 만들고 고친다.

## 번역

**프롬프트를 따른다. 직접 규칙을 세우지 않는다.**

| 문서 | 언제 |
| --- | --- |
| [prompts/translate-database-sync.md](prompts/translate-database-sync.md) | 동기화 후 번역할 글을 고르고 일괄 처리할 때 |
| [prompts/translate-blog-post.md](prompts/translate-blog-post.md) | 글 하나를 번역하는 상세 규칙 |

### 번역 대상 고르기

**`notion_*.json` 의 `properties["AI_번역"].checkbox` 가 `true` 인 글만 번역한다.**

`false` 인 글은 의도적으로 제외한 것이다. 한국 한정 서비스를 다루는 글처럼 영어·일본어
독자에게 의미가 없는 경우가 있다. 예를 들어 130(공공데이터포털)이 그렇다.

이미 있는 번역본은 건드리지 않는다. 없는 언어만 새로 만든다.

원문이 바뀌면 그 글은 다시 번역한다. 다만 **대표 이미지만 바뀐 경우는 재번역하지 않는다.**
이미지 경로와 alt 한 줄만 고치면 된다. 이미지 확장자가 바뀌었다면(png → jpg) 번역본도
같이 고쳐야 한다. 안 그러면 영어·일본어 페이지에서 이미지가 깨진다.

## 대표 이미지 만들기

AI 에게 SVG 를 그리게 하지 않는다. 결과가 조악하다. `hans-blog` MCP 서버의 도구를 쓴다.
구현은 [mcp/](mcp/) 에 있고 `.mcp.json` 으로 등록돼 있다.

```
generate_featured_image        프롬프트로 생성. pageId 를 주면 그 자리에서 Notion 에 올린다
attach_featured_image_to_notion  이미 만들어 둔 파일을 올릴 때만 쓴다
```

### 흐름

1. 글을 읽고 무엇을 그릴지 정한다
2. `generate_featured_image` 를 `pageId` · `caption` 과 함께 부른다
3. 사람이 노션에서 보고 고른다
4. 다시 뽑으려면 같은 `pageId` 로 한 번 더 부른다. 직전 후보는 자동으로 지워진다
5. 확정되면 동기화해서 repo 에 내려받는다

**혼자 판단해서 반려하지 않는다.** 만들었으면 올리고 사람이 고르게 한다. 취향이 갈리는
판단을 대신하지 말 것.

### 프롬프트를 쓸 때

공통 시각 스타일은 [prompts/featured-image-style.txt](prompts/featured-image-style.txt) 에
있고 **코드가 자동으로 앞에 붙인다.** 배경색·아이소메트릭·네온 액센트를 다시 적지 않는다.
`prompt` 에는 그 글만의 장면(사물·배치·연결·라벨)만 적는다.

**금지 사항을 길게 나열하지 않는다.** "no lanes, no pipes, no arrows..." 처럼 부정형을
늘어놓으면 모델이 그림 대신 텍스트로 답한다. 없는 것을 적지 말고 있는 것을 묘사한다.

자세한 작업 순서와 검수 기준은
[prompts/generate-featured-image.md](prompts/generate-featured-image.md) 에 있다.

### 비용

이미지 생성은 무료 등급을 지원하지 않는다. `.env` 의 `GEMINI_API_KEY` 는 결제가 등록된
프로젝트의 키여야 한다. 1K 기준 장당 약 $0.067 이라 시안은 1K 로 뽑는다.

## 글 쓰기

### 한국어 문체

**절을 쉼표로 잇지 않는다.** 문장을 끊는다. 쉼표로 이어 붙인 긴 문장은 AI 티가 난다.

정리나 마무리를 같은 리듬의 불릿으로 채우지 않는다. 본문을 압축해 나열만 하면 읽고 나서
남는 것이 없다. 산문으로 흐름을 만들고, 목록이 필요한 곳에만 목록을 쓴다.

### 제목 · 요약 · slug

SERP 는 글자 수가 아니라 **픽셀 폭**으로 자른다. 한글은 약 16px, ASCII 는 약 8px 다.

```
제목  600px 이내
요약  920px 이내
```

검색어를 앞에 둔다. 사람들이 그대로 복사해 검색하는 문자열(`INVALID_REQUEST_PARAMETER_ERROR`
같은 것)은 요약이나 slug 맨 앞에 넣는다.

### 글을 나눌 때

목적이 둘 섞인 글은 나눈다. 나눈 뒤에는 **끊긴 참조**를 찾는다. "뒤에 붙인 표",
"앞에서 말한" 같은 표현이 옮겨간 내용을 계속 가리키는 경우가 반드시 생긴다.

상호 링크는 Notion 페이지 멘션으로 건다. 동기화하면 `../{POST_ID}-{slug}/` 로 바뀐다.
단, **대상 글이 이미 로컬에 있어야 변환된다.** 새 글끼리 서로 링크했다면 한 번 더
동기화해야 `app.notion.com` 링크가 상대 경로로 바뀐다.

링크는 블로그 관례를 따른다. 안내 문단을 쓰고 그 아래 불릿으로 멘션을 놓는다.

## 알아둘 것

- `notion.yml` 에 `summary` 와 `slug` 키가 없다. `NotionExportService` 생성자의 기본값
  (`요약` · `slug`)에 **전적으로 의존한다.** "안 쓰이는 기본값" 이라는 주석을 믿고 지우면
  description 과 slug 가 조용히 사라진다.
- 동기화 건너뛰기는 로컬 `notion_*.json` 의 `last_edited_time` 비교로 판단한다. 코드를
  고쳐서 마크다운을 다시 만들어야 할 때는 그 값을 되돌려 강제 재생성한다.
- `.env` 를 고쳤으면 `.env.enc` 도 다시 만든다. 수신자 키는 기존과 같아야 한다
  (`gpg --list-packets .env.enc` 로 확인).
