---
id: "130"
translationKey: "130"
slug: "130-data-go-kr-400-invalid-request-parameter-error"
title: "공공데이터포털 API 400 오류 - 헤더에 environment 가 있으면 거부한다"
description: "INVALID_REQUEST_PARAMETER_ERROR 는 파라미터 문제가 아닐 수 있다. data.go.kr 은 헤더 값의 environment= 을 거부한다."
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


![data.go.kr 의 WAF 가 헤더 값의 environment= 패턴을 보고 요청을 차단해 400 을 돌려주는 모습](./assets/1_3dd22a0f-7e83-8111-9893-f6ccdf4c2ddc.jpg)


## 개요


공공데이터포털(data.go.kr) API 를 부르는 배치가 어느 날부터 한 건도 성공하지 못했다. 응답은 HTTP 400 이고 메시지는 INVALID_REQUEST_PARAMETER_ERROR 였다. 그런데 같은 URL 을 curl 로 부르면 200 이 돌아왔다.


원인은 파라미터가 아니라 헤더였다. data.go.kr 은 헤더 값에 environment= 이라는 문자열이 있으면 거부한다. 헤더 이름은 무엇이든 상관이 없다. 그 헤더를 넣은 것은 Sentry 였다. 분산 추적이 나가는 요청마다 baggage 를 얹는다.


관련 내용은 아래 링크를 참조하면 된다.

- [Sentry 추적 헤더 - 나가는 모든 요청에 붙는 이유와 tracePropagationTargets](../129-sentry-trace-headers-trace-propagation-targets/)

## 문제 발생


운영 서버의 배치는 매일 새벽에 세 기관의 공공데이터를 받아 온다. 건강보험심사평가원과 국립중앙의료원 그리고 행정안전부다.


어느 날 실행 이력을 열어 보니 며칠 내내 모든 실행이 실패해 있었다. 세 기관의 첫 호출이 모두 같은 상태코드를 받았다.


```plain text
GET /B551182/codeInfoService/getAddrCodeList        400
GET /B552657/CodeMast/info                          400
GET /1741000/StanReginCd/getStanReginCdList         400
```


본문은 게이트웨이가 만든 오류 봉투였다.


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


공공데이터포털은 오픈API 에러코드를 문서로 공개한다. 아래는 그 공식 안내를 옮긴 것이다. 일반 에러와 인증 에러로 나뉘어 있다.


| 에러메시지                                                       | 에러코드 | 설명                                               |
| ----------------------------------------------------------- | ---- | ------------------------------------------------ |
| APPLICATION_ERROR                                           | 01   | GW 내부 처리 중 예기치 않은 오류가 발생했습니다.                    |
| HTTP_ERROR                                                  | 04   | 허용되지 않은 HTTP 요청이거나 기관 API 응답 처리에 실패했습니다.         |
| SERVICETIMEOUT_ERROR                                        | 05   | 기관 API 또는 GW 연계 서비스와의 연결에 실패했거나 응답 대기시간을 초과했습니다. |
| INVALID_REQUEST_PARAMETER_ERROR                             | 10   | 요청 파라미터의 값이나 형식이 올바르지 않습니다.                      |
| NO_OPENAPI_SERVICE_ERROR                                    | 12   | 요청한 오픈API 서비스가 존재하지 않거나 폐기되었습니다.                 |
| SERVICE_KEY_IS_NULL                                         | 20   | 요청에 API 인증키가 포함되지 않았습니다.                         |
| PERMISSION_DENIED                                           | 20   | GW 접근 권한 검사에서 요청이 거부되었습니다.                       |
| LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS_ERROR            | 22   | API 서비스의 일일 호출 허용량을 초과했습니다.                      |
| LIMITED_NUMBER_OF_SERVICE_REQUESTS_PER_SECOND_EXCEEDS_ERROR | 23   | 짧은 시간에 많은 요청이 발생하여 초당 호출 허용량을 초과했습니다.            |
| BLACKLIST_IP_ACCESS_ERROR                                   | 29   | 차단된 IP에서 호출한 요청입니다.                              |
| SERVICE_ACCESS_DENIED_ERROR                                 | 20   | 해당 API 서비스에 대한 이용 권한이 확인되지 않습니다. (인증 에러)         |
| SERVICE_KEY_IS_NOT_REGISTERED_ERROR                         | 30   | 등록되지 않은 API 인증키입니다. (인증 에러)                      |
| DEADLINE_HAS_EXPIRED_ERROR                                  | 31   | API 인증키의 사용 기한이 만료되었습니다. (인증 에러)                 |


표를 성격별로 묶으면 셋이다. 01 과 04 그리고 05 와 23 은 일시적인 문제이므로 다시 호출하면 된다. 20 과 29 그리고 30 과 31 은 사람이 손대야 하는 문제다. 22 는 한도를 다 쓴 것이라 다음 날을 기다려야 한다.


우리가 받은 10 은 그 어느 쪽도 아니다. 우리가 보낸 요청이 잘못됐다는 뜻이다.


## 원인 분석


### 개발에서는 나지 않았다


먼저 눈에 띈 것은 개발 환경이 멀쩡하다는 사실이었다. 같은 코드와 같은 인증키로 도는 개발 배치는 같은 API 를 불러 아무 문제 없이 받아 오고 있었다. 두 환경은 같은 호스트에서 컨테이너로 돈다.


실행 기록을 맞춰 보니 두 환경은 같은 시각에 시작했다. 한쪽은 한 시간 가까이 정상으로 받아 왔고 다른 쪽은 첫 요청에서 죽었다. 포털 점검이나 장애라면 나올 수 없는 그림이다. 원인은 요청을 보내는 쪽에 있다.


