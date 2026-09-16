---
id: "132"
translationKey: "132"
slug: "132-cloudflare-ai-crawl-control-managed-robots-txt"
title: "Cloudflare 로 AI 봇 차단하기 - Managed robots.txt 와 AI Crawl Control"
description: "Cloudflare 가 robots.txt 를 대신 써 주고 AI 봇을 엣지에서 차단한다. 어떤 봇이 얼마나 가져갔는지도 보여 준다."
categories:
  - "web"
tags:
  - "ai"
  - "cloudflare"
  - "seo"
date: 2026-09-16T14:55:00.000Z
lastmod: 2026-09-16T14:55:00.000Z
toc: true
draft: false
images:
  - "assets/1_3dd22a0f-7e83-81e9-ab71-dd552f2abd95.jpg"
---


![Cloudflare 가 robots.txt 를 대신 관리하고 AI 크롤러를 엣지에서 돌려보내는 구성](./assets/1_3dd22a0f-7e83-81e9-ab71-dd552f2abd95.jpg)


## 개요


robots.txt 는 의사 표시까지다. 지킬 의사가 있는 봇에게만 통한다. 실제로 막으려면 요청이 오리진에 닿기 전에 끊어야 한다.


Cloudflare 는 그 두 가지를 대시보드 토글로 만들어 뒀다. robots.txt 를 대신 써 주는 기능과 엣지에서 실제로 차단하는 기능 그리고 누가 얼마나 가져갔는지 보여 주는 기능이다.


이 글은 그 기능들을 정리한다. robots.txt 자체의 문법과 AI 때문에 늘어난 항목은 따로 정리했다.


### 먼저 읽으면 좋은 글


robots.txt 로 AI 에이전트에게 어떤 지침을 내릴 수 있는지는 아래 글에 있다. 용도별로 쪼개진 봇 이름과 Google-Extended 같은 용도 스위치 그리고 Content-Signal 문법을 다룬다.

- [robots.txt 로 AI 크롤러 제어하기 - 검색·학습·에이전트를 나눠 허용하는 방법](../131-robots-txt-ai-crawler-content-signals/) — robots.txt 의 문법과 AI 때문에 늘어난 항목

## Cloudflare 가 하는 일


Cloudflare 가 하고 있는 일을 한 줄로 요약하면 이렇다. **robots.txt 는 부탁이고, 엣지 설정은 집행이다.** 대시보드 토글 몇 개로 정리해 뒀다.


### Managed robots.txt


Cloudflare 가 `/robots.txt` 에 Content Signals 블록을 **대신 붙여 준다**([문서](https://developers.cloudflare.com/bots/additional-configurations/managed-robots-txt/)). 


기본값은 `search=yes, ai-input=yes, ai-train=no`


(검색은 열고 학습은 닫는 쪽이다.)


오리진에 이미 robots.txt 가 있으면 지우지 않고 거기에 합쳐진다. 직접 관리하고 싶으면 끄고 내 파일에 `Content-Signal` 줄을 적으면 된다.


### Block AI bots


토글 하나로 알려진 AI 봇을 <strong>엣지에서 실제로 차단</strong>한다([문서](https://developers.cloudflare.com/bots/additional-configurations/block-ai-bots/)). 전 플랜 무료다.


앞의 것과 성격이 완전히 다르다는 점이 중요하다. robots.txt 는 지킬 의사가 있는 봇에게만 통하지만 이쪽은 **robots.txt 를 무시하는 봇에게도 통한다.** 요청 자체가 오리진에 닿지 못한다.


### AI Crawl Control


어떤 AI 봇이 언제 무엇을 얼마나 가져갔는지 보여 준다. 봇 단위로 허용/차단도 정할 수 있다.


목록을 한 번 열어 보면 규모가 감이 온다. 이 블로그 기준으로도 **서른 개 남짓이 잡힌다.** 그리고 Cloudflare 는 그걸 그냥 나열하지 않고 **성격별로 분류해 둔다.**


![클라우드플레어 AI Crawl Control 의 Security 항목](./assets/2_3dd22a0f-7e83-81d2-bc3e-eb2d4e28c37a.png)

- **Search Engine Crawler** — Googlebot, BingBot, Baidu. 전통적인 검색 크롤러
- **AI Search** — OAI-SearchBot, PerplexityBot, Claude-SearchBot, Applebot. AI 검색 인덱스용
- **AI Assistant** — ChatGPT-User, Perplexity-User, MistralAI-User, DuckAssistBot. 사용자가 물어본 순간에 들어오는 쪽
- **AI Crawler** — GPTBot, ClaudeBot, CCBot, Meta-ExternalAgent, Bytespider. 대량 수집
- **Archiver** — `archive.org_bot` 같은 보존용

앞에서 말한 <strong>용도 축이 그대로 UI 가 된 것</strong>이다. robots.txt 에 `Content-Signal` 로 적는 search · ai-input · ai-train 이 여기서는 카테고리로 나타난다.


실제 숫자를 보면 예상과 다른 것도 있다. 이 블로그에서 제일 많이 가져간 건 검색 엔진이 아니라 `Meta-ExternalAgent` 였다. 425 요청에 12 MB 를 가져갔다. 같은 기간 `Googlebot` 은 61 요청이다. 막연히 "검색 봇이 대부분" 이라고 생각하고 있었다면 한 번 확인해 볼 값이다.


그래서 순서로는 이게 먼저다 — <strong>로그를 먼저 보고 정책을 정하는 편</strong>이 낫다. 막연히 다 막아 놓으면 검색 유입 경로까지 같이 닫힐 수 있다.


### Pay per crawl


[Content Independence Day](https://blog.cloudflare.com/content-independence-day-no-ai-crawl-without-compensation/) 에서 내놓은 실험이다. 크롤러 요청에 `402 Payment Required` 로 답하고 **요청당 가격을 매긴다.** 허용 아니면 차단이라는 이분법에 "돈을 내면 허용" 이라는 선택지를 하나 더 얹는 시도다. 아직 베타.


같은 발표에서 Cloudflare 는 <strong>신규 도메인의 AI 크롤러 차단을 기본값</strong>으로 돌렸다. 가입할 때 열지 말지를 묻는다. 아무것도 안 하면 닫힌 상태다. 기본값이 "열림" 에서 "닫힘" 으로 뒤집힌 것 자체가 이 판의 분위기를 보여 준다.


## 정리

- robots.txt 는 의사 표시이고 엣지 설정은 집행이다. 둘은 성격이 다르므로 같이 써야 한다.
- Managed robots.txt 로 의사를 밝히고 Block AI bots 로 집행하고 AI Crawl Control 로 확인하는 조합이 기본형이다.
- 순서는 관측이 먼저다. 로그를 보고 정책을 정하는 편이 낫다. 막연히 다 막으면 검색 유입 경로까지 같이 닫힌다.
- Pay per crawl 은 허용 아니면 차단이라는 이분법에 선택지를 하나 더 얹는 시도다. 아직 베타다.

### 참고

- [Cloudflare — Managed robots.txt](https://developers.cloudflare.com/bots/additional-configurations/managed-robots-txt/)
- [Cloudflare — Block AI bots](https://developers.cloudflare.com/bots/additional-configurations/block-ai-bots/)
- [Cloudflare 블로그 — Content Independence Day](https://blog.cloudflare.com/content-independence-day-no-ai-crawl-without-compensation/)
- [robots.txt 로 AI 크롤러 제어하기 - 검색·학습·에이전트를 나눠 허용하는 방법](../131-robots-txt-ai-crawler-content-signals/) — robots.txt 의 문법과 AI 때문에 늘어난 항목
