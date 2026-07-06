---
id: "111"
translationKey: "111"
slug: "111-tailscale-linux-install-secure-remote-vpn"
title: "Tailscale Linux インストール - 安全なリモート VPN 構成"
description: "Linux サーバーに Tailscale をインストールして安全なリモート VPN 環境を構成する方法を説明します。アウトバウンドベースの接続、P2P 通信、DERP リレー、Serve と Funnel の活用方法もあわせて整理します。"
categories:
  - "infra"
tags:
  - "linux"
  - "tailscale"
  - "vpn"
date: 2026-07-03T00:00:00.000Z
lastmod: 2026-07-03T10:39:00.000Z
toc: true
draft: false
images:
  - "assets/1_39222a0f-7e83-80b5-9302-c17947e91a83.png"
---


![](./assets/1_39222a0f-7e83-80b5-9302-c17947e91a83.png)


## 概要


Tailscale は、複数のデバイスを一つのプライベートネットワークのようにまとめてくれる VPN サービスです。Linux サーバー、NAS、ノートパソコン、スマートフォンがそれぞれ異なる場所にあっても、同じ内部ネットワークにいるかのように接続できます。


一般的なサーバーへのアクセスは、外部からサーバーへのインバウンドポートを開放する必要があります。この方式ではルーターのポートフォワーディング、ファイアウォールの許可、グローバル IP の設定が必要で、設定を誤るとサーバーがインターネットに直接露出する可能性があります。


Tailscale は逆に、デバイスから外部へのアウトバウンド接続を使用します。そのため、ほとんどの環境で別途ポートを開放せずに利用できます。ただし、企業ネットワークやセキュリティ機器でアウトバウンド通信を強く制限している場合は、ファイアウォールのアウトバウンドポリシーの影響を受けることがあります。


動作の仕組みはシンプルです。各デバイスに Tailscale クライアントをインストールし、同じアカウントの tailnet に登録します。登録されたデバイスは固有の tailnet IP を受け取り、可能であればデバイス同士が直接 P2P で通信します。直接接続が難しい NAT やファイアウォール環境では、Tailscale の中継サーバーである DERP を通じてリレー方式で通信します。


また、Tailscale はデバイス名ベースのドメインを提供します。


nginx リバースプロキシのように、`https://{device}.{tailnet}.ts.net` 形式のアドレスで内部サービスに接続できます。


Serve モードは tailnet 内部からのみアクセス可能なプロキシを提供し、Funnel モードは必要なサービスをインターネットに公開する際に使用します。


## インストール


### インストールスクリプトの使用


```bash
curl -fsSL https://tailscale.com/install.sh | sudo sh
```


### サービスの起動


enable で有効化し、--now ですぐに起動します。


```bash
sudo systemctl enable --now tailscaled
```


## 実行


### デバイスの登録


現在のマシンを指定したアカウントの Tailscale ネットワークに接続します。


ex) https://login.tailscale.com/a/xxxxxxxxxxxxx


```bash
sudo tailscale up

# Result
# To authenticate, visit:
#
#         https://login.tailscale.com/a/xxxxxxxxxxxxx
```


### アカウント認証


Tailscale アカウントにログインします。


![](./assets/2_39122a0f-7e83-80f3-bd3f-ff3b63b6482c.png)


### デバイスの接続


Connect ボタンをクリックしてサービスに接続します。


![](./assets/3_39122a0f-7e83-8005-91b2-d1f1a9a5967e.png)


![](./assets/4_39122a0f-7e83-80da-a100-ceea15213754.png)


### デバイス登録完了


デバイスは登録されましたが、--accept-routes オプションが false になっています。これは peer 間のルーティング接続が行われていないことを意味します。


```bash
# Result
# Success.
# Some peers are advertising routes but --accept-routes is false
```


ステータスの確認


```bash
ubuntu@a1-free:~$ tailscale status

# result
# xx.xx.184.107  a1-free           plzhans@        linux    -
# xx.xx.46.27    iphone-14-pro     plzhans@        iOS      -
# xx.xx.192.32   plzhanss-macbook  plzhans@        macOS    -
# xx.xx.23.68    wee-home          tagged-devices  linux    -

# Health check:
#     - Some peers are advertising routes but --accept-routes is false
```


