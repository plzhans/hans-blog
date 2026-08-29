---
id: "89"
translationKey: "89"
slug: "89-gpg-encrypt-env-file"
title: "GPGで.envファイルを暗号化して安全にコミットする方法"
description: ".envファイルをGitにコミットする必要がある場合に、GPGで暗号化して機密情報の漏洩を防ぐ方法をまとめました。.gitignoreの設定からgpg encrypt/decryptコマンド、recipientのデフォルト設定まで適用して、安全なリポジトリ運用を始めましょう。"
categories:
  - "git"
tags:
  - "git"
  - "github"
  - "gpg"
date: 2026-02-16T17:42:00.000Z
lastmod: 2026-08-29T16:02:00.000Z
toc: true
draft: false
images:
  - "assets/1_30922a0f-7e83-803e-8671-fa8de7b1660a.png"
---


![GPGで.envファイルを暗号化し、機密情報を漏らさずにGitにコミットする流れを示した代表画像](./assets/1_30922a0f-7e83-803e-8671-fa8de7b1660a.png)


# 概要


アプリケーションの設定ファイルや環境変数定義ファイルをGitにコミットしなければならない場合があります。


開発環境のパスワードだからと不用意にコミットしてしまったり、本番(プロダクション)環境のパスワードが含まれたままコミットされてしまうこともよくあります。


この記事では、<strong>機密情報が含まれるファイルをコミットする際に、内容を暗号化して隠す方法</strong>をまとめます。


代表的なアプローチはいくつかありますが、ここでは<strong>GPGを直接使用する方式</strong>のみを扱います。


### ファイル内容の暗号化によく使われるおすすめの方法

- gpg
- age
- git-crypt（Gitフィルターベースの暗号化）
- sops（+age）

# なぜGPGなのか？


GitHubのコミット/タグ署名のためにすでにGPGを使っているケースが多いです。


同じキーでファイルの暗号化まで拡張できる点がメリットです。


インストール/キー生成については[GitでGPGによるコミット署名を行う](../88-github-gpg-commit-signing/)の記事を参考にしてください。


ファイル暗号化だけが目的なら、ageのほうがシンプルに感じられるかもしれません。


# ファイルの暗号化/復号化


**事前要件:** 以下の手順を進める前に、GPGキーが発行されている必要があります。


## 最初に確認すべき点（重要）

- <strong>すでに過去のコミットに含まれた</strong>ことがある場合、`.gitignore`に追加しても**過去のコミットから機密情報を閲覧できてしまいます。**
- 完全に取り除くには、機密情報を<strong>失効/再発行</strong>し、gitコミットを<strong>書き換える</strong>必要があります。
    - `git filter-repo` または BFG Repo-Cleaner
    - （必要な場合）force push

## 元のファイルをGitから除外する


```shell
# .gitignoreに.envを追加
echo ".env" >> .gitignore

# もしすでに追跡されている場合はインデックスから削除
# （ローカルファイルは残し、Gitの追跡のみ解除）
git rm --cached .env
```


## ファイルの暗号化


### 注意事項

- `gpg --encrypt`は既存ファイルを更新する概念ではなく、<strong>実行のたびに出力ファイルを新規作成</strong>します。
- ファイルがすでに存在する場合、上書きするか確認されます。自動的に同意するには`--yes`オプションを使用します。

`.env`ファイルの例:


機密情報が含まれる.envファイルから、暗号化された.envファイルを作成します。


```shell
# 指定したrecipient（受信者）のキーで暗号化して.env.encを生成
gpg --encrypt -r plzhans@gmail.com --output .env.enc .env

# 上書きまで自動化したい場合は
# gpg --yes --encrypt -r plzhans@gmail.com --output .env.enc .env
```


## ファイルの復号化


.env.encファイルから機密情報を含む.envファイルを作成します。


```shell
gpg --decrypt .env.enc > .env
```


# その他


## デフォルトrecipientの指定


- 毎回`-r`を指定するのが面倒な場合に使用できます。
- `default-recipient`: `-r`オプションがない場合にデフォルトで使用
- `encrypt-to`: `-r`オプションに関係なく必ず含める
- 設定ファイル: `~/.gnupg/gpg.conf`

```shell
# デフォルトキー
default-key {pub uuid}

# デフォルトrecipient
default-recipient {pub uuid}

# 必ず含めるrecipient（必要な場合のみ）
#encrypt-to {pub uuid}
```
