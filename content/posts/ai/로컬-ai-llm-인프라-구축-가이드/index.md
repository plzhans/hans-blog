---
id: "122"
translationKey: "122"
slug: "122-local-ai-llm-infra-guide"
title: "로컬 AI/LLM 인프라 구축 가이드"
description: "Ollama로 로컬 LLM 서버를 세우고, 평소 쓰던 Claude Code까지 로컬 모델로 연결하는 방법을 정리합니다."
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


## 개요


외부 AI API에 데이터를 보내지 않고 직접 서버에서 LLM을 돌리고 싶다면 아래 순서로 보면 된다.


## 뭐부터 봐야 하나

- **로컬 LLM 서버 자체가 필요하다** → [Ollama 설치와 로컬 LLM 서버 구축 방법](../112-ollama-local-llm-server-setup/) (기반 인프라, 먼저 이것부터)
- **서버는 있는데 평소 쓰던 Claude Code를 그 위에서 돌리고 싶다** → [Claude Code를 Ollama 로컬 LLM으로 사용하는 방법](../113-claude-code-ollama-local-llm/) (Ollama가 먼저 떠 있어야 함)

## Ollama — 로컬 LLM 서버의 시작점


Linux 서버에 Ollama를 설치하고 외부 접속을 허용하는 방법, HTTP API 호출 예제, 그리고 Oracle Cloud A1 ARM 같은 제한된 스펙에서 어떤 모델을 골라야 하는지까지 정리했다. GPU 없는 환경의 현실적인 한계도 함께 다룬다.


→ [Ollama 설치와 로컬 LLM 서버 구축 방법](../112-ollama-local-llm-server-setup/)


## Claude Code + Ollama — 익숙한 도구를 로컬 모델로


Claude Code를 Anthropic API 대신 로컬 Ollama 모델에 연결하는 방법이다. Claude 호환 API, 환경변수 설정, 모델 선택, 필요 시 LiteLLM 프록시까지 정리했다.


→ [Claude Code를 Ollama 로컬 LLM으로 사용하는 방법](../113-claude-code-ollama-local-llm/)

