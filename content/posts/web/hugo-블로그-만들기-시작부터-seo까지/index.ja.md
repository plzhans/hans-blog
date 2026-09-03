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
lastmod: 2026-09-03T11:08:00.000Z
toc: true
draft: false
---


## 概要


このブログ自体がこの順番で構築されました。Notionで記事を書きMarkdownに変換してHugoでビルドし、GitHub Pagesにデプロイするパイプラインから、カスタムドメインの接続、多言語対応、セキュリティヘッダーまで順番に整理しました。


## なぜこの組み合わせなのか


静的サイトはサーバーを別途運用する必要がなく、GitHub Pagesのような無料ホスティングに載せるだけでそれ自体が高速で安定します。問題は「静的」という言葉どおり執筆の体験が不便になりがちな点ですが、NotionをCMSとして使うとこの問題が解決します — 普段使っているエディタで記事を書き、APIでNotionページをそのままMarkdownとして取り込んでビルドすればよいのです。Hugoは静的サイトジェネレーターの中でもビルド速度が速く、テーマのエコシステムが整っているため選びました。


## 全体アーキテクチャ


Notion(記事作成) → 同期スクリプト(Notion APIでMarkdownに変換) → Hugo(静的サイトビルド) → GitHub Actions(コミット時に自動ビルド・デプロイ) → GitHub Pages(ホスティング) → Cloudflare(CDN・セキュリティヘッダー)の順でつながっています。記事を書いて「発行要求」状態に変えるだけで、あとは自動化されたパイプラインが処理してくれます。


## 構築の順番

1. まず基本のブログを作る → [Hugo + GitHubでブログを作る](../94-hugo-github-blog/)
2. 自分のドメインを接続する → [GitHub Pagesでカスタムドメインを使う方法](../86-github-pages-custom-domain/)
3. 複数言語に拡張する → [Hugoサイトで多言語対応する](../93-hugo-multilingual-seo-setup/)
4. セキュリティヘッダーで仕上げる → [SEO監査が指摘するセキュリティヘッダー4つを、Cloudflareでコードなしに適用する](../120-cloudflare-security-headers-hsts-csp/)

## Hugo + GitHubでブログを作る — 基本パイプライン


Notion→Markdown→Hugoビルド→GitHub Pagesデプロイの流れ全体を整理しました。Hugoのインストール、m10cテーマの適用、GitHub Actionsによる自動デプロイ、baseURL設定でよくあるミスまで扱います。この段階だけ終えても、執筆からデプロイまで完全に自動化されたパイプラインが手に入ります。


→ [Hugo + GitHubでブログを作る](../94-hugo-github-blog/)


## GitHub Pagesカスタムドメイン — 自分のドメインを接続する


CNAME・A/AAAAレコードの設定、GitHub PagesのCustom domain適用手順、Actionsデプロイとブランチデプロイでのcnameファイル処理の違い、CAAレコードのせいでEnforce HTTPSが有効にならない原因まで整理しました。github.ioサブドメインの代わりに自分のドメインを使うと、ブランディングだけでなく検索エンジンにもより一貫したシグナルを送れます。


→ [GitHub Pagesでカスタムドメインを使う方法](../86-github-pages-custom-domain/)


## Hugo多言語対応 — SEOまでカバーする


多言語ブログでbaseURL、sitemap、robots、JSON-LD、Open Graph、meta descriptionを設定し、hreflang・canonicalで重複コンテンツの問題を防ぐ方法を整理しました。言語別のsitemapを別々に管理しないとインデックスの問題につながりやすい部分なので、最初から構造を整えておくことが重要です。


→ [Hugoサイトで多言語対応する](../93-hugo-multilingual-seo-setup/)


## セキュリティヘッダー — SEO監査が指摘する理由


HSTS・CSP・X-Content-Type-Options・Referrer-PolicyをSEO監査がなぜ指摘するのか、値が固定されたヘッダーはCloudflare Transform Rulesで、頻繁に変わるCSPはHTML metaタグで管理する方法を整理しました。静的サイトなのでサーバーの設定ファイルがない分、こうしたヘッダーはCDNやmetaタグのレベルで別途対応する必要があります。


→ [SEO監査が指摘するセキュリティヘッダー4つを、Cloudflareでコードなしに適用する](../120-cloudflare-security-headers-hsts-csp/)


## このブログが実際に直面した問題


「静的サイトだから簡単」という前提とは裏腹に、実際に運用してみると予想外の問題が次々と出てきました。

- **Googleのインデックス遅延** — sitemapを提出してもGooglebotが再訪問しなければ、新しい記事が数週間インデックスされないことがあります。sitemapの再提出とGSCのURL検査を定期的にチェックする必要があります。
- **画像読み込みの優先順位** — 一覧ページの最初のカード画像はLCP(最大コンテンツ描画)の候補としてeagerローディングが必要ですが、「配列インデックス0番」と「実際にレンダリングされる最初のカード」は必ずしも一致しません(画像のない記事がメインリストに混ざると食い違います)。
- **メタタグの長さ** — Googleはtitle・meta descriptionを文字数ではなく固定ピクセル幅(デスクトップで約600〜920px)を基準に切り詰めますが、日本語の文字はローマ字より幅広くレンダリングされるため、同じ文字数でもより早く切り詰められます。
- **多言語lastmodの同期** — 韓国語の原文だけを修正して翻訳版を同時に手直ししないと、翻訳版のsitemapのlastmodが実際の変更日とずれてしまい、sitemapの信頼性が下がります。

共通しているのは一つです。コードが「論理的に正しい」ことと「実際のライブサイトで意図どおりに動作するか」は別問題なので、デプロイ後に必ずライブページを直接確認する習慣が必要だということです。


## 次のステップ


サイトが軌道に乗った後は、Google Search Consoleのインデックス管理、sitemapカバレッジの点検、パフォーマンス(Core Web Vitals)の最適化といった継続的なSEO運用がより重要になります。このブログも実際にその過程で出てきた問題を別記事として整理し続けています。
