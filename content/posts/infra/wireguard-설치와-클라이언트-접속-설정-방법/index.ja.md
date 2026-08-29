---
id: "116"
translationKey: "116"
slug: "116-wireguard-install-client-setup"
title: "WireGuardのインストールとクライアント接続設定方法"
description: "Linuxサーバーに WireGuard VPN をインストールし、鍵生成、ファイアウォール開放、サービス登録までを構成する方法を説明します。Mac クライアントの conf 設定と GUI 接続確認の手順を含め、安全なリモートアクセス環境を構築できます。"
categories:
  - "infra"
tags:
  - "linux"
  - "mac"
  - "vpn"
  - "wireguard"
date: 2026-07-10T08:20:00.000Z
lastmod: 2026-08-29T10:51:00.000Z
toc: true
draft: false
images:
  - "assets/1_39922a0f-7e83-8083-8055-de3d7910f539.png"
---


![Linuxサーバーに WireGuard VPN を構築し、クライアントを接続する構成を示す代表画像](./assets/1_39922a0f-7e83-8083-8055-de3d7910f539.png)


## 概要


WireGuardは、簡潔な設定と軽量なパフォーマンスで peer-to-peer VPN を構成できるツールです。


この記事では、Linuxサーバーに WireGuard をインストールし、サーバー鍵・ファイアウォール・サービスを整えた後、Mac クライアントから接続するまでの一連の流れをまとめます。


サーバー鍵の生成、wg0 の設定、UDP 51820 ポートの開放、クライアント Peer の登録、接続確認までを順番に扱うため、同じ手順に従って設定できます。


## サーバーのインストール


システムサービスとして動作するため、root で進めてください。


### 基本インストール


```bash
apt install wireguard
```


インストール確認


```bash
wg --version
```


### サーバー鍵の生成


```bash
mkdir -p /etc/wireguard
wg genkey | tee /etc/wireguard/server.key | wg pubkey | tee /etc/wireguard/server.pub

# 権限設定
chmod 600 /etc/wireguard/server.key
```


### 環境設定


設定ファイルを事前に作成


```bash
touch /etc/wireguard/wg0.conf
chmod 600 /etc/wireguard/wg0.conf
```


設定ファイルにインターフェースを設定

- サーバー鍵を登録
- SaveConfig が有効になっている場合、このファイルを編集してからサーバーを停止すると、サーバーの状態が上書きされてしまいます
- SaveConfig モードで使用する場合は、`wg set` などで制御する必要があります

```bash
# /etc/wireguard/wg0.conf
[Interface]
Address = 10.200.0.1/24
ListenPort = 51820
PrivateKey = {server key contents}
SaveConfig = false
```


### Inbound 設定(ファイアウォール設定)


Peer to Peer ではありますが、最初のハンドシェイクのために UDP のサーバーポートが開いている必要があります。


さらに、iptables を使用している場合はポートも開放する必要があります。


```bash
iptables -I INPUT 1 -p udp --dport 51820 -j ACCEPT

# ubuntu 24
# netfilter-persistent save

# Result
# run-parts: executing /usr/share/netfilter-persistent/plugins.d/15-ip4tables save
# run-parts: executing /usr/share/netfilter-persistent/plugins.d/25-ip6tables save
```


## サーバーの実行


サービスの登録と起動


```bash
systemctl enable wg-quick@wg0
systemctl start wg-quick@wg0
```


wg での確認


```bash
wg

# Result
# interface: wg0
#  public key: Y9oH7jnQVVILuRnhekWDRh9s7gCOyOf2HerAfS5Iymw=
#  private key: (hidden)
```


インターフェースの確認


```bash
ip addr show wg0

# Result
# 3: wg0: <POINTOPOINT,NOARP,UP,LOWER_UP> mtu 8920 qdisc noqueue state UNKNOWN group default qlen 1000
#     link/none 
#     inet 10.200.0.1/24 scope global wg0
#       valid_lft forever preferred_lft forever
```


## クライアントのインストール


### ユーザークライアント鍵の生成(ローカルクライアント作業)

- ユーザーの秘密鍵はサーバー上で生成しても構いませんが、生成後にサーバーに残しておいてはいけません
- サーバーは公開鍵のテキストさえ分かれば十分です
- 生成した秘密鍵はクライアントに移動した後、削除してください

ローカルの Mac にインストールする場合、wg がなければインストールする必要があります。


```bash
brew install wireguard-tools
```


### 鍵の生成


```bash
# ディレクトリを作成して移動
mkdir -p ~/.wireguard
cd ~/.wireguard

# 鍵の生成 : wg genkey | tee {KeyName}.key | wg pubkey > {KeyName}.pub
wg genkey | tee user.key | wg pubkey > user.pub
```


