---
id: "129"
translationKey: "129"
slug: "129-sentry-trace-headers-trace-propagation-targets"
title: "Sentry のトレースヘッダー - 出ていくすべてのリクエストに付く理由と tracePropagationTargets"
description: "Sentry は出ていくすべてのリクエストに sentry-trace と baggage を付けます。なぜ付くのかと、tracePropagationTargets で絞る方法。"
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


![アプリが外部 API へ送る HTTP リクエストの流れの途中に Sentry が割り込み、baggage ヘッダーを注入する様子](./assets/1_3dd22a0f-7e83-81f2-a997-f8cc7e65a827.jpg)


## 概要


Sentry を有効にすると、エラー収集だけが付いてくるわけではありません。分散トレーシングも一緒に有効になり、そのときから出ていくすべてのリクエストにトレースヘッダーが付きます。


アプリのコードにはそんな行はありません。ログにも残りません。ですから問題が起きても、コードをいくら読んでも見えません。


この記事では、そのヘッダーが何なのか、どう確認するのか、そして付く範囲をどう絞るのかを整理します。


エラーやバグを追跡する用途で Sentry を使っているところは多いです。アプリケーションで発生した例外を集め、いつどこで何回起きたのかを見せてくれるツールです。数行入れるだけで組み込めて、言語やフレームワークを選ばないため、標準で入れておくケースがよくあります。

