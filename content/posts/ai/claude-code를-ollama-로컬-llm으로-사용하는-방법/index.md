---
id: "39222a0f-7e83-80fe-8b4d-ee6466d71c77"
translationKey: "39222a0f-7e83-80fe-8b4d-ee6466d71c77"
slug: "39222a0f-7e83-80fe-8b4d-ee6466d71c77-claude-code-ollama-local-llm"
title: "Claude Code를 Ollama 로컬 LLM으로 사용하는 방법"
description: "Claude Code를 Ollama 로컬 LLM으로 연결하는 방법을 설명합니다. Claude 호환 API, 환경변수, 모델 선택, LiteLLM 프록시가 필요한 경우까지 정리합니다."
categories:
  - "ai"
tags:
  - "claude"
  - "ollama"
  - "visual-code"
date: 2026-07-03T00:00:00.000Z
lastmod: 2026-07-06T02:15:00.000Z
toc: true
draft: false
images:
  - "assets/1_39522a0f-7e83-80b7-877c-d1ff175d736c.png"
---


![](./assets/1_39522a0f-7e83-80b7-877c-d1ff175d736c.png)


## 개요


Claude Code는 터미널에서 코드 작성, 파일 편집, 명령 실행을 도와주는 개발용 CLI 도구다.


편리한 개발 흐름을 제공하지만 Claude API나 구독 기반 환경을 계속 사용하면 비용이 발생한다.


개인 프로젝트나 반복적인 실험 환경에서는 이 비용이 부담이 될 수 있다.


이 글에서는 Claude Code의 사용 흐름은 유지하면서 실제 모델 실행을 Ollama 로컬 LLM으로 대체하는 방법을 정리한다.


최신 Ollama는 Claude CLI가 사용하는 API 경로와 호환되는 컨트롤러를 제공하므로 별도 프록시 없이 Claude Code 요청을 직접 받을 수 있다.


핵심 설정은 Claude 호환 API 주소 지정, 인증값 설정, 모델명 매핑이다.


모델 선택은 환경변수, Ollama 모델 별칭, CLI의 `--model` 매개변수 방식으로 처리할 수 있다.


호환 API가 없는 도구를 함께 사용하거나 여러 모델 제공자를 묶어야 하는 경우에는 LiteLLM 같은 프록시를 선택적으로 사용한다.


## 설치


설치 과정은 크게 네 단계로 진행한다.


### 로컬 LLM 런타임 설치


먼저 로컬에서 모델을 실행할 수 있는 런타임을 설치한다. 대표적으로 Ollama를 사용할 수 있다.


```bash
curl -fsSL https://ollama.com/install.sh | sh
```


설치 후 서비스가 정상적으로 실행되는지 확인한다.


```bash
ollama --version
```


### 사용할 모델 다운로드


Claude Code 대체 용도로 사용할 모델을 내려받는다. 코드 작성과 명령 이해가 필요한 작업이라면 Qwen Coder 계열이나 Llama 계열 모델을 우선 검토할 수 있다.


```bash
ollama pull qwen2.5-coder:7b
```


모델이 정상적으로 실행되는지 간단히 테스트한다.


```bash
ollama run qwen2.5-coder:7b
```


## Claude tool 연동


### Claude 호환 API 엔드포인트 준비


Claude Code나 VS Code의 Claude 확장에서 로컬 LLM을 사용하려면 Claude CLI가 호출하는 API 경로와 호환되는 엔드포인트가 필요하다.


기존에는 Ollama의 기본 API 경로가 Claude 도구에서 기대하는 API 구조와 달랐다.


그래서 별도 변환 API를 직접 만들거나 LiteLLM 같은 프록시를 앞단에 두고 Claude 형식의 요청을 로컬 LLM 호출로 변환하는 구성이 필요했다.


하지만 최신 Ollama에서는 Claude CLI가 사용하는 API 경로와 동일하게 동작하는 호환 API 컨트롤러를 내장으로 제공한다.


따라서 최신 Ollama를 사용하면 별도 프록시를 구성하지 않아도 Claude Code의 요청을 Ollama로 그대로 보낼 수 있다.


구성 방식이 단순해지고 로컬 LLM을 Claude 개발 도구 흐름에 붙이기 쉬워진다.


반대로 사용하는 도구가 Claude 호환 API를 지원하지 않거나 Ollama가 제공하지 않는 API 형식을 요구한다면 프록시 구성이 필요하다.


이 경우 LiteLLM 같은 도구를 사용해 요청과 응답 형식을 변환하면 된다.


