---
id: "94"
translationKey: "94"
slug: "94-hugo-github-blog"
title: "Hugo + GitHubでブログを作る"
description: "Notion→Markdown変換→Hugoビルド→GitHub Pagesデプロイという流れで個人ブログを構築する過程をまとめました。Hugoのインストールとm10cテーマの適用、GitHub Actionsによる自動デプロイ、baseURL設定の注意点まで実践し、デプロイエラーを減らしましょう。"
categories:
  - "web"
tags:
  - "github-action"
  - "github-pages"
  - "hugo"
date: 2026-02-10T08:46:00.000Z
lastmod: 2026-09-03T11:08:00.000Z
toc: true
draft: false
images:
  - "assets/1_30a22a0f-7e83-80c6-b1d4-ed75cfa333a7.png"
---


![Notion執筆→Markdown変換→Hugoビルド→GitHub Pagesデプロイへとつながるブログ構築の流れを表したアイキャッチ画像](./assets/1_30a22a0f-7e83-80c6-b1d4-ed75cfa333a7.png)


## はじめに


技術関連の内容をEvernoteや個人ドキュメントに整理してきたが、Notionのウェブサイト機能を活用してブログとして運用しようと準備していた。


しかし、Notionはカスタマイズに制約があり、カスタムドメインの利用にも追加費用が発生するため、少し悩むことになった。


