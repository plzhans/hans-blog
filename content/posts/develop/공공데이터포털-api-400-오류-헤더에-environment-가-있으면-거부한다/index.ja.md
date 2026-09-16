---
id: "130"
translationKey: "130"
slug: "130-data-go-kr-400-invalid-request-parameter-error"
title: "公共データポータル API の 400 エラー - ヘッダーに environment があると拒否される"
description: "INVALID_REQUEST_PARAMETER_ERROR はパラメータの問題ではないかもしれません。data.go.kr はヘッダー値の environment= を拒否します。"
categories:
  - "develop"
tags:
  - "datagokr"
  - "nodejs"
  - "sentry"
date: 2026-09-16T14:55:00.000Z
lastmod: 2026-09-16T14:55:00.000Z
toc: true
draft: false
images:
  - "assets/1_3dd22a0f-7e83-8111-9893-f6ccdf4c2ddc.jpg"
---


![data.go.kr の WAF がヘッダー値の environment= パターンを見てリクエストを遮断し、400 を返す様子](./assets/1_3dd22a0f-7e83-8111-9893-f6ccdf4c2ddc.jpg)


## 概要


公共データポータル（data.go.kr）の API を呼ぶバッチが、ある日から一件も成功しなくなりました。レスポンスは HTTP 400 で、メッセージは INVALID_REQUEST_PARAMETER_ERROR でした。ところが同じ URL を curl で呼ぶと 200 が返ってきます。


原因はパラメータではなくヘッダーでした。data.go.kr はヘッダー値に environment= という文字列があると拒否します。ヘッダー名は何であっても関係ありません。そのヘッダーを入れていたのは Sentry でした。分散トレーシングが、出ていくリクエストごとに baggage を載せます。


関連する内容は下のリンクを参照してください。

- [Sentry のトレースヘッダー - 出ていくすべてのリクエストに付く理由と tracePropagationTargets](../129-sentry-trace-headers-trace-propagation-targets/)

## 問題の発生


本番サーバーのバッチは、毎日未明に三つの機関の公共データを取得しています。健康保険審査評価院と国立中央医療院、そして行政安全部です。


ある日、実行履歴を開いてみると、数日間ずっとすべての実行が失敗していました。三機関への最初の呼び出しが、すべて同じステータスコードを受け取っていました。


```plain text
GET /B551182/codeInfoService/getAddrCodeList        400
GET /B552657/CodeMast/info                          400
GET /1741000/StanReginCd/getStanReginCdList         400
```


ボディはゲートウェイが作ったエラー封筒でした。


```json
{
  "OpenAPI_ServiceResponse": {
    "cmmMsgHeader": {
      "errMsg": "INVALID_REQUEST_PARAMETER_ERROR",
      "returnAuthMsg": "잘못된 요청 파라미터 에러",
      "returnReasonCode": "10"
    }
  }
}
```


公共データポータルはオープン API のエラーコードをドキュメントとして公開しています。以下はその公式案内を書き写したものです。一般エラーと認証エラーに分かれています。


| エラーメッセージ                                              | エラーコード | 説明                                                         |
| ------------------------------------------------------------ | ------ | ------------------------------------------------------------ |
| APPLICATION_ERROR                                            | 01     | GW 内部処理中に予期しないエラーが発生しました。                 |
| HTTP_ERROR                                                   | 04     | 許可されない HTTP リクエストか、機関 API のレスポンス処理に失敗しました。 |
| SERVICETIMEOUT_ERROR                                         | 05     | 機関 API または GW 連携サービスとの接続に失敗したか、応答待ち時間を超過しました。 |
| INVALID_REQUEST_PARAMETER_ERROR                              | 10     | リクエストパラメータの値または形式が正しくありません。           |
| NO_OPENAPI_SERVICE_ERROR                                     | 12     | 要求されたオープン API サービスが存在しないか廃止されました。     |
| SERVICE_KEY_IS_NULL                                          | 20     | リクエストに API 認証キーが含まれていません。                   |
| PERMISSION_DENIED                                            | 20     | GW のアクセス権限チェックでリクエストが拒否されました。         |
| LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS_ERROR             | 22     | API サービスの一日の呼び出し許容量を超過しました。               |
| LIMITED_NUMBER_OF_SERVICE_REQUESTS_PER_SECOND_EXCEEDS_ERROR  | 23     | 短時間に多くのリクエストが発生し、秒あたりの呼び出し許容量を超過しました。 |
| BLACKLIST_IP_ACCESS_ERROR                                    | 29     | 遮断された IP からの呼び出しです。                              |
| SERVICE_ACCESS_DENIED_ERROR                                  | 20     | 当該 API サービスの利用権限が確認できません。（認証エラー）       |
| SERVICE_KEY_IS_NOT_REGISTERED_ERROR                          | 30     | 登録されていない API 認証キーです。（認証エラー）                |
| DEADLINE_HAS_EXPIRED_ERROR                                   | 31     | API 認証キーの使用期限が切れています。（認証エラー）             |


表を性格ごとにまとめると三つになります。01 と 04、05 と 23 は一時的な問題なので再度呼び出せば済みます。20 と 29、30 と 31 は人が手を入れるべき問題です。22 は上限を使い切ったので翌日を待つことになります。


私たちが受け取った 10 はそのどちらでもありません。私たちが送ったリクエストが間違っているという意味です。


