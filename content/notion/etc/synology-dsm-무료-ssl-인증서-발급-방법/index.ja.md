---
id: "104"
translationKey: "104"
slug: "104-synology-dsm-acme-sh-letsencrypt"
title: "Synology DSM 無料SSL証明書の発行方法 | "
description: "Synology DSMでacme.shとCloudflare DNS認証を使ってLet’s Encryptの無料SSL証明書を発行し、自動更新する方法をまとめます。synology_dsm deploy-hookの設定や、2FAおよびHostnameエラーの解決まで案内します。"
categories:
  - etc
date: 2026-05-15T04:19:00.000Z
lastmod: 2026-06-18T05:02:00.000Z
toc: true
draft: false
images:
  - "assets/1_36122a0f-7e83-80e6-9c56-c0c62fc2aa95.png"
---


## 概要


DSMを外部に直接公開する方式は危険なため、Tailscale、OpenVPN、WireGuardのようなVPNの使用を推奨します。


外部アクセスを遮断してドメインをプライベートIPにマッチングした環境では、HTTP認証方式での無料証明書登録が困難です。


この記事は、**Synology NAS(DSM)で** [**acme.sh<strong>](http://acme.sh/)</strong>**を使ってLet’s Encryptの無料SSL証明書を発行し、DSMに自動インストールする方法**をまとめます。


---


## 準備事項

- ドメイン: 例) `plzhans.com`
- DNS: Cloudflareを使用(推奨)
- DSM自動インストール用アカウント(2FAなしのアカウントが必要、下記参照)

---


## Cloudflare APIトークンの発行(最小権限)


セキュリティのため、特定のドメインに最小権限のみを付与したトークンを作成します。


### 最小必須権限

- DNS: Read, Edit
- Zone: Read

![](./assets/1_36122a0f-7e83-80e6-9c56-c0c62fc2aa95.png)


---


## 証明書の発行([acme.sh](http://acme.sh/))


### テストサーバーでまず確認


本番(Production)サーバーへ繰り返しリクエストするとブロックされる可能性があります。成功サイクルを作るまではテストサーバーを使用します。

- `--server letsencrypt_test`
- 発行には`--issue`オプションが必要です

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


### 実際(本番)発行


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


### 発行の確認


```bash
acme.sh \
  --home ~/scripts/ssl \
  --list

# execute result
# Main_Domain	KeyLength	SAN_Domains	CA	Created	Renew
# plzhans.com	"ec-256"	*.plzhans.com	LetsEncrypt.org	2026-05-15T04:59:58Z	2026-07-13T04:59:58Z
```


参考

- 使用したトークン情報は`account.conf`ファイルに保存されます
- ドメイン設定は例) `~/ssl/plzhans.com_ecc/plzhans.com.conf` に保存されます

---


## 発行した証明書をDSMにインストール(deploy-hook)


[acme.sh](http://acme.sh/)はdeploy-hookとして`synology_dsm`をサポートします。

- DSMに証明書がない場合は`SYNO_Create="1"`の値が必要で、これによって作成されます
- テスト証明書がすでに発行されている場合は、削除するか`--force`オプションが必要になることがあります

### 既存証明書の削除(必要な場合)


```bash
acme.sh --remove --home ~/ssl -d "plzhans.com"
```


### DSM自動インストールスクリプトの例


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


## 問題発生: 2FAで自動化が妨げられる場合


`SYNO_Username`アカウントに2FAが適用されていると、自動化の妨げになります。


解決策

- 別のアカウントを作成します(管理者アカウントが必要)
- 自動化用に最小限のセキュリティ対策で運用します
    - 外部アクセス不可
    - 必要な権限のみ付与
- 該当アカウントは2FAを無効化

DSM確認


![](./assets/2_36122a0f-7e83-808e-9e19-d5de5cd0c5e1.png)


---


## FAQ: Hostname/証明書のマッチング問題


外部アクセスが遮断され、代表ドメインでのアクセスが不可能な場合(例: `wee-home.synology.me`)、証明書のマッチング失敗でエラーが発生することがあります。コマンド実行時に`https://{Hostname}:{port}`でアクセスするためです。


解決策3つのうち1つを選択

1. `SYNO_Hostname`を実際にアクセス可能な正常な証明書のドメインに明示します
2. `/etc/hosts`ファイルでドメインを明示してDNSクエリを回避し、`127.0.0.1`に接続します
3. `http`方式を使用します

---


## 参考

- [https://github.com/acmesh-official/acme.sh/wiki/Synology-NAS-Guide](https://github.com/acmesh-official/acme.sh/wiki/Synology-NAS-Guide)