정리하면 최신 Ollama 기준으로는 `Claude 도구 → Ollama Claude 호환 API` 구조를 우선 사용한다.


Ollama가 제공하는 Claude 호환 API를 사용할 수 없는 도구라면 `도구 → LiteLLM 또는 변환 프록시 → 해당 도구가 요구하는 모델 API` 구조를 선택한다.


### API 경로 변경


Claude 호환 API 엔드포인트를 사용할 때는 API 주소와 인증값을 먼저 맞춘다.


이 설정은 어떤 모델을 사용할지와는 별개로 Claude 도구가 어느 API 서버로 요청을 보낼지 결정하는 부분이다.


| 환경변수                 | 설명                                                    |
| -------------------- | ----------------------------------------------------- |
| ANTHROPIC_BASE_URL   | Claude API 대신 Ollama의 Claude 호환 API 주소를 지정한다.         |
| ANTHROPIC_AUTH_TOKEN | 인증 토큰 방식이 필요한 게이트웨이나 프록시 환경에서 사용한다.                   |
| ANTHROPIC_API_KEY    | API 키 방식이 필요한 환경에서 사용한다. 로컬 Ollama에서는 더미 값을 사용할 수 있다. |


로컬 Ollama에 직접 연결하는 단순 구성은 보통 아래처럼 설정한다.


```bash
export ANTHROPIC_BASE_URL=http://localhost:11434
export ANTHROPIC_API_KEY=dummy-key
```


`ANTHROPIC_AUTH_TOKEN`과 `ANTHROPIC_API_KEY`는 사용하는 게이트웨이나 호환 API 구현 방식에 따라 선택한다.


로컬 Ollama에 직접 붙는 구성이라면 대개 `ANTHROPIC_API_KEY`에 더미 값을 지정하는 정도로 충분하다.


### 모델 선택 문제


API 주소와 인증값을 맞췄다면 다음으로 모델명을 맞춰야 한다.


Claude CLI나 VS Code의 Claude 관련 설정에서 요청 대상은 Ollama의 Claude 호환 API로 바꾸고, 실제 실행 모델은 로컬에 설치된 Ollama 모델로 지정한다.


Claude CLI는 기본적으로 Claude 모델 이름이나 모델 alias를 기준으로 요청을 보낸다.


예를 들면 Ollama에는 Claude 모델명과 동일한 모델이 존재하지 않는다.


따라서 Claude 도구에서 전달하는 모델명을 Ollama에 설치된 로컬 모델명과 맞춰야 한다.


실제 환경에서는 사용하는 Claude CLI 버전과 VS Code 확장의 설정 방식에 따라 환경변수 이름이나 API 경로가 달라질 수 있다.


LiteLLM 같은 프록시는 구버전 Ollama를 사용하거나 여러 모델 제공자를 하나의 엔드포인트로 묶어야 할 때만 선택적으로 사용하면 된다.


모델 선택 문제는 대표적으로 아래 세 가지 방식으로 정리할 수 있다.


CASE 1 : 환경변수로 제어하기


가장 먼저 검토할 방식은 환경변수로 Claude Code의 API 주소, 인증값, 모델 선택을 제어하는 것이다.


Ollama 모델명을 임의로 복사하지 않고 Claude 도구가 요청할 대상과 모델명을 직접 지정할 수 있다.


모델 선택에 주로 사용하는 환경변수는 아래와 같다.


| 환경변수                           | 설명                                                                              |
| ------------------------------ | ------------------------------------------------------------------------------- |
| ANTHROPIC_MODEL                | 현재 세션에서 사용할 기본 모델을 지정한다.                                                        |
| ANTHROPIC_DEFAULT_SONNET_MODEL | Sonnet 계열 alias가 호출될 때 사용할 모델을 지정한다.                                            |
| ANTHROPIC_DEFAULT_OPUS_MODEL   | Opus 계열 alias가 호출될 때 사용할 모델을 지정한다.                                              |
| ANTHROPIC_DEFAULT_HAIKU_MODEL  | Haiku 계열 alias나 빠른 보조 작업에 사용할 모델을 지정한다.                                         |
| ANTHROPIC_SMALL_FAST_MODEL     | 기존에 빠른 보조 작업 모델을 지정할 때 쓰던 값이다. 최신 구성에서는 ANTHROPIC_DEFAULT_HAIKU_MODEL을 우선 사용한다. |


