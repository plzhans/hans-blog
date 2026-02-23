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
date: 2026-02-23T10:10:00.000Z
lastmod: 2026-02-23T15:30:00.000Z
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


> <details>  
> <summary>⚠️ **보안 경고 — 반드시 읽어 주세요**</summary>  
>   
> > OpenClaw는 취미 프로젝트이며 아직 베타 단계입니다.    
> > 예상치 못한 문제나 미완성 기능이 존재할 수 있습니다.    
> > 이 봇은 도구가 활성화된 경우 <strong>파일을 읽거나 작업을 실행</strong>할 수 있습니다.    
> > 잘못된 프롬프트는 봇을 속여 <strong>안전하지 않은 동작</strong>을 수행하게 만들 수 있습니다.    
> > 기본적인 보안 및 접근 제어에 익숙하지 않다면 OpenClaw 실행을 권장하지 않습니다.    
> > 도구를 활성화하거나 인터넷에 노출하기 전, 경험 있는 사람의 도움을 받으십시오.  
>   
>   
> **중요:** OpenClaw는 도구가 활성화되면 파일을 읽거나 명령을 실행할 수 있다.  
>   
>   
> 외부에 노출되면 매우 위험해질 수 있으니 기본 설정 그대로 공개 채널에 연결하지 않는 편이 안전하다.  
>   
>   
> 예를 들어 챗봇에게 파일을 읽어 달라고 하면 그대로 출력할 수 있다.  
>   
>   
> ![](./assets/4_31022a0f-7e83-80dc-a51c-c26d7be8c0f0.png)  
>   
>   
> </details>


### 2. 설치 모드 선택


![](./assets/5_30d22a0f-7e83-8014-b12d-d1e1b342ba91.png)


![](./assets/6_30d22a0f-7e83-80a8-a129-f6a2ad9dbd00.png)


> <details>  
> <summary>Manual 모드는 게이트웨이와 워크스페이스를 수동으로 지정할 때 사용한다.</summary>  
>   
> **게이트웨이 선택(보통 로컬 머신)**  
>   
>   
> ![](./assets/7_30d22a0f-7e83-803c-ad18-f3beec531690.png)  
>   
>   
> **워크스페이스 경로 지정**  
>   
>   
> 기본 경로는 `~/.openclaw/workspace`  
>   
>   
> ![](./assets/8_30d22a0f-7e83-8045-8f43-f8e216bb19b0.png)  
>   
>   
> </details>


### 3. 모델 및 인증 공급자 선택


![](./assets/9_30d22a0f-7e83-804c-aba4-d28f3ce24fa0.png)


> 필요한 공급자를 활성화하면 된다.  
> 선택하면 인증 절차를 안내해 준다.  
>   
> <details>  
> <summary>Claude(Anthropic) 예시</summary>  
>   
> 일부 에이전트는 자동 설치되기도 한다.  
>   
>   
> 수동 설치가 필요한 경우도 있다.  
>   
>   
> ![](./assets/10_31022a0f-7e83-80d8-bbd1-c82743ef6e3e.png)  
>   
>   
> 토큰 확인  
>   
>   
> ```shell  
> claude setup-token  
> ```  
>   
>   
> ![](./assets/11_31022a0f-7e83-80f4-a282-d0d5d905b104.png)  
>   
>   
> 모델 선택은 보통 기본값을 유지해도 된다.  
>   
>   
> 필요하면 언제든 변경할 수 있다.  
>   
>   
> ![](./assets/12_31022a0f-7e83-80d3-a320-ec6f7664dcab.png)  
>   
>   
> </details>


> ChatGPT 같은 클라우드 모델은 API 키 방식이면 사용량 기반 과금이 될 수 있다.  
> 하지만 구독형 계정을 쓰는 경우에도 API 키 없이 연동되는 방식이 있으니 살펴볼 만하다.  
>   
> - ChatGPT: OpenAI Codex (ChatGPT OAuth)  
> - Claude: Anthropic token (setup-token 붙여넣기)  
> - Gemini: Google Gemini CLI OAuth


### 4. 채널 선택


![](./assets/13_30d22a0f-7e83-807b-978a-fc624c5ddcf8.png)


![](./assets/14_30d22a0f-7e83-8064-9991-fa23e5a937f4.png)


> 원하는 메신저 채널을 선택한다.  
> 텔레그램은 무료라서 선택하는 경우가 많다.  
>   
> <details>  
> <summary>텔레그램 봇 토큰 생성 및 입력</summary>  
>   
> 텔레그램 봇은 관리자 콘솔이 아니라 `@BotFather` 와 대화해서 생성하고 관리한다.  
>   
>   
> ![](./assets/15_30d22a0f-7e83-80a3-9025-e1fc0a7cdeb9.png)  
>   
>   
> ![](./assets/16_30d22a0f-7e83-80c8-b4f8-edaa3a69552e.png)  
>   
>   
> ![](./assets/17_30d22a0f-7e83-8020-a48d-dd2be45089ca.png)  
>   
>   
> </details>


### 5. 스킬 선택


![](./assets/18_30d22a0f-7e83-802c-9003-d2e265d919f2.png)


![](./assets/19_30d22a0f-7e83-803a-a434-d99e4a626ff4.png)


