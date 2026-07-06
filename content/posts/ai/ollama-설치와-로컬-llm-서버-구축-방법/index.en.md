---
id: "112"
translationKey: "112"
slug: "112-ollama-local-llm-server-setup"
title: "How to Install Ollama and Build a Local LLM Server"
description: "Learn how to run a local LLM on a Linux server with Ollama. This guide covers installation, external access configuration, model selection, and HTTP API call examples to set up your own personal AI server."
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


## Overview


Ollama is a local AI execution tool that allows you to run LLMs directly on your personal server or PC.


Since you download the models you need and run them in your own environment, you can set up chatbots, document summarization, and code assistance features without sending data to external AI services.


This post covers how to install Ollama on a Linux server and allow external access.


It also includes model selection criteria suitable for Oracle Cloud A1 ARM environments and HTTP API call examples.


### Things to Keep in Mind


Ollama is primarily used via HTTP API.


If you allow external access, model calls may become possible from outside your network, so access control is necessary.


When exposing it directly to the internet, you should configure protective measures such as firewalls, VPNs, reverse proxy authentication, and IP whitelisting.


Personally, I recommend tailscale


## Installation


Script installation


```bash
curl -fsSL https://ollama.com/install.sh | sh
```


Verify installation


```bash
ollama --version
```


Check service status


```bash
systemctl status ollama
```


Enable auto-start


```bash
sudo systemctl enable ollama
```


Check logs


```bash
journalctl -u ollama -f
```


### Allowing External Access


Check bind IP

- In the example below, it is bound to 127.0.0.1
- This means it is only accessible locally

```bash
ss -tlnp | grep 11434

# Result
# LISTEN 0      4096                     127.0.0.1:11434      0.0.0.0:*
```


Create configuration directory


```bash
sudo mkdir -p /etc/systemd/system/ollama.service.d
```


Edit environment configuration file


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


Verify binding again

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
| 🥇 Chat + Tool combined | **Qwen3:4B**    | ⭐⭐⭐⭐⭐   | ★★★★☆  | ★★★★★            | ★★★★★   | 4~5GB   | Most recommended      |
| Chat only           | **Gemma3:4B**   | ⭐⭐⭐⭐☆   | ★★★★★  | ★★★☆☆            | ★★★★☆   | 4GB     | Fast response      |
| Lightweight              | **Llama3.2:3B** | ⭐⭐⭐⭐☆   | ★★★★★  | ★★★☆☆            | ★★★★☆   | 3GB     | Lightest     |
| High quality (slow)         | **Qwen3:8B**    | ⭐⭐⭐☆☆   | ★★☆☆☆  | ★★★★★            | ★★★★★   | 8~10GB  | Slow on CPU  |
| Dev/Coding specialized        | **Qwen3-Coder** | ⭐⭐⭐⭐☆   | ★★☆☆☆  | ★★★★★            | ★★★★★   | Large       | Almost coding-only |

- No GPU, always-free instance
- **Tried using Qwen3:4B on the above specs,** but it was too slow to use...
    - Without a GPU, the limitations are clear
    - Only usable for batch scheduling at best

## LLM Model Installation


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


### Running a Prompt


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


Edit environment settings


```bash
sudo systemctl edit ollama
```


Add necessary environment variables


```bash
# Default keep alive time
# -1: Unlimited
# example: 10m, 1h, ...
Environment="OLLAMA_KEEP_ALIVE=-1"
```


Apply the service


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
