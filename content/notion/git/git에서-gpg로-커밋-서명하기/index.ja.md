---
id: "88"
translationKey: "88"
slug: "88-github-gpg-commit-signing"
title: "GitでGPGを使ってコミットに署名する"
description: "GitでGPGコミット署名を設定する手順をまとめました。GnuPGのインストールからキーの生成とエクスポートまでを説明します。Gitでの自動署名の設定方法も解説します。ローカルでの署名検証の方法も案内します。GitHubに公開鍵を登録してVerifiedバッジを確認する流れも整理しました。"
categories:
  - "git"
tags:
  - "git"
  - "github"
  - "gpg"
date: 2026-02-16T17:42:00.000Z
lastmod: 2026-02-19T01:31:00.000Z
toc: true
draft: false
images:
  - "assets/1_30922a0f-7e83-8009-8ece-df4294bd3d5c.png"
---


![](./assets/1_30922a0f-7e83-8009-8ece-df4294bd3d5c.png)


## 概要


GitコミットにGPGデジタル署名を追加することで、コミット作成者の身元を証明し、コードの完全性を保証できます。


このドキュメントでは、GPGの概念とGitでの活用方法を紹介します。


GPGキーの生成からGitの設定、GitHubとの連携まで、全体の手順を段階的に案内します。


## GPGとは？


<strong>GPG（GNU Privacy Guard）</strong>は、データ暗号化とデジタル署名のためのオープンソース暗号化ソフトウェアです。


PGP（Pretty Good Privacy）標準に従い、公開鍵暗号方式を使用します。


**主な特徴**

- **公開鍵暗号化：** 公開鍵と秘密鍵のペアでデータを暗号化・復号します。
- **デジタル署名：** 秘密鍵でデータに署名します。作成者の身元とデータの完全性を保証します。
- **セキュアな通信：** メールやファイルなどを安全に暗号化して送信できます。

### **GitとGPG**


GitでGPGはコミットやタグにデジタル署名を追加する際に使用します。

- コミットが実際に本人によって作成されたことを証明できます。
- GitHubやGitLabなどのプラットフォームでVerifiedバッジを表示し、信頼性を高めます。
- コードの改ざんや偽造を防ぎ、プロジェクトのセキュリティを強化します。
- ファイルを暗号化して保護します。

### Gitコミットに署名する理由


Gitコミットの作成者情報は、`git config user.name`と`user.email`で誰でも任意に設定できます。


そのため、名前とメールアドレスだけでは実際の作成者を信頼することが難しいです。


コミット前に秘密鍵でコミットに署名し、公開鍵をGitHubなどのリポジトリに登録することで、プラットフォームが署名を検証してコミット作成者が一致するかどうかを確認できます。


## GPGを使う


### gnupgのインストール


gnupg: GPGを使用するためのパッケージのインストール（例：Mac）


```shell
brew install gnupg
```


### キーの生成


`gpg --full-generate-key`はデフォルトで対話型モードで動作します。バッチモードもオプションとしてサポートされています。


```shell
gpg --full-generate-key
```

> Please select what kind of key you want:
> (1) RSA and RSA
> (2) DSA and Elgamal
> (3) DSA (sign only)
> (4) RSA (sign only)
> (9) ECC (sign and encrypt) _default_
> (10) ECC (sign only)
> (14) Existing key from card
> Your selection? 1
>
> RSA keys may be between 1024 and 4096 bits long.
> What keysize do you want? (3072) 4096
>
>
> Requested keysize is 4096 bits
> Please specify how long the key should be valid.
> 0 = key does not expire
> \<n\>  = key expires in n days
> \<n\>w = key expires in n weeks
> \<n\>m = key expires in n months
> \<n\>y = key expires in n years
> Key is valid for? (0) 1y
>
>
> Key is valid for? (0) 1y
> Key expires at 2027년  2월 16일 화요일 17시 14분 10초 KST
> Is this correct? (y/N) y
>
>
> GnuPG needs to construct a user ID to identify your key.
>
>
> Real name: your name
> Email address: your test@email.com
> Not a valid email address
> Email address: test@test.com
> Comment: test
> You selected this USER-ID:
> "your name (test) test@test.com"
>
>

