---
id: "122"
translationKey: "122"
slug: "122-local-ai-llm-infra-guide"
title: "Local AI/LLM Infrastructure Guide"
description: "A guide to setting up a local LLM server with Ollama, then connecting Claude Code you already use to run on top of it."
categories:
  - "ai"
tags:
  - "ai"
  - "claude"
  - "ollama"
date: 2026-09-03T00:00:00.000Z
lastmod: 2026-09-03T11:03:00.000Z
toc: true
draft: false
---


## Overview


Sometimes you want to run an LLM directly on your own server instead of sending code or documents to external AI APIs (OpenAI, Anthropic, etc.) — because you need to handle internal code or sensitive documents, want to run repeated experiments without worrying about API usage costs, or need something that works in unstable network environments. That said, local LLMs have clear limitations in model quality and inference speed compared to commercial APIs, so "run alongside for the right use case" is a more realistic approach than "fully replace." This blog covers the setup in the following order.

## Setup Order

1. Set up the local LLM server itself (base infrastructure — start here first) → [How to Install Ollama and Set Up a Local LLM Server](../112-ollama-local-llm-server-setup/)
2. Connect a tool you already use (Claude Code) to the local model on top of the server → [How to Use Claude Code with Ollama Local LLMs](../113-claude-code-ollama-local-llm/) (requires Ollama to already be running)

## Why Consider a Local LLM

- **Data privacy** — You don't need to send internal code or documents containing personal information to an external API.
- **Cost** — No API charges even if you run large amounts of repeated experiments. You only need to factor in electricity and hardware depreciation.
- **Network independence** — Works even in environments with unstable or no internet connectivity.
- **No rate limits** — No need to worry about hitting a commercial API's per-minute or per-day request limits.

## Realistic Limitations


In GPU-less environments (e.g., an Oracle Cloud Always Free A1 ARM instance), inference is noticeably slower than commercial APIs, and the model sizes you can run are limited. 7B-class models run reasonably well on CPU, but code generation quality falls well short of the latest commercial models. In other words, a local LLM is the right choice for situations where you're willing to accept slower, slightly less satisfying answers in exchange for keeping your data in-house — not an unconditional replacement for commercial APIs.


## Choosing a Model Size and Quantization Level


Even for the same model, required memory and speed vary a lot depending on the parameter count and quantization level.

- **7B class** — Runs with Q4 quantization even on a server with around 8GB of memory. Suitable for simple summarization, classification, or short code snippets.
- **13B~14B class** — Needs around 16GB. Better context understanding than 7B, but still limited for complex tasks like multi-file refactoring.
- **30B and above** — CPU inference often isn't practically fast enough, so there's not much reason to try it without a GPU.
- **Quantization level (Q4/Q5/Q8)** — Lower numbers use less memory but gradually reduce answer quality. Q4 is the most common compromise.

In the end, "how far can my server's memory take me" becomes a constraint that gets settled before model quality does.


## Ollama — The Starting Point for a Local LLM Server


Covers how to install Ollama on a Linux server and allow external access, HTTP API call examples, and which models to choose on constrained specs like an Oracle Cloud A1 ARM instance. Also addresses the practical limitations of a GPU-less environment. Ollama handles model download, execution, and API serving through a single CLI, making the barrier to entry much lower than building llama.cpp yourself.


→ [How to Install Ollama and Set Up a Local LLM Server](../112-ollama-local-llm-server-setup/)


## Claude Code + Ollama — Running a Familiar Tool on a Local Model


A guide to connecting Claude Code to a local Ollama model instead of the Anthropic API. Covers the Claude-compatible API, environment variable setup, model selection, and using a LiteLLM proxy when needed. Since you keep the CLI workflow you're already used to and only swap out the backend for a local model, this fits well when you just want to secure data privacy without learning a new tool.


→ [How to Use Claude Code with Ollama Local LLMs](../113-claude-code-ollama-local-llm/)


## What's Coming Next


Routing multiple local/commercial models through a single endpoint with a proxy like LiteLLM, and RAG integration that searches local documents to inform answers, aren't covered yet. Once the local infrastructure is more settled, these will be covered in follow-up posts.