```bash
# 기본 세션 모델
export ANTHROPIC_MODEL=qwen2.5-coder:7b

# Sonnet 계열 alias 모델
export ANTHROPIC_DEFAULT_SONNET_MODEL=qwen2.5-coder:7b

# Opus 계열 alias 모델
export ANTHROPIC_DEFAULT_OPUS_MODEL=qwen2.5-coder:14b

# Haiku 계열 alias 모델
export ANTHROPIC_DEFAULT_HAIKU_MODEL=qwen2.5-coder:3b
```


이렇게 설정하면 Claude 도구가 내부적으로 모델 alias를 구분해 호출할 때 각각 다른 Ollama 모델을 사용할 수 있다.


예를 들어 일반 코드 수정과 리팩터링은 `qwen2.5-coder:7b`로 처리하고 간단한 요약이나 빠른 보조 작업은 `qwen2.5-coder:3b`로 처리하는 식이다.


기존의 `ANTHROPIC_SMALL_FAST_MODEL`은 빠른 보조 작업 모델을 지정할 때 쓰이던 값이다.


최신 문서에서는 `ANTHROPIC_DEFAULT_HAIKU_MODEL`을 사용하는 방식으로 정리되어 있다.


따라서 새로 구성한다면 `ANTHROPIC_DEFAULT_HAIKU_MODEL`을 우선 사용하고, 구버전 Claude Code에서 필요할 때만 `ANTHROPIC_SMALL_FAST_MODEL`을 함께 확인한다.


환경변수 방식은 설정 의도가 명확하다.


로컬에 설치된 Ollama 모델명을 그대로 사용하므로 모델 별칭을 따로 만들 필요가 없다.


여러 터미널에서 서로 다른 모델 조합을 테스트하기도 쉽다.


CASE 2 :Ollama 사용하는 경우 동일한 모델명 맞추기


환경변수로 모델명을 제어하기 어렵거나 도구가 Claude 모델명을 고정으로 호출한다면 Ollama 쪽에서 동일한 모델명을 맞추는 방식을 사용할 수 있다.


예를 들어 Claude 도구가 `claude-3-5-sonnet`을 고정으로 호출한다면 Ollama에서 같은 이름의 모델 별칭을 만든다.


실제 실행 모델은 Qwen Coder를 사용하되 외부에 노출되는 이름만 Claude 모델명과 맞추는 방식이다.


```bash
ollama cp qwen2.5-coder:7b claude-3-5-sonnet
```


이렇게 하면 Claude 도구는 기존 모델명을 그대로 요청한다.


Ollama는 같은 이름으로 등록된 로컬 모델을 찾아 실행한다.


도구의 모델 선택 UI나 설정을 바꾸기 어려운 경우에 유용하다.


단점은 모델 별칭이 늘어나면 관리할 이름이 많아진다는 점이다.


따라서 개인 개발 환경에서는 환경변수 방식을 우선 사용하고, 모델명을 직접 제어할 수 없는 경우에만 Ollama 별칭 방식을 사용하는 것이 좋다.


CASE 3 : CLI 실행 시 model 매개변수 직접 지정하기


일회성으로 모델을 바꿔 실행해야 한다면 Claude CLI 실행 시 `--model` 매개변수를 직접 지정할 수 있다.


이 방식은 환경변수를 바꾸지 않고 특정 실행에서만 모델을 다르게 쓰고 싶을 때 유용하다.


```bash
claude --model qwen2.5-coder:7b
```


예를 들어 평소에는 환경변수로 기본 모델을 지정해두고, 특정 작업에서만 더 큰 모델을 사용하려면 아래처럼 실행한다.


```bash
claude --model qwen2.5-coder:14b
```


`--model` 매개변수는 해당 실행 세션에만 적용된다.


여러 터미널에서 서로 다른 모델을 동시에 테스트할 때도 사용할 수 있다.


다만 반복적으로 같은 모델을 사용할 예정이라면 환경변수로 지정하는 편이 관리하기 쉽다.


## 마무리


Claude Code와 VS Code Claude 환경은 개발자가 이미 익숙한 도구 사용 흐름을 제공한다. 


이 환경에서 모델 실행 부분만 로컬 LLM으로 바꾸면 Claude 인프라 비용을 줄이면서도 비슷한 개발 워크플로우를 유지할 수 있다.


다만 로컬 LLM은 모델 크기와 하드웨어 성능에 따라 응답 품질과 속도가 달라진다. 


복잡한 리팩터링이나 장기 컨텍스트가 필요한 작업은 Claude보다 품질이 낮을 수 있다. 


따라서 비용 절감이 중요한 반복 작업과 개인 프로젝트부터 적용하는 것이 현실적이다.

