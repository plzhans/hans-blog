---
id: "112"
translationKey: "112"
slug: "112-ollama-local-llm-server-setup"
title: "OllamaのインストールとローカルLLMサーバー構築方法"
description: "Ollamaを使ってLinuxサーバーでローカルLLMを実行する方法を説明します。インストール、外部アクセス設定、モデル選択、HTTP API呼び出し例を通じて、個人AIサーバー構築の流れをまとめます。"
categories:
  - "ai"
tags:
  - "ai"
  - "infra"
  - "ollama"
date: 2026-07-03T00:00:00.000Z
lastmod: 2026-07-03T10:45:00.000Z
toc: true
draft: false
images:
  - "assets/1_39222a0f-7e83-8032-b786-dfe04c1d2efb.png"
---


![](./assets/1_39222a0f-7e83-8032-b786-dfe04c1d2efb.png)


## 概要


Ollamaは、個人サーバーやPCでLLMを直接実行できるローカルAI実行ツールです。


必要なモデルをダウンロードして自分の環境で実行するため、外部AIサービスにデータを送信せずにチャットボット、文書要約、コード補助機能を構成できます。


この記事では、LinuxサーバーにOllamaをインストールし、外部アクセスを許可する方法をまとめます。


Oracle Cloud A1 ARM環境で使用できるモデルの選択基準とHTTP API呼び出し例も合わせて取り上げます。


### 注意点


Ollamaは主にHTTP API方式で使用されます。


外部アクセスを許可すると、同じネットワーク外からもモデル呼び出しが可能になるため、アクセス制御が必要です。


インターネットに直接公開する場合は、ファイアウォール、VPN、リバースプロキシ認証、許可IP制限などの保護手段を合わせて構成する必要があります。


個人的にはtailscaleをおすすめします


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


### 外部アクセスの許可


bind IPの確認

- 以下の例では127.0.0.1にバインドされています
- ローカルからのみアクセス可能という意味です

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


サービスの適用


```bash
sudo systemctl daemon-reload
sudo systemctl restart ollama
```


バインディングの再確認

- *:11434で全てのIPからの接続を許可

```bash
ubuntu@a1-free:~$ ss -tlnp | grep 11434

# Result
# LISTEN 0      4096                             *:11434            *:*
```


## LLM Modelのおすすめ


Oracle Cloud A1 ARM 2OCPU / 12 RAM基準


| **用途<strong>          | </strong>モデル<strong>          | </strong>おすすめ度<strong> | </strong>速度** | **Tool Calling<strong> | </strong>韓国語<strong> | </strong>メモリ<strong> | </strong>備考**     |
| --------------- | --------------- | ------- | ------ | ---------------- | ------- | ------- | ---------- |
| 🥇 チャット + Tool兼用 | **Qwen3:4B**    | ⭐⭐⭐⭐⭐   | ★★★★☆  | ★★★★★            | ★★★★★   | 4~5GB   | 最もおすすめ      |
| チャット専用           | **Gemma3:4B**   | ⭐⭐⭐⭐☆   | ★★★★★  | ★★★☆☆            | ★★★★☆   | 4GB     | 高速レスポンス      |
| 軽量              | **Llama3.2:3B** | ⭐⭐⭐⭐☆   | ★★★★★  | ★★★☆☆            | ★★★★☆   | 3GB     | 最も軽量     |
| 高品質（低速）         | **Qwen3:8B**    | ⭐⭐⭐☆☆   | ★★☆☆☆  | ★★★★★            | ★★★★★   | 8~10GB  | CPUでは低速  |
| 開発/コーディング特化        | **Qwen3-Coder** | ⭐⭐⭐⭐☆   | ★★☆☆☆  | ★★★★★            | ★★★★★   | 大       | コーディング専用に近い |

- GPUなし、常時無料インスタンス
- **上記スペックではQwen3:4Bを使用しましたが、**遅すぎて使えませんでした...
    - GPUがなければ限界は明確です
    - バッチスケジュールでのみ使用すべきレベルです

## LLM Modelのインストール


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


サービスの適用


```bash
sudo systemctl daemon-reload && sudo systemctl restart ollama
```


Create a clean modern tech blog cover image about installing Ollama on a Linux server and building a local LLM server.


Main concept:
A Linux server running a local AI language model through Ollama. Show a compact server rack or cloud server node connected to an AI brain or neural network. Include subtle terminal and API elements such as command lines, HTTP request symbols, and port 11434. Emphasize local execution, private AI, infrastructure, and developer workflow.


Visual style:
Modern developer blog thumbnail, clean vector-style digital illustration, dark navy background, green and cyan accent colors, soft glow, high contrast, minimal but detailed, professional infrastructure diagram feel, sharp edges, balanced composition.


Key elements:

- Linux server or terminal window
- Local LLM model blocks
- Ollama-inspired llama silhouette or abstract llama icon
- Secure network connection
- API endpoint visualization
- Small cloud/server label style elements
- Developer-friendly technical atmosphere

Composition:
16:9 wide cover image. Center the Linux server and AI model. Place network lines around it. Keep the left and right sides visually balanced. Leave some clean negative space for possible title text overlay.


Text:
No text, no letters, no numbers, no logo, no watermark.


Negative prompt:
photorealistic, human face, messy UI, unreadable text, excessive details, brand logo, low resolution, blurry, distorted server, random letters, watermark
