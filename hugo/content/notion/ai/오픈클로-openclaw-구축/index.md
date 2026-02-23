---
id: "95"
translationKey: "95"
slug: "95-openclaw-setup"
title: "오픈클로(OpenClaw) 구축 "
description: "OpenClaw(OpenClaw AI agent framework)를 설치하고 onboard로 초기 설정하는 과정을 정리했다. 모델·채널·스킬 선택과 Telegram 인증까지 단계별로 따라 하며 안전하게 로컬에서 에이전트를 실행하는 방법을 다룬다."
categories:
  - "ai"
tags:
  - "OpenClaw"
  - "ai"
date: 2026-02-19T01:58:00.000Z
lastmod: 2026-02-23T10:09:00.000Z
toc: true
draft: false
images:
  - "assets/1_30c22a0f-7e83-80ee-9c2c-c2ff88b811d4.png"
---


![](./assets/1_30c22a0f-7e83-80ee-9c2c-c2ff88b811d4.png)


## 개요


### OpenClaw란


OpenClaw는 개발자가 자율적으로 동작하는 AI 에이전트를 구축할 수 있게 해주는 <strong>Node.js 기반 오픈소스 프레임워크</strong>다.


Claude, GPT 같은 다양한 모델과 연동할 수 있다.


파일 읽기, 명령 실행, 외부 서비스 호출 같은 작업을 도구로 연결해서 자동화할 수 있다.


