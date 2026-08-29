---
id: "10"
translationKey: "10"
slug: "10-tortoisegit-clear-saved-authentication-data"
title: "TortoiseGitの認証エラーを解決する：保存された認証情報を初期化(Clear)する方法"
description: "TortoiseGitでAuthentication failedが繰り返し発生する場合に、Saved DataのClearで保存された認証情報を初期化する手順をまとめました。Windows資格情報マネージャーの整理、credential.helperの確認、PATの準備、SSHへの切り替えまで扱います。"
categories:
  - "git"
tags:
  - "git"
  - "gitlab"
  - "TortoiseGit"
date: 2020-09-03T16:46:00.000Z
lastmod: 2026-08-29T16:02:00.000Z
toc: true
draft: false
images:
  - "assets/1_31222a0f-7e83-80ae-9ee2-d7e9823934ad.png"
---


![TortoiseGitに保存された認証情報を初期化してAuthentication failedエラーを解決する内容を表す代表画像](./assets/1_31222a0f-7e83-80ae-9ee2-d7e9823934ad.png)


## 概要


Gitサーバーのアドレスが変わったり、アカウントを変更したりしても認証失敗が繰り返される場合があります。


原因は、TortoiseGitがWindowsの資格情報または自身のストレージに以前の認証情報を保存しているためです。


この記事では、TortoiseGitで保存された認証情報を初期化する方法をまとめます。


## 症状

- `Authentication failed` エラーが繰り返し発生する
- 同じリポジトリでアカウントが変わったにもかかわらず、以前のアカウントで認証を試みる

## 原因

- GitサーバーをGitHubからGitLabに変更した
- HTTP(S) URLまたはユーザー名が変わった

## 解決策


### TortoiseGitで認証情報を初期化する


以下の手順は、保存された認証データを削除して、次のPullまたはPushで再びログイン入力画面が表示されるようにする方法です。

1. Windowsエクスプローラーで、Gitの作業フォルダーに移動します。
2. フォルダー上でマウスの右ボタンをクリックします。
3. **TortoiseGit → Settings** に移動します。

    ![エクスプローラーの右クリックメニューからTortoiseGit → Settingsに移動する画面](./assets/2_2fd22a0f-7e83-81f2-a7bc-c7bc5c867533.png)

4. 左側のメニューで **Saved Data** を選択します。
5. **Authentication data** 領域で **Clear** をクリックします。

    この操作により、既存に保存されていた認証情報が削除されます。


    ![SettingsのSaved DataでAuthentication dataをClearする画面](./assets/3_2fd22a0f-7e83-8185-97b3-f0be61b614d4.png)

6. 再度 `Pull` または `Push` を実行します。
7. IDとパスワード、またはトークンを再入力します。
    > 参考  
    > GitLabでは通常、パスワードの代わりにPersonal Access Tokenを使用します。  
    > 2FAを使用している場合は、トークンを事前に準備してから入力します。

### 削除できない場合の点検

- リポジトリURLが複数保存されている場合、他のURLの認証データが残っている可能性があります。
- Windows資格情報マネージャーにも関連項目が残っている場合があります。
    - コントロールパネルの **資格情報マネージャー → Windows資格情報** でGit関連の項目を確認します。

## Windows資格情報マネージャーで直接削除する


TortoiseGitのClearで削除されない認証情報は、Windowsが別途保管している場合が多いです。

1. コントロールパネル → ユーザーアカウント → <strong>資格情報マネージャー</strong> に移動します。
2. **Windows資格情報** タブを選択します。
3. `git:https://github.com`、`git:https://gitlab.com` のように `git:` で始まる項目を探します。
4. 項目を展開して <strong>削除</strong> をクリックします。

コマンドで先に確認したい場合は、以下を使用します。


```powershell
cmdkey /list | findstr git
```


## どのcredential helperが使われているか確認する


認証情報を実際に保管する主体は、Gitに設定されたcredential helperです。どこに保存されているか分からないと、見当違いの場所を削除し続けることになるため、まず設定値を確認します。


```shell
git config --show-origin --get credential.helper
```

- `manager` : Git Credential Managerが管理します。独自のアカウント選択画面が表示されるため、Windows資格情報と併せて確認する必要があります。
- `wincred` : Windows資格情報マネージャーに保存します。
- 値が空の場合は保存されず、毎回入力を求められます。

特定のホストの認証情報だけを削除したい場合は、以下のように実行します。


```shell
printf "protocol=https\nhost=github.com\n\n" | git credential reject
```


## 新しく入力する値を準備する


GitHubとGitLabはいずれもセキュリティのため、アカウントのパスワードの代わりにトークンを使用します。
削除する前にあらかじめ発行しておくと、認証画面が表示されたときにすぐ入力できます。

- GitHub : Settings → Developer settings → Personal access tokens
- GitLab : User Settings → Access Tokens

cloneとpushを行うには、リポジトリの読み取りと書き込みの権限を付与します。必要以上に広い権限は与えない方が安全です。


## 繰り返される場合はSSHへの切り替えを検討します


HTTP(S)の認証情報を何度も修正しなければならない場合は、リモートアドレスをSSHに変更する方法があります。一度キーを登録すれば、トークンの期限切れや資格情報キャッシュの問題から解放されます。


```shell
# 現在のリモートアドレスを確認
git remote -v

# SSHアドレスに変更
git remote set-url origin git@github.com:{アカウント名}/{リポジトリ名}.git
```


キーの生成と登録の手順は、[Git SSHキーでリモートリポジトリに接続する：キー生成から登録まで](../13-git-ssh-key-setup-and-remote-access/) の記事で確認できます。
