---
id: "130"
translationKey: "130"
slug: "130-data-go-kr-400-invalid-request-parameter-error"
title: "data.go.kr API 400 Error - It Rejects Any Header Containing environment"
description: "INVALID_REQUEST_PARAMETER_ERROR may not be a parameter problem at all. data.go.kr rejects environment= in a header value."
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


![The data.go.kr WAF spotting the environment= pattern in a header value, blocking the request and returning 400](./assets/1_3dd22a0f-7e83-8111-9893-f6ccdf4c2ddc.jpg)


## Overview


A batch job calling the Korean public data portal (data.go.kr) API stopped succeeding entirely one day. The response was HTTP 400 and the message was INVALID_REQUEST_PARAMETER_ERROR. Yet calling the same URL with curl returned 200.


The cause was not the parameters but a header. data.go.kr rejects any request whose header value contains the string environment=. The header name doesn't matter at all. What put that header there was Sentry. Its distributed tracing adds baggage to every outgoing request.


See the article below for the related details.

- [Sentry Trace Headers - Why They Attach to Every Outgoing Request, and tracePropagationTargets](../129-sentry-trace-headers-trace-propagation-targets/)

## The problem appears


The batch job on the production server pulls public data from three agencies every night. HIRA, the National Medical Center, and the Ministry of the Interior and Safety.


One day I opened the run history and found that every run had failed for several days straight. The first call to all three agencies had received the same status code.


```plain text
GET /B551182/codeInfoService/getAddrCodeList        400
GET /B552657/CodeMast/info                          400
GET /1741000/StanReginCd/getStanReginCdList         400
```


The body was an error envelope produced by the gateway.


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


The public data portal publishes its Open API error codes as documentation. Below is that official guide, transcribed. It is split into general errors and authentication errors.


| Error message                                                | Code | Description                                                                             |
| ------------------------------------------------------------ | ---- | --------------------------------------------------------------------------------------- |
| APPLICATION_ERROR                                            | 01   | An unexpected error occurred during internal GW processing.                               |
| HTTP_ERROR                                                   | 04   | The HTTP request was not allowed, or handling the agency API response failed.             |
| SERVICETIMEOUT_ERROR                                         | 05   | Connection to the agency API or a GW-linked service failed, or the response timed out.    |
| INVALID_REQUEST_PARAMETER_ERROR                              | 10   | The value or format of a request parameter is not valid.                                  |
| NO_OPENAPI_SERVICE_ERROR                                     | 12   | The requested Open API service does not exist or has been retired.                        |
| SERVICE_KEY_IS_NULL                                          | 20   | The request did not include an API service key.                                           |
| PERMISSION_DENIED                                            | 20   | The request was denied by the GW access permission check.                                 |
| LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS_ERROR             | 22   | The daily call quota for the API service has been exceeded.                               |
| LIMITED_NUMBER_OF_SERVICE_REQUESTS_PER_SECOND_EXCEEDS_ERROR  | 23   | Too many requests in a short time exceeded the per-second call quota.                     |
| BLACKLIST_IP_ACCESS_ERROR                                    | 29   | The request came from a blocked IP.                                                       |
| SERVICE_ACCESS_DENIED_ERROR                                  | 20   | Your permission to use this API service could not be confirmed. (authentication error)    |
| SERVICE_KEY_IS_NOT_REGISTERED_ERROR                          | 30   | The API service key is not registered. (authentication error)                             |
| DEADLINE_HAS_EXPIRED_ERROR                                   | 31   | The API service key has expired. (authentication error)                                   |


Group the table by character and you get three kinds. 01, 04, 05 and 23 are transient, so retrying is enough. 20, 29, 30 and 31 need a human to step in. 22 means the quota is used up, so you wait for the next day.


The 10 we received is neither. It means the request we sent was wrong.


## Tracking down the cause


### It didn't happen in development


The first thing that stood out was that the development environment was perfectly fine. The development batch, running the same code with the same service key, was calling the same API and pulling data without any trouble. Both environments run as containers on the same host.


