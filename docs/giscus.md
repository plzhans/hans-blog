# 댓글 시스템 (giscus)

[giscus](https://giscus.app/ko)는 GitHub Discussions 기반의 오픈소스 댓글 시스템입니다.

별도 데이터베이스 없이 GitHub 저장소의 Discussions에 댓글이 저장됩니다.

방문자는 GitHub 계정으로 로그인하여 댓글과 반응(리액션)을 남길 수 있습니다.

## 사전 조건

1. GitHub 저장소가 **공개(Public)** 상태여야 합니다.
   > 참고: 블로그 저장소가 비공개인 경우, 댓글 전용 공개 저장소를 별도로 생성하여 `repo` 설정에 지정할 수 있습니다.
2. 저장소에 [giscus 앱](https://github.com/apps/giscus)이 설치되어 있어야 합니다.
3. 저장소의 **Discussions** 기능이 활성화되어 있어야 합니다.
   > 참고: 저장소 **Settings > General > Features > Discussions** 체크

## 설정

### 1. giscus 설정값 생성

[giscus.app](https://giscus.app/ko)에서 저장소 정보를 입력하면 `repo`, `repoId`, `category`, `categoryId` 등의 설정값이 자동 생성됩니다.

### 2. hugo.toml 설정

생성된 설정값을 [`hugo/hugo.toml`](../hugo/hugo.toml)의 `[params.giscus]` 섹션에 반영합니다.

```toml
[params.giscus]
  repo = "plzhans/hans-blog"
  repoId = "R_kgDORDHy7g"
  category = "General"
  categoryId = "DIC_kwDORDHy7s4C1zoX"
  mapping = "pathname"
  reactionsEnabled = "1"
  emitMetadata = "0"
  inputPosition = "top"
  theme = "dark"
  lang = "ko"
```

| 설정 | 설명 |
|---|---|
| `repo` | GitHub 저장소 (`owner/repo` 형식) |
| `repoId` | 저장소 ID (giscus.app에서 자동 생성) |
| `category` | Discussion 카테고리 이름 |
| `categoryId` | 카테고리 ID (giscus.app에서 자동 생성) |
| `mapping` | 페이지와 Discussion을 연결하는 방식. `pathname`, `url`, `title`, `og:title` 등 선택 가능 |
| `reactionsEnabled` | 메인 포스트에 대한 리액션 활성화 여부 (`1`: 활성화, `0`: 비활성화) |
| `emitMetadata` | Discussion 메타데이터를 페이지에 전송할지 여부 |
| `inputPosition` | 댓글 입력창 위치 (`top`: 상단, `bottom`: 하단) |
| `theme` | 테마 (`dark`, `light`, `preferred_color_scheme` 등) |
| `lang` | 언어 코드 (`ko`, `en` 등) |

### 3. Hugo 템플릿

테마(m10c)의 기본 `single.html`을 프로젝트 레벨에서 오버라이드하여 giscus 스크립트를 삽입합니다.

- 테마 원본: `hugo/themes/m10c/layouts/_default/single.html` (Disqus 사용)
- 프로젝트 오버라이드: [`hugo/layouts/_default/single.html`](../hugo/layouts/_default/single.html) (giscus 사용)

템플릿에서는 `hugo.toml`의 `[params.giscus]` 설정을 읽어 `<script>` 태그의 `data-*` 속성으로 전달합니다.

```html
{{- with .Site.Params.giscus }}
  {{- if .repo }}
  <div class="giscus-comments">
    <script src="https://giscus.app/client.js"
      data-repo="{{ .repo }}"
      data-repo-id="{{ .repoId }}"
      data-category="{{ .category }}"
      data-category-id="{{ .categoryId }}"
      data-mapping="{{ .mapping | default "pathname" }}"
      ...
      async>
    </script>
  </div>
  {{- end }}
{{- end }}
```

`[params.giscus]` 섹션이 없거나 `repo` 값이 비어 있으면 댓글 영역이 렌더링되지 않습니다.

## 참고

- giscus 공식 사이트: https://giscus.app/ko
- GitHub Discussions: https://github.com/plzhans/hans-blog/discussions