공식 사이트: [OpenClaw](https://openclaw.ai/)


### 주요 특징

- **멀티모달 입력,** 텍스트, 이미지, 파일 등 여러 형태의 입력을 처리한다.
- **도구 통합,** 파일 시스템 접근, 웹 검색, API 호출 같은 기능을 도구로 붙여서 확장한다.
- **보안 중심 설계,** 샌드박스, 접근 제어, 화이트리스트 같은 장치를 제공한다.
- **확장 가능한 구조,** 플러그인 방식으로 기능을 추가하기 쉽다.

## 설치


OpenClaw는 설치 스크립트를 제공한다.


Node.js 같은 필수 유틸리티도 함께 설치한다.


설치 문서: [https://docs.openclaw.ai/install](https://docs.openclaw.ai/install)


### 기본 설치 모드


기본 설치는 설치 직후 **onboard(대화형 초기 설정)** 로 진입한다.


설정이 끝나면 실행 단계로 넘어간다.


```shell
# macOS / Linux / WSL2
curl -fsSL https://openclaw.ai/install.sh | bash

# Windows (PowerShell)
iwr -useb https://openclaw.ai/install.ps1 | iex
```

{{< details summary="수동 설치만 필요한 경우" >}}
onboard 없이 설치만 하고 싶으면 아래 옵션을 사용한다.


```shell
# macOS / Linux / WSL2
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --no-onboard

# Windows (PowerShell)
& ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard
```


설치 이후에는 아래 순서로 진행한다.


```shell
# 설정하기
openclaw onboard

# 실행하기
openclaw gateway start
```
{{< /details >}}


### 기본 설치 화면


![](./assets/2_30d22a0f-7e83-80f1-9217-fccc404257dc.png)


## 초기 설정(onboard)


기본 설치 모드를 진행하면 설치 후 onboard로 진입한다.


설정은 대화형 UI로 진행한다.


설정 파일은 기본적으로 `~/.openclaw/openclaw.json` 에 기록된다.


onboard를 중간에 끊어도 다시 실행하면 이어서 편집할 수 있다.


필요하면 초기화 후 다시 설정할 수도 있다.


### 1. 보안 경고 동의


![](./assets/3_30d22a0f-7e83-808b-b444-f99cdc23c20e.png)


> ⚠️ ⚠️ **보안 경고 — 반드시 읽어 주세요**


### 2. 설치 모드 선택


![](./assets/6_30d22a0f-7e83-8014-b12d-d1e1b342ba91.png)


![](./assets/7_30d22a0f-7e83-80a8-a129-f6a2ad9dbd00.png)


> 💡 Manual 모드는 게이트웨이와 워크스페이스를 수동으로 지정할 때 사용한다.  
> Manual 모드에서 지정할 수 있는 것


### 3. 모델 및 인증 공급자 선택


![](./assets/8_30d22a0f-7e83-804c-aba4-d28f3ce24fa0.png)


> 💡 필요한 공급자를 활성화하면 된다.  
> 선택하면 인증 절차를 안내해 준다.  
>   
> Claude(Anthropic) 예시


> 💡 ChatGPT 같은 클라우드 모델은 API 키 방식이면 사용량 기반 과금이 될 수 있다.  
> 하지만 구독형 계정을 쓰는 경우에도 API 키 없이 연동되는 방식이 있으니 살펴볼 만하다.  
>   
> - ChatGPT: OpenAI Codex (ChatGPT OAuth)  
>   
> - Claude: Anthropic token (setup-token 붙여넣기)  
>   
> - Gemini: Google Gemini CLI OAuth


### 4. 채널 선택


![](./assets/15_30d22a0f-7e83-807b-978a-fc624c5ddcf8.png)


![](./assets/16_30d22a0f-7e83-8064-9991-fa23e5a937f4.png)


> 💡 원하는 메신저 채널을 선택한다.  
> 텔레그램은 무료라서 선택하는 경우가 많다.  
>   
> 텔레그램 봇 토큰 생성 및 입력


### 5. 스킬 선택


![](./assets/23_30d22a0f-7e83-802c-9003-d2e265d919f2.png)


![](./assets/24_30d22a0f-7e83-803a-a434-d99e4a626ff4.png)


> 💡 OpenClaw는 부가 기능을 스킬, 플러그인 같은 형태로 제공한다.  
> 기본적으로 필요한 스킬만 켜고 시작해도 된다.  
>   
> 반복적으로 시키는 업무는 나중에 스킬로 만들어 붙일 수 있다.  
>   
> 고급 기능에 필요한 설정 예시


### 6. Hook 설정


![](./assets/37_30d22a0f-7e83-80f4-ba8e-f046b7b530b2.png)


> 💡 - **boot-md**  
>   
> - **bootstrap-extra-files**  
>   
> - **command-logger**  
>   
> - **session-memory**


### 7. 봇 실행


![](./assets/38_30d22a0f-7e83-80da-b680-e7e95ec284d6.png)


> 💡 macOS에서 실행 허용이 필요한 경우


실행 화면


![](./assets/41_30d22a0f-7e83-80e0-aa50-dc0df8e91829.png)


### 8. 텔레그램 유저 인증


![](./assets/42_31022a0f-7e83-80ba-a460-ff3c09092256.png)


> 💡 봇을 만든 뒤 메시지를 보내면 유저 인증을 진행한다.  
> 아무 사용자나 봇을 통해 OpenClaw에 접근하면 안 되기 때문에 인증이 필요하다.  
>   
> 인증 코드는 텔레그램 메시지로 전달된다.  
>   
> 안내된 명령어를 복사해서 터미널에서 수동으로 실행하면 된다.  
>   
> ![](./assets/43_30d22a0f-7e83-8056-af82-d77955b2432a.png)


### 9. 내 호칭과 봇 이름 정하기


![](./assets/45_31022a0f-7e83-80a0-b6de-e328656450d4.png)


> 💡 봇이 사용자를 부를 이름과 사용자가 봇을 부를 이름을 정한다.  
> 설정 후에는 일반 ChatGPT처럼 대화하며 쓸 수 있다.


### 10. 예시


![](./assets/46_31022a0f-7e83-8083-89cd-ea0433d6ff7a.png)


![](./assets/47_31022a0f-7e83-8012-aede-f808b1d235e5.png)