- [Sentry Docs - Sentry Basics](https://docs.sentry.io/product/sentry-basics/)

ヘッダーを付けている側はエラー収集ではありません。Sentry を有効にすると分散トレーシングが一緒に付いてきます。出ていくリクエストごとにヘッダーを載せているのはそちらです。


## 何のための機能なのか


このヘッダーは分散トレーシングのためのものです。一つのリクエストが複数のサービスを経由するとき、その道のりを一つにまとめて見るために存在します。


サービス A が B を呼び、B がさらに C を呼ぶとします。ヘッダーがなければ三つはそれぞれ別々に記録を残します。A のレスポンスが遅かったことは分かっても、その原因が C だったことは分かりません。ヘッダーが trace_id を運ぶと、三つの記録が同じトレースにまとまります。


Sentry のドキュメントは目的をこう書いています。

> track software performance and measure throughput & latency, while seeing the impact of errors across multiple systems

二つのヘッダーの役割は異なります。

- sentry-trace は位置を指します。<trace_id>-<span_id>-<sampled> の形です。このリクエストがどのトレースのどの地点なのかを教えます。
- baggage は文脈を運びます。W3C が定めた標準ヘッダーで、Sentry はここに動的サンプリングで使う値を入れます。sentry-environment や sentry-release といったものです。

```plain text
sentry-trace: 41c74c2ea9f2bfb184f86939de5b97aa-399b3e5cc8b83494-1
baggage:      sentry-trace_id=41c74c2ea9f2bfb184f86939de5b97aa,
              sentry-environment=production,
              sentry-release=1.4.2,
              sentry-sample_rate=0.2
```


サンプリングの判断を先頭のサービスで下し、後ろへ渡すのも baggage の仕事です。

> a sampling decision is made in the originating service and passed to subsequent services

先頭で捨てたトレースを後ろで記録してしまうと、半端な記録が残ります。ですから判断を値に載せて一緒に送ります。


### サーバーが一つなら不要ではないか


受け取る側がなければ意味がありません。ここでいう受け取る側とは、同じ Sentry 組織へデータを送るサービスのことです。


ただし、サーバーが一つでも役に立つ場合はあります。ブラウザに Sentry を入れているなら、フロントエンドとバックエンドですでに二つです。キューやワーカーを経由する処理も同じです。


逆に、他所のサービスへ出ていくリクエストにはほとんどの場合、役に立ちません。公共データポータルが私たちの trace_id を受け取っても使い道はありません。ところがサーバー SDK のデフォルトは、出ていくリクエストすべてに付ける側です。後で扱う tracePropagationTargets が、そのデフォルトを絞るための道具です。


## 何が出ていくのか


何が出ていくのかを確認するには、受け取る側を自分で作ればよいです。一時サーバーを一つ立て、Sentry を有効にしたプロセスからそのサーバーへリクエストを送り、受け取ったヘッダーをそのまま出力します。


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


node print-headers.js で動かすとこうなります。


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


私たちのコードが渡したヘッダーは Accept 一つだけです。下の二行は Sentry が載せたものです。Sentry は初期化するときに HTTP レイヤーを包み、それ以降に出ていくすべてのリクエストへトレースヘッダーを付けます。アプリのコードのどこにもこの行はありません。


## どうやって付くのか


コードにヘッダーを入れる行がないのに、ヘッダーが出ていきます。それを可能にする仕組みはプラットフォームごとに異なります。三つを比べてみると、こうしたことがなぜ Node で特に見つけにくいのかが分かります。


### Node.js・NestJS — モジュールをすり替える


Sentry Node SDK はモジュールローダーにフックをかけます。CommonJS なら require-in-the-middle、ESM なら import-in-the-middle です。公式ドキュメントはこう書いています。

> all packages are wrapped under the hood by import-in-the-middle to aid instrumenting them

ですからコードが http を読み込むと、返ってくるのは本物ではなく Sentry が包んだ http です。呼び出し側はそのままなのに、http.request はすでに別の関数です。ヘッダーはその中で付きます。


Sentry.init() を他の import より先に置けと言われる理由がこれです。すでに読み込まれたモジュールはフックが捕まえられません。registerEsmLoaderHooks を false にすると、フックと一緒にトレーシングの計装も切れます。


NestJS も同じ方式です。instrument.ts に Sentry.init() を入れ、main.ts の先頭で先に読み込みます。ドキュメントのコメントがその順序を明言しています。


```typescript
// Import this first!
import "./instrument";

// Now import other modules
import { NestFactory } from "@nestjs/core";
```


登録地点がコードのどこにもありません。コードをいくら読んでもヘッダーが見えない理由です。


### Java — フレームワークのインターセプターまたはバイトコード注入


基本は、フレームワークがもともと用意している場所に割り込む方式です。Spring と Spring Boot は統合を有効にしておけば、出ていくリクエストに自動で付きます。

> The Java SDK will attach the sentry-trace and baggage headers to all outgoing requests by default.

ただし、すべてのクライアントが自動というわけではありません。OkHttp はインターセプターを自分で付けます。


```kotlin
private val client = OkHttpClient.Builder()
  .addInterceptor(SentryOkHttpInterceptor())
  .eventListener(SentryOkHttpEventListener())
  .build()
```


コードに手を入れない道もあります。sentry-opentelemetry-agent を -javaagent で付ける方式です。


```shell
java -javaagent:/path/to/sentry-opentelemetry-agent.jar -jar app.jar
```


ドキュメントはエージェントの仕事をこう書いています。

> dynamically injects bytecode into your application / Inject tracing information into outgoing requests and produced messages

エージェントを使うと、Node と同じくコードに痕跡が残りません。代わりに実行コマンドに -javaagent が見えます。


### .NET — HttpClient のパイプラインにハンドラーを挟む


SentryHttpMessageHandler という DelegatingHandler を HttpClient のハンドラーチェーンに入れます。リクエストがそのハンドラーを通るときにヘッダーが付きます。


挟む作業は DI が代わりにやります。SDK が IHttpMessageHandlerBuilderFilter の実装をシングルトンとして登録しておきます。


```c#
// Sentry.Extensions.Logging/Extensions/DependencyInjection/ServiceCollectionExtensions.cs
services.AddSingleton<IHttpMessageHandlerBuilderFilter, SentryHttpMessageHandlerBuilderFilter>();
```


そのフィルターが、IHttpClientFactory で作られるすべての HttpClient にハンドラーを入れます。


```c#
// Injects Sentry's HTTP handler into HttpClientFactory
handlerBuilder.AdditionalHandlers.Add(
    new SentryHttpMessageHandler(hub)
);
```


ですから IHttpClientFactory から受け取ったクライアントは自動で、new HttpClient() で自分で作ったものには付きません。DisableSentryHttpMessageHandler オプションで切ることができます。


### まとめ


Node だけは標準モジュールそのものが入れ替わります。残りは、誰かがパイプラインに入れたという痕跡がどこかに残ります。依存関係であれ DI 登録であれ実行コマンドであれ、たどる手がかりがあります。


付き方は違っても結果は同じです。出ていくリクエストに sentry-trace と baggage が載ります。そして三つとも tracePropagationTargets で対象を絞ることができます。


### 参考

- [Sentry Docs - Node ESM のインストールとローダーフック](https://docs.sentry.io/platforms/javascript/guides/node/install/esm/)
- [Sentry Docs - NestJS](https://docs.sentry.io/platforms/javascript/guides/nestjs/)
- [Sentry Docs - Java Trace Propagation](https://docs.sentry.io/platforms/java/tracing/trace-propagation/)
- [Sentry Docs - Java OkHttp Integration](https://docs.sentry.io/platforms/java/tracing/instrumentation/okhttp/)
- [Sentry Docs - Java OpenTelemetry Agent](https://docs.sentry.io/platforms/java/opentelemetry/setup/agent/)
- [sentry-dotnet - SentryHttpMessageHandlerBuilderFilter.cs](https://github.com/getsentry/sentry-dotnet/blob/main/src/Sentry.Extensions.Logging/SentryHttpMessageHandlerBuilderFilter.cs)

## トレーシングを切っても付く


もう一つ押さえておくべきことがあります。tracesSampleRate が 0 でもこのヘッダーは付きます。サンプルから除外するという印を付けたうえで、そのまま伝播させるからです。トレーシングを切ったから関係ないという推測は当たりません。


## 付ける対象を絞る


Sentry を切る話ではありません。トレースヘッダーを付ける対象を絞れば済みます。tracePropagationTargets オプションがその仕事をします。


公式ドキュメントはサーバーでのデフォルトをこう書いています。

> On the server, all outgoing requests will be propagated by default.
- [Sentry Docs - Distributed Tracing: Trace Propagation](https://docs.sentry.io/platforms/javascript/guides/node/tracing/trace-propagation/)
- [Sentry Docs - Configuration Options: tracePropagationTargets](https://docs.sentry.io/platforms/javascript/guides/node/configuration/options/#tracePropagationTargets)

リストを渡せば、それに合うアドレスにだけヘッダーが付きます。自分のドメインとローカルだけ入れれば十分です。


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


正規表現は前後を固定する必要があります。緩いままにしておくと、アドレスの一部がかすっただけで引っかかります。https://example.com/?ref=plzhans.com のようなアドレスがそうです。


適用したあとは、先ほどの print-headers.js でもう一度確認します。対象リストにないアドレスへ送ると、sentry-trace と baggage が消えます。


エラー収集には影響しません。このオプションはトレースヘッダーだけを扱うので、captureException はそのまま動きます。


## まとめ


計装ツールはリクエストを静かに書き換えます。コードにはヘッダーが一行しか見えないのに、線の上には三行が出ていきます。その事実がログに残らないので、コードをいくら読んでも見えません。何が出ていくのか気になるなら、受け取る側を自分で作って出力してみるのが一番早いです。


外部 API を呼ぶサーバーで Sentry を有効にするなら、tracePropagationTargets も一緒に設定するほうがよいです。こうした事故を防ぐのはもちろん、デプロイのバージョンやコミットハッシュが他所のサーバーへ出ていくのも一緒に防いでくれます。


このヘッダーのせいで外部 API がリクエストを丸ごと拒否した事例があります。下のリンクにまとめました。

- [公共データポータル API の 400 エラー - ヘッダーに environment があると拒否される](../130-data-go-kr-400-invalid-request-parameter-error/) — 公共データポータルが environment= を拒否した事例