### 重要!サーバーへのユーザー鍵の登録


wg0.conf ファイルに peer 情報を登録します

- Peer は複数設定できます
- AllowedIPs で送られたリクエストを該当の Peer に転送します

```bash
# /etc/wireguard/wg0.conf append

# plzhans
[Peer]
PublicKey = {public key contents}
AllowedIPs = 10.200.0.2/32
```


サーバーの再起動


```bash
systemctl restart wg-quick@wg0
```


## クライアントからサーバーへの接続


peer to peer 通信の特性だと理解し、サーバー設定を反対にすればよいです。


### WireGuard クライアントの設定


インストール確認


```bash
wg --version
wg-quick --version
```


### ユーザークライアントの接続(ローカルクライアント作業)

- Endpoint : External public ip
- PersistentKeepalive : Keep alive time

```bash
# ~/.wireguard/xx-server.conf

[Interface]
PrivateKey = {user private key contents}
Address = 10.200.0.2/24

[Peer]
PublicKey = {server key contents}
Endpoint = {server public IP}:51820
AllowedIPs = 10.200.0.1/32
PersistentKeepalive = 25
```


### クライアントの実行


```bash
sudo wg-quick up ~/.wireguard/xx-server.conf

# 停止
sudo wg-quick down ~/.wireguard/xx-server.conf
```


### クライアントの状態確認

- この部分が表示されたら最終的に接続完了です : latest handshake: 5 seconds ago

```bash
wg

# Result
# interface: utun12
#   public key: b69QMnldUd60JLXEUc4j8QzKI/1su1h4e6scx/YgrHE=
#   private key: (hidden)
#   listening port: 64874

# peer: Y9oH7jnQVVILuRnhekWDRh9s7gCOyOf2HerAfS5Iymw=
#   endpoint: 161.33.140.98:51820
#   allowed ips: 10.200.0.1/32
#   latest handshake: 5 seconds ago
#   transfer: 92 B received, 180 B sent
#   persistent keepalive: every 25 seconds
```


### クライアント GUI ツールを使用する場合


作成しておいたクライアント conf ファイルを import します。


import


![WireGuard GUI クライアントでクライアント conf ファイルをインポートする画面](./assets/2_39922a0f-7e83-80c1-ad8d-df9d68816cd4.png)


登録の確認


![インポートしたトンネルが GUI クライアントの一覧に登録されたことを確認する画面](./assets/3_39922a0f-7e83-804b-a53f-e609694788ff.png)


接続の確認


![GUI クライアントで VPN トンネルが接続された状態を確認する画面](./assets/4_39922a0f-7e83-8053-94f8-de82008e95e9.png)


## プライベートサーバーへの接続確認


### VPN IP での SSH アクセス確認


```bash
nc -vz 10.200.0.1 22
Connection to 10.200.0.1 port 22 [tcp/ssh] succeeded!
```


## IP ルーティング


次に、ローカルクライアントから VPN サーバーを経由して内部ネットワークに接続するための設定を行う必要があります(MASQUERADE を使用)。


以下の内容を前提とします

- サーバーのプライベートネットワーク : 10.200.0.0/24
- サーバーのネットワークインターフェース : enp0s6

```bash
# /etc/wireguard/wg0.conf append
[Interface]
...

# IP FORWARD
PostUp = sysctl -w net.ipv4.ip_forward=1
PostUp = iptables -t nat -A POSTROUTING -s 10.200.0.0/24 -o enp0s6 -j MASQUERADE
PostUp = iptables -I FORWARD 1 -i %i -j ACCEPT
PostUp = iptables -I FORWARD 1 -o %i -j ACCEPT

PostDown = iptables -t nat -D POSTROUTING -s 10.200.0.0/24 -o enp0s6 -j MASQUERADE
PostDown = iptables -D FORWARD -i %i -j ACCEPT
PostDown = iptables -D FORWARD -o %i -j ACCEPT
```


## まとめ


サーバーのインストールからクライアント接続確認まで完了すれば、VPN IP を使って SSH などの内部サービスにアクセスできます。


Peer を追加する際は、公開鍵と AllowedIPs だけをサーバーに登録し、秘密鍵はクライアントにのみ保管しておけばよいです。


GUI クライアントを使えば、生成した conf ファイルを import するだけで同じように接続できます。


SaveConfig オプションとファイアウォールの UDP ポートは、運用中によくミスが起きやすい部分なので、設定前にもう一度確認しておくとよいでしょう。
