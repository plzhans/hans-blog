---
id: "99"
translationKey: "99"
slug: "99-naver-map-openapi-authentication-failed-200-ncpkeyid"
title: "ネイバー地図 Open API 認証失敗(200)の解決:ncpClientIdからncpKeyIdへの変更"
description: "ネイバー地図 Open APIでAuthentication Failed(200)エラーが発生する原因をまとめます。コンソール統合によりncpClientId・govClientId・finClientIdがncpKeyIdに変更された点と、ポート・URIを除外する必要があるWebサービスURL登録ルールまで確認してください。"
categories:
  - "cloud"
tags:
  - "maps"
  - "naver-api"
  - "ncloud"
date: 2026-03-24T06:54:00.000Z
lastmod: 2026-08-29T18:41:00.000Z
toc: true
draft: false
images:
  - "assets/1_32d22a0f-7e83-8032-898f-d7ab33128d85.png"
---


![ネイバー地図 Open API 認証失敗(200)の問題とncpKeyIdへのパラメータ変更を示すアイキャッチ画像](./assets/1_32d22a0f-7e83-8032-898f-d7ab33128d85.png)


## ネイバー地図の認証エラー


アプリケーション設定でサービスURLを正しく登録しているにもかかわらず、認証に失敗します。


### 問題:ネイバー地図の認証が失敗する

> ネイバー地図 Open APIの認証に失敗しました。クライアントIDとWebサービスURLを確認してください。,  * Error Code / Error Message: 200 / Authentication Failed,  * Client ID: xxxxx,  * URI: [http://localhost:8030/](http://localhost:8030/hospitals/1050/edit/basic)xxxxx  
> 
>
> ![ブラウザに表示されたAuthentication Failed(200)認証失敗メッセージ](./assets/2_32d22a0f-7e83-8053-a2b0-fd791f882d47.png)
>
>
> ![サービスURLを正しく登録しておいたアプリケーション設定画面](./assets/3_32d22a0f-7e83-8041-8b4c-f2442ad47ca3.png)
>
>

### 原因:クライアントIDのパラメータ名が`ncpClientId`から`ncpKeyId`に変更されました


参考ドキュメント

- [https://navermaps.github.io/maps.js.ncp/docs/tutorial-2-Getting-Started.html](https://navermaps.github.io/maps.js.ncp/docs/tutorial-2-Getting-Started.html)

### 解決:パラメータIDを正しく使用する


変更前


```plain text
<!-- 일반 -->
<script type="text/javascript" src="https://oapi.map.naver.com/openapi/v3/maps.js?ncpClientId=YOUR_CLIENT_ID"></script>

<!-- 공공 -->
<script type="text/javascript" src="https://oapi.map.naver.com/openapi/v3/maps.js?govClientId=YOUR_CLIENT_ID"></script>

<!-- 금융 -->
<script type="text/javascript" src="https://oapi.map.naver.com/openapi/v3/maps.js?finClientId=YOUR_CLIENT_ID"></script>
```


変更後


```plain text
<!-- 개인/일반 통합 -->
<script type="text/javascript" src="https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=YOUR_CLIENT_ID"></script>
```


## なぜ変更されたのか


公共機関用と金融機関用に分かれていたコンソールが、個人/一般企業用コンソールに統合されました。パラメータもこれに合わせて一つに整理されました。


| 区分    | 従来のパラメータ     | 変更後     |
| ----- | ----------- | -------- |
| 個人/一般 | ncpClientId | ncpKeyId |
| 公共機関  | govClientId | ncpKeyId |
| 金融機関  | finClientId | ncpKeyId |


既存の公共機関用・金融機関用コンソールは今後廃止される予定であると告知されています。該当コンソールを使用していた場合は、統合コンソールでキーを新たに発行する必要があります。


> ⚠️ ドキュメントによって更新時期が異なるため、まだ旧パラメータ名で案内しているページも残っています。スクリプトの読み込み方法は、Maps JavaScript API v3 Getting Startedドキュメントを基準に確認するのが確実です。


## WebサービスURL登録ルール


パラメータを修正しても同じエラーが発生する場合は、コンソールに登録したWebサービスURLを確認してください。


**ホストドメインのみを登録する必要があり、ポート番号とURIは除外します。**


| 誤った登録                                          | 正しい登録                                |
| ----------------------------------------------- | ------------------------------------- |
| [http://localhost:8080](http://localhost:8080/) | [http://localhost](http://localhost/) |
| [http://127.0.0.1/main](http://127.0.0.1/main)  | [http://127.0.0.1](http://127.0.0.1/) |


先ほどのエラーメッセージに表示されたURIが`http://localhost:8030/hospitals/...`の形式であった場合は、登録値にもポートとパスが含まれていないか併せて確認してください。


## 確認手順

1. 読み込みアドレスのパラメータが`ncpKeyId`であるか確認します。
2. 統合コンソールで発行されたキーであるか確認します。以前のコンソールのキーをそのまま使用していると失敗します。
3. 登録したWebサービスURLからポート番号とパスを削除します。
4. 以前のスクリプトがキャッシュされている場合があるため、ブラウザのキャッシュを削除して再度確認します。

## 参考

- [Maps問題解決 - NAVER Cloud Platform使用ガイド](https://guide.ncloud-docs.com/docs/maps-troubleshoot)
