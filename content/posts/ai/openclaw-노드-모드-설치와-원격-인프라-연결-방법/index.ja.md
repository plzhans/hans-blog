---
id: "107"
translationKey: "107"
slug: "107-openclaw-node-mode-remote-infra-setup"
title: "OpenClawノードモードのインストールとリモートインフラ接続方法"
description: "OpenClawノードモードでリモートサーバーをゲートウェイに接続する方法を説明します。インストール、実行確認、デバイス承認、systemdサービス登録までのインフラ制御フローをまとめます。"
categories:
  - "ai"
tags:
  - "ai"
  - "OpenClaw"
date: 2026-06-29T00:00:00.000Z
lastmod: 2026-08-29T16:02:00.000Z
toc: true
draft: false
images:
  - "assets/1_39222a0f-7e83-8060-b7f3-e21076ffcbf3.png"
---


![OpenClawノードモードでリモートサーバーをゲートウェイに接続し、インフラを制御する構成を示す代表画像](./assets/1_39222a0f-7e83-8060-b7f3-e21076ffcbf3.png)


## 概要


OpenClawノードは、ゲートウェイに接続されたリモートインフラを直接制御するための実行環境です。


別のサーバーにノードをインストールすると、OpenClawゲートウェイでそのマシンを承認・接続した後、リモート作業を行うことができます。


この記事では、npmを利用したOpenClawノードのインストール方法と、runモードでの実行、ゲートウェイでの承認、systemdユーザーサービスの登録の流れをまとめます。


Stable Diffusion、Ollamaのようなツールや APIサーバーを別マシンで運用しつつ、OSレベルの制御まで必要な状況で活用できます。


## インストール


パッケージのインストール


```bash
npm install -g openclaw@latest
```


インストール確認


```bash
openclaw --version
```


## 直接実行


### runモードでの実行


installモードを使用しますが、まずはrunモードで事前にきちんと動作するか確認します。


```bash
openclaw node run --host wee-home.synology.me --port 18788 --tls --display-name "node-xxxx"
```


結果

- ペンディング状態です。gatewayで承認する必要があります。

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


一覧の確認


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


runモードでの実行


```bash
openclaw node run --host wee-home.synology.me --port 18788 --tls --display-name "node-xxxx"
```


## サービス登録


installを実行する前にOPENCLAW_GATEWAY_TOKEN環境変数を事前に設定しておくと、~/.openclaw/node.systemd.envファイルに環境変数の値が記録されます。


runモードを実行した状態のまま同じシェルで作業している場合はすでに設定済みです。設定されていない場合は再度指定してください。


```bash
# トークン環境変数の設定
export OPENCLAW_GATEWAY_TOKEN={openclaw remote gateway token}

# nodeサービスのインストール
openclaw node install --host {host} --port {port} --tls --display-name "node-xxxx"
```


実行後の環境変数確認


```bash
# サービスで使用する環境ファイルの場所を確認
cat ~/.config/systemd/user/openclaw-node.service | grep EnvironmentFile
EnvironmentFile=-/home/ubuntu/.openclaw/node.systemd.env
```


### サービスの開始


サービスをインストールして開始


```bash
systemctl --user start openclaw-node
```


### サービスの確認


```bash
openclaw nodes status
```


## 関連記事

- [OpenClawの構築](../95-openclaw-setup/)
- [Ollamaのインストールとローカル LLMサーバー構築方法](../112-ollama-local-llm-server-setup/)
- [Claude CodeをOllamaローカルLLMとして使用する方法](../113-claude-code-ollama-local-llm/)
