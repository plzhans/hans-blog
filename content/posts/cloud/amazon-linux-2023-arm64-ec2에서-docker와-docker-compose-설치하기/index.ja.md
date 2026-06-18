---
id: "97"
translationKey: "97"
slug: "97-amazon-linux-2023-arm64-ec2-docker-docker-compose-install"
title: "Amazon Linux 2023 ARM64 EC2でDockerとDocker Composeをインストールする"
categories:
  - "cloud"
tags:
  - "aws"
  - "docker"
  - "linux"
date: 2026-03-19T03:44:00.000Z
lastmod: 2026-03-19T03:44:00.000Z
toc: true
draft: false
images:
  - "assets/1_32822a0f-7e83-8061-b2db-e3359b83d6d3.png"
---


![](./assets/1_32822a0f-7e83-8061-b2db-e3359b83d6d3.png)


## 概要


Amazon Linux 2023ベースのEC2でDockerとDocker Composeを動作させる最小限のインストール手順をまとめます。


## パッケージのインストール


`dnf`はRHEL系（例: Fedora、RHEL、Amazon Linux 2023）で使用されるパッケージマネージャーです。


Ubuntu/Debianの`apt-get`やCentOSの`yum`と同じ役割を果たします。


リポジトリからパッケージをダウンロードしてインストールし、依存関係を自動的に処理します。


### パッケージの更新


```bash
sudo dnf update -y
```


### Dockerのインストール


```bash
sudo dnf install -y docker
```


## 基本設定


### Dockerサービスの有効化


Dockerデーモン（dockerd）が実際に実行されていないと、`docker`コマンドは動作しません。


`enable --now`は<strong>今すぐ起動</strong>し、<strong>再起動後も自動的に起動</strong>するように登録します。


```bash
sudo systemctl enable --now docker
```


### 現在のユーザーへのDocker権限の付与


デフォルトでは、Dockerソケット（`/var/run/docker.sock`）にはroot権限が必要です。


`docker`グループにユーザーを追加すると、毎回`sudo`を付けなくてもDockerを使用できます。


`newgrp docker`は<strong>現在のセッションにグループの変更を即座に反映</strong>するためのコマンドです。


ログアウトして再ログインしても同様に適用されます。


```bash
sudo usermod -aG docker $USER
newgrp docker
```


Dockerの実行確認


```bash
docker version
```


Amazon Linux 2023環境では、Dockerのインストールだけで`docker compose`が一緒に提供される場合があります。


```bash
docker compose version
```


## Docker Composeの個別インストールが必要な場合


`docker compose version`が失敗する場合は、以下の方法でCLIプラグインをインストールします。


ディレクトリの作成


```bash
mkdir -p ~/.docker/cli-plugins
```


インストール: ARM64（aarch64）


```bash
curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-aarch64 \
	-o ~/.docker/cli-plugins/docker-compose
```


x86_64の場合


```bash
curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
	-o ~/.docker/cli-plugins/docker-compose
```


実行権限の追加


```bash
chmod +x ~/.docker/cli-plugins/docker-compose
```


Docker Composeのインストール確認


```bash
docker compose version
```
