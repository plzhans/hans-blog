---
id: "94"
translationKey: "94"
slug: "94-hugo-github-blog"
title: "Hugo + GitHub でブログを構築する"
description: "Notion → Markdown → Hugo ビルド → GitHub Pages 配信の流れで個人ブログを構築します。Hugo の導入と m10c テーマ適用、GitHub Actions による自動デプロイ、baseURL 設定の注意点まで押さえてデプロイエラーを防ぎましょう。"
categories:
  - "git"
tags:
  - "github-action"
  - "github-pages"
  - "hugo"
date: 2026-02-10T08:46:00.000Z
lastmod: 2026-02-27T16:08:00.000Z
toc: true
draft: false
images:
  - "assets/1_30a22a0f-7e83-80c6-b1d4-ed75cfa333a7.png"
---


![](./assets/1_30a22a0f-7e83-80c6-b1d4-ed75cfa333a7.png)


## 序論


技術メモはこれまで Evernote や個人ドキュメントにまとめ、Notion のウェブサイト機能でブログ化する計画も立てていました。

しかし Notion はカスタマイズに制限があり、カスタムドメインにも追加料金が必要なので迷っていました。

代案として [velog](https://velog.io/) へ移るか、Markdown に書き直して Jekyll へ移行する案も検討しました。

それでも執筆しやすい Notion を捨てられず、最終的に「Notion で書いて静的サイトとして配信する」方針に落ち着きました。

## 目標

- Markdown で書いた記事を Hugo でビルドする
- GitHub Pages へのデプロイを自動化する

> 💡 **環境**  
> - テスト環境: Mac  
> - デプロイ環境: GitHub Actions

**Hugo を選んだ理由**

- GitHub Stars が多く活発に更新されている
- 1,000 ページ超のビルドで Jekyll より速い

**このブログは現在次のワークフローで運用しています（ソース: [https://github.com/plzhans/hans-blog](https://github.com/plzhans/hans-blog)）**

> Notion で執筆  
> → Notion API で Markdown へ変換  
>  
> → Hugo で静的サイトをビルド  
>  
> → GitHub Pages へデプロイ

## 事前準備

### Hugo テーマを選ぶ

まず [Hugo Themes](https://themes.gohugo.io/) でテーマを選定しました。

**採用テーマ:** [m10c](https://themes.gohugo.io/themes/hugo-theme-m10c/)

**選定基準**

- SEO 最適化をサポート
- 多言語サイトをサポート

m10c は一部機能が不足していますが、Hugo のレイアウトオーバーライドで補えます。

### Hugo をインストール

**インストール手順:** [Installation Guide](https://gohugo.io/installation/)

**ドキュメント:** [Documentation](https://gohugo.io/documentation/)

Mac 例:

```shell
# Hugo をインストール
brew install hugo

# バージョン確認
hugo --version
```

## Hugo サイトを作成

### プロジェクト初期化

```shell
# 作業ディレクトリ作成
mkdir hugo && cd hugo

# Hugo サイト生成
hugo new site .

# 結果を確認
tree
# .
# ├── archetypes
# │   └── default.md
# ├── assets
# ├── content
# ├── data
# ├── hugo.toml
# ├── i18n
# ├── layouts
# ├── static
# └── themes
```

### テーマをインストール

Git のサブモジュールとして追加します。

```shell
# 必要なら Git リポジトリを初期化
git init

# テーマをサブモジュール追加
git submodule add https://github.com/vaga/hugo-theme-m10c.git themes/m10c

# 確認
ls -al themes/m10c
```

### サンプルコンテンツをコピー（任意）

```shell
# テーマのサンプルコンテンツをコピー
cp -R themes/m10c/exampleSite/content ./content

# 結果を確認
ls -al ./content/
```

### Hugo を設定

デフォルトの `hugo.toml` をテーマのサンプル設定に置き換えます。

```shell
# 既存設定を削除
rm hugo.toml

# サンプル設定をコピー
cp themes/m10c/exampleSite/config.toml ./hugo.toml
```

`hugo.toml` を開いて基本値を調整します。

```toml
baseURL = "https://testblog.plzhans.com"
title = "Test blog"
theme = "m10c"
```

**メモ:** `themesDir` 設定は削除し、`theme` は実際のディレクトリ名に合わせます。

### ローカルサーバーを起動

```shell
# 開発サーバーを起動
hugo server -D
```

出力例:

```javascript
Watching for changes in /Users/plzhans/temp/sample/hugo/...
Start building sites …
hugo v0.154.5+extended+withdeploy darwin/arm64 BuildDate=2026-01-11T20:53:23Z

Built in 2 ms
Environment: "development"
Web Server is available at http://localhost:57264/
Press Ctrl+C to stop
```

表示された URL をブラウザーで開き、サイトを確認します。

## GitHub Pages へデプロイ

### リポジトリを作成

GitHub で新しいリポジトリを用意します。

### デプロイ戦略を選ぶ

Jekyll も Hugo も「ソース」と「ビルド成果物」を分けて管理します。

GitHub Pages は Jekyll を自動ビルドしますが、Hugo は GitHub Actions で配信する必要があります。

また、ソースリポジトリを公開にするか非公開にするかも合わせて判断します。

**無料プラン**

- 公開リポジトリのみ Pages を設定できます。
- ソースを非公開にしたい場合は方法3でソースリポジトリを非公開にし、デプロイリポジトリだけ公開にします。

**有料プラン**

- リポジトリが非公開でも Pages を公開できます。

### 方法1: actions/deploy-pages

- リポジトリ 1 つ
- GitHub Pages のソースを GitHub Actions に設定
- `main` へ push → Hugo ビルド → アーティファクトをアップロード → 自動デプロイ

### 方法2: peaceiris/actions-gh-pages

- リポジトリ 1 つ
- GitHub Pages を `gh-pages` ブランチに接続
- `main` へ push → Hugo ビルド → `gh-pages` へコミット

### 方法3: デプロイ用リポジトリを分離

- リポジトリ 2 つ（ソース用 + デプロイ用）
- `public` ディレクトリの成果物をデプロイリポジトリへ push

### 方法4: 外部へ成果物をアップロード

- GitHub Pages にこだわる必要はなく、静的ファイルを置けるサーバーならよい
- Hugo のビルド成果物はデフォルトで `/public` に出力

> 本記事では方法1を採用します。

### GitHub Pages を設定

Repository → Settings → Pages → **Source** を **GitHub Actions** にします。

## GitHub Actions ワークフローを作成

`.github/workflows/deploy-hugo.yml` を作成します。

```yaml
name: Deploy Hugo

on:
  push:
    branches: [ master ]
   
permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

env:
  HUGO_BASEURL: https://plzhans.github.io/hugo-sample/

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    env:
      HUGO_CACHEDIR: /tmp/hugo_cache

    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          submodules: recursive
          fetch-depth: 1

      - name: Setup Hugo
        uses: peaceiris/actions-hugo@v3
        with:
          hugo-version: "latest"
          extended: true

      - name: Cache Hugo
        uses: actions/cache@v4
        with:
          path: $ env.HUGO_CACHEDIR 
          key: $ runner.os -hugomod-$ hashFiles('**/go.sum') 
          restore-keys: |
            $ runner.os -hugomod-

      - name: Build
        run: hugo --minify --gc --cleanDestinationDir --baseURL "$HUGO_BASEURL"

      - uses: actions/upload-pages-artifact@v3
        with:
          path: ./public

      - uses: actions/deploy-pages@v4
```

## Git のデプロイ

```shell
# リモートを追加
git remote add origin git@github.com:plzhans/hugo-sample.git

# ビルド成果物を除外
echo "/public/" >> .gitignore

# すべてコミット
git add . 
git commit -m "first commit"

# ブランチ作成と push
git branch -M master
git push -u origin master
```

## デプロイを確認

GitHub Actions タブでワークフロー実行を確認し、Settings → Pages で公開 URL を確認します。

**例:** [https://plzhans.github.io/hugo-sample/](https://plzhans.github.io/hugo-sample/)

## 注意事項

**baseURL 設定**

`hugo.toml` の `baseURL` やビルド時の `--baseURL` が正しくないと、CSS と画像パスが壊れます。

このガイドでは GitHub Actions ワークフロー内の `HUGO_BASEURL` 環境変数に配信 URL を設定しています。

## 関連記事

- カスタムドメイン設定: [Github pages カスタムドメイン使用](../86-github-pages-custom-domain/)
- （準備中）Notion から GitHub Pages への自動デプロイ
