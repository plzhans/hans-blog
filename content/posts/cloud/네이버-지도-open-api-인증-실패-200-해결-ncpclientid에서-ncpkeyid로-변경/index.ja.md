---
id: "99"
translationKey: "99"
slug: "99-naver-map-openapi-authentication-failed-200-ncpkeyid"
title: "Naver Map Open API 認証失敗(200) 解決: ncpClientIdからncpKeyIdへ変更"
description: "Naver Map Open APIでAuthentication Failed(200)エラーが発生する原因をまとめます。パラメータがncpClientIdからncpKeyIdに変更された点を確認し、スクリプトURLを修正して認証失敗を解決します。"
categories:
  - "cloud"
tags:
  - "maps"
  - "naver-api"
  - "ncloud"
date: 2026-03-24T06:54:00.000Z
lastmod: 2026-03-24T06:54:00.000Z
toc: true
draft: false
images:
  - "assets/1_32d22a0f-7e83-8032-898f-d7ab33128d85.png"
---


![](./assets/1_32d22a0f-7e83-8032-898f-d7ab33128d85.png)


## Naver Map 認証エラー


アプリケーション設定でサービスURLを正常に登録したにもかかわらず、認証が失敗します。


### 問題: Naver Map の認証が失敗する

> 네이버 지도 Open API 인증이 실패하였습니다. 클라이언트 아이디와 웹 서비스 URL을 확인해 주세요.,  * Error Code / Error Message: 200 / Authentication Failed,  * Client ID: xxxxx,  * URI: [http://localhost:8030/](http://localhost:8030/hospitals/1050/edit/basic)xxxxx
>
>
> ![](./assets/2_32d22a0f-7e83-8053-a2b0-fd791f882d47.png)
>
>
> ![](./assets/3_32d22a0f-7e83-8041-8b4c-f2442ad47ca3.png)
>
>

### 原因: クライアントIDパラメータ名が`ncpClientId`から`ncpKeyId`に変更された


参考ドキュメント

- [https://navermaps.github.io/maps.js.ncp/docs/tutorial-2-Getting-Started.html](https://navermaps.github.io/maps.js.ncp/docs/tutorial-2-Getting-Started.html)

### 解決: パラメータIDを正しく使用する


変更前


```plain text
<!-- 一般 -->
<script type="text/javascript" src="https://oapi.map.naver.com/openapi/v3/maps.js?ncpClientId=YOUR_CLIENT_ID"></script>

<!-- 公共 -->
<script type="text/javascript" src="https://oapi.map.naver.com/openapi/v3/maps.js?govClientId=YOUR_CLIENT_ID"></script>

<!-- 金融 -->
<script type="text/javascript" src="https://oapi.map.naver.com/openapi/v3/maps.js?finClientId=YOUR_CLIENT_ID"></script>
```


変更後


```plain text
<!-- 個人/一般 統合 -->
<script type="text/javascript" src="https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=YOUR_CLIENT_ID"></scri
```