## VPN 通信


大きく3つの方法があります。

1. tailnet 内部 IP を使用
2. accept-routes によるルーティングを通じた VPN デバイスノード間の通信
3. Serve モードによる VPN デバイスノード間の通信
4. Funnel モードによるインターネットからの接続（ただし HTTP / HTTPS のみ）

## VPN: tailnet IP 方式


tailnet に接続すると、基本的に tailnet 専用のプライベート IP が割り当てられます。


デフォルトインストール時に自動的にセットアップされます。

- tun モードを使用するため、内部に tailscale0 仮想ルーターが作成されていることを前提とします。

![](./assets/5_39222a0f-7e83-8039-8753-d1d39530060e.png)


## VPN: accept-routes 方式


Tailscale インフラを使用せず内部通信を行うため、トラフィックの制限がありません。


### Tailscale 設定

1. コンソールに移動: [https://login.tailscale.com/admin](https://login.tailscale.com/admin)
2. Subnet の確認

![](./assets/6_39122a0f-7e83-8041-bf0e-e29819c42c91.png)


### マシン設定

1. Tailscale peer ルーティングの受け入れ

これ以降、Tailscale admin からルーティング情報を取得して同期するようになります。


```bash
tailscale set --accept-routes=true
```

1. ルーティングの確認

NAS のプライベート IP が 192.168.35.x の場合:


```bash
ip route show table all | grep 192.168.35

# Result
# 192.168.35.0/24 dev tailscale0 table 52
```

1. 他のデバイスへの接続確認

Tailscale は P2P 方式を使用するため、デバイス間ではインバウンドポリシーではなくアウトバウンドポリシーの影響を受けます。


通常、ホールパンチングを試行し、失敗した場合はリレーにフォールバックされます。


```bash
nc -vz 192.168.35.3 1022

# Result
# Connection to 192.168.35.3 1022 port [tcp/*] succeeded!
```


## VPN: Serve モード


{デバイス名}.tailnet.ts.net を通じてアクセスできます。


Tailscale サーバーを使用するため、トラフィック制限があります。


参考: [https://tailscale.com/docs/reference/tailscale-cli/serve](https://tailscale.com/docs/reference/tailscale-cli/serve)


```bash
# Client -> xxxxx.tailnet.ts.net:443 -> xxxxx:3000
sudo tailscale serve --https=443 / http://127.0.0.1:3000

# Client -> xxxxx.tailnet.ts.net:80 -> xxxxx:3000
sudo tailscale serve --http=80 / http://127.0.0.1:3000

# Client -> xxxxx.tailnet.ts.net:1111 -> xxxxx:2222
sudo tailscale serve --tcp=1111 tcp://127.0.0.1:2222
```


## VPN: Funnel モード


https://{デバイス名}.tailnet.ts.net を通じてアクセスできます。


Tailscale サーバーを使用するため、トラフィック制限があります。


参考: [https://tailscale.com/docs/reference/tailscale-cli/funnel](https://tailscale.com/docs/reference/tailscale-cli/funnel?utm_source=chatgpt.com)


```bash
# Client -> xxxxx.tailnet.ts.net:443 -> xxxxx:3000
sudo tailscale funnel 3000

# Result
# Available on the internet:
# https://xxxxx.<tailnet>.ts.net
# |-- / proxy http://127.0.0.1:3000
```


## 備考


### Synology DSM に内蔵された Tailscale パッケージを使用する場合


執筆時点（2006.07.03）では、tailnet 内蔵パッケージで tun サーバーが有効化されません。


解決策: 強制的に有効化します。


```bash
# tun の有効化
sudo /var/packages/Tailscale/target/bin/tailscale configure-host

# 再起動
sudo synosystemctl restart pkgctl-Tailscale.service
```


再起動やアップデートで設定が消える可能性があるため、DSM タスクスケジューラに登録します。

- コントロールパネル → タスクスケジューラ → 作成 → トリガーされたタスク → ユーザー定義スクリプト
    - ユーザー: root
    - イベント: ブートアップ
    - ユーザー定義スクリプト

        ```bash
        /var/packages/Tailscale/target/bin/tailscale configure-host
        synosystemctl restart pkgctl-Tailscale.service
        ```
