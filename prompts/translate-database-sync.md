# Notion Database Sync 번역 프롬프트

## 목적
Notion 데이터베이스 전체 동기화(`node src/NotionCli.mjs database sync`)를 실행하면 `hugo/content/notion/**/index.md` 경로마다 **한국어 원문**이 생성됩니다. 각 원문을 `index.en.md`(영어)와 `index.ja.md`(일본어)로 번역하여 동일 디렉터리에 추가하는 작업을 자동화하기 위한 프롬프트입니다.

---

## 프롬프트

당신은 Notion에서 동기화된 기술 아티클을 다루는 번역가입니다.

`hugo/content/notion/**/index.md` 파일은 모두 한국어로 작성된 기본 페이지입니다. 각 디렉터리에는 대응되는 `notion_*.json` 메타데이터가 존재하며, `properties["AI_번역"].checkbox` 값이 `true`인 경우에만 번역 대상입니다. 조건을 만족하는 파일만 읽고 영어(`index.en.md`), 일본어(`index.ja.md`) 두 개의 번역 파일을 생성해 주세요.

- 경로 예시: `hugo/content/notion/database/redis-dump-vs-aof/index.md`, `hugo/content/notion/git/git-삭제-브런치-복구/index.md`, `hugo/content/notion/infra/https-tls-ssl-무료-vs-유료-인증서/index.md`
- 상위 디렉터리 구조(`category/slug/`)와 `index.*.md` 파일명 규칙은 그대로 유지합니다.

### 번역 원칙
- 상세 규칙은 `prompts/translate-blog-post.md`를 그대로 따릅니다.

### 작업 효율성
**번역 처리 시간이 오래 걸리므로, 제일 빠른 결과를 받을 수 있는 방법을 스스로 판단하여 병렬로 실행하세요.**

- 대상 파일이 적으면 단일 메시지로 여러 Write 도구를 병렬 호출
- 대상 파일이 많으면 번역 스크립트(Node.js/bash)를 작성하여 병렬 처리
- 상황에 맞는 최적의 방법을 선택하여 실행

### 작업 단계
1. 디렉터리 내 `notion_*.json` 파일을 열어 `properties["AI_번역"]` 값이 `true`인지 확인합니다. `false`라면 번역을 건너뜁니다.
2. 대상 디렉터리의 `index.md` 한국어 원문을 읽습니다.
3. front matter의 `title`, `description`, `summary` 등 사람이 읽는 문구를 번역합니다.
4. 본문, 표, 리스트, 캡션 등 모든 한국어 텍스트를 언어별로 번역합니다.
5. `index.en.md`, `index.ja.md`가 이미 존재하면 해당 언어는 건너뛰고, 없는 경우에만 새 파일을 생성합니다.
6. 새 파일을 저장할 때 front matter → 본문 순서를 유지합니다.

### 출력 형식
동일한 디렉터리에 아래 두 파일을 작성합니다.

- `index.en.md`: 영어 번역본
- `index.ja.md`: 일본어 번역본

두 파일 모두 front matter → 본문 순서를 유지하며, 원문과 동일한 마크다운 구조를 보존해야 합니다.

### 검수 체크리스트
- front matter 필드 순서와 공백, 리스트 스타일이 원문과 일치하는가?
- 코드 블록, 인라인 코드, 명령어가 원문과 동일하게 유지되었는가?
- 한국어 표현이 남아 있지 않은가?
- 이미지/링크 경로와 파일 참조가 깨지지 않았는가?
- `AI_번역`이 `true`인 페이지만 처리되었는가?
- 이미 존재하는 번역 파일은 수정하지 않았는가?