### 차이는 Sentry


두 환경의 설정을 훑어 나갔다. 인증키도 같고 코드도 같고 나가는 네트워크 경로도 같았다. 끝까지 남은 차이는 하나였다. 운영에만 Sentry 가 켜져 있었다.


오류 수집 도구가 API 호출을 막는다는 것이 선뜻 연결되지 않았지만 다른 후보가 없었다. 혹시나 하고 Sentry 를 끈 채로 배치를 돌렸다. 바로 통과했다.


원인은 잡았는데 이유를 모르는 상태가 됐다. Sentry 가 무엇을 방해하는가.


### 실제로 나간 요청을 본다


앱이 부르면 실패하고 사람이 같은 서버에서 부르면 성공한다. 그렇다면 차이는 요청 그 자체에 있다. 앱과 같은 서버에서 같은 URL 을 그대로 한 번 쏴 봤다.


```bash
curl -s -w '\n%{http_code}\n' -H 'Accept: application/json' \
  "https://apis.data.go.kr/B551182/codeInfoService/getAddrCodeList?pageNo=1&numOfRows=10&ServiceKey=$KEY&_type=json"
```


200 이 돌아왔다. 네트워크도 인증키도 DNS 도 아니었다. 남은 것은 앱이 보내는 요청과 curl 이 보내는 요청의 차이뿐이다.


남은 것은 앱이 실제로 무엇을 보내는지 보는 일이다. 임시 서버를 띄우고 Sentry 를 켠 프로세스에서 요청을 보내 받은 헤더를 그대로 찍어 봤다.


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


우리 코드가 넘긴 헤더는 Accept 하나였다. 아래 두 줄은 Sentry 가 얹은 것이다. 앱 코드 어디에도 이 줄은 없다.


덧붙이면 이 헤더는 원래 분산 추적용이다. 요청이 여러 서비스를 거칠 때 그 여정을 하나로 묶으려고 trace_id 를 실어 나른다. baggage 는 W3C 가 정한 표준 헤더이고 Sentry 는 거기에 환경과 릴리스 같은 값을 담는다.


문제는 그 쓸모가 우리 쪽 서비스끼리일 때만 성립한다는 것이다. 공공데이터포털이 우리 trace_id 를 받아 봐야 할 일이 없다. 그런데 서버 SDK 의 기본값은 나가는 요청 전부에 붙이는 쪽이라 남의 API 로도 그대로 나간다.


## 어느 값이 걸리는가


이 헤더를 curl 로 그대로 붙여 보내니 400 이 재현됐다. 값을 하나씩 떼어 내며 범위를 좁혀 나가자 결론은 단순했다.


```plain text
baggage: sentry-environment=production   400
baggage: sentry-environment=develop      400   value does not matter
baggage: environment=production          400   prefix does not matter
baggage: foo=production                  200
baggage: x=environment                   200
x-test:  environment=production          400   header name does not matter
```


헤더 값에 environment= 이라는 문자열이 있으면 거부한다. 헤더 이름도 값도 길이도 상관이 없다. WAF 가 파라미터 주입 시도로 보는 패턴이다.


짚고 넘어갈 것이 하나 더 있다. tracesSampleRate 가 0 이어도 이 헤더는 붙는다. 표본에서 제외한다는 표시를 달아 그대로 전파하기 때문이다. 추적을 껐으니 상관없다는 짐작은 맞지 않는다.


## 대응


보내지 않으면 된다. 헤더 값에 environment= 이 없으면 그대로 통과한다.


Sentry 때문이라면 tracePropagationTargets 로 추적 헤더를 붙일 대상을 좁히면 된다. 설정 방법은 아래 링크에 있다.

- [Sentry 추적 헤더 - 나가는 모든 요청에 붙는 이유와 tracePropagationTargets](../129-sentry-trace-headers-trace-propagation-targets/) — tracePropagationTargets 설정

## 마무리


오류 메시지가 가리키는 곳에 원인이 없을 수 있다. 게이트웨이는 파라미터가 잘못됐다고 말했지만 파라미터는 처음부터 정상이었다. 메시지를 믿고 쿼리스트링만 들여다보면 영영 찾지 못한다.


환경 비교는 조건을 맞춰야 쓸모가 있다. 개발이 멀쩡해 보였던 이유는 호출을 건너뛰고 있었기 때문이다. 실제로 일이 일어난 실행만 세야 한다.


아쉬운 점도 하나 남는다. 공공데이터포털은 기관용 API 라서 요청을 보수적으로 검사하는 쪽이 맞다. 그 판단 자체를 탓할 생각은 없다.


다만 걸린 것이 baggage 였다. 이 헤더는 누가 임의로 만든 것이 아니라 W3C 가 정한 표준이고 Sentry 나 OpenTelemetry 처럼 널리 쓰이는 도구가 기본으로 붙인다. 관측 도구를 붙인 서버라면 어디서나 나가는 값이다. 표준 헤더를 값 모양만 보고 막으면 멀쩡한 클라이언트가 이유도 모른 채 깨진다.


돌아오는 오류가 요청 파라미터가 잘못됐다는 메시지인 것도 아쉽다. 실제로 걸린 것은 헤더인데 파라미터를 가리키니 원인에서 멀어지는 쪽으로 사람을 밀어낸다. 파라미터 검사는 쿼리와 본문에만 하고 표준 헤더는 통과시켜 주면 좋겠다. 굳이 막아야 한다면 무엇이 걸렸는지 정도는 알려 주면 좋겠다.

