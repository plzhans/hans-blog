---
id: "89"
translationKey: "89"
slug: "89-gpg-encrypt-env-file"
title: "GPGで.envファイルを暗号化して安全にコミットする"
categories:
  - "git"
tags:
  - "git"
  - "github"
  - "gpg"
date: 2026-02-16T17:42:00.000Z
lastmod: 2026-02-17T17:08:00.000Z
toc: true
draft: false
images:
  - "assets/1_30922a0f-7e83-803e-8671-fa8de7b1660a.png"
---


![](./assets/1_30922a0f-7e83-803e-8671-fa8de7b1660a.png)


# 概要


アプリケーションの設定ファイルや環境変数定義ファイルをGitにコミットしなければならない場合があります。


開発環境のパスワードだからと油断してコミットしてしまったり、本番（プロダクション）環境のパスワードが含まれたままコミットされてしまうケースも少なくありません。


この記事では、**秘密情報を含むファイルをコミットする際に、内容を暗号化して隠す方法**をまとめます。


代表的なアプローチはいくつかありますが、ここでは**GPGを直接使う方式**のみを扱います。


### ファイル内容の暗号化によく使われる方法

- gpg
- age
- git-crypt（Gitフィルターベースの暗号化）
- sops (+age)

# なぜGPG？


GitHubのコミット・タグ署名のためにすでにGPGを使っている場合が多いです。


同じキーでファイルの暗号化まで続けて行えるのが利点です。


インストール・キー生成については[GitでGPGを使ってコミットに署名する](../88-github-gpg-commit-signing/)のドキュメントを参照してください。


ファイルの暗号化だけが目的なら、ageの方がシンプルに感じるかもしれません。


# ファイルの暗号化・復号


**前提条件：** 以下の手順を進める前に、GPGキーが発行済みである必要があります。


## 最初に確認すべき点（重要）

- **すでに過去のコミットに含まれている**場合は、`.gitignore`に追加しても**過去のコミットから秘密の値を閲覧できます。**
- 完全に削除するには、秘密の値を**廃棄・再発行**し、gitのコミットを**書き直す**必要があります。

## 元のファイルをGitから除外する


```shell
# .gitignoreに.envを追加
echo ".env" >> .gitignore

# すでに追跡中の場合はインデックスから削除
# （ローカルファイルは残してGitの追跡のみ削除）
git rm --cached .env
```


## ファイルの暗号化


### 注意事項

- `gpg --encrypt`は既存ファイルを更新するのではなく、**毎回新しく出力ファイルを生成**します。
- ファイルが既に存在する場合は上書きするか確認されます。自動承認には`--yes`オプションを使用します。

`.env`ファイルの例：


秘密情報を含む`.env`ファイルから暗号化された`.env`ファイルを作成します。


```shell
# 指定したrecipient（受信者）キーで暗号化して.env.encを生成
gpg --encrypt -r plzhans@gmail.com --output .env.enc .env

# 上書きの自動化が必要な場合
# gpg --yes --encrypt -r plzhans@gmail.com --output .env.enc .env
```


## ファイルの復号


`.env.enc`ファイルから秘密情報を含む`.env`ファイルを作成します。


```shell
gpg --decrypt .env.enc > .env
```


# その他


## デフォルトrecipientの指定

- `-r`を毎回指定するのが面倒な場合に使用できます。
- `default-recipient`: `-r`オプションがない場合にデフォルトで使用
- `encrypt-to`: `-r`オプションに関わらず必ず含める
- 設定ファイル: `~/.gnupg/gpg.conf`

```shell
# デフォルトキー
default-key {pub uuid}

# デフォルトrecipient
default-recipient {pub uuid}

# 必ず含めるrecipient（必要な場合のみ）
#encrypt-to {pub uuid}
```