![](./assets/2_30922a0f-7e83-8051-b1f7-d7a544c8425e.png)


### キー生成の確認


```shell
# 秘密鍵の一覧
gpg --list-secret-keys

# 公開鍵の一覧
gpg --list-keys
```


### その他の必要な機能

{{< details summary="キーの削除が必要な場合" >}}
```shell
# 秘密鍵の削除
gpg --delete-secret-keys {sec uuid}

# 公開鍵の削除
gpg --delete-keys {pub uuid}
```
{{< /details >}}

{{< details summary="キーのエクスポート" >}}
```shell
# 秘密鍵のエクスポート
# gpg --armor --export-secret-keys {key_id} > private.asc
gpg --armor --export-secret-keys 7XXXXXXXXXXXXXXXX6 > private.asc

# 公開鍵のエクスポート
# gpg --armor --export {key_id} > public.asc
gpg --armor --export 7XXXXXXXXXXXXXXXX6 > public.asc
```
{{< /details >}}

{{< details summary="キーの復元" >}}
```shell
#
gpg --import private.asc

# trustの指定
# gpg --edit-key {key_id}
gpg --edit-key 7XXXXXXXXXXXXXXXX6

# 登録確認
gpg --list-secret-keys --keyid-format LONG
```
{{< /details >}}


### （参考）トラブルシューティング

{{< details summary="**エラー**: パスフレーズ（キーの暗号）を使わないようにしようとしました。キー生成の途中でパスワード入力画面に戻りました。" >}}
**原因**

- 最新バージョンではキー漏洩のセキュリティリスクから、キーのパスフレーズ使用を強く推奨しています。
- バッチモードなどで回避する方法はありますが、それでも短くてもパスフレーズを設定する方が安全です。

**解決**：パスフレーズを設定しました。
{{< /details >}}


## Gitでの署名


コミットする際は、GitHubに登録したGPG公開鍵と紐づいた秘密鍵で署名する必要があります。


その後、GitHubは署名されたコミットがプッシュされるとコミット作成者を検証します。


GitHubのコミットに「Verified」バッジも一緒に表示されます。


### GitでGPG署名の準備


以下のA、B、Cの方式から一つを選択します。


### オプション A) 手動署名（コミットごとに `-S`）

{{< details summary="自動設定なしで、署名したいコミットにだけ `-S` を付けます。" >}}
```shell
git commit -S -m "Commit message"
```
{{< /details >}}


### オプション B) グローバル自動署名（すべてのリポジトリ）

{{< details summary="ローカル環境で作るすべてのリポジトリに自動署名を有効にします。" >}}
```shell
# GPGキーIDを登録（グローバル）
git config --global user.signingkey 7XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX6

# コミット自動署名（グローバル）
git config --global commit.gpgsign true

# 設定確認
git config --show-origin commit.gpgsign
```
{{< /details >}}


### オプション C) リポジトリ単位の自動署名（特定のリポジトリのみ）

{{< details summary="特定のリポジトリでのみ自動署名を有効にします。" >}}
- `--global`はすべてのリポジトリに適用します。
- `--local`は現在のリポジトリにのみ適用します。設定は`.git/config`に保存されます。

```shell
# リポジトリに移動
cd /path/to/repo

# GPGキーIDを登録（ローカル）
git config --local user.signingkey 7XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX6

# コミット自動署名（ローカル）
git config --local commit.gpgsign true

# 設定確認
git config --show-origin commit.gpgsign
```
{{< /details >}}


### GPGで署名されたコミットの作成


コミット時に `-S` オプションを使用して署名を追加します。


```shell
# 署名されたコミットを作成
git commit -S -m "コミットメッセージ"

# 自動署名が設定されている場合
git commit -m "コミットメッセージ"
```


署名確認：コミットが正しく署名されているか確認します。


```shell
# コミット署名の確認
git log --show-signature

# または
git verify-commit HEAD
```


### （参考）トラブルシューティング

{{< details summary="**error: gpg failed to sign the data**" >}}
**署名の問題でコミットが失敗しました。**


