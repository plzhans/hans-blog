---
id: "129"
translationKey: "129"
slug: "129-sentry-trace-headers-trace-propagation-targets"
title: "Sentry 추적 헤더 - 나가는 모든 요청에 붙는 이유와 tracePropagationTargets"
description: "Sentry 는 나가는 모든 요청에 sentry-trace 와 baggage 를 붙인다. 왜 붙는지와 tracePropagationTargets 로 좁히는 방법."
categories:
  - "develop"
tags:
  - "nodejs"
  - "sentry"
date: 2026-09-16T14:55:00.000Z
lastmod: 2026-09-16T14:55:00.000Z
toc: true
draft: false
images:
  - "assets/1_3dd22a0f-7e83-81f2-a997-f8cc7e65a827.jpg"
---


![앱이 외부 API 로 보내는 HTTP 요청 흐름 중간에 Sentry 가 끼어들어 baggage 헤더를 주입하는 모습](./assets/1_3dd22a0f-7e83-81f2-a997-f8cc7e65a827.jpg)


## 개요


Sentry 를 켜면 오류 수집만 따라오는 것이 아니다. 분산 추적이 같이 켜지고 그때부터 나가는 모든 요청에 추적 헤더가 붙는다.


앱 코드에는 그런 줄이 없다. 로그에도 남지 않는다. 그래서 문제가 생겨도 코드를 아무리 읽어도 보이지 않는다.


이 글은 그 헤더가 무엇인지와 어떻게 확인하는지 그리고 붙는 범위를 어떻게 좁히는지 정리한다.


오류와 버그를 추적하는 용도로 Sentry 를 쓰는 곳이 많다. 애플리케이션에서 터진 예외를 모아 언제 어디서 몇 번 났는지 보여 주는 도구다. 몇 줄만 넣으면 붙고 언어와 프레임워크를 가리지 않아 기본으로 깔아 두는 경우가 흔하다.

- [Sentry Docs - Sentry Basics](https://docs.sentry.io/product/sentry-basics/)

헤더를 붙이는 쪽은 오류 수집이 아니다. Sentry 를 켜면 분산 추적이 같이 따라온다. 나가는 요청마다 헤더를 얹는 것은 그쪽이다.


## 무엇에 쓰는 기능인가


이 헤더는 분산 추적을 위한 것이다. 요청 하나가 여러 서비스를 거칠 때 그 여정을 하나로 묶어 보려고 존재한다.


서비스 A 가 B 를 부르고 B 가 다시 C 를 부른다고 하자. 헤더가 없으면 셋은 각자 따로 기록을 남긴다. A 의 응답이 느렸다는 것은 알아도 그 원인이 C 였다는 것은 알 수 없다. 헤더가 trace_id 를 실어 나르면 셋의 기록이 같은 추적으로 합쳐진다.


Sentry 문서는 목적을 이렇게 적는다.

> track software performance and measure throughput & latency, while seeing the impact of errors across multiple systems

두 헤더의 역할은 다르다.

- sentry-trace 는 위치를 가리킨다. <trace_id>-<span_id>-<sampled> 형태다. 이 요청이 어느 추적의 어느 지점인지 알려 준다.
- baggage 는 맥락을 나른다. W3C 가 정한 표준 헤더이고 Sentry 는 여기에 동적 샘플링에 쓸 값을 담는다. sentry-environment 와 sentry-release 같은 것들이다.

```plain text
sentry-trace: 41c74c2ea9f2bfb184f86939de5b97aa-399b3e5cc8b83494-1
baggage:      sentry-trace_id=41c74c2ea9f2bfb184f86939de5b97aa,
              sentry-environment=production,
              sentry-release=1.4.2,
              sentry-sample_rate=0.2
```


샘플링 결정을 맨 앞 서비스에서 내려 뒤로 넘기는 것도 baggage 가 하는 일이다.

> a sampling decision is made in the originating service and passed to subsequent services

앞에서 버린 추적을 뒤에서 기록하면 반쪽짜리 기록이 남는다. 그래서 결정을 값에 실어 함께 보낸다.


### 서버가 하나면 필요 없지 않나


받는 쪽이 없으면 의미가 없다. 여기서 받는 쪽이란 같은 Sentry 조직으로 데이터를 보내는 서비스다.


다만 서버가 하나여도 쓸모가 있는 경우가 있다. 브라우저에 Sentry 를 넣었다면 프론트엔드와 백엔드가 이미 둘이다. 큐나 워커를 거치는 작업도 마찬가지다.


반대로 남의 서비스로 나가는 요청에는 거의 언제나 쓸모가 없다. 공공데이터포털이 우리 trace_id 를 받아 봐야 할 일이 없다. 그런데 서버 SDK 의 기본값은 나가는 요청 전부에 붙이는 쪽이다. 뒤에서 다루는 tracePropagationTargets 가 그 기본값을 좁히는 도구다.


## 무엇이 나가는가


무엇이 나가는지 확인하려면 받는 쪽을 직접 만들면 된다. 임시 서버를 하나 띄우고 Sentry 를 켠 프로세스에서 그 서버로 요청을 보내 받은 헤더를 그대로 찍는다.


```javascript
// print-headers.js
const Sentry = require('@sentry/node');
const http = require('http');

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: 'production',
  release: '1.4.2',
  tracesSampleRate: 0,
});

// A throwaway server that prints whatever reaches it.
const server = http.createServer((req, res) => {
  console.log(req.headers);
  res.end('ok');
  server.close();
});

server.listen(0, '127.0.0.1', () => {
  const { port } = server.address();
  fetch(`http://127.0.0.1:${port}/`, { headers: { Accept: 'application/json' } });
});
```


node print-headers.js 로 돌리면 이렇게 나온다.


```plain text
accept: application/json