代案として[velog](https://velog.io/)に切り替えるか、Markdownで書き直してJekyllに移行するか検討した。


しかし、書きやすいNotionを諦めることはできなかった。結論はNotionで執筆し、静的ウェブサイトとしてデプロイすること!


## 目標

- mdファイルで書かれたドキュメントをHugoでビルドし
- GitHub Pagesでデプロイを自動化する

> 💡 **構築環境**  
> - テスト環境: Mac  
> - デプロイ環境: GitHub Actions


**Hugoを選んだ理由**

- GitHub Starの数が多く、活発に更新されている
- 1000ページ以上をビルドする際にJekyllより速い

**現在このブログは次のような流れで運用している。(ソース参考: )**


> Notionで執筆   
> → Notion APIでMarkdownに変換  
>   
>   
> → Hugoで静的サイトをビルド  
>   
>   
> → GitHub Pagesにデプロイ


## 事前準備


### Hugoテーマの選定


[Hugo Themes](https://themes.gohugo.io/)でテーマをまず選んだ。


**選んだテーマ:** [m10c](https://themes.gohugo.io/themes/hugo-theme-m10c/)


**テーマ選定基準**

- SEO最適化機能をサポート
- 多言語サイト機能をサポート

m10cは一部機能が完全にはサポートされていないが、Hugoのレイアウトオーバーライドで補完できる。


### Hugoのインストール


**インストールドキュメント:** [Installation Guide](https://gohugo.io/installation/)


**Hugoドキュメント:** [Documentation](https://gohugo.io/documentation/)


Macの例


```shell
# Hugoをインストール
brew install hugo

# インストール確認
hugo --version
```


## Hugoサイトの作成


### プロジェクトの初期化


```shell
# 作業ディレクトリを作成
mkdir hugo && cd hugo

# Hugoサイトを作成
hugo new site .

# 生成結果を確認
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


### テーマのインストール


Git submoduleを使ってテーマをインストールする。


```shell
# Gitリポジトリを初期化(必要な場合)
git init

# テーマのsubmoduleを追加
git submodule add https://github.com/vaga/hugo-theme-m10c.git themes/m10c

# インストール確認
ls -al themes/m10c
```


### サンプルコンテンツのコピー(任意)


```shell
# テーマのサンプルコンテンツをコピー
cp -R themes/m10c/exampleSite/content ./content

# 確認
ls -al ./content/
```


### Hugoの設定


デフォルトの設定ファイルである`hugo.toml`をテーマのサンプル設定に置き換える。


```shell
# 既存の設定を削除
rm hugo.toml

# サンプル設定をコピー
cp themes/m10c/exampleSite/config.toml ./hugo.toml
```


`hugo.toml`ファイルを開いて基本設定を修正する。


```toml
baseURL = "https://testblog.plzhans.com"
title = "Test blog"
theme = "m10c"
```


**注意:** `themesDir`設定は削除し、`theme`は実際のディレクトリ名と一致させる。


### ローカルサーバーの実行


```shell
# 開発サーバーを起動
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


ブラウザで表示されたアドレスにアクセスして確認する。

> http://localhost:57264

## GitHub Pagesへのデプロイ


### リポジトリの作成


GitHubで新しいリポジトリを作成する。


### デプロイ戦略の選択


JekyllとHugoはいずれもソースとビルド成果物を分離して管理する。


Jekyllは GitHub Pagesが自動的に検知してデプロイするが、Hugoは GitHub Actionsを通じて直接デプロイする必要がある。


デプロイ戦略を選ぶ際に注意すべき点は、ソースリポジトリの公開・非公開の有無である。


ソースリポジトリを非公開にしたい場合は、以下の点に注意すること。


無料プラン

- 公開リポジトリのみPages設定が可能である。
- そのためソースを非公開にしたい場合は、方法3を使ってソースリポジトリを非公開にし、デプロイ用リポジトリのみ公開する必要がある。

有料プラン

- リポジトリが非公開でもPagesは公開可能

### 方法1: actions/deploy-pages

- リポジトリを1つ使用
- GitHub PagesのソースをGitHub Actionsに設定
- mainブランチへのpush → Hugoビルド → 成果物のアップロード → 自動デプロイ

### 方法2: peaceiris/actions-gh-pages

- リポジトリを1つ使用
- GitHub Pagesをgh-pagesブランチに接続
- mainブランチへのpush → Hugoビルド → gh-pagesブランチにコミット

### 方法3: デプロイ用リポジトリを分離

- リポジトリを2つ使用(ソースリポジトリ、デプロイ用リポジトリ)
- ビルド成果物をデプロイ用リポジトリにプッシュ

### 方法4: ビルド成果物を外部にアップロード

- GitHub Pagesを必ず使う必要はない。
- ウェブサーバーが接続されたディレクトリにビルド成果物だけをアップロードしてもよい。
- デフォルトでは成果物は`/public`ディレクトリに生成される。

> この文書では方法1を使ってデプロイ戦略を組み立てた。


### GitHub Pagesの設定


Repository → Settings → Pages → Sourceを<strong>GitHub Actions</strong>に設定


## GitHub Actionsワークフローの作成


`.github/workflows/deploy-hugo.yml`ファイルを作成する。


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


## Gitでのデプロイ


```shell
# リモートリポジトリを追加
git remote add origin git@github.com:plzhans/hugo-sample.git

# .gitignoreを設定
echo "/public/" >> .gitignore

# 全ファイルをコミット
git add . 
git commit -m "first commit"

# ブランチを作成してプッシュ
git branch -M master
git push -u origin master
```


## デプロイの確認


GitHub Actionsタブでワークフローの実行を確認し、Settings → Pagesでデプロイされたurlを確認する。


**例のアドレス:** [https://plzhans.github.io/hugo-sample/](https://plzhans.github.io/hugo-sample/)


## 注意事項


**baseURLの設定**


`hugo.toml`の`baseURL`、またはビルド時の`--baseURL`オプションが正しくないと、CSSと画像のパスが誤っていてエラーが発生する。


このガイドでは、GitHub Actionsワークフローの環境変数`HUGO_BASEURL`にデプロイ先アドレスを設定した。


## 関連記事

- 全体の概観: [Hugoブログを作る - 始め方からSEOまで](../123-hugo-blog-guide/)
- カスタムドメインの設定: [GitHub Pagesでカスタムドメインを使う](../86-github-pages-custom-domain/)
- 多言語(i18n)対応の設定: [Hugoサイトを多言語対応にする](../93-hugo-multilingual-seo-setup/)
- (準備中) Notionで書いた記事のデプロイを自動化してGitHub Pagesにデプロイする
