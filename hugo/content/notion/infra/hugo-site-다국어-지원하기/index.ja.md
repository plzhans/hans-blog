---
id: "93"
translationKey: "93"
slug: "93-hugo-multilingual-seo-setup"
title: "Hugo サイトの多言語対応"
description: "Hugo 静的サイトジェネレーターで多言語ブログを構築する際に必要な SEO 最適化および多言語設定方法を説明します。sitemap.xml、robots.txt、Schema.org JSON-LD、Open Graph、meta description などの検索エンジン最適化設定を自動化し、HTML lang 属性、hreflang タグ、canonical URL を通じて多言語コンテンツの重複問題を防止する方法を扱います。hugo.toml での defaultContentLanguageInSubdir 設定、translationKey による言語間の連携、テーマの baseof.html オーバーライドによる SEO タグ追加方法を説明し、url の代わりに slug を使用して言語別 URL 衝突を解決する実践的なトラブルシューティングを提供します。"
categories:
  - "Infra"
tags:
  - "hugo"
  - "seo"
date: 2026-02-06T11:34:00.000+09:00
lastmod: 2026-02-11T08:29:00.000Z
toc: true
draft: false
---


## 目標


Hugo ブログに多言語対応と SEO 最適化を適用し、検索エンジンへの露出を最大化し、多言語ユーザーに適切な言語バージョンを提供します。


---


## SEO 設定


SEO（Search Engine Optimization、検索エンジン最適化）とは、Google などの検索エンジンがサイトのコンテンツを正しく理解し、検索結果に表示できるようにサイト構造とメタデータを最適化する作業です。


この文書ではブログに適用された SEO 設定を整理します。


### 1. 絶対 URL - Hugo baseURL 設定