sentry-trace: 6406c1516309404d89d3d094f704f600-8cb266148716b50a
baggage: sentry-environment=production,
         sentry-release=<release>,
         sentry-public_key=<public key>,
         sentry-trace_id=6406c1516309404d89d3d094f704f600,
         sentry-org_id=<org id>,
         sentry-sample_rand=0.730917246418646
```


우리 코드가 넘긴 헤더는 Accept 하나였다. 아래 두 줄은 Sentry 가 얹은 것이다. Sentry 는 초기화할 때 HTTP 계층을 감싸고 그 뒤로 나가는 모든 요청에 추적 헤더를 붙인다. 앱 코드 어디에도 이 줄은 없다.


## 어떻게 붙는가


코드에 헤더를 넣는 줄이 없는데 헤더가 나간다. 그것을 가능하게 하는 방식은 플랫폼마다 다르다. 셋을 비교해 보면 이런 일이 왜 Node 에서 특히 찾기 어려운지 드러난다.


### Node.js · NestJS — 모듈을 바꿔치기한다


Sentry Node SDK 는 모듈 로더에 훅을 건다. CommonJS 면 require-in-the-middle 이고 ESM 이면 import-in-the-middle 이다. 공식 문서는 이렇게 적고 있다.

> all packages are wrapped under the hood by import-in-the-middle to aid instrumenting them

그래서 코드가 http 를 불러오면 원본이 아니라 Sentry 가 감싼 http 가 돌아온다. 호출부는 그대로인데 http.request 가 이미 다른 함수다. 헤더는 그 안에서 붙는다.


Sentry.init() 을 다른 import 보다 먼저 두라는 이유가 이것이다. 이미 로드된 모듈은 훅이 잡을 수 없다. registerEsmLoaderHooks 를 false 로 두면 훅과 함께 추적 계측도 같이 꺼진다.


NestJS 도 같은 방식이다. instrument.ts 에 Sentry.init() 을 넣고 main.ts 맨 위에서 먼저 불러온다. 문서의 주석이 그 순서를 못박는다.


```typescript
// Import this first!
import "./instrument";

// Now import other modules
import { NestFactory } from "@nestjs/core";
```


등록 지점이 코드 어디에도 없다. 코드를 아무리 읽어도 헤더가 보이지 않는 이유다.


### Java — 프레임워크 인터셉터 또는 바이트코드 주입


기본은 프레임워크가 원래 제공하는 자리에 끼어드는 방식이다. Spring 과 Spring Boot 는 통합을 켜 두면 나가는 요청에 자동으로 붙는다.

> The Java SDK will attach the sentry-trace and baggage headers to all outgoing requests by default.

다만 모든 클라이언트가 자동은 아니다. OkHttp 는 인터셉터를 직접 단다.


```kotlin
private val client = OkHttpClient.Builder()
  .addInterceptor(SentryOkHttpInterceptor())
  .eventListener(SentryOkHttpEventListener())
  .build()
