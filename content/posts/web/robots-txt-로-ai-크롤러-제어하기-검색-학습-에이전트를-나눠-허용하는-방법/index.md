---
id: "131"
translationKey: "131"
slug: "131-robots-txt-ai-crawler-content-signals"
title: "robots.txt 로 AI 크롤러 제어하기 - 검색·학습·에이전트를 나눠 허용하는 방법"
description: "AI 크롤러 때문에 robots.txt 에 적을 것이 늘었다. 용도별 봇 이름과 Google-Extended 와 Content-Signal 을 정리한다."
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
  - "assets/1_3dd22a0f-7e83-81b3-9ca5-fb1ae5e5862d.jpg"
---


![robots.txt 를 읽고 검색·에이전트는 통과하고 학습 크롤러는 돌아가는 모습](./assets/1_3dd22a0f-7e83-81b3-9ca5-fb1ae5e5862d.jpg)


## 개요


robots.txt 는 1994년 메일링 리스트 합의로 시작해 2022년에야 [RFC 9309](https://www.rfc-editor.org/rfc/rfc9309.html) 로 표준이 된 파일이다. 


규칙은 단순하다. 사이트 루트에 텍스트 파일 하나 두고 **누가**(`User-agent`) **어디를**(`Disallow` / `Allow`) 긁어도 되는지 적는다.


과거에는 문제가 없었다. 크롤러의 목적이 사실상 하나였기 때문이다 — 검색 인덱스를 만들고 대신 링크로 사람을 돌려보낸다. 주고받는 게 성립했다.


AI 크롤러는 그 교환을 깨뜨렸다. 똑같이 가져가는데 돌려보내지 않는다. 모델 학습에 쓰고 사용자가 질문한 그 순간에 실시간으로 읽어 간다. 셋은 사이트 입장에서 <strong>전혀 다른 일</strong>인데 robots.txt 에는 이걸 나눠 적을 칸이 없었다. 그래서 지금 칸이 늘어나는 중이다.


### 이 글에서 다루는 것

- 전통적인 robots.txt 가 다루던 것과 그 구조적 한계
- AI 때문에 늘어난 항목 — 용도별로 쪼개진 봇, 크롤러가 아닌 토큰, `Content-Signal`
- 왜 이제 와서 신경 써야 하는지 · 사이트 성격별로 무엇을 열고 무엇을 막을지

---


## 전통적으로 robots.txt 에 적던 것


문법은 사실상 네 줄이 전부다.


```plain text
User-agent: *
Disallow: /admin/
Disallow: /*?sort=
Allow: /

Sitemap: https://example.com/sitemap.xml
```


쓰임새는 대개 이 넷 중 하나였다.

- **안 봐도 되는 경로 빼기** — `/admin/`, 로그인 뒤 페이지, 스테이징 사본
- **크롤 버짓 아끼기** — 정렬·필터 쿼리 파라미터처럼 사실상 같은 페이지가 수백 개로 불어나는 URL
- **봇별로 다르게 주기** — `User-agent: Googlebot` 그룹을 따로 쓰는 식
- **사이트맵 위치 알려주기** — `Sitemap:` 은 크롤러가 어디부터 볼지 알려주는 유일한 표준 통로다

여기서 두 가지는 처음부터 짚고 가야 한다.

1. **강제력이 없다.** robots.txt 는 방화벽이 아니라 <strong>부탁</strong>이다. 지키는 건 봇의 선택이다. 
안 지키는 봇에게는 아무 일도 일어나지 않는다. 진짜로 막으려면 서버나 WAF 에서 막아야 한다.
2. **Disallow 는 색인 차단이 아니다.** 
오히려 반대로 가는 경우가 있다. 크롤링을 막으면 크롤러가 그 페이지의 `noindex` 메타 태그를 **읽지 못해서** 외부 링크만 보고 URL 만 검색 결과에 남겨 두기도 한다.
색인에서 빼고 싶으면 크롤링은 열어 두고 `noindex` 를 읽게 해야 한다.

그리고 이 글의 핵심인 세 번째 한계 — **축이 두 개뿐이다.** 누가, 어디를. **무엇에 쓸 것인가** 를 적을 자리가 없다.


---


## AI 가 생기면서 늘어난 항목들


### ① 한 회사가 봇을 여러 개 굴린다


용도 칸이 없으니 업체들이 택한 우회로는 <strong>용도마다 봇 이름을 따로 파는 것</strong>이었다. 지금 주요 업체는 대체로 학습 / 검색 / 사용자 실시간 요청 셋으로 나눠 놓았다.

- **OpenAI** — `GPTBot`(학습), `OAI-SearchBot`(검색 인덱스), `ChatGPT-User`(사용자가 링크를 물어본 순간의 실시간 방문)
- **Anthropic** — `ClaudeBot`(학습), `Claude-SearchBot`(검색), `Claude-User`(사용자 요청)
- **Perplexity** — `PerplexityBot`, `Perplexity-User`
- **Meta** — `Meta-ExternalAgent`
- **Common Crawl** — `CCBot`. 이건 특정 모델 소유가 아니라 <strong>공개 데이터셋</strong>이다. 그 데이터셋을 여러 모델이 학습에 쓴다

덕분에 이런 분기가 가능해졌다.


```plain text
# 검색은 환영, 학습은 사절
User-agent: OAI-SearchBot
Allow: /

User-agent: GPTBot
Disallow: /
```


다만 구조적 한계가 그대로다. **이건 블랙리스트다.** 봇 이름을 내가 전부 알고 있어야 한다. 업체가 새 봇을 하나 만들면 내 robots.txt 는 그날부터 뒤처진다. 이름을 관리하는 일이 끝나지 않는다.


### ② 크롤러가 아닌 "토큰" 이 등장했다


`Google-Extended` 와 `Applebot-Extended` 는 **봇 이름이 아니다.** 그런 이름으로 찾아오는 크롤러는 없다.


구글을 예로 보자. 구글의 크롤러는 `Googlebot` 하나다. 이 봇이 와서 페이지를 가져간다. 그런데 가져간 데이터는 검색 인덱스에도 쓰이고 Gemini 학습에도 쓰인다.


여기서 문제가 생긴다. 학습이 싫다고 `Googlebot` 을 막으면 **검색에서도 같이 사라진다.** 둘을 나눌 방법이 없었다.


그래서 구글이 따로 만든 게 `Google-Extended` 다. 크롤링은 그대로 두고 <strong>"가져간 걸 학습에는 쓰지 마라" 만 따로 말하는 스위치</strong>다.


```plain text
User-agent: Google-Extended
Disallow: /
```


이렇게 적어도 `Googlebot` 은 평소대로 온다. 검색 순위도 그대로다. 학습 쪽만 빠진다.


의미가 작지 않다. robots.txt 가 <strong>접근(access) 이 아니라 용도(use) 를 통제한 첫 사례</strong>다. 파일의 성격이 "긁지 마라" 에서 "긁는 건 괜찮은데 그 용도로는 쓰지 마라" 로 넘어간 것이다.


### ③ 용도를 직접 적는 `Content-Signal`


봇 이름을 쫓아다니는 대신 아예 <strong>용도 축을 문법으로 만들자</strong>는 게 Cloudflare 가 2025년 9월에 내놓은 [Content Signals Policy](https://contentsignals.org/) 다.


```plain text
User-agent: *
Allow: /

Content-Signal: search=yes, ai-input=yes, ai-train=no
```


값은 셋이다.

- `search` — 검색 인덱스를 만들고 링크로 사람을 돌려보내는 용도
- `ai-input` — 답변을 생성하는 시점에 콘텐츠를 입력으로 넣는 용도(RAG·그라운딩)
- `ai-train` — 모델을 학습·파인튜닝하는 용도

각각 `yes` / `no` 다. **적지 않으면 "의사 표시 없음"** 이다. 허용도 금지도 아니다.


좋은 점은 봇 이름을 몰라도 된다는 것이다. `User-agent: *` 하나에 용도 세 줄이면 새로 생긴 봇에도 그대로 적용된다. 반대로 분명히 해 둘 점은 <strong>이것도 여전히 강제가 아니라는 것</strong>이다. Content Signals 는 기술적 차단이 아니라 <strong>의사 표시</strong>다. robots.txt 안에 사람이 읽을 수 있는 라이선스 문구를 같이 넣어 "몰랐다" 는 변명을 막는 데 목적이 있다. 집행이 아니라 근거다.


실제로 어떻게 쓰는지는 이 블로그 설정으로 바로 뒤에서 보자.


### ④ 표준화도 진행 중이다


IETF 에 [AI Preferences(aipref) 워킹그룹](https://datatracker.ietf.org/wg/aipref/about/)이 만들어져서 용도 어휘와 그걸 붙이는 방법을 표준으로 다듬고 있다. 아직 초안 단계지만 방향은 `Content-Signal` 과 같다 — **용도별 어휘를 정하고** robots.txt 뿐 아니라 **HTTP 응답 헤더로도** 붙일 수 있게 하는 것. 헤더로 붙일 수 있으면 페이지 단위를 넘어 이미지·PDF 같은 개별 파일에도 의사를 표시할 수 있다.


### ⑤ 헷갈리기 쉬운 것 — `llms.txt` 는 권한 파일이 아니다


같이 언급되지만 성격이 다른 파일들이 있다.

- **`llms.txt`** — 허용/차단과 **아무 상관 없다.** LLM 이 사이트를 이해하기 좋게 핵심 문서 목록을 마크다운으로 정리해 둔 <strong>안내문</strong>에 가깝다. robots.txt 의 대체재가 아니다
- **`ai.txt`** — 학습 데이터 옵트아웃을 노린 별도 파일. 채택률이 낮아 사실상 `Content-Signal` 쪽으로 정리되는 분위기다

### ⑥ 그리고 robots.txt 로는 못 막는 것 — AI 에이전트


여기가 지금 제일 애매한 지점이다.


브라우저를 직접 조작하는 AI 에이전트는 **크롤러가 아니다.** 사람이 "이 페이지 요약해 줘" 라고 시켜서 사람 대신 한 번 들어오는 <strong>대리인</strong>이다. robots.txt 는 애초에 자동 크롤러를 위한 규약이라 사용자가 직접 지시한 단발 접근에는 원칙적으로 적용 대상이 아니라고 보는 해석이 우세하다. 실제로 `ChatGPT-User` 나 `Claude-User` 같은 이름이 따로 있는 이유가 그것이다.


게다가 User-Agent 문자열은 그냥 <strong>자기 신고</strong>다. 마음먹으면 일반 브라우저인 척할 수 있다. 그래서 Cloudflare 는 [mixed-use 크롤러에 책임을 묻자](https://blog.cloudflare.com/accountable-mixed-use-ai-crawlers/)는 글에서 두 가지를 요구한다 — 하나의 크롤러가 검색과 학습을 겸하면 사이트 입장에서 분기할 방법이 없으니 **목적별로 봇을 나누고** UA 문자열 대신 <strong>암호학적 서명으로 신원을 증명</strong>하라는 것(Web Bot Auth). 이름을 믿는 체제에서 서명을 검증하는 체제로 가자는 이야기다.


---


## 그래서 왜 신경 써야 하나


전통적인 검색 크롤러는 사실 별문제가 아니었다. Googlebot 은 주기적으로 들러 바뀐 것만 가져간다. 대신 검색 결과로 사람을 보내 준다. 부하도 크지 않고 돌려받는 것도 있으니 굳이 막을 이유가 없었다.


AI 크롤러는 다르다. 학습용 수집은 사이트를 통째로 훑는 것이 목적이다. 바뀐 것만 보는 게 아니라 있는 대로 가져간다. 한 번 다녀가는 규모가 검색 크롤러와 비교가 안 된다. 이 블로그만 봐도 AI 크롤러 한 곳이 요청 수 기준으로 Googlebot 의 일곱 배를 가져갔다.


그게 공짜가 아니다.

- 정적 블로그면 대역폭 정도다. <strong>동적 사이트나 API 를 물고 있으면 그대로 서버 부하</strong>가 된다
- 검색과 달리 **돌려주는 게 없다.** AI 답변에 인용돼도 링크를 타고 오는 사람은 적다
- 학습에 한 번 들어간 글은 **되돌릴 수 없다**

그렇다고 전부 막는 게 답은 아니다. **사이트 성격에 따라 답이 다르다.**

- **개인 블로그 · 기술 문서** — 읽히는 게 목적이다. 검색은 물론이고 AI 답변에 인용되는 경로(`ai-input`)까지 막으면 손해가 더 크다
- **뉴스 · 유료 콘텐츠 · 창작물** — 콘텐츠 자체가 상품이다. `ai-train` 은 닫는 쪽이 기본이다
- **커머스 · 사내 서비스** — 학습 가치는 낮고 부하만 남는 경우가 많다. 대량 수집형부터 골라 막는 게 낫다

결국 robots.txt 는 이제 <strong>"열까 막을까" 가 아니라 "무엇을 위해 열까" 를 정하는 파일</strong>이 됐다.


### 이 블로그는 이렇게 해 뒀다


개인 기술 블로그라 셋 다 열어 뒀다. 읽히려고 쓰는 글이라 학습까지 막을 이유는 없다고 봤다.


```plain text
User-agent: *
Allow: /

Content-Signal: search=yes, ai-input=yes, ai-train=yes

Sitemap: https://blog.plzhans.com/sitemap.xml
```

- `Allow: /` — 경로 제한은 걸지 않았다. 숨길 것 없는 사이트다
- `Content-Signal` — 검색 · AI 답변 · 학습 셋 다 `yes`
- `Sitemap:` — **의외로 이게 부하를 줄인다.** 크롤러가 사이트를 무작정 훑는 대신 목록을 보고 필요한 것만 가져가게 된다. 막는 것만 방법이 아니다

Hugo 라면 `hugo.toml` 에 `enableRobotsTXT = true` 를 켜고 `layouts/robots.txt` 에 위 내용을 두면 빌드할 때 생성된다. `sitemap.xml` 은 Hugo 가 알아서 만든다.


---


## 마무리

- robots.txt 는 원래 누가 어디를 긁어도 되는지만 적는 파일이었다. 이제는 긁어 간 것을 어디에 쓸지까지 적어야 한다.
- 봇 이름을 쪼개 막는 방식은 블랙리스트라 끝이 없다. Content-Signal 은 search · ai-input · ai-train 셋으로 줄였다.
- 개인 블로그라면 search 와 ai-input 은 열어 두는 편이 낫다. 고민할 것은 ai-train 하나다.
- robots.txt 는 끝까지 부탁이다. 강제하려면 서버에서 직접 끊어야 한다.

Cloudflare 를 쓴다면 그 일을 기능으로 지원한다.

- [Cloudflare 로 AI 봇 차단하기 - Managed robots.txt 와 AI Crawl Control](../132-cloudflare-ai-crawl-control-managed-robots-txt/) — Managed robots.txt · Block AI bots · AI Crawl Control

### 참고

- [RFC 9309 — Robots Exclusion Protocol](https://www.rfc-editor.org/rfc/rfc9309.html)
- [Content Signals Policy](https://contentsignals.org/)
- [Cloudflare 블로그 — mixed-use AI 크롤러에 책임을](https://blog.cloudflare.com/accountable-mixed-use-ai-crawlers/)
- [IETF AI Preferences (aipref) WG](https://datatracker.ietf.org/wg/aipref/about/)