```plain text
**error: gpg failed to sign the data:**
[GNUPG:] KEY_CONSIDERED 7E7DCEBF62463A41ACD992D8D9F62FE2379DF7E6 2
[GNUPG:] BEGIN_SIGNING H8
[GNUPG:] PINENTRY_LAUNCHED 42114 curses 1.3.2 - xterm-256color NONE - 501/20 0
gpg: signing failed: Inappropriate ioctl for device
[GNUPG:] FAILURE sign 83918950
gpg: signing failed: Inappropriate ioctl for device
**fatal: failed to write commit object**
```


**原因：** GPGキーにパスフレーズが設定されている状態で発生することがあります。


**解決：** OSと環境によって対処方法が異なります。Mac環境では<strong>pinentry-mac</strong>をインストールして解決しました。

>
> 1. パッケージのインストール
> `brew install pinentry-mac`
> 2. ~/.gnupg/gpg-agent.conf に以下の内容を追加します。
> `pinentry-program /opt/homebrew/bin/pinentry-mac`
> 3. ~/.profile に以下の内容を追加します。
> `export GPG_TTY=$(tty)`
> 4. プロファイルを再読み込みします。
> `source ~/.profile`
> 5. gpg agentを再起動
> `gpgconf --kill gpg-agent`
> `gpgconf --launch gpg-agent`
> 6. 再度コミット：パスフレーズ入力ウィンドウが表示されます
>
> ![](./assets/3_30922a0f-7e83-8047-9f1b-ec157d7d9f09.png)
>
>
{{< /details >}}


## GitHubでの署名


### GitHubとGPG


GitHubにGPG公開鍵を登録することで、コミット署名を検証できます。


GitHubはプッシュされたコミットの署名を確認する際、登録されたGPG公開鍵を使って署名が有効かどうかを検証します。


検証が成功するとコミットの横に「Verified」バッジが表示され、そのコミットが登録されたキーの所有者によって作成されたことを証明します。


これにより以下のメリットが得られます：

- **身元確認：** コミット作成者が実際に本人であることを証明します。
- **改ざん防止：** 他人が自分の名前でコミットを作成することを防ぎます。
- **信頼性向上：** オープンソースプロジェクトやチーム協業でコードの出所を明確にします。

### 登録手順


GPG公開鍵をGitHubの個人設定の **GPG keys** セクションに登録します。

- GitHubにログインし、右上のプロフィールアイコンをクリックします。
- <strong>Settings</strong>を選択します。
- 左サイドバーで <strong>SSH and GPG keys</strong> をクリックします。
- **GPG keys** セクションで **New GPG key** ボタンをクリックします。
- 公開鍵の全内容をコピーして入力欄に貼り付けます。
- **Add GPG key** ボタンをクリックして登録を完了します。

登録が完了するとGPG Keysのリストに新しいキーが表示されます。


### 個人のGPG公開鍵の照会


```shell
gpg --list-secret-keys --keyid-format LONG
```

>
>
> 結果
>
>
> [keyboxd]
>
>
> —-
>
>
> pub   rsa4096 2026-02-16 [SC] [expires: 2027-02-16]
> 7XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX6 ← {Key ID}
> uid           [ultimate] Son Won Chul (plzhans's macbook) [plzhans@gmail.com](mailto:plzhans@gmail.com)
> sub   rsa4096 2026-02-16 [E] [expires: 2027-02-16] ← キーの有効期限
>
>

キーの内容を確認します。


```shell
# キーの閲覧: gpg --armor --export {Key ID}
gpg --armor --export 7XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX6
```


### GitHub GPGキーの登録


![](./assets/4_30922a0f-7e83-80df-b1bf-db8d4f984ac7.png)


![](./assets/5_30922a0f-7e83-80d1-b6c1-ce0f86256467.png)


### リポジトリへのプッシュ


署名されたコミットをGitHubにプッシュすると「Verified」バッジが表示されます。


```shell
git push origin main
```


### 署名されたコミットとタグの確認


![](./assets/6_30922a0f-7e83-806f-a583-f3ce282e27fb.png)

