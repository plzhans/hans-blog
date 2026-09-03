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
lastmod: 2026-09-03T08:53:00.000Z
toc: true
draft: false
---


## Overview


If you want to run an LLM directly on your own server without sending data to external AI APIs, here's where to start.


## Where to Start

- **You need the local LLM server itself** → [How to Install Ollama and Set Up a Local LLM Server](../112-ollama-local-llm-server-setup/) (base infrastructure — start here first)
- **You already have the server, and want to run the Claude Code you're used to on top of it** → [How to Use Claude Code with Ollama Local LLMs](../113-claude-code-ollama-local-llm/) (requires Ollama to already be running)

## Ollama — The Starting Point for a Local LLM Server


Covers how to install Ollama on a Linux server and allow external access, HTTP API call examples, and which models to choose on constrained specs like an Oracle Cloud A1 ARM instance. Also addresses the practical limitations of a GPU-less environment.


→ [How to Install Ollama and Set Up a Local LLM Server](../112-ollama-local-llm-server-setup/)


## Claude Code + Ollama — Running a Familiar Tool on a Local Model


A guide to connecting Claude Code to a local Ollama model instead of the Anthropic API. Covers the Claude-compatible API, environment variable setup, model selection, and using a LiteLLM proxy when needed.


→ [How to Use Claude Code with Ollama Local LLMs](../113-claude-code-ollama-local-llm/)
