---
id: "94"
translationKey: "94"
slug: "94-hugo-github-blog"
title: "Hugo + GitHubでブログを作る"
description: "Hugo静的サイトジェネレーターとGitHub Pagesを活用した個人ブログ構築ガイドです。Hugoのインストール、m10cテーマの適用、ローカル開発環境の設定からGitHub Actionsによる自動デプロイパイプラインの構成まで、全プロセスをステップバイステップで説明します。Jekyllと比較して高速なビルド速度とNotion-Markdownベースの執筆ワークフローを採用した理由も含みます。"
tags:
  - "hugo"
  - "github-action"
  - "github-pages"
date: 2026-01-29T10:44:00.000+09:00
lastmod: 2026-02-10T08:23:00.000Z
draft: false
---


> 💡 **構築環境**
> - テスト環境: Mac
>
> - デプロイ環境: GitHub Actions


# はじめに


技術関連の内容をEvernoteや個人ドキュメントに整理してきましたが、Notionのウェブサイト機能を活用してブログとして運営しようと準備していました。


しかし、Notionはカスタマイズに制約があり、カスタムドメインの使用にも追加費用が発生するため、悩むことになりました。


代替案として、vlog形式に転換するか、Markdownで書き直してJekyllに移行するか検討しました。


しかし、執筆が便利なNotionを諦めることはできませんでした。結論はNotionで作成して静的ウェブサイトとしてデプロイすること！


現在このブログは以下のような流れで運営しています。（ソース参考：[https://github.com/plzhans/hans-blog](https://github.com/plzhans/hans-blog)）


> Notionで作成 → Notion APIでMarkdownに変換 → Hugo静的サイトビルド → GitLab Pagesデプロイ


# 目標

- mdファイルで作成されたドキュメントをHugoでビルドする
- GitHub Pagesへのデプロイを自動化する

## Hugoを選んだ理由

- GitHub Star数が多く、活発にアップデート中
- 1000ページ以上をビルドする際、Jekyllより高速

# Hugoテーマの選択


[Hugo Themes](https://themes.gohugo.io/)からテーマを先に選びました。


**選択したテーマ:** [m10c](https://themes.gohugo.io/themes/hugo-theme-m10c/)


**テーマ選択基準**

- SEO最適化機能のサポート
- 多言語サイト機能のサポート

m10cは一部の機能が完全にはサポートされていませんが、Hugoのレイアウトオーバーライドで補完可能です。


# Hugoのインストール


**インストールドキュメント:** [Installation Guide](https://gohugo.io/installation/)


**Hugoドキュメント:** [Documentation](https://gohugo.io/documentation/)


## Macでのインストール


```shell
# Hugoのインストール
brew install hugo

# インストール確認
hugo --version
```


# Hugoサイトの作成


## プロジェクトの初期化


```shell
# 作業ディレクトリの作成
mkdir hugo && cd hugo

# Hugoサイトの作成
hugo new site .

# 作成結果の確認
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


## テーマのインストール


Git submoduleを使用してテーマをインストールします。


```shell
# Gitリポジトリの初期化（必要な場合）
git init

# テーマsubmoduleの追加
git submodule add https://github.com/vaga/hugo-theme-m10c.git themes/m10c

# インストール確認
ls -al themes/m10c
```


## サンプルコンテンツのコピー（任意）


```shell
# テーマのサンプルコンテンツをコピー
cp -R themes/m10c/exampleSite/content ./content

# 確認
ls -al ./content/
```


## Hugo設定


デフォルトの設定ファイル `hugo.toml` をテーマのサンプル設定に置き換えます。


```shell
# 既存の設定を削除
rm hugo.toml

# サンプル設定をコピー
cp themes/m10c/exampleSite/config.toml ./hugo.toml
```


`hugo.toml` ファイルを開いて基本設定を修正します。


```toml
baseURL = "https://testblog.plzhans.com"
title = "Test blog"
theme = "m10c"
```


**注意:** `themesDir` 設定は削除し、`theme` は実際のディレクトリ名と一致させます。


## ローカルサーバーの実行


```shell
# 開発サーバーの起動
hugo server -D
```


実行結果の例:


```javascript
Watching for changes in /Users/plzhans/temp/sample/hugo/...
Start building sites …
hugo v0.154.5+extended+withdeploy darwin/arm64 BuildDate=2026-01-11T20:53:23Z

Built in 2 ms
Environment: "development"
Web Server is available at http://localhost:57264/
Press Ctrl+C to stop
```


ブラウザで表示されたアドレスにアクセスして確認します。


# GitHub Pagesへのデプロイ


## リポジトリの作成


GitHubで新しいリポジトリを作成します。


## デプロイ戦略の選択


JekyllとHugoはどちらもソースとビルド成果物を分離して管理します。


JekyllはGitHub Pagesが自動的に検出してデプロイしますが、HugoはGitHub Actionsを通じて直接デプロイする必要があります。


このドキュメントでは方法1を使用してデプロイ戦略を構成しました。


### 方法1: actions/deploy-pages

- リポジトリ1つを使用
- GitHub PagesのソースをGitHub Actionsに設定
- mainブランチへpush → Hugoビルド → 成果物アップロード → 自動デプロイ

### 方法2: peaceiris/actions-gh-pages

- リポジトリ1つを使用
- GitHub Pagesをgh-pagesブランチに接続
- mainブランチへpush → Hugoビルド → gh-pagesブランチにコミット

### 方法3: デプロイリポジトリの分離

- リポジトリ2つを使用（ソースリポジトリ、デプロイリポジトリ）
- ビルド成果物をデプロイリポジトリにプッシュ

## GitHub Pages設定


Repository → Settings → Pages → Sourceを**GitHub Actions**に設定します


## GitHub Actionsワークフローの作成


`.github/workflows/deploy-hugo.yml` ファイルを作成します。


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


## Gitデプロイ


```shell
# リモートリポジトリの追加
git remote add origin git@github.com:plzhans/hugo-sample.git

# .gitignoreの設定
echo "/public/" >> .gitignore

# 全ファイルをコミット
git add .
git commit -m "first commit"

# ブランチの作成とプッシュ
git branch -M master
git push -u origin master
```


## デプロイの確認


GitHub Actionsタブでワークフローの実行を確認し、Settings → Pagesでデプロイされた URLを確認します。


**例のURL:** [https://plzhans.github.io/hugo-sample/](https://plzhans.github.io/hugo-sample/)


## 注意事項


### baseURL設定


`hugo.toml` の `baseURL` またはビルド時の `--baseURL` オプションが正確でない場合、CSSと画像パスが間違ってエラーが発生します。


このガイドでは、GitHub Actionsワークフローの環境変数 `HUGO_BASEURL` にデプロイアドレスを設定しました。


## 関連記事

- カスタムドメイン設定：[GitHub Pagesでカスタムドメインを使用する](../86-github-pages-custom-domain/)
- （準備中）Notionで作成した記事をGitHub Pagesに自動デプロイする
