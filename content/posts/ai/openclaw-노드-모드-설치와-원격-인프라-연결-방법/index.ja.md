---
id: "107"
translationKey: "107"
slug: "107-openclaw-node-mode-remote-infra-setup"
title: "OpenClaw ノードモードのインストールとリモートインフラ接続方法"
description: "OpenClaw ノードモードでリモートサーバーをゲートウェイに接続する方法を説明します。インストール、実行確認、デバイス承認、systemd サービス登録までのインフラ制御フローをまとめます。"
categories:
  - "ai"
tags:
  - "ai"
  - "OpenClaw"
date: 2026-06-29T00:00:00.000Z
lastmod: 2026-07-03T10:51:00.000Z
toc: true
draft: false
images:
  - "assets/1_39222a0f-7e83-8060-b7f3-e21076ffcbf3.png"
---


![](./assets/1_39222a0f-7e83-8060-b7f3-e21076ffcbf3.png)


## 概要


OpenClaw ノードは、ゲートウェイに接続されたリモートインフラを直接制御するための実行環境です。


別のサーバーにノードをインストールすると、OpenClaw ゲートウェイからそのマシンを承認・接続し、リモート操作を実行できます。


この記事では、npm を使った OpenClaw ノードのインストール方法、run モードでの実行、ゲートウェイでの承認、systemd ユーザーサービスの登録フローについてまとめます。


Stable Diffusion や Ollama などの AI ツールや API サーバーを別のマシンで運用しながら、OS レベルの制御まで必要な場合に活用できます。


## インストール


パッケージのインストール


```bash
npm install -g openclaw@latest
```


インストールの確認


```bash
openclaw --version
```


## 手動実行


### run モードの実行


install モードを使用しますが、まず run モードで正常に動作するか確認します。


```bash
openclaw node run --host wee-home.synology.me --port 18788 --tls --display-name "node-xxxx"
```


結果

- ペンディング状態です。gateway で承認する必要があります。

```bash
OpenClaw 2026.6.11 (e085fa1) — Your personal assistant, minus the passive-aggressive calendar reminders.

node host gateway connect failed: device pairing required (requestId: 0a4ac05b-c3f3-4e01-bcde-315ada55c0e8)
gateway connect failed: GatewayClientRequestError: device pairing required (requestId: 0a4ac05b-c3f3-4e01-bcde-315ada55c0e8)
node host gateway reconnect paused after close (1008): pairing required: device is not approved yet (requestId: 0a4ac05b-c3f3-4e01-bcde-315ada55c0e8) detail=PAIRING_REQUIRED; waiting for operator action
node host gateway closed (1008): pairing required: device is not approved yet (requestId: 0a4ac05b-c3f3-4e01-bcde-315ada55c0e8)
Warning: Detected unsettled top-level await at file:///home/ubuntu/.local/share/fnm/node-versions/v24.18.0/installation/lib/node_modules/openclaw/openclaw.mjs:772
```


### ゲートウェイでの承認


この作業は現在のマシンではなく、ゲートウェイで行う必要があります。


デバイス一覧の確認


```bash
openclaw devices list
```


```bash
Pending (1)
┌──────────────────────────────────────┬─────────────────────────┬───────────────────────────┬────────────────────┬────────┬─────────────┐
│ Request                              │ Device                  │ Requested                 │ Approved           │ Age    │ Status      │
├──────────────────────────────────────┼─────────────────────────┼───────────────────────────┼────────────────────┼────────┼─────────────┤
│ 525b560b-5863-4676-988b-b080b7aa53c5 │ node-llm · 192.168.35.3 │ roles: node; scopes: none │ none               │ 2m ago │ new pairing │
└──────────────────────────────────────┴─────────────────────────┴───────────────────────────┴────────────────────┴────────┴─────────────┘
```


承認


```bash
openclaw devices approve 525b560b-5863-4676-988b-b080b7aa53c5
```


```bash
Approved a4d8a6a6a62ec1e14a2a1622df746710aea0405631e1ebd69e6ef33e768748e2 (525b560b-5863-4676-988b-b080b7aa53c5)
```


### マシンノードの接続確認


run モードで実行します。


```bash
openclaw node run --host wee-home.synology.me --port 18788 --tls --display-name "node-xxxx"
```


## サービス登録


install を実行する前に OPENCLAW_GATEWAY_TOKEN 環境変数を設定しておくと、~/.openclaw/node.systemd.env ファイルに環境変数の値が記録されます。


run モードを実行した後、同じシェルで作業している場合はすでに設定されています。設定されていない場合は再度指定してください。


```bash
# トークン環境変数の設定
export OPENCLAW_GATEWAY_TOKEN={openclaw remote gateway token}

# node サービスのインストール
openclaw node install --host {host} --port {port} --tls --display-name "node-xxxx"
```


実行後の環境変数の確認


```bash
# サービスが使用する環境ファイルのパスを確認
cat ~/.config/systemd/user/openclaw-node.service | grep EnvironmentFile
EnvironmentFile=-/home/ubuntu/.openclaw/node.systemd.env
```


### サービスの開始


サービスをインストールして開始します。


```bash
systemctl --user start openclaw-node
```


### サービスの確認


```bash
openclaw nodes status
```
