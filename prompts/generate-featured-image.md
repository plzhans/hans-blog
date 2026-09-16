# 블로그 대표 이미지 생성 프롬프트

## 목적

블로그 글의 대표 이미지를 이미지 모델 API 로 생성해 Notion 페이지에 넣는다.

SVG 를 직접 그리지 않는다. 벡터를 손으로 그리면 결과가 조악하다. `hans-blog` MCP 서버의 도구를 쓴다.

---

## 도구

프로젝트 MCP 서버 `hans-blog`. `.mcp.json` 에 등록되어 있다. 구현은 `mcp/` 아래에 있다.

| 도구 | 하는 일 |
| --- | --- |
| `generate_featured_image` | 프롬프트로 생성한다. `pageId` 를 주면 그 자리에서 Notion 에 올리고 직전 후보를 지운다. |
| `attach_featured_image_to_notion` | 이미 만들어 둔 파일을 올릴 때만 쓴다. |

---

## 작업 순서

1. 대상 글을 읽는다. 제목, 개요, 핵심 명령어와 구성 요소를 파악한다.
2. 아래 시각 규칙에 맞춰 영어 프롬프트를 작성한다.
3. `generate_featured_image` 를 `pageId` · `caption` 과 함께 호출한다. `name` 에는 글 슬러그를 넣는다.
4. **사람이 노션에서 보고 고른다.** 혼자 판단해 반려하지 않는다.
5. 다시 뽑으려면 같은 `pageId` 로 한 번 더 호출한다. 직전 후보는 자동으로 지워진다.
6. 확정되면 `node src/NotionCli.mjs database sync` 로 repo 에 내려받는다.

`content/posts/*/index.md` 를 직접 고치지 않는다. Notion 이 원본이다. Hugo 는 본문 첫 이미지 블록을 front matter 의 `images` 로 쓴다.

이미 대표 이미지가 있는 글을 교체할 때는 `mode: "replace_first"` 를 쓴다. 그 블록을 제자리에서 갈아끼운다.

---

## 시각 규칙

공통 스타일은 `prompts/featured-image-style.md` 에 있고 **코드가 자동으로 앞에 붙인다.** 배경색·아이소메트릭·네온 액센트를 프롬프트에 다시 적지 않는다. `prompt` 에는 그 글만의 장면만 적는다.

### 무엇을 적나
- 글의 주제를 사물로 번역한다. 터미널 창, 서버 큐브, 열쇠와 자물쇠, 문서, 클라우드 같은 것들이다.
- 요소 사이를 흐르는 선으로 연결한다. 데이터가 어디서 어디로 가는지 보이게 한다.
- 중앙에 초점을 하나 둔다. 요소를 고르게 흩뿌리지 않는다.
- 라벨은 짧은 영어 대문자로 쓴다. `SEARCH`, `WORKER`, `400` 정도가 적당하다.

### 하지 말 것

**금지 사항을 길게 나열하지 않는다.** 이게 가장 중요하다.

```
나쁜 예: There are no lanes, no pipes, no beams, no arrows and no
        connecting paths anywhere in this image. Nothing travels
        to a destination.
```

이렇게 부정형을 늘어놓으면 **모델이 그림 대신 텍스트로 답한다.** 실제로 겪은 문제다. 없는 것을 적지 말고 있는 것을 묘사한다.

한글은 이미지에 넣지 않는다. 문장이나 단락도 넣지 않는다.

### 프롬프트 예시

```
Subject: a robots.txt file acting as a gatekeeper that sorts AI crawlers by purpose.

At the center sits a glowing isometric document tile labeled "robots.txt" in monospace.

From its right edge three light lanes fan outward to three destinations. The top lane
is mint green and passes through an open gate to a lit platform labeled "SEARCH". The
middle lane is violet and reaches a lit platform labeled "AGENT". The bottom lane is
dim grey and stops at a solid barrier; beyond it a platform labeled "TRAIN" sits
switched off, desaturated and unlit.

On the left, a stream of small dark bot cubes flows toward the tile.
```

---

## 검수 항목

생성된 이미지를 보고 아래를 확인한다. 걸리면 프롬프트를 고쳐 다시 호출한다.

- 텍스트가 뭉개지거나 철자가 틀렸는가.
- 글의 주제와 그림이 어긋나는가.
- 초점이 없이 요소가 흩어져 있는가.
- 사람 손이나 얼굴이 일그러졌는가. 사람은 되도록 넣지 않는다.

**경로를 그리되 하나만 끊는 구성은 모델이 특히 못한다.** 막으라고 해도 화살표가 벽을 통과하거나 우회한다. 그럴 때는 문구를 다듬지 말고 메타포를 바꾼다. 이어 그릴 선이 없는 구성(스위치, 게이트, 전후 대비)으로 가면 실패할 여지가 사라진다.

액자 테두리는 신경 쓰지 않아도 된다. 모델이 가끔 그리는데 코드가 감지해서 잘라낸다.

---

## 캡션

`caption` 은 Hugo 에서 alt 텍스트가 된다. 비워두면 안 된다. 발행 요청 상태에서 캡션 없는 이미지가 있으면 동기화가 거부된다.

글이 다루는 내용을 설명하는 한국어 한 문장으로 쓴다. "대표 이미지" 같은 말은 쓰지 않는다.

예시: `요청이 Cloudflare 엣지에서 정적 자산과 워커 실행으로 갈리고 워커가 돈 요청만 과금되는 흐름`

---

## 비용

이미지 생성은 **무료 등급을 지원하지 않는다.** 결제가 등록된 프로젝트의 키여야 한다.

| 모델 | 1K | 2K |
| --- | --- | --- |
| `gemini-3.1-flash-image` (기본) | $0.067 | $0.101 |

시안은 `imageSize: "1K"` 로 뽑는다. 기본값이 1K 다.

---

## 환경 변수

`.env` 에 아래 키가 있어야 한다.

- `GEMINI_API_KEY` — https://aistudio.google.com/apikey 에서 발급한다.
- `NOTION_API_TOKEN` — Notion 업로드에 쓴다.

선택 항목이다.

- `GEMINI_IMAGE_MODEL` — 기본값은 `gemini-3.1-flash-image` 다.
- `FEATURED_IMAGE_DIR` — 생성 이미지를 쌓는 경로다. 기본값은 `tmp/featured-images` 다.