## 原因分析


### 開発では起きなかった


まず目についたのは、開発環境が問題なく動いているという事実でした。同じコードと同じ認証キーで回る開発バッチは、同じ API を呼んで何の問題もなく取得できていました。二つの環境は同じホスト上でコンテナとして動いています。


実行記録を突き合わせてみると、二つの環境は同じ時刻に開始していました。片方は一時間近く正常に取得し、もう片方は最初のリクエストで落ちていました。ポータルのメンテナンスや障害ならこうはなりません。原因はリクエストを送る側にあります。


### 違いは Sentry


二つの環境の設定を洗い出していきました。認証キーも同じ、コードも同じ、出ていくネットワーク経路も同じです。最後まで残った違いは一つでした。本番だけ Sentry が有効になっていたのです。


エラー収集ツールが API 呼び出しを妨げるというのはすぐには結びつきませんでしたが、他に候補がありません。念のため Sentry を切った状態でバッチを回してみました。すぐに通りました。


原因はつかんだものの理由が分からない状態になりました。Sentry は何を妨げているのか。


### 実際に出ていったリクエストを見る


アプリが呼ぶと失敗し、人が同じサーバーから呼ぶと成功します。であれば違いはリクエストそのものにあります。アプリと同じサーバーから、同じ URL をそのまま一度投げてみました。


```bash
curl -s -w '\n%{http_code}\n' -H 'Accept: application/json' \
  "https://apis.data.go.kr/B551182/codeInfoService/getAddrCodeList?pageNo=1&numOfRows=10&ServiceKey=$KEY&_type=json"
```


200 が返ってきました。ネットワークでも認証キーでも DNS でもありません。残るのは、アプリが送るリクエストと curl が送るリクエストの違いだけです。


残ったのは、アプリが実際に何を送っているのかを見ることです。一時サーバーを立て、Sentry を有効にしたプロセスからリクエストを送り、受け取ったヘッダーをそのまま出力してみました。


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


私たちのコードが渡したヘッダーは Accept 一つだけです。下の二行は Sentry が載せたものです。アプリのコードのどこにもこの行はありません。


付け加えると、このヘッダーは本来、分散トレーシングのためのものです。リクエストが複数のサービスを経由するとき、その道のりを一つにまとめるために trace_id を運びます。baggage は W3C が定めた標準ヘッダーで、Sentry はそこに環境やリリースといった値を入れます。


問題は、その有用性が自分たちのサービス同士の間でしか成り立たないことです。公共データポータルが私たちの trace_id を受け取っても使い道はありません。ところがサーバー SDK のデフォルトは、出ていくリクエストすべてに付ける側なので、他所の API にもそのまま出ていきます。


## どの値が引っかかるのか


このヘッダーを curl にそのまま付けて送ると 400 が再現しました。値を一つずつ外しながら範囲を狭めていくと、結論は単純でした。


```plain text
baggage: sentry-environment=production   400
baggage: sentry-environment=develop      400   value does not matter
baggage: environment=production          400   prefix does not matter
baggage: foo=production                  200
baggage: x=environment                   200
x-test:  environment=production          400   header name does not matter
```


ヘッダー値に environment= という文字列があると拒否されます。ヘッダー名も値も長さも関係ありません。WAF がパラメータインジェクションの試みとみなすパターンです。


もう一つ押さえておくべきことがあります。tracesSampleRate が 0 でもこのヘッダーは付きます。サンプルから除外するという印を付けたうえで、そのまま伝播させるからです。トレーシングを切ったから関係ないという推測は当たりません。


## 対応


送らなければ済みます。ヘッダー値に environment= がなければそのまま通ります。


Sentry が原因なら、tracePropagationTargets でトレースヘッダーを付ける対象を絞れば済みます。設定方法は下のリンクにあります。

- [Sentry のトレースヘッダー - 出ていくすべてのリクエストに付く理由と tracePropagationTargets](../129-sentry-trace-headers-trace-propagation-targets/) — tracePropagationTargets の設定

## まとめ


エラーメッセージが指す場所に原因がないことがあります。ゲートウェイはパラメータが間違っていると言いましたが、パラメータは最初から正常でした。メッセージを信じてクエリ文字列だけを眺めていては、いつまでも見つかりません。


環境の比較は条件を揃えてこそ役に立ちます。開発が問題なく見えたのは、呼び出しを飛ばしていたからです。実際に処理が行われた実行だけを数えるべきです。


惜しい点も一つ残ります。公共データポータルは機関向けの API なので、リクエストを保守的に検査するのは正しい判断です。その判断自体を責めるつもりはありません。


ただ、引っかかったのが baggage でした。このヘッダーは誰かが勝手に作ったものではなく W3C が定めた標準で、Sentry や OpenTelemetry のように広く使われるツールがデフォルトで付けます。観測ツールを入れたサーバーならどこからでも出ていく値です。標準ヘッダーを値の形だけ見て塞ぐと、まともなクライアントが理由も分からずに壊れます。


返ってくるエラーがリクエストパラメータの誤りだというメッセージなのも惜しいところです。実際に引っかかったのはヘッダーなのに、パラメータを指すことで人を原因から遠ざけてしまいます。パラメータ検査はクエリとボディにだけ行い、標準ヘッダーは通してくれるとよいと思います。どうしても塞ぐのであれば、何が引っかかったのかくらいは教えてくれると助かります。
