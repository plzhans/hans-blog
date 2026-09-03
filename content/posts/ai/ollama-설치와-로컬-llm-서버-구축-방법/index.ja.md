---
id: "112"
translationKey: "112"
slug: "112-ollama-local-llm-server-setup"
title: "Ollamaのインストールとローカルllmサーバー構築方法"
description: "OllamaでLinuxサーバー上にローカルLLMを実行する方法を説明します。インストール、外部接続設定、モデル選定、HTTP API呼び出し例を通じて、個人用AIサーバー構築の流れをまとめます。"
categories:
  - "ai"
tags:
  - "ai"
  - "ollama"
date: 2026-07-03T00:00:00.000Z
lastmod: 2026-09-03T11:08:00.000Z
toc: true
draft: false
images:
  - "assets/1_39222a0f-7e83-8032-b786-dfe04c1d2efb.png"
---


![OllamaをインストールしてLinuxサーバーでローカルLLMを直接運用する構成を示す代表画像](./assets/1_39222a0f-7e83-8032-b786-dfe04c1d2efb.png)


## 概要


Ollamaは、個人サーバーやPCでLLMを直接実行できるローカルAI実行ツールです。


必要なモデルをダウンロードして自分の環境で実行するため、外部のAIサービスにデータを送信することなく、チャットボット、文書要約、コード補助機能を構成できます。


この記事では、LinuxサーバーにOllamaをインストールし、外部接続を許可する方法をまとめます。


Oracle Cloud A1 ARM環境で使えそうなモデル選定の基準と、HTTP API呼び出し例についても併せて扱います。


### 注意点


Ollamaは主にHTTP API方式で使用されます。


外部接続を許可すると、同じネットワークの外からもモデル呼び出しが可能になる場合があるため、アクセス制御が必要です。


インターネットに直接公開する場合は、以下の保護対策を併せて構成することをお勧めします。

1. ファイアウォールで11434番ポートを信頼できるIP帯域のみに許可します。
2. VPNで接続を迂回します。個人的には[Tailscale](../111-tailscale-linux-install-secure-remote-vpn/)をお勧めします。
3. リバースプロキシ(nginxなど)の背後に置き、認証を付けます。
4. 許可するIPを明示的に制限します。


## インストール


スクリプトインストール


```bash
curl -fsSL https://ollama.com/install.sh | sh
```


実行確認


```bash
ollama --version
```


サービス確認


```bash
systemctl status ollama
```


サービス自動起動


```bash
sudo systemctl enable ollama
```


ログ確認


```bash
journalctl -u ollama -f
```


### 外部接続の許可


bind ipの確認

- 下記の例では127.0.0.1にバインドされています
- ローカルからのみアクセスできるという意味です

```bash
ss -tlnp | grep 11434

# Result
# LISTEN 0      4096                     127.0.0.1:11434      0.0.0.0:*
```


設定ディレクトリの作成


```bash
sudo mkdir -p /etc/systemd/system/ollama.service.d
```


環境設定ファイルの編集


```bash
sudo vim /etc/systemd/system/ollama.service.d/override.conf
```


内容の追加


```bash
[Service]
Environment="OLLAMA_HOST=0.0.0.0:11434"
```


サービスへの適用


```bash
sudo systemctl daemon-reload
sudo systemctl restart ollama
```


バインドの再確認

- *:11434により、すべてのIPからの接続が許可されます

```bash
ubuntu@a1-free:~$ ss -tlnp | grep 11434

# Result
# LISTEN 0      4096                             *:11434            *:*
```


## LLMモデルのおすすめ


Oracle Cloud A1 ARM 2OCPU / 12 RAM基準


| **用途<strong>          | </strong>モデル<strong>          | </strong>推奨度<strong> | </strong>速度** | **Tool Calling<strong> | </strong>韓国語<strong> | </strong>メモリ<strong> | </strong>備考**     |
| --------------- | --------------- | ------- | ------ | ---------------- | ------- | ------- | ---------- |
| 🥇 チャット+Tool兼用 | **Qwen3:4B**    | ⭐⭐⭐⭐⭐   | ★★★★☆  | ★★★★★            | ★★★★★   | 4~5GB   | 最もおすすめ      |
| チャット専用           | **Gemma3:4B**   | ⭐⭐⭐⭐☆   | ★★★★★  | ★★★☆☆            | ★★★★☆   | 4GB     | 高速応答      |
| 軽量              | **Llama3.2:3B** | ⭐⭐⭐⭐☆   | ★★★★★  | ★★★☆☆            | ★★★★☆   | 3GB     | 最も軽量     |
| 高品質（遅い）         | **Qwen3:8B**    | ⭐⭐⭐☆☆   | ★★☆☆☆  | ★★★★★            | ★★★★★   | 8~10GB  | CPUでは遅い  |
| 開発/コーディング特化        | **Qwen3-Coder** | ⭐⭐⭐⭐☆   | ★★☆☆☆  | ★★★★★            | ★★★★★   | 大       | コーディング専用に近い |

- GPUなし、常時無料インスタンス
- **上記スペックでQwen3:4Bを使用しましたが**、遅すぎて使い物になりませんでした…
    - GPUがないと限界が明確です
    - バッチスケジュールでしか使えないレベルです

## LLMモデルのインストール


```bash
# chat + tool chain
ollama pull qwen3:4b

# fast chat
ollama pull gemma3:4b
```


## LLMの使用


### Warm up


```bash
curl -s \
  -w "\n\nHTTP Status: %{http_code}\nTotal Time : %{time_total}s\n" \
  http://localhost:11434/api/generate \
  -d '{
    "model":"qwen3:4b",
    "prompt":"hi",
    "stream":false,
    "keep_alive":"5m",
    "options": {
      "num_predict": 32
    }
  }'
```


### プロンプトの実行


```bash
curl -s \
  -w "\n\nHTTP Status: %{http_code}\nTotal Time : %{time_total}s\n" \
  http://localhost:11434/api/chat \
  -d '{
    "model":"qwen3:4b",
    "messages":[
      {
        "role":"user",
        "content":"한국어로 대답해줘. 1+1?"
      }
    ],
    "think": false,    
    "stream":false
  }'
```


## 追加設定


環境設定の編集


```bash
sudo systemctl edit ollama
```


必要な環境変数の追加


```bash
# デフォルトのkeep alive時間
# -1: 無制限
# example: 10m, 1h, ... 
Environment="OLLAMA_KEEP_ALIVE=-1"
```


サービスへの適用


```bash
sudo systemctl daemon-reload && sudo systemctl restart ollama
```


## 関連記事

- [ローカルAI/LLMインフラ構築ガイド](../122-local-ai-llm-infra-guide/)
- [オープンクロー(OpenClaw)構築](../95-openclaw-setup/)
- [OpenClawノードモードのインストールとリモートインフラ接続方法](../107-openclaw-node-mode-remote-infra-setup/)
- [Claude CodeをOllamaローカルLLMとして使用する方法](../113-claude-code-ollama-local-llm/)
