---
id: "86"
translationKey: "86"
slug: "86-github-pages-custom-domain"
title: "GitHub Pagesでカスタムドメインを使用する"
description: "GitHub Pagesにカスタムドメインを接続する際のCNAME・A/AAAAレコード設定とリポジトリのCustom domain適用手順を整理しました。Enforce HTTPS設定時の証明書伝播遅延も含め、ドメイン接続トラブルを素早く解決できます。"
tags:
  - "domain"
  - "github"
  - "github-action"
  - "github-pages"
categories:
  - "Git"
date: 2026-02-04T18:07:00.000+09:00
lastmod: 2026-02-10T07:36:00.000Z
toc: true
draft: false
images:
  - "assets/1_30a22a0f-7e83-80e7-8f4c-f143df1f0d00.png"
---


![](./assets/1_30a22a0f-7e83-80e7-8f4c-f143df1f0d00.png)


# 概要


GitHub Pagesはデフォルトで `https://{アカウント名}.`[`github.io/{リポジトリ名}/`](http://github.io/%7B저장소명%7D/) 形式のURLを提供します。

このドキュメントではカスタムドメインを接続する方法を説明します。


# サブドメインの使用


`hugosample.plzhans.com` のようなサブドメインを使用する場合です。


## DNS設定


ドメインのDNS設定でCNAMEレコードを追加します。


![](./assets/2_30222a0f-7e83-80d2-8bf8-df6ddbcd2239.png)


**設定例**

- Type: CNAME
- Name: サブドメイン（例: hugosample）
- Value: {アカウント名}.[github.io](http://github.io/)

## GitHub Pages設定


Repository → Settings → Pages → Custom domainでカスタムドメインを入力します。


**入力例:** hugosample.plzhans.com


![](./assets/3_30222a0f-7e83-80fe-875c-c3b270a89dd1.png)


# Apexドメインの使用


`plzhans.com` のようにドメインルートを使用する場合です。


## DNS設定


DNSプロバイダーに応じてA、AAAA、またはALIASレコードを設定します。


| レコードタイプ       | Name | Value                                                                           |
| -------------- | ---- | ------------------------------------------------------------------------------- |
| A              | @    | 185.199.108.153<br>185.199.109.153<br>185.199.110.153<br>185.199.111.153                 |
| AAAA           | @    | 2606:50c0:8000::153<br>2606:50c0:8001::153<br>2606:50c0:8002::153<br>2606:50c0:8003::153 |
| ALIASまたはANAME | @    | USERNAME.github.io                                                              |

**注意:** ALIAS/ANAMEレコードをサポートしていないDNSプロバイダーの場合はAレコードを使用します。


## GitHub Pages設定


Repository → Settings → Pages → Custom domainでカスタムドメインを入力します。


**入力例:** plzhans.com


# HTTPSの有効化


**Enforce HTTPS** オプションにチェックを入れるとHTTPS証明書が自動的に適用されます。


> ⚠️ 証明書の発行と伝播には最大24時間かかる場合があります。HTTPS接続ができない場合は、1日程度待ってから再度お試しください。


---


参考

- [GitHub公式ドキュメント: カスタムドメインの管理](https://docs.github.com/ko/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)
