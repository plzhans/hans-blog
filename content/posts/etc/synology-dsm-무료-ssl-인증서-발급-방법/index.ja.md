---
id: "104"
translationKey: "104"
slug: "104-synology-dsm-acme-sh-letsencrypt"
title: "Synology DSM 無料 SSL 証明書の発行方法 | "
description: "Synology DSM で acme.sh と Cloudflare DNS 認証を使い、Let's Encrypt 無料 SSL 証明書を発行して自動更新する方法を整理します。synology_dsm deploy-hook の設定と 2FA およびホスト名エラーの解決方法まで案内します。"
categories:
  - "etc"
tags:
  - "dsm"
  - "synology-nas"
date: 2026-05-16T05:03:00.000Z
lastmod: 2026-06-18T08:02:00.000Z
toc: true
draft: false
images:
  - "assets/1_38322a0f-7e83-80ac-9410-f92e336bb81a.png"
---


![](./assets/1_38322a0f-7e83-80ac-9410-f92e336bb81a.png)


## 概要


DSM を外部に直接公開する方式は危険なため、Tailscale、OpenVPN、WireGuard などの VPN の使用を推奨します。


外部アクセスを遮断しドメインをプライベート IP にマッピングした環境では、HTTP 認証方式での無料証明書登録が困難です。


この記事では **Synology NAS（DSM）で [acme.sh](http://acme.sh/) を使って Let's Encrypt 無料 SSL 証明書を発行し、DSM に自動インストールする方法**を整理します。


---


## 準備事項

- ドメイン: 例）`plzhans.com`
- DNS: Cloudflare 使用（推奨）
- DSM 自動インストール用アカウント（2FA なしのアカウントが必要、下記参照）

---


## Cloudflare API トークンの発行（最小権限）


セキュリティのため、特定ドメインに最小権限のみを付与したトークンを作成します。


### 最小必須権限

- DNS: Read, Edit
- Zone: Read

![](./assets/2_36122a0f-7e83-80e6-9c56-c0c62fc2aa95.png)


---


## 証明書の発行（[acme.sh](http://acme.sh/)）


### まずテストサーバーで確認


本番（Production）サーバーに繰り返しリクエストするとブロックされる可能性があります。成功サイクルが確立するまではテストサーバーを使用します。

- `--server letsencrypt_test`
- 発行には `--issue` オプションが必要です

```bash
#!/bin/bash

export CF_Token="cloudflare_api_token"

acme.sh \
  --server letsencrypt_test \
  --log --debug \
  --home ~/ssl \
  --issue \
  --dns dns_cf \
  -d "plzhans.com" \
  -d "*.plzhans.com"
```


### 本番発行


```bash
acme.sh \
  --server letsencrypt \
  --log --debug \
  --home ~/ssl \
  --issue \
  --dns dns_cf \
  -d "plzhans.com" \
  -d "*.plzhans.com"
```


### 発行確認


```bash
acme.sh \
  --home ~/scripts/ssl \
  --list

# execute result
# Main_Domain	KeyLength	SAN_Domains	CA	Created	Renew
# plzhans.com	"ec-256"	*.plzhans.com	LetsEncrypt.org	2026-05-15T04:59:58Z	2026-07-13T04:59:58Z
```


参考

- 使用したトークン情報は `account.conf` ファイルに保存されます
- ドメイン設定は例）`~/ssl/plzhans.com_ecc/plzhans.com.conf` に保存されます

---


## 発行した証明書を DSM にインストール（deploy-hook）


[acme.sh](http://acme.sh/) は deploy-hook として `synology_dsm` をサポートしています。

- DSM に証明書がない場合、`SYNO_Create="1"` の値が必要です
- テスト証明書がすでに発行されている場合、削除するか `--force` オプションが必要になることがあります

### 既存証明書の削除（必要な場合）


```bash
acme.sh --remove --home ~/ssl -d "plzhans.com"
```


### DSM 自動インストールスクリプトの例


```bash
#!/bin/bash

# syno server
export SYNO_Hostname="localhost"
export SYNO_Scheme="https"
export SYNO_Port="5001"

# syno account
export SYNO_Username='system-script'
export SYNO_Password='secret'

export SYNO_Create="1"

acme.sh \
  --deploy \
  --insecure \
  --home ~/ssl \
  --log --debug \
  --deploy-hook synology_dsm \
  -d "plzhans.com"

# execute result
# ...
# ret='0'
# Success
```


---


## 問題発生: 2FA で自動化がブロックされる場合


`SYNO_Username` アカウントに 2FA が適用されていると、自動化の妨げになります。


解決策

- 別のアカウントを作成します（管理者アカウントが必要）
- 自動化用の最小セキュリティ対策で運用します
    - 外部アクセス不可
    - 必要な権限のみ付与
- そのアカウントの 2FA を無効化します

DSM 確認


![](./assets/3_36122a0f-7e83-808e-9e19-d5de5cd0c5e1.png)


---


## FAQ: ホスト名/証明書マッチングの問題


外部アクセスが遮断されて代表ドメインでのアクセスが不可能な場合（例: `wee-home.synology.me`）、証明書マッチング失敗によりエラーが発生する可能性があります。コマンドの実行時に `https://{Hostname}:{port}` でアクセスするためです。


3 つの解決策から 1 つを選択

1. `SYNO_Hostname` を実際にアクセス可能な有効な証明書のドメインに指定します
2. `/etc/hosts` ファイルにドメインを記述して DNS クエリをバイパスし、`127.0.0.1` に接続します
3. `http` 方式を使用します

---


## 参考

- [https://github.com/acmesh-official/acme.sh/wiki/Synology-NAS-Guide](https://github.com/acmesh-official/acme.sh/wiki/Synology-NAS-Guide)
