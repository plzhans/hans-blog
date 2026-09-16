# 블로그 대표 이미지 생성 프롬프트

## 목적

블로그 글의 대표 이미지를 이미지 모델 API 로 생성해 Notion 페이지에 넣는다.

SVG 를 직접 그리지 않는다. 벡터를 손으로 그리면 결과가 조악하다. `hans-blog` MCP 서버의 도구를 쓴다.

---

## 도구

프로젝트 MCP 서버 `hans-blog`. `.mcp.json` 에 등록되어 있다. 구현은 `mcp/` 아래에 있다.

| 도구 | 하는 일 |
| --- | --- |
| `generate_featured_image` | 프롬프트로 이미지를 생성한다. `tmp/featured-images/` 에 저장하고 이미지를 그대로 돌려준다. |
| `attach_featured_image_to_notion` | 저장된 이미지를 Notion 페이지에 업로드해 이미지 블록으로 넣는다. |

두 단계로 나뉜 이유가 있다. 이미지 모델은 한 번에 원하는 그림을 주지 않는다. 생성 결과를 눈으로 보고 판단한 뒤 통과한 것만 Notion 에 올린다.

---

## 작업 순서

1. 대상 글을 읽는다. 제목, 개요, 핵심 명령어와 구성 요소를 파악한다.
2. 아래 시각 규칙에 맞춰 영어 프롬프트를 작성한다.
3. `generate_featured_image` 를 호출한다. `name` 에는 글 슬러그를 넣는다.
4. 돌아온 이미지를 확인한다. 아래 검수 항목에 걸리면 프롬프트를 고쳐 다시 생성한다.
5. 통과하면 `attach_featured_image_to_notion` 을 호출한다. `mode` 는 새로 넣을 때 `prepend`, 기존 대표 이미지를 갈아끼울 때 `replace_first` 를 쓴다.
6. `make notion-database-sync` 로 repo 에 내려받는다.

`content/posts/*/index.md` 를 직접 고치지 않는다. Notion 이 원본이다. Hugo 는 본문 첫 이미지 블록을 front matter 의 `images` 로 쓴다. 그래서 대표 이미지는 페이지 맨 위에 있어야 한다.

---

## 시각 규칙

기존 대표 이미지와 같은 결을 유지한다. 프롬프트에 아래 요소를 명시한다.

### 기본 형태
- 아이소메트릭 3D 일러스트레이션. 사진이 아니다.
- 16:9 가로. 해상도는 2K.
- 평평한 면과 부드러운 그라데이션. 질감이나 노이즈는 넣지 않는다.

### 색
- 배경은 어두운 네이비에서 보라로 가는 그라데이션.
- 액센트는 네온 시안, 민트 그린, 보라. 글로우를 준다.
- 강조할 대상 하나만 밝게 띄운다. 나머지는 배경으로 가라앉힌다.

### 구성 요소
- 글의 주제를 사물로 번역한다. 터미널 창, 서버 큐브, 열쇠와 자물쇠, 문서, 클라우드 같은 것들이다.
- 요소 사이를 흐르는 선으로 연결한다. 데이터가 어디서 어디로 가는지 보이게 한다.
- 중앙에 초점을 하나 둔다. 요소를 고르게 흩뿌리지 않는다.

### 텍스트
- 이미지 안 텍스트는 최소로 한다. 이미지 모델은 긴 문자열을 자주 뭉갠다.
- 넣는다면 짧은 영어 명령어나 라벨만 쓴다. `terraform apply`, `Dev`, `Stage`, `Prod` 정도가 적당하다.
- 한글은 넣지 않는다.
- 문장이나 단락은 넣지 않는다.

### 프롬프트 예시

```
Isometric 3D technical illustration on a dark navy-to-purple gradient background.
A glowing terminal window at center-left displays the monospace text "terraform apply"
in neon green. Flowing light lines run from the terminal to three isometric platform
blocks on the right labeled "Dev", "Stage", "Prod", each in a different accent color
(purple, cyan, green). Above them float a storage bucket and a database table icon,
lit from below. Soft neon glow, flat shaded surfaces, subtle grid lines in the
background, no texture or noise. Wide 16:9 composition, single clear focal point.
```

---

## 검수 항목

생성된 이미지를 보고 아래를 확인한다. 하나라도 걸리면 다시 생성한다.

- 텍스트가 뭉개지거나 철자가 틀렸는가.
- 글의 주제와 그림이 어긋나는가.
- 초점이 없이 요소가 흩어져 있는가.
- 배경색이 기존 글들과 따로 노는가.
- 사람 손이나 얼굴이 일그러졌는가. 사람은 되도록 넣지 않는다.

---

## 캡션

`attach_featured_image_to_notion` 의 `caption` 은 Hugo 에서 alt 텍스트가 된다. 비워두면 안 된다.

글이 다루는 내용을 설명하는 한국어 한 문장으로 쓴다. "대표 이미지" 같은 말은 쓰지 않는다.

예시: `Terraform 으로 Dev, Stage, Prod 환경에 인프라를 배포하고 S3 와 DynamoDB 에 state 를 보관하는 구성`

---

## 환경 변수

`.env` 에 아래 키가 있어야 한다.

- `GEMINI_API_KEY` — https://aistudio.google.com/apikey 에서 발급한다. Gemini API 가 활성화된 프로젝트의 키여야 한다.
- `NOTION_API_TOKEN` — Notion 업로드에 쓴다.

선택 항목이다.

- `GEMINI_IMAGE_MODEL` — 기본값은 `gemini-3.1-flash-image` 다.
- `FEATURED_IMAGE_DIR` — 생성 이미지를 쌓는 경로다. 기본값은 `tmp/featured-images` 다.