Lining up the run records showed that both environments started at the same time. One pulled data normally for nearly an hour while the other died on its first request. That is not a picture you get from portal maintenance or an outage. The cause was on the sending side.


### The difference was Sentry


I went through the configuration of both environments. The service key was the same, the code was the same, the outbound network path was the same. One difference was left at the end. Sentry was enabled only in production.


An error-tracking tool blocking an API call did not connect for me right away, but there were no other candidates. On the off chance, I ran the batch with Sentry turned off. It went straight through.


So I had the cause but not the reason. What exactly was Sentry interfering with?


### Look at the request that actually goes out


It fails when the app calls and succeeds when a person calls from the same server. If so, the difference is in the request itself. I fired the same URL from the same server the app runs on.


```bash
curl -s -w '\n%{http_code}\n' -H 'Accept: application/json' \
  "https://apis.data.go.kr/B551182/codeInfoService/getAddrCodeList?pageNo=1&numOfRows=10&ServiceKey=$KEY&_type=json"
```


200 came back. It was not the network, not the service key, not DNS. All that was left was the difference between the request the app sends and the request curl sends.


What remained was to see what the app actually sends. I spun up a throwaway server, sent a request to it from a process with Sentry enabled, and printed the headers it received.


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


The only header our code passed was Accept. The two lines below it were added by Sentry. That line appears nowhere in the app code.


To add some context, this header is meant for distributed tracing. When a request passes through several services, it carries a trace_id so the journey can be stitched into one. baggage is a standard header defined by the W3C, and Sentry puts values like environment and release into it.


The problem is that its usefulness only holds between our own services. The public data portal has no reason to receive our trace_id. Yet the server SDK defaults to attaching it to every outgoing request, so it goes out to other people's APIs too.


## Which value trips it


I attached that header to curl exactly as-is and the 400 reproduced. Peeling off values one at a time to narrow the range, the conclusion was simple.


```plain text
baggage: sentry-environment=production   400
baggage: sentry-environment=develop      400   value does not matter
baggage: environment=production          400   prefix does not matter
baggage: foo=production                  200
baggage: x=environment                   200
x-test:  environment=production          400   header name does not matter
```


If a header value contains the string environment=, it is rejected. The header name, the value and the length are all irrelevant. It is a pattern the WAF reads as an attempted parameter injection.


There is one more thing worth noting. This header is attached even when tracesSampleRate is 0. It marks the trace as excluded from sampling and propagates it anyway. The assumption that it doesn't matter because tracing is off is wrong.


## What to do about it


Don't send it. If the header value has no environment= in it, the request goes through.


If Sentry is the cause, narrow the targets that get trace headers with tracePropagationTargets. The setup is in the article below.

- [Sentry Trace Headers - Why They Attach to Every Outgoing Request, and tracePropagationTargets](../129-sentry-trace-headers-trace-propagation-targets/) — configuring tracePropagationTargets

## Wrapping up


The cause may not be where the error message points. The gateway said a parameter was wrong, but the parameters were fine from the start. Trust the message and stare only at the query string and you will never find it.


Comparing environments is only useful when the conditions match. Development looked fine because it was skipping the call. Count only the runs where something actually happened.


One thing does leave a bad taste. The public data portal is an API for public agencies, so checking requests conservatively is the right call. I have no intention of blaming that judgment itself.


But what got caught was baggage. This header is not something someone invented arbitrarily — it is a W3C standard, and widely used tools like Sentry and OpenTelemetry attach it by default. On any server with an observability tool installed, it goes out. Block a standard header on the shape of its value alone and perfectly healthy clients break without knowing why.


It is also a shame that the error returned says the request parameters are wrong. What actually got caught was a header, but pointing at parameters pushes people away from the cause. I would rather parameter checks were applied only to the query and the body, and standard headers were let through. And if they must be blocked, it would help to at least say what got caught.
