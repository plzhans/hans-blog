---
id: "99"
translationKey: "99"
slug: "99-naver-map-openapi-authentication-failed-200-ncpkeyid"
title: "네이버 지도 Open API 인증 실패(200) 해결: ncpClientId에서 ncpKeyId로 변경"
description: "네이버 지도 Open API에서 Authentication Failed(200) 오류가 나는 원인을 정리합니다. 콘솔 통합으로 ncpClientId·govClientId·finClientId가 ncpKeyId로 바뀜 점과, 포트·URI를 제외해야 하는 웹 서비스 URL 등록 규칙까지 확인하세요."
categories:
  - "cloud"
tags:
  - "maps"
  - "naver-api"
  - "ncloud"
date: 2026-03-24T06:54:00.000Z
lastmod: 2026-08-29T16:07:00.000Z
toc: true
draft: false
images:
  - "assets/1_32d22a0f-7e83-8032-898f-d7ab33128d85.png"
---


![네이버 지도 Open API 인증 실패(200) 문제와 ncpKeyId로의 파라미터 변경을 나타난 대표 이미지](./assets/1_32d22a0f-7e83-8032-898f-d7ab33128d85.png)


## 네이버 지도 인증 오류


어플리케이션 설정에서 서비스 url을 정상 등록했는데도 불구하고 인증이 실패함.


### 문제: 네이버 지도 인증이 실패 한다

> 네이버 지도 Open API 인증이 실패하였습니다. 클라이언트 아이디와 웹 서비스 URL을 확인해 주세요.,  * Error Code / Error Message: 200 / Authentication Failed,  * Client ID: xxxxx,  * URI: [http://localhost:8030/](http://localhost:8030/hospitals/1050/edit/basic)xxxxx  
> 
>
> ![브라우저에 표시된 Authentication Failed(200) 인증 실패 메시지](./assets/2_32d22a0f-7e83-8053-a2b0-fd791f882d47.png)
>
>
> ![서비스 URL을 정상 등록해둔 애플리케이션 설정 화면](./assets/3_32d22a0f-7e83-8041-8b4c-f2442ad47ca3.png)
>
>

### 원인: 클라이언트 ID 파라메터 이름이 `ncpClientId` 에서 `ncpKeyId` 로 변경 되었다.


참고 문서

- [https://navermaps.github.io/maps.js.ncp/docs/tutorial-2-Getting-Started.html](https://navermaps.github.io/maps.js.ncp/docs/tutorial-2-Getting-Started.html)

### 해결: 파라메터 ID 정상적으로 사용하기


변경 전


```plain text
<!-- 일반 -->
<script type="text/javascript" src="https://oapi.map.naver.com/openapi/v3/maps.js?ncpClientId=YOUR_CLIENT_ID"></script>

<!-- 공공 -->
<script type="text/javascript" src="https://oapi.map.naver.com/openapi/v3/maps.js?govClientId=YOUR_CLIENT_ID"></script>

<!-- 금융 -->
<script type="text/javascript" src="https://oapi.map.naver.com/openapi/v3/maps.js?finClientId=YOUR_CLIENT_ID"></script>
```


변경 후


```plain text
<!-- 개인/일반 통합 -->
<script type="text/javascript" src="https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=YOUR_CLIENT_ID"></script>
```


## 왜 바뀌었나


공공기관용과 금융기관용으로 나뉘어 있던 콘솔이 개인/일반 기업용 콘솔로 통합됐다. 파라미터도 여기에 맞춰 하나로 정리됐다.


| 구분    | 기존 파라미터     | 변경 후     |
| ----- | ----------- | -------- |
| 개인/일반 | ncpClientId | ncpKeyId |
| 공공기관  | govClientId | ncpKeyId |
| 금융기관  | finClientId | ncpKeyId |


기존 공공기관용과 금융기관용 콘솔은 중단될 예정이라고 공지돼 있다. 해당 콘솔을 쓰고 있었다면 통합 콘솔에서 키를 새로 발급받아야 한다.


> ⚠️ 문서마다 갱신 시점이 달라서 아직 이전 파라미터명으로 안내하는 페이지가 남아 있다. 스크립트 로딩 방식은 Maps JavaScript API v3 Getting Started 문서를 기준으로 확인하는 편이 확실하다.


## 웹 서비스 URL 등록 규칙


파라미터를 고쳤는데도 같은 오류가 난다면 콘솔에 등록해둔 웹 서비스 URL을 확인한다.


**호스트 도메인만 등록해야 하며 포트 번호와 URI는 제외한다.**


| 잘못된 등록                                          | 올바른 등록                                |
| ----------------------------------------------- | ------------------------------------- |
| [http://localhost:8080](http://localhost:8080/) | [http://localhost](http://localhost/) |
| [http://127.0.0.1/main](http://127.0.0.1/main)  | [http://127.0.0.1](http://127.0.0.1/) |


앞의 오류 메시지에 찍힌 URI가 `http://localhost:8030/hospitals/...` 형태였다면 등록값에도 포트와 경로가 들어가 있지 않은지 함께 확인한다.


## 점검 순서

1. 로딩 주소의 파라미터가 `ncpKeyId`인지 확인한다.
2. 통합 콘솔에서 발급받은 키인지 확인한다. 이전 콘솔의 키를 그대로 쓰고 있으면 실패한다.
3. 등록한 웹 서비스 URL에서 포트 번호와 경로를 제거한다.
4. 이전 스크립트가 캐시돼 있을 수 있으므로 브라우저 캐시를 지우고 다시 확인한다.

## 참고

- [Maps 문제 해결 - NAVER Cloud Platform 사용 가이드](https://guide.ncloud-docs.com/docs/maps-troubleshoot)
