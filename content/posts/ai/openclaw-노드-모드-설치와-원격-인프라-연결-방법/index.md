---
id: "107"
translationKey: "107"
slug: "107-openclaw-node-mode-remote-infra-setup"
title: "OpenClaw 노드 모드 설치와 원격 인프라 연결 방법"
description: "OpenClaw 노드 모드로 원격 서버를 게이트웨이에 연결하는 방법을 설명합니다. 설치, 실행 확인, 장치 승인, systemd 서비스 등록까지 인프라 제어 흐름을 정리합니다."
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


## 개요


OpenClaw 노드는 게이트웨이에 연결된 원격 인프라를 직접 제어하기 위한 실행 환경입니다.


별도 서버에 노드를 설치하면 OpenClaw 게이트웨이에서 해당 머신을 승인하고 연결한 뒤 원격 작업을 수행할 수 있습니다.


이 글에서는 npm을 이용한 OpenClaw 노드 설치 방법과 run 모드 실행, 게이트웨이 승인, systemd 사용자 서비스 등록 흐름을 정리합니다.


Stable Diffusion, Ollama 같은 AI 도구나 API 서버를 별도 머신에서 운영하면서 OS 수준 제어까지 필요한 상황에 활용할 수 있습니다.


## 설치


패키지 설치


```bash
npm install -g openclaw@latest
```


설치 확인


```bash
openclaw --version
```


## 직접 실행


### run 모드 실행


install 모드를 사용할거지만 일단 run 모드로 사전에 잘 실행되는지 먼저 체크


```bash
openclaw node run --host wee-home.synology.me --port 18788 --tls --display-name "node-xxxx"
```


결과

- 팬딩 상태임 gateway 에서 승인해줘야함

```bash
OpenClaw 2026.6.11 (e085fa1) — Your personal assistant, minus the passive-aggressive calendar reminders.

node host gateway connect failed: device pairing required (requestId: 0a4ac05b-c3f3-4e01-bcde-315ada55c0e8)
gateway connect failed: GatewayClientRequestError: device pairing required (requestId: 0a4ac05b-c3f3-4e01-bcde-315ada55c0e8)
node host gateway reconnect paused after close (1008): pairing required: device is not approved yet (requestId: 0a4ac05b-c3f3-4e01-bcde-315ada55c0e8) detail=PAIRING_REQUIRED; waiting for operator action
node host gateway closed (1008): pairing required: device is not approved yet (requestId: 0a4ac05b-c3f3-4e01-bcde-315ada55c0e8)
Warning: Detected unsettled top-level await at file:///home/ubuntu/.local/share/fnm/node-versions/v24.18.0/installation/lib/node_modules/openclaw/openclaw.mjs:772
```


### 게이트웨이 승인


이 작업 현재 머신이 아니라 게이트웨이에서 해야함


목록 확인


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


승인


```bash
openclaw devices approve 525b560b-5863-4676-988b-b080b7aa53c5
```


```bash
Approved a4d8a6a6a62ec1e14a2a1622df746710aea0405631e1ebd69e6ef33e768748e2 (525b560b-5863-4676-988b-b080b7aa53c5)
```


### 머신 노드 연결 확인


run 모드 실행


```bash
openclaw node run --host wee-home.synology.me --port 18788 --tls --display-name "node-xxxx"
```


## 서비스 등록


install 을 하기전에 OPENCLAW_GATEWAY_TOKEN 환경변수를 미리 셋팅하면 ~/.openclaw/node.systemd.env 파일에 환경변수 값 기록됨


실행 모드를 진행한 상태 이후에 동일한 쉘에서 작업중이면 이미 되어 있음 안된 경우 다시 지정할 것


```bash
# 토큰 환경 변수 설정
export OPENCLAW_GATEWAY_TOKEN={openclaw remote gateway token}

# node 서비스 설치
openclaw node install --host {host} --port {port} --tls --display-name "node-xxxx"
```


실행후 환경 변수 확인


```bash
# 서비스에서 사용하는 환경 파일 위치 확인
cat ~/.config/systemd/user/openclaw-node.service | grep EnvironmentFile
EnvironmentFile=-/home/ubuntu/.openclaw/node.systemd.env
```


### 서비스 시작


서비스 설치하고 시작


```bash
systemctl --user start openclaw-node
```


### 서비스 확인


```bash
openclaw nodes status
```

