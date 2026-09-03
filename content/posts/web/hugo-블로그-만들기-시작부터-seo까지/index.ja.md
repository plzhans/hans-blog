---
id: "123"
translationKey: "123"
slug: "123-hugo-blog-guide"
title: "Hugoブログを作る - 始め方からSEOまで"
description: "Notion→Hugo→GitHub Pagesでブログを作り、カスタムドメインの接続、多言語対応、セキュリティヘッダーの適用まで順番に整理します。"
categories:
  - "web"
tags:
  - "github-pages"
  - "hugo"
  - "seo"
date: 2026-09-03T00:00:00.000Z
lastmod: 2026-09-03T08:50:00.000Z
toc: true
draft: false
---


## 概要


このブログ自体がこの順番で構築されました。Notionで記事を書きMarkdownに変換してHugoでビルドし、GitHub Pagesにデプロイするパイプラインから、カスタムドメインの接続、多言語対応、セキュリティヘッダーまで順番に整理しました。


## 構築の順番

1. まず基本のブログを作る → [Hugo + GitHubでブログを作る](../94-hugo-github-blog/)
2. 自分のドメインを接続する → [GitHub Pagesでカスタムドメインを使う方法](../86-github-pages-custom-domain/)
3. 複数言語に拡張する → [Hugoサイトで多言語対応する](../93-hugo-multilingual-seo-setup/)
4. セキュリティヘッダーで仕上げる → [SEO監査が指摘するセキュリティヘッダー4つを、Cloudflareでコードなしに適用する](../120-cloudflare-security-headers-hsts-csp/)

## Hugo + GitHubでブログを作る — 基本パイプライン


Notion→Markdown→Hugoビルド→GitHub Pagesデプロイの流れ全体を整理しました。Hugoのインストール、m10cテーマの適用、GitHub Actionsによる自動デプロイ、baseURL設定でよくあるミスまで扱います。


→ [Hugo + GitHubでブログを作る](../94-hugo-github-blog/)


## GitHub Pagesカスタムドメイン — 自分のドメインを接続する


CNAME・A/AAAAレコードの設定、GitHub PagesのCustom domain適用手順、Actionsデプロイとブランチデプロイでのcnameファイル処理の違い、CAAレコードのせいでEnforce HTTPSが有効にならない原因まで整理しました。


→ [GitHub Pagesでカスタムドメインを使う方法](../86-github-pages-custom-domain/)


## Hugo多言語対応 — SEOまでカバーする


多言語ブログでbaseURL、sitemap、robots、JSON-LD、Open Graph、meta descriptionを設定し、hreflang・canonicalで重複コンテンツの問題を防ぐ方法を整理しました。


→ [Hugoサイトで多言語対応する](../93-hugo-multilingual-seo-setup/)


## セキュリティヘッダー — SEO監査が指摘する理由


HSTS・CSP・X-Content-Type-Options・Referrer-PolicyをSEO監査がなぜ指摘するのか、値が固定されたヘッダーはCloudflare Transform Rulesで、頻繁に変わるCSPはHTML metaタグで管理する方法を整理しました。


→ [SEO監査が指摘するセキュリティヘッダー4つを、Cloudflareでコードなしに適用する](../120-cloudflare-security-headers-hsts-csp/)
