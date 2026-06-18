---
id: "10"
translationKey: "10"
slug: "10-tortoisegit-clear-saved-authentication-data"
title: "TortoiseGit 認証エラーの解決: 保存された認証情報の初期化（Clear）方法"
description: "Git サーバー変更後に TortoiseGit で Authentication failed が繰り返される場合に、Saved Data の Clear で保存された認証情報を初期化する手順をまとめました。Windows 資格情報マネージャーの点検まで一度に解決しましょう。"
categories:
  - "git"
tags:
  - "git"
  - "gitlab"
  - "TortoiseGit"
date: 2020-09-03T16:46:00.000Z
lastmod: 2026-06-18T02:47:00.000Z
toc: true
draft: false
images:
  - "assets/1_31222a0f-7e83-80ae-9ee2-d7e9823934ad.png"
---


![](./assets/1_31222a0f-7e83-80ae-9ee2-d7e9823934ad.png)


## 概要


Git サーバーのアドレスが変わったり、アカウントを変更したりしたのに、認証失敗が繰り返される場合があります。


原因は、TortoiseGit が Windows 資格情報または独自のストアに以前の認証情報を保存しているためです。


この記事では、TortoiseGit で保存された認証情報を初期化する方法をまとめます。


## 症状

- `Authentication failed` エラーが発生し続ける
- 同じリポジトリでアカウントが変わったのに、以前のアカウントで認証を試みる

## 原因

- Git サーバーを GitHub から GitLab に変更した
- HTTP(S) URL またはユーザー名が変わった

## 解決策


### TortoiseGit で認証情報を初期化する


以下の手順は、保存された認証データを消去して、次の Pull または Push で再びログイン入力画面が表示されるようにする方法です。

1. Windows エクスプローラーで Git の作業フォルダーに移動します。
2. フォルダー内で右クリックします。
3. **TortoiseGit → Settings** に移動します。

    ![](./assets/2_2fd22a0f-7e83-81f2-a7bc-c7bc5c867533.png)

4. 左側のメニューから **Saved Data** を選択します。
5. **Authentication data** 領域で **Clear** をクリックします。

    この操作で、既存に保存されていた認証情報が削除されます。


    ![](./assets/3_2fd22a0f-7e83-8185-97b3-f0be61b614d4.png)

6. 再度 `Pull` または `Push` を実行します。
7. ID とパスワードまたはトークンを再入力します。
    > 参考
    > GitLab は通常、パスワードの代わりに Personal Access Token を使用します。
    > 2FA を使用している場合は、トークンを準備してから入力します。

### 削除できない場合の点検

- リポジトリ URL が複数保存されている場合、別の URL の認証データが残っている可能性があります。
- Windows 資格情報マネージャーにも関連項目が残っている可能性があります。
    - コントロールパネルの **資格情報マネージャー → Windows 資格情報** で Git 関連の項目を確認します。