```


코드를 건드리지 않는 길도 있다. sentry-opentelemetry-agent 를 -javaagent 로 붙이는 방식이다.


```shell
java -javaagent:/path/to/sentry-opentelemetry-agent.jar -jar app.jar
```


문서는 에이전트가 하는 일을 이렇게 적는다.

> dynamically injects bytecode into your application / Inject tracing information into outgoing requests and produced messages

에이전트를 쓰면 Node 처럼 코드에 흔적이 남지 않는다. 대신 실행 명령에 -javaagent 가 보인다.


### .NET — HttpClient 파이프라인에 핸들러를 끼운다


SentryHttpMessageHandler 라는 DelegatingHandler 를 HttpClient 의 핸들러 체인에 넣는다. 요청이 그 핸들러를 지날 때 헤더가 붙는다.


끼우는 일은 DI 가 대신한다. SDK 가 IHttpMessageHandlerBuilderFilter 구현체를 싱글턴으로 등록해 둔다.


```c#
// Sentry.Extensions.Logging/Extensions/DependencyInjection/ServiceCollectionExtensions.cs
services.AddSingleton<IHttpMessageHandlerBuilderFilter, SentryHttpMessageHandlerBuilderFilter>();
```


그 필터가 IHttpClientFactory 로 만들어지는 모든 HttpClient 에 핸들러를 넣는다.


```c#
// Injects Sentry's HTTP handler into HttpClientFactory
handlerBuilder.AdditionalHandlers.Add(
    new SentryHttpMessageHandler(hub)
);
```


그래서 IHttpClientFactory 로 받은 클라이언트는 자동이고 new HttpClient() 로 직접 만든 것은 붙지 않는다. DisableSentryHttpMessageHandler 옵션으로 끌 수 있다.


### 정리


Node 만 표준 모듈 자체가 바뀐다. 나머지는 누군가 파이프라인에 넣었다는 흔적이 어딘가 남는다. 의존성이든 DI 등록이든 실행 명령이든 찾아갈 실마리가 있다.


붙는 방식은 달라도 결과는 같다. 나가는 요청에 sentry-trace 와 baggage 가 실린다. 그리고 셋 다 tracePropagationTargets 로 대상을 좁힐 수 있다.


### 참고

- [Sentry Docs - Node ESM 설치와 로더 훅](https://docs.sentry.io/platforms/javascript/guides/node/install/esm/)
- [Sentry Docs - NestJS](https://docs.sentry.io/platforms/javascript/guides/nestjs/)
- [Sentry Docs - Java Trace Propagation](https://docs.sentry.io/platforms/java/tracing/trace-propagation/)
- [Sentry Docs - Java OkHttp Integration](https://docs.sentry.io/platforms/java/tracing/instrumentation/okhttp/)
- [Sentry Docs - Java OpenTelemetry Agent](https://docs.sentry.io/platforms/java/opentelemetry/setup/agent/)
- [sentry-dotnet - SentryHttpMessageHandlerBuilderFilter.cs](https://github.com/getsentry/sentry-dotnet/blob/main/src/Sentry.Extensions.Logging/SentryHttpMessageHandlerBuilderFilter.cs)

## 추적을 꺼도 붙는다


짚고 넘어갈 것이 하나 더 있다. tracesSampleRate 가 0 이어도 이 헤더는 붙는다. 표본에서 제외한다는 표시를 달아 그대로 전파하기 때문이다. 추적을 껐으니 상관없다는 짐작은 맞지 않는다.


## 붙일 대상을 좁힌다


Sentry 를 끌 일은 아니다. 추적 헤더를 붙일 대상을 좁히면 된다. tracePropagationTargets 옵션이 그 일을 한다.


공식 문서는 서버에서의 기본값을 이렇게 적고 있다.

> On the server, all outgoing requests will be propagated by default.
- [Sentry Docs - Distributed Tracing: Trace Propagation](https://docs.sentry.io/platforms/javascript/guides/node/tracing/trace-propagation/)
- [Sentry Docs - Configuration Options: tracePropagationTargets](https://docs.sentry.io/platforms/javascript/guides/node/configuration/options/#tracePropagationTargets)

목록을 주면 거기에 맞는 주소에만 헤더가 붙는다. 우리 도메인과 로컬만 담으면 된다.


```typescript
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: 'production',
  release: '1.4.2',
  tracesSampleRate: 0,
  // Without this the SDK attaches trace headers to every outgoing request.
  tracePropagationTargets: [
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//,
    /^https?:\/\/([a-z0-9-]+\.)*plzhans\.com(:\d+)?\//,
  ],
});
```


정규식은 앞뒤를 고정해야 한다. 느슨하게 두면 주소 일부만 스쳐도 걸린다. https://example.com/?ref=plzhans.com 같은 주소가 그렇다.


적용한 뒤에는 앞의 print-headers.js 로 다시 확인한다. 대상 목록에 없는 주소로 보내면 sentry-trace 와 baggage 가 사라진다.


오류 수집에는 영향이 없다. 이 옵션은 추적 헤더만 다루므로 captureException 은 그대로 동작한다.


## 마무리


계측 도구는 요청을 조용히 바꾼다. 코드에는 헤더 한 줄만 보이는데 선에는 세 줄이 나간다. 그 사실이 로그에 남지 않으므로 코드를 아무리 읽어도 보이지 않는다. 무엇이 나가는지 궁금하면 받는 쪽을 직접 만들어 찍어 보는 것이 가장 빠르다.


외부 API 를 부르는 서버에 Sentry 를 켠다면 tracePropagationTargets 을 함께 설정하는 편이 낫다. 이런 사고를 막는 것은 물론이고 배포 버전과 커밋 해시가 남의 서버로 나가는 것도 함께 막아 준다.


이 헤더 때문에 외부 API 가 요청을 통째로 거부한 사례가 있다. 아래 링크에 정리했다.

- [공공데이터포털 API 400 오류 - 헤더에 environment 가 있으면 거부한다](../130-data-go-kr-400-invalid-request-parameter-error/) — 공공데이터포털이 environment= 을 거부한 사례
