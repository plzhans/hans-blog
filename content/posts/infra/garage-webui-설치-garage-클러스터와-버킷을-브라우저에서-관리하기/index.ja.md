---
id: "135"
translationKey: "135"
slug: "135-garage-webui-install-docker-compose"
title: "garage-webui のインストール - Garage のクラスタとバケットをブラウザから管理する"
description: "Garage に garage-webui を追加して、レイアウト・バケット・キーをブラウザから管理します。compose のサービス 1 つと htpasswd のログイン設定です。"
categories:
  - "infra"
tags:
  - "docker"
  - "garage"
  - "infra"
  - "s3"
date: 2026-09-23T10:56:00.000Z
lastmod: 2026-09-23T10:56:00.000Z
toc: true
draft: false
images:
  - "assets/1_3e422a0f-7e83-81ac-be01-c24ca688240a.jpg"
---


![Garage のロゴ。この記事では Garage に garage-webui を追加し、ブラウザからクラスタとバケットを管理します](./assets/1_3e422a0f-7e83-81ac-be01-c24ca688240a.jpg)


## 概要


Garage は CLI が本体です。ただしレイアウトを組み、バケットとキーを結びつける作業は、画面で見たほうがずっと速く進みます。


Garage には公式の Web コンソールがなく、サードパーティの UI がいくつかあります。この記事では、その中でもっとも単純な garage-webui を扱います。


Garage がすでに動いている状態で、compose にサービスを 1 つ追加する形で進めます。


Garage 自体のインストールと CLI での構成は、前の記事で扱っています。

- [Garage のインストールと構成 - Docker で動かす S3 互換オブジェクトストレージ](../134-garage-docker-install-s3-object-storage/)

## インストール


### webui サービスの追加


前の記事の compose に `webui` サービスを 1 つ追加します。完成したファイルはリポジトリにあります。[sample/docker/garage-webui](https://github.com/plzhans/hans-blog/tree/master/sample/docker/garage-webui)


```yaml
# docker-compose.yml

services:
  garage:
    image: dxflrs/garage:v2.4.1
    container_name: garage
    restart: unless-stopped
    ports:
      - "3900:3900"     # S3 API, signed requests only
    # - "3901:3901"     # RPC, only needed to join other nodes
      - "3902:3902"     # static website hosting, public read
    # - "3903:3903"     # admin API, reached by webui over the compose network
    env_file:
      - .env
    volumes:
      - ./garage.toml:/etc/garage.toml:ro
      - ./meta:/var/lib/garage/meta
      - ./data:/var/lib/garage/data

  webui:
    image: khairul169/garage-webui:1.1.0
    container_name: garage-webui
    restart: unless-stopped
    depends_on:
      - garage
    ports:
      - "3909:3909"
    environment:
      API_BASE_URL: "http://garage:3903"
      S3_ENDPOINT_URL: "http://garage:3900"
      API_ADMIN_KEY: "${GARAGE_ADMIN_TOKEN}"
      AUTH_USER_PASS: "${AUTH_USER_PASS}"
    volumes:
      - ./garage.toml:/etc/garage.toml:ro
```


### ログインの追加


アカウントとパスワードハッシュを生成します。


```bash
# htpasswd -nBC 10 {id}
htpasswd -nBC 10 admin
```


プロンプトが 2 回聞いてきて、最後の行に `アカウント:ハッシュ` の形で出力されます。この行をそのままコピーします。


```plain text
New password:
Re-type new password:
admin:$2y$10$H9W.......yn6ze54n2
```


.env に貼り付けます。


```bash
# htpasswd -nBC 10 admin
AUTH_USER_PASS=admin:$2y$10$H9W.......yn6ze54n2
```


### 再起動


環境変数はコンテナの作成時に埋め込まれるため、変更後はコンテナを作り直す必要があります。


```bash
docker compose up -d --force-recreate

[+] Restarting 2/2
 ✔ Container garage-webui  Started                                                                                                                                                                                                        0.7s
 ✔ Container garage        Started
```


## WEB UI


### アクセス


ex) http://192.168.0.10:3909


![ブラウザで garage-webui の 3909 ポートにアクセスした画面](./assets/2_3e422a0f-7e83-801b-bd4c-f96678ed2216.png)


### ダッシュボード


![webui のダッシュボード。レイアウトを組む前なので Status が Unavailable、Storage Nodes が 0 です](./assets/3_3e422a0f-7e83-800f-bd1d-eecc717e7220.png)


### クラスタの作成


![Cluster タブのノード一覧。Zone と Capacity が空です](./assets/4_3e422a0f-7e83-80fb-91b8-c75ac91a5559.png)


Node Assign


![Assign Node ダイアログで zone と capacity を入力します](./assets/5_3e422a0f-7e83-80ec-bcda-c9a8b27bc277.png)


Node Apply


![ステージングされたレイアウト変更を適用する段階](./assets/6_3e422a0f-7e83-804d-8b9f-f22fafdd481c.png)


作成完了


![レイアウト適用後、ノードがストレージとして認識され Layout version が上がった状態](./assets/7_3e422a0f-7e83-8094-a6bb-cf980da0a321.png)


## バケットの作成


![Buckets タブで新しいバケットを作成します](./assets/8_3e422a0f-7e83-8065-b9a1-fdb2dd89e8a5.png)


## バケットへの権限付与


### キーの作成


![Keys タブでアクセスキーを発行した結果](./assets/9_3e422a0f-7e83-8058-928e-f48667c16657.png)


### バケットへの移動


Manage タブへ移動します


![バケット詳細の Manage タブを開きます](./assets/10_3e422a0f-7e83-8043-ac16-fc8b72535b90.png)


パーミッションの接続


Permissions の項目で、接続するキーに必要な権限を与えます。


![Permissions でアクセスキーに読み取り・書き込み権限を与えます](./assets/11_3e422a0f-7e83-8000-b52d-c6eae03bab52.png)


## 追加オプション


### 静的ウェブサイトの許可


バケット設定で Website Access Enabled をオンにします。


![バケット設定で Website Access をオンにして静的ウェブサイトを許可します](./assets/12_3e422a0f-7e83-80e7-976b-e04fb757d7fc.png)


## まとめ


CLI でやっていたことがブラウザに移っただけで、動作は同じです。Assign と Apply が分かれているのも、キーとバケットを別々に作って権限でつなぐのも CLI と変わりません。

webui は admin API をラップした画面なので、Garage 側の概念を知っていれば迷うところはありません。逆に概念を知らずに画面から入ると、Assign だけして Apply を忘れる、といった形で詰まります。

留意点は 2 つです。公式コンソールではなくサードパーティなので、Garage 本体と更新サイクルが異なります。

そして **認証はデフォルトでオフです。** `AUTH_USER_PASS` を設定しなければ、3909 に到達できる人は誰でも管理者になります。内部ネットワークであっても、開けておく理由はありません。

パスワードを変えるにはハッシュを作り直してコンテナを再作成する必要があります。運用では、認証を前段のリバースプロキシに移すか、そもそもポートを公開せず VPN の中からだけ到達できるようにするほうが楽です。
