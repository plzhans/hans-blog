---
id: "122"
translationKey: "122"
slug: "122-local-ai-llm-infra-guide"
title: "ローカルAI/LLMインフラ構築ガイド"
description: "OllamaでローカルLLMサーバーを立て、普段使っているClaude Codeをその上でローカルモデルに接続する方法を整理します。"
categories:
  - "ai"
tags:
  - "ai"
  - "claude"
  - "ollama"
date: 2026-09-03T00:00:00.000Z
lastmod: 2026-09-03T08:53:00.000Z
toc: true
draft: false
---


## 概要


外部のAI APIにデータを送らずに自分のサーバーで直接LLMを動かしたい場合は、以下を見てください。


## まず何を見るべきか

- **ローカルLLMサーバー自体が必要** → [Ollamaのインストールとローカルllmサーバー構築方法](../112-ollama-local-llm-server-setup/)(基盤インフラ、まずこちらから)
- **サーバーはあるので、普段使っているClaude Codeをその上で動かしたい** → [Claude CodeをOllamaローカルLLMで使う方法](../113-claude-code-ollama-local-llm/)(Ollamaが先に起動している必要あり)

## Ollama — ローカルLLMサーバーの出発点


Linuxサーバーにollamaをインストールして外部アクセスを許可する方法、HTTP API呼び出し例、そしてOracle Cloud A1 ARMのような限られたスペックでどのモデルを選ぶべきかまで整理しました。GPUがない環境の現実的な限界についても扱います。


→ [Ollamaのインストールとローカルllmサーバー構築方法](../112-ollama-local-llm-server-setup/)


## Claude Code + Ollama — 使い慣れたツールをローカルモデルで


Claude CodeをAnthropic APIの代わりにローカルのOllamaモデルに接続する方法です。Claude互換API、環境変数の設定、モデル選択、必要に応じたLiteLLMプロキシまで整理しました。


→ [Claude CodeをOllamaローカルLLMで使う方法](../113-claude-code-ollama-local-llm/)