- **ファイル**: `hugo/hugo.toml`
- **内容**: `baseURL = '`[`https://blog.plzhans.com`](https://blog.plzhans.com/)`'`
- sitemap.xml、RSS フィード、Open Graph などで正しい絶対 URL が生成されます
- Sitemap（`sitemap.xml`）、RSS フィード（`index.xml`）は Hugo が自動生成します
- `hugo server`（開発）では自動的に [`localhost:1313`](http://localhost:1313/) を使用するため、別途の対応は不要です

### 2. robots.txt 自動生成

- **ファイル**: `hugo/hugo.toml`
- **内容**: `enableRobotsTXT = true`
- Hugo ビルド時に `robots.txt` を自動生成します（すべてのクローラーを許可 + Sitemap URL を含む）

### 3. [Schema.org](http://schema.org/) 構造化データ（JSON-LD）

- **ファイル**: `hugo/layouts/_default/single.html`
- 記事ページ（`type != "page"`）に `BlogPosting` JSON-LD を挿入します
- 含まれる項目：headline、datePublished、dateModified、author、description、mainEntityOfPage
- Google 検索結果でリッチスニペット（著者、日付など）の表示が可能になります

### 4. og:image（代表画像）/ Open Graph

- **ファイル**: `src/services/NotionExportService.mjs`
- Notion 同期時にコンテンツの最初の画像を検出し、front matter の `images` フィールドに自動追加します
- Open Graph メタタグは Hugo 内蔵テンプレート（`_internal/opengraph.html`）で出力され、`images` を `og:image` として使用します

### 5. meta description / Twitter Card

- **ファイル**: `src/services/NotionExportService.mjs`
- Notion の「要約」プロパティを front matter の `description` フィールドとして出力します
- Hugo 内蔵の opengraph/twitter_cards テンプレートおよび baseof.html の meta description で使用されます
- Twitter Card メタタグは Hugo 内蔵テンプレート（`_internal/twitter_cards.html`）で出力されます
- その他のメタタグ（author、viewport）もテーマでデフォルト提供されます

### 6. Canonical URL

- **ファイル**: `hugo/layouts/_default/baseof.html`
- テーマ（`m10c`）の `baseof.html` をオーバーライドして `<link rel="canonical">` タグを追加します
- `.Permalink` を canonical URL として使用します
- 多言語 hreflang タグも併せて含まれます（翻訳ページが存在する場合、`alternate` + `x-default` を出力）

### 7. Google Analytics (GA4)

- テーマ（`m10c`）でデフォルト提供されます
- Google Search Console 認証時に GA 連携で認証が可能です


---


## 多言語 SEO の核心要素


### HTML lang 属性


ページの言語を明示し、検索エンジンとスクリーンリーダーに言語情報を提供します。


```html
<html lang="ko">
```


### link rel alternate hreflang


各言語別ページの URL を検索エンジンに通知し、重複コンテンツの問題を防止します。


```html
<link rel="alternate" hreflang="ko" href="https://blog.plzhans.com/ko/post/example/">
<link rel="alternate" hreflang="en" href="https://blog.plzhans.com/en/post/example/">
<link rel="alternate" hreflang="ja" href="https://blog.plzhans.com/ja/post/example/">
<link rel="alternate" hreflang="x-default" href="https://blog.plzhans.com/ko/post/example/">
```


### Canonical URL（多言語）


各言語を専門翻訳として作成した場合、canonical を省略してすべての言語バージョンを独立した原本として認識させることができます。


```html
<link rel="canonical" href="https://blog.plzhans.com/ko/post/example/">
```


---


## Hugo 多言語実装


### 1. テーマの多言語対応確認


**lang 属性の確認**（`themes/{テーマ}/layouts/_default/baseof.html`）


```html
<!doctype html>
<html lang=" .Site.Language.Lang ">
```


**relLangURL 対応の確認**


ホームリンクが言語別 URL を維持しているか確認します。未対応の場合は baseof.html をオーバーライドします。


```html
<body>
  <header class="app-header">
    <a href=" .Site.Home.RelPermalink "><img class="app-header-avatar" src="..." alt="..." /></a>
```


### 2. hugo.toml 多言語設定


```toml
# デフォルトコンテンツ言語
defaultContentLanguage = "ko"
# デフォルト言語もサブディレクトリに含める（/ko/）
defaultContentLanguageInSubdir = true

[languages]
  [languages.ko]
    weight = 1
    languageName = "한국어"

  [languages.en]
    weight = 2
    languageName = "English"

  [languages.ja]
    weight = 3
    languageName = "日本語"
```


### 3. canonical タグの追加


テーマが未対応の場合、baseof.html をオーバーライドします。


```html
<link rel="canonical" href=" .Permalink " />
```


### 4. hreflang タグの生成


**コンテンツファイルに translationKey を設定**


```markdown
---
id: "80"
translationKey: "80"
slug: "80-redis-dump-vs-aof"
title: "Redis dump vs aof"
---
```


**baseof.html に hreflang を追加**（テーマが未対応の場合はオーバーライド）


```html
<link rel="alternate" hreflang=" .Language.Lang " href=" .Permalink " />
<link rel="alternate" hreflang="x-default" href=" .Permalink " />
```


---


## トラブルシューティング


### URL 重複衝突


Hugo で投稿の URL を設定する際は、`url` の代わりに `slug` を使用する必要があります。


**原因**

- `slug` を設定すると `/ko/`、`/en/` などの言語プレフィックスが自動的に追加されます
- `url` で強制指定すると、Hugo が言語コードを自動的に追加しません
- `url` を使用する場合、`/ko/post/example`、`/en/post/example` のように url 自体に言語コードを直接含める必要があります
- `url` に言語コードなしで同一のパスを指定すると、異なる言語の投稿が同じ URL を持つことになり、衝突が発生します

**解決方法**

- `url` の代わりに `slug` を使用するように変更します
- `hugo.toml` で `defaultContentLanguageInSubdir = true` を設定し、デフォルト言語を含むすべての言語がサブディレクトリ構造を持つようにします

**備考**

- `slug` のみを指定すると言語コードは自動的に追加されますが、slug 自体が特定の言語で記述されている場合は、各言語別に翻訳する必要があります。slug は英語で記述することを推奨します。

### translationKey を追加しても hreflang が生成されない


**原因**

- テーマが hreflang タグの生成に対応していません

**解決方法**

- baseof.html をオーバーライドして hreflang 関連のコードを追加します


---


## 参考

- [Multi-language Website SEO with Hugo](https://www.glukhov.org/de/post/2025/10/multi-language-website-seo-with-hugo/)
