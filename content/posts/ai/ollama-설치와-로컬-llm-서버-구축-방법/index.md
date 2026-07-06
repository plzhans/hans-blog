---
id: "112"
translationKey: "112"
slug: "112-ollama-local-llm-server-setup"
title: "Ollama 설치와 로컬 LLM 서버 구축 방법"
description: "Ollama로 Linux 서버에서 로컬 LLM을 실행하는 방법을 설명합니다. 설치, 외부 접속 설정, 모델 선택, HTTP API 호출 예제로 개인 AI 서버 구축 흐름을 정리합니다."
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


## 개요


Ollama는 개인 서버나 PC에서 LLM을 직접 실행할 수 있게 해주는 로컬 AI 실행 도구입니다.


필요한 모델을 내려받아 내 환경에서 실행하므로 외부 AI 서비스에 데이터를 보내지 않고도 챗봇, 문서 요약, 코드 보조 기능을 구성할 수 있습니다.


이 글에서는 Linux 서버에 Ollama를 설치하고 외부 접속을 허용하는 방법을 정리합니다.


Oracle Cloud A1 ARM 환경에서 사용할 만한 모델 선택 기준과 HTTP API 호출 예제도 함께 다룹니다.


### 주의할 점


Ollama는 주로 HTTP API 방식으로 사용됩니다.


외부 접속을 허용하면 같은 네트워크 밖에서도 모델 호출이 가능해질 수 있으므로 접근 제어가 필요합니다.


인터넷에 직접 노출할 때는 방화벽, VPN, 리버스 프록시 인증, 허용 IP 제한 같은 보호 장치를 함께 구성해야 합니다.


개인적으로 tailscale 을 추천


## 설치


스크립트 설치


```bash
curl -fsSL https://ollama.com/install.sh | sh
```


실행 확인


```bash
ollama --version
```


서비스 확인


```bash
systemctl status ollama
```


서비스 자동 시작


```bash
sudo systemctl enable ollama
```


로그 확인


```bash
journalctl -u ollama -f
```


### 외부 접속 허용


bind ip 확인

- 아래 예시 기준으로 127.0.0.1 바인딩
- 로컬에서만 접근된다는 뜻

```bash
ss -tlnp | grep 11434

# Result
# LISTEN 0      4096                     127.0.0.1:11434      0.0.0.0:*
```


설정 디렉토리 생성


```bash
sudo mkdir -p /etc/systemd/system/ollama.service.d
```


환경 설정 파일 편집


```bash
sudo vim /etc/systemd/system/ollama.service.d/override.conf
```


내용 추가


```bash
[Service]
Environment="OLLAMA_HOST=0.0.0.0:11434"
```


서비스 적용


```bash
sudo systemctl daemon-reload
sudo systemctl restart ollama
```


바인딩 다시 확인

- *:11434 로 모든 ip 연결 허용

```bash
ubuntu@a1-free:~$ ss -tlnp | grep 11434

# Result
# LISTEN 0      4096                             *:11434            *:*
```


## LLM Model 추천


Oracle Cloud A1 ARM 2OCPU / 12 RAM 기준


| **용도<strong>          | </strong>모델<strong>          | </strong>추천도<strong> | </strong>속도** | **Tool Calling<strong> | </strong>한국어<strong> | </strong>메모리<strong> | </strong>비고**     |
| --------------- | --------------- | ------- | ------ | ---------------- | ------- | ------- | ---------- |
| 🥇 채팅 + Tool 겸용 | **Qwen3:4B**    | ⭐⭐⭐⭐⭐   | ★★★★☆  | ★★★★★            | ★★★★★   | 4~5GB   | 가장 추천      |
| 채팅 전용           | **Gemma3:4B**   | ⭐⭐⭐⭐☆   | ★★★★★  | ★★★☆☆            | ★★★★☆   | 4GB     | 빠른 응답      |
| 경량              | **Llama3.2:3B** | ⭐⭐⭐⭐☆   | ★★★★★  | ★★★☆☆            | ★★★★☆   | 3GB     | 가장 가벼움     |
| 고품질(느림)         | **Qwen3:8B**    | ⭐⭐⭐☆☆   | ★★☆☆☆  | ★★★★★            | ★★★★★   | 8~10GB  | CPU에서는 느림  |
| 개발/코딩 특화        | **Qwen3-Coder** | ⭐⭐⭐⭐☆   | ★★☆☆☆  | ★★★★★            | ★★★★★   | 큼       | 코딩 전용에 가까움 |

- GPU 없음, 상시 무료 인스턴스
- **위 사양에서는 Qwen3:4B 사용했는데** 너무 느려서 못 쓰겠다…
    - GPU 없으면 한계가 확실함
    - 배치 스케쥴로만 사용해야할 정도

## LLM Model 설치


```bash
# chat + tool chain
ollama pull qwen3:4b

# fast chat
ollama pull gemma3:4b
```


## LLM 사용


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


### 프롬프트 실행


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


## 추가 설정


환경 설정 편집


```bash
sudo systemctl edit ollama
```


필요한 환경 변수 추가


```bash
# 기본 keep alive 시간
# -1: 무제한
# example: 10m, 1h, ... 
Environment="OLLAMA_KEEP_ALIVE=-1"
```


서비스 적용


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

