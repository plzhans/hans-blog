---
id: "105"
translationKey: "105"
slug: "105-mac-office-activation"
title: "Mac Officeのライセンス認証方法 | ボリュームライセンス VL Serializerで LTSC をインストール"
description: "Macで Microsoft Office をボリュームライセンスでインストールし、ライセンス認証を有効化する手順をまとめます。LTSC インストーラーの選択から VL Serializer の適用、認証確認の方法まで一度に案内します。"
categories:
  - "etc"
tags:
  - "mac"
  - "office"
  - "office365"
date: 2026-06-18T02:18:00.000Z
lastmod: 2026-06-18T02:21:00.000Z
toc: true
draft: false
images:
  - "assets/1_38222a0f-7e83-8081-a85a-e61f35929c9c.png"
---


## 概要


Macで Microsoft Office をインストールする際は、ライセンス認証が必要です。  


Microsoft 365 アカウントで認証するか、特定のバージョンをインストールした後にシリアルを入力する方法があります。 


組織にボリュームライセンスがある場合は、VL Serializer で認証するインストール方法をおすすめします。  


出典: [https://github.com/alsyundawy/Microsoft-Office-For-MacOS](https://github.com/alsyundawy/Microsoft-Office-For-MacOS)


---


## インストール手順

1. インストールする Office のバージョンを選択します
    - 例: [**Office LTSC 2021/2024 Suite Installer**](https://go.microsoft.com/fwlink/?linkid=525133)
2. インストールを進めます
    - 必要なアプリのみを選んでインストールできます
3. Office VL Serializer をダウンロードします
    - 例: [Office 2024 LTSC VL Serializer](https://github.com/alsyundawy/Microsoft-Office-For-MacOS/blob/master/DATA/Microsoft_Office_LTSC_2024_VL_Serializer.pkg)
4. Serializer を実行してボリュームライセンスを適用します
5. Office アプリを起動して認証状態を確認します

---


## インストール画面の例


インストール


![](./assets/1_38222a0f-7e83-8081-a85a-e61f35929c9c.png)


![](./assets/2_38222a0f-7e83-80b8-b486-dfd635b44edc.png)


カスタマイズ


![](./assets/3_38222a0f-7e83-80ec-9e5b-c15b8927d557.png)


必要なものだけインストール


![](./assets/4_38222a0f-7e83-809a-bf31-eb6d73602517.png)


Serializer のダウンロード


![](./assets/5_38222a0f-7e83-80c6-89c5-fab1c527a4d6.png)


実行および認証確認


![](./assets/6_38222a0f-7e83-80d9-9d7b-e4c4dab73d7d.png)


---


## オプション


### テレメトリの無効化


```bash
defaults write com.microsoft.Word SendAllTelemetryEnabled -bool FALSE
defaults write com.microsoft.Excel SendAllTelemetryEnabled -bool FALSE
defaults write com.microsoft.Powerpoint SendAllTelemetryEnabled -bool FALSE
defaults write com.microsoft.Outlook SendAllTelemetryEnabled -bool FALSE
defaults write com.microsoft.onenote.mac SendAllTelemetryEnabled -bool FALSE
defaults write com.microsoft.autoupdate2 SendAllTelemetryEnabled -bool FALSE
defaults write com.microsoft.Office365ServiceV2 SendAllTelemetryEnabled -bool FALSE
```


### クラウドログイン機能の無効化


```bash
defaults write com.microsoft.Word UseOnlineContent -integer 0
defaults write com.microsoft.Excel UseOnlineContent -integer 0
defaults write com.microsoft.Powerpoint UseOnlineContent -integer 0
```