> OpenClaw는 부가 기능을 스킬, 플러그인 같은 형태로 제공한다.  
> 기본적으로 필요한 스킬만 켜고 시작해도 된다.  
>   
>   
> 반복적으로 시키는 업무는 나중에 스킬로 만들어 붙일 수 있다.  
>   
> <details>  
> <summary>고급 기능에 필요한 설정 예시</summary>  
>   
> 아래 같은 작업이 필요할 때만 활성화하는 편이 안전하다.  
>   
> - 구글 지도에서 장소 탐색  
> - 이미지 생성  
> - 노션 데이터 탐색  
> - 음성을 텍스트로 변환(STT)  
> - 텍스트를 음성으로 변환(TTS)  
>   
> **Google Places**  
>   
>   
> 장소 검색에 필요한 Google API 키 설정이다.  
>   
>   
> 예: "서울 강남구에서 점수 높은 맛집 추천해줘"  
>   
>   
> ![](./assets/20_30d22a0f-7e83-80ea-bec0-f2092ffd730c.png)  
>   
>   
> **이미지 생성(Gemini, Nano Banana)**  
>   
>   
> Gemini 기반 이미지 생성 기능을 사용할 때 설정한다.  
>   
>   
> ![](./assets/21_30d22a0f-7e83-8057-aeeb-cab0cf88d3b0.png)  
>   
>   
> **Notion**  
>   
>   
> 노션 페이지에서 데이터를 참조할 때 사용한다.  
>   
>   
> ![](./assets/22_30d22a0f-7e83-8006-a59f-c428e0ba5bcb.png)  
>   
>   
> **이미지 생성(OpenAI)**  
>   
>   
> ![](./assets/23_30d22a0f-7e83-809c-8b87-cd499c42219d.png)  
>   
>   
> **Whisper(STT)**  
>   
>   
> 음성 파일을 텍스트로 변환한다.  
>   
>   
> 텔레그램에서 음성으로 메시지를 보내면 이를 텍스트로 바꿔서 처리할 수 있다.  
>   
>   
> ![](./assets/24_30d22a0f-7e83-809b-a7bb-d0ac4824e529.png)  
>   
>   
> **ElevenLabs(TTS)**  
>   
>   
> 텍스트를 음성으로 변환할 때 사용한다.  
>   
>   
> ![](./assets/25_30d22a0f-7e83-801d-b123-e98305c4cc29.png)  
>   
>   
> </details>


### 6. Hook 설정


![](./assets/26_30d22a0f-7e83-80f4-ba8e-f046b7b530b2.png)


> 항목별 참고  
> **boot-md**  
>   
> - gateway 시작 시 `BOOT.md` 를 자동 실행해서 초기 지침을 로드한다.  
>   
> **bootstrap-extra-files**  
>   
> - glob 또는 path 패턴으로 workspace 초기 파일을 자동으로 주입한다.  
> - 개인적으로는 이 옵션만 빼고 활성화하는 편을 추천한다.  
> - 경로를 잘못 지정하면 workspace가 오염될 수 있다.  
>   
> **command-logger**  
>   
> - 모든 명령 이벤트를 중앙 감사 로그 파일에 기록한다.  
>   
> **session-memory**  
>   
> - `/new` 실행 시 세션 컨텍스트를 메모리에 자동 저장한다.


### 7. 봇 실행


![](./assets/27_30d22a0f-7e83-80da-b680-e7e95ec284d6.png)


> 💡 <details>  
> <summary>macOS에서 실행 허용이 필요한 경우</summary>  
>   
> ![](./assets/28_30d22a0f-7e83-80da-9cba-fe9769b0baf1.png)  
>   
>   
> TUI로 실행할지 Web UI로 실행할지 선택한다.  
>   
>   
> 웹 UI가 편해 보이지만 채널 기반 비서를 쓸 예정이면 TUI도 충분하다.  
>   
>   
> </details>


실행 화면


![](./assets/29_30d22a0f-7e83-80e0-aa50-dc0df8e91829.png)


### 8. 텔레그램 유저 인증


![](./assets/30_31022a0f-7e83-80ba-a460-ff3c09092256.png)


> 봇을 만든 뒤 메시지를 보내면 유저 인증을 진행한다.  
> 아무 사용자나 봇을 통해 OpenClaw에 접근하면 안 되기 때문에 인증이 필요하다.  
>   
>   
> 인증 코드는 텔레그램 메시지로 전달된다.  
>   
>   
> 안내된 명령어를 복사해서 터미널에서 수동으로 실행하면 된다.  
>   
>   
> ![](./assets/31_30d22a0f-7e83-8056-af82-d77955b2432a.png)


### 9. 내 호칭과 봇 이름 정하기


![](./assets/32_31022a0f-7e83-80a0-b6de-e328656450d4.png)


> 💡 봇이 사용자를 부를 이름과 사용자가 봇을 부를 이름을 정한다.  
> 설정 후에는 일반 ChatGPT처럼 대화하며 쓸 수 있다.


### 10. 예시


![](./assets/33_31022a0f-7e83-8083-89cd-ea0433d6ff7a.png)


![](./assets/34_31022a0f-7e83-8012-aede-f808b1d235e5.png)

