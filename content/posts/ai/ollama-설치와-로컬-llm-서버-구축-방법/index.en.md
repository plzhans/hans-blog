---
id: "112"
translationKey: "112"
slug: "112-ollama-local-llm-server-setup"
title: "How to Install Ollama and Set Up a Local LLM Server"
description: "This explains how to run a local LLM on a Linux server using Ollama. It covers installation, external access configuration, model selection, and HTTP API call examples to outline the process of building a personal AI server."
categories:
  - "ai"
tags:
  - "ai"
  - "infra"
  - "ollama"
date: 2026-07-03T00:00:00.000Z
lastmod: 2026-08-29T18:41:00.000Z
toc: true
draft: false
images:
  - "assets/1_39222a0f-7e83-8032-b786-dfe04c1d2efb.png"
---


![Representative image showing a configuration for installing Ollama and running a local LLM directly on a Linux server](./assets/1_39222a0f-7e83-8032-b786-dfe04c1d2efb.png)


## Overview


Ollama is a local AI execution tool that lets you run an LLM directly on your own server or PC.


Since you download the model you need and run it in your own environment, you can build chatbot, document summarization, and code assistance features without sending data to an external AI service.


This post covers how to install Ollama on a Linux server and allow external access.


It also covers criteria for choosing a model suitable for an Oracle Cloud A1 ARM environment, along with HTTP API call examples.


### Points to note


Ollama is mainly used via an HTTP API.


If you allow external access, model calls may become possible from outside the same network, so access control is required.


When exposing it directly to the internet, it is recommended to set up the protective measures below together.

1. Allow the 11434 port only for trusted IP ranges via a firewall.
2. Bypass direct access using a VPN. Personally, I recommend [Tailscale](../111-tailscale-linux-install-secure-remote-vpn/).
3. Put it behind a reverse proxy (such as nginx) and add authentication.
4. Explicitly restrict the allowed IPs.


## Installation


Script installation


```bash
curl -fsSL https://ollama.com/install.sh | sh
```


Verify execution


```bash
ollama --version
```


Check the service


```bash
systemctl status ollama
```


Enable auto-start for the service


```bash
sudo systemctl enable ollama
```


Check the logs


```bash
journalctl -u ollama -f
```


### Allowing external access


Check the bind IP

- Based on the example below, it is bound to 127.0.0.1
- This means it can only be accessed locally

```bash
ss -tlnp | grep 11434

# Result
# LISTEN 0      4096                     127.0.0.1:11434      0.0.0.0:*
```


Create the configuration directory


```bash
sudo mkdir -p /etc/systemd/system/ollama.service.d
```


Edit the environment configuration file


```bash
sudo vim /etc/systemd/system/ollama.service.d/override.conf
```


Add the following content


```bash
[Service]
Environment="OLLAMA_HOST=0.0.0.0:11434"
```


Apply the service


```bash
sudo systemctl daemon-reload
sudo systemctl restart ollama
```


Check the binding again

- *:11434 allows connections from all IPs

```bash
ubuntu@a1-free:~$ ss -tlnp | grep 11434

# Result
# LISTEN 0      4096                             *:11434            *:*
```


## Recommended LLM Models


Based on Oracle Cloud A1 ARM 2OCPU / 12 RAM


| **Purpose<strong>          | </strong>Model<strong>          | </strong>Recommendation<strong> | </strong>Speed** | **Tool Calling<strong> | </strong>Korean<strong> | </strong>Memory<strong> | </strong>Notes**     |
| --------------- | --------------- | ------- | ------ | ---------------- | ------- | ------- | ---------- |
| 🥇 Chat + Tool combined use | **Qwen3:4B**    | ⭐⭐⭐⭐⭐   | ★★★★☆  | ★★★★★            | ★★★★★   | 4~5GB   | Most recommended      |
| Chat only           | **Gemma3:4B**   | ⭐⭐⭐⭐☆   | ★★★★★  | ★★★☆☆            | ★★★★☆   | 4GB     | Fast response      |
| Lightweight              | **Llama3.2:3B** | ⭐⭐⭐⭐☆   | ★★★★★  | ★★★☆☆            | ★★★★☆   | 3GB     | Lightest     |
| High quality (slow)         | **Qwen3:8B**    | ⭐⭐⭐☆☆   | ★★☆☆☆  | ★★★★★            | ★★★★★   | 8~10GB  | Slow on CPU  |
| Development/coding specialized        | **Qwen3-Coder** | ⭐⭐⭐⭐☆   | ★★☆☆☆  | ★★★★★            | ★★★★★   | Large       | Close to coding-only use |

- No GPU, an always-free instance
- **On the spec above I used Qwen3:4B**, but it was too slow to be usable…
    - Without a GPU, the limitations are clear
    - It's about only usable for batch scheduling

## Installing an LLM Model


```bash
# chat + tool chain
ollama pull qwen3:4b

# fast chat
ollama pull gemma3:4b
```


## Using the LLM


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


### Running a prompt


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


## Additional Configuration


Edit the environment configuration


```bash
sudo systemctl edit ollama
```


Add the required environment variable


```bash
# default keep alive time
# -1: unlimited
# example: 10m, 1h, ... 
Environment="OLLAMA_KEEP_ALIVE=-1"
```


Apply the service


```bash
sudo systemctl daemon-reload && sudo systemctl restart ollama
```


## Related Posts

- [Setting up OpenClaw](../95-openclaw-setup/)
- [How to Install OpenClaw Node Mode and Connect Remote Infrastructure](../107-openclaw-node-mode-remote-infra-setup/)
- [How to Use Claude Code with an Ollama Local LLM](../113-claude-code-ollama-local-llm/)
