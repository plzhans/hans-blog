# hans-blog

Notion 에 글을 쓰면 Hugo 마크다운으로 변환해 Cloudflare 로 배포하는 개인 기술 블로그.

## 절대 규칙

**Notion 이 원본이다.** `content/posts/**/index.md` 를 직접 고치지 않는다. 내용을 바꾸려면
Notion API 로 페이지를 고치고 동기화한다. 로컬 마크다운은 생성물이라 덮어써진다.

```bash
node src/NotionCli.mjs database sync          # 발행 요청 상태인 글
node src/NotionCli.mjs database sync --draft  # 초안까지
```

번역본(`index.en.md` · `index.ja.md`)만 예외다. Notion 에 없으므로 직접 만든다.

## skills/

| 스킬 | 언제 |
| --- | --- |
| [new-post](.claude/skills/new-post/SKILL.md) | 새 글을 쓸 때. 실습 대화 → 목차 협의 → 초안 → Notion 생성 → 동기화 |
| [translate-post](.claude/skills/translate-post/SKILL.md) | 동기화한 글을 en·ja 로 번역할 때. 대상 선별과 언어별 문체 |

두 스킬 모두 승인 없이 다음 단계로 넘어가지 않고, 원문(`content/posts/**/index.md`)을
직접 고치지 않는다.

`.claude` 는 개인 설정이 섞여 있어 git 이 무시하지만 `.claude/skills/` 만은 추적한다.

## prompts/

작업별 규칙이 여기 있다. **시작하기 전에 읽는다. 직접 규칙을 세우지 않는다.**

| 파일 | 언제 |
| --- | --- |
| [generate-featured-image.md](prompts/generate-featured-image.md) | 대표 이미지를 만들 때. 순서·프롬프트 작성법·검수·비용 |
| [claude-seo.md](prompts/claude-seo.md) | 발행된 글의 SEO 를 점검할 때 |
| [featured-image-style.md](prompts/featured-image-style.md) | 읽지 않아도 된다. 코드가 이미지 프롬프트 앞에 자동으로 붙인다 |

`featured-image-style.md` 는 **코드 블록 안만 모델에게 전달된다.** 스타일을 바꾸려면
블록 안을 고친다. 바깥 설명은 전달되지 않는다.

## 번역

**`notion_*.json` 의 `properties["AI_번역"].checkbox` 가 `true` 인 글만** 번역한다.
`false` 는 의도적 제외다. 한국 한정 서비스를 다루는 글은 번역하지 않는다(예: 130 공공데이터포털).

**대표 이미지만 바뀌면 재번역하지 않는다.** 경로와 alt 한 줄만 고친다. 다만 확장자가
바뀌었다면(png → jpg) 번역본도 고쳐야 한다. 안 그러면 en/ja 에서 이미지가 깨진다.

## 대표 이미지

AI 에게 SVG 를 그리게 하지 않는다. 결과가 조악하다. `hans-blog` MCP 서버([mcp/](mcp/))의
`generate_featured_image` 를 `pageId` · `caption` 과 함께 부르면 생성 즉시 Notion 에 올라간다.

**혼자 판단해서 반려하지 않는다.** 만들었으면 올리고 사람이 고르게 한다. 다시 뽑으려면
같은 `pageId` 로 한 번 더 부른다. 직전 후보는 자동으로 지워진다.

나머지는 [prompts/generate-featured-image.md](prompts/generate-featured-image.md) 에 있다.

## 글 쓰기

**절을 쉼표로 잇지 않는다.** 문장을 끊는다. 쉼표로 이어 붙인 긴 문장은 AI 티가 난다.

정리나 마무리를 같은 리듬의 불릿으로 채우지 않는다. 본문을 압축해 나열만 하면 읽고 나서
남는 것이 없다. 산문으로 흐름을 만들고 목록이 필요한 곳에만 목록을 쓴다.

제목과 요약은 글자 수가 아니라 **픽셀 폭**으로 잘린다. 한글 약 16px, ASCII 약 8px 기준으로
제목 600px, 요약 920px 안에 맞춘다. 사람들이 그대로 복사해 검색하는 문자열
(`INVALID_REQUEST_PARAMETER_ERROR` 같은 것)은 요약이나 slug 맨 앞에 둔다.

글을 나눈 뒤에는 **끊긴 참조**를 찾는다. "뒤에 붙인 표" 같은 표현이 옮겨간 내용을 계속
가리키는 경우가 반드시 생긴다.

상호 링크는 Notion 페이지 멘션으로 건다. 동기화하면 `../{POST_ID}-{slug}/` 로 바뀐다.
단 **대상 글이 이미 로컬에 있어야 변환된다.** 새 글끼리 링크했다면 한 번 더 동기화한다.
안내 문단을 쓰고 그 아래 불릿으로 멘션을 놓는 것이 이 블로그 관례다.

## 알아둘 것

- `notion.yml` 에 `summary` 와 `slug` 키가 없다. `NotionExportService` 생성자의 기본값에
  **전적으로 의존한다.** "안 쓰이는 기본값" 이라는 주석을 믿고 지우면 description 과 slug 가
  조용히 사라진다.
- **이미 발행된 글을 고쳤으면 상태를 `발행 요청` 으로 되돌려야 동기화된다.** `발행 완료` 는
  동기화 대상이 아니다. 오타 하나를 고쳐도 마찬가지다.
- 동기화 건너뛰기는 로컬 `notion_*.json` 의 `last_edited_time` 비교로 판단한다. 코드를 고쳐
  마크다운을 다시 만들어야 할 때는 그 값을 되돌려 강제 재생성한다.
- `.env` 를 고쳤으면 `.env.enc` 도 다시 만든다. 수신자 키는 기존과 같아야 한다
  (`gpg --list-packets .env.enc` 로 확인).
