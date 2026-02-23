---
id: "95"
translationKey: "95"
slug: "95-openclaw-setup"
title: "OpenClaw（オープンクロー）の構築"
description: "OpenClaw（OpenClaw AIエージェントフレームワーク）をインストールし、onboardで初期設定を行う手順をまとめました。モデル・チャネル・スキルの選択とTelegram認証まで、ローカルで安全にエージェントを実行する方法を段階的に説明します。"
categories:
  - "ai"
tags:
  - "OpenClaw"
  - "ai"
date: 2026-02-23T10:10:00.000Z
lastmod: 2026-02-23T15:30:00.000Z
toc: true
draft: false
images:
  - "assets/1_30c22a0f-7e83-80ee-9c2c-c2ff88b811d4.png"
---


![](./assets/1_30c22a0f-7e83-80ee-9c2c-c2ff88b811d4.png)


## 概要


### OpenClawとは


OpenClawは、開発者が自律的に動作するAIエージェントを構築できる**Node.jsベースのオープンソースフレームワーク**です。


ClaudeやGPTなどのさまざまなモデルと連携できます。


ファイルの読み取り、コマンドの実行、外部サービスの呼び出しといった作業をツールとして接続して自動化できます。


公式サイト：[OpenClaw](https://openclaw.ai/)


### 主な特徴

- **マルチモーダル入力、** テキスト、画像、ファイルなど複数の形式の入力を処理します。
- **ツール統合、** ファイルシステムアクセス、ウェブ検索、API呼び出しなどの機能をツールとして拡張します。
- **セキュリティ中心の設計、** サンドボックス、アクセス制御、ホワイトリストなどの仕組みを提供します。
- **拡張可能な構造、** プラグイン方式で機能を追加しやすいです。

## インストール


OpenClawはインストールスクリプトを提供しています。


Node.jsなどの必須ユーティリティも一緒にインストールします。


インストールドキュメント：[https://docs.openclaw.ai/install](https://docs.openclaw.ai/install)


### 基本インストールモード


基本インストールは、インストール直後に**onboard（対話型初期設定）**に進みます。


設定が完了すると実行段階に移ります。


```shell
# macOS / Linux / WSL2
curl -fsSL https://openclaw.ai/install.sh | bash

# Windows (PowerShell)
iwr -useb https://openclaw.ai/install.ps1 | iex
```

{{< details summary="インストールのみ必要な場合" >}}
onboardなしでインストールだけしたい場合は以下のオプションを使用します。


```shell
# macOS / Linux / WSL2
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --no-onboard

# Windows (PowerShell)
& ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard
```


インストール後は以下の順番で進めます。


```shell
# 設定する
openclaw onboard

# 実行する
openclaw gateway start
```
{{< /details >}}


### 基本インストール画面


![](./assets/2_30d22a0f-7e83-80f1-9217-fccc404257dc.png)


## 初期設定（onboard）


基本インストールモードを進めると、インストール後にonboardに進みます。


設定は対話型UIで進めます。


設定ファイルはデフォルトで`~/.openclaw/openclaw.json`に記録されます。


onboardを途中で中断しても、再度実行すると続きから編集できます。


必要であればリセットして再設定することもできます。


### 1. セキュリティ警告への同意


![](./assets/3_30d22a0f-7e83-808b-b444-f99cdc23c20e.png)


> <details>
> <summary>⚠️ **セキュリティ警告 — 必ずお読みください**</summary>
>
> > OpenClawは趣味プロジェクトであり、まだベータ段階です。
> > 予期しない問題や未完成の機能が存在する可能性があります。
> > このボットはツールが有効な場合、**ファイルを読んだり作業を実行**したりできます。
> > 悪意のあるプロンプトはボットを騙して**安全でない動作**を実行させる可能性があります。
> > 基本的なセキュリティおよびアクセス制御に慣れていない場合は、OpenClawの実行を推奨しません。
> > ツールを有効にしたりインターネットに公開する前に、経験のある方の助けを得てください。
>
>
> **重要：** OpenClawはツールが有効になるとファイルを読んだりコマンドを実行したりできます。
>
>
> 外部に公開すると非常に危険になる可能性があるため、デフォルト設定のままパブリックチャネルに接続しない方が安全です。
>
>
> たとえばチャットボットにファイルを読んでほしいと頼むと、そのまま出力できます。
>
>
> ![](./assets/4_31022a0f-7e83-80dc-a51c-c26d7be8c0f0.png)
>
>
> </details>


### 2. インストールモードの選択


![](./assets/5_30d22a0f-7e83-8014-b12d-d1e1b342ba91.png)


![](./assets/6_30d22a0f-7e83-80a8-a129-f6a2ad9dbd00.png)


> <details>
> <summary>Manualモードはゲートウェイとワークスペースを手動で指定する場合に使用します。</summary>
>
> **ゲートウェイの選択（通常はローカルマシン）**
>
>
> ![](./assets/7_30d22a0f-7e83-803c-ad18-f3beec531690.png)
>
>
> **ワークスペースのパスを指定**
>
>
> デフォルトパスは`~/.openclaw/workspace`
>
>
> ![](./assets/8_30d22a0f-7e83-8045-8f43-f8e216bb19b0.png)
>
>
> </details>


### 3. モデルおよび認証プロバイダーの選択


![](./assets/9_30d22a0f-7e83-804c-aba4-d28f3ce24fa0.png)


> 必要なプロバイダーを有効化すればよいです。
> 選択すると認証手順を案内してくれます。
>
> <details>
> <summary>Claude（Anthropic）の例</summary>
>
> 一部のエージェントは自動インストールされることもあります。
>
>
> 手動インストールが必要な場合もあります。
>
>
> ![](./assets/10_31022a0f-7e83-80d8-bbd1-c82743ef6e3e.png)
>
>
> トークンの確認
>
>
> ```shell
> claude setup-token
> ```
>
>
> ![](./assets/11_31022a0f-7e83-80f4-a282-d0d5d905b104.png)
>
>
> モデルの選択は通常デフォルト値のままで問題ありません。
>
>
> 必要であればいつでも変更できます。
>
>
> ![](./assets/12_31022a0f-7e83-80d3-a320-ec6f7664dcab.png)
>
>
> </details>


> ChatGPTのようなクラウドモデルはAPIキー方式だと使用量ベースの課金になる場合があります。
> ただしサブスクリプション型アカウントを使っている場合もAPIキーなしで連携できる方式があるので確認する価値があります。
>
> - ChatGPT: OpenAI Codex（ChatGPT OAuth）
> - Claude: Anthropicトークン（setup-tokenの貼り付け）
> - Gemini: Google Gemini CLI OAuth


### 4. チャネルの選択


![](./assets/13_30d22a0f-7e83-807b-978a-fc624c5ddcf8.png)


![](./assets/14_30d22a0f-7e83-8064-9991-fa23e5a937f4.png)


> 好きなメッセンジャーチャネルを選択します。
> Telegramは無料のため選ぶ人が多いです。
>
> <details>
> <summary>Telegramボットトークンの生成と入力</summary>
>
> Telegramボットは管理者コンソールではなく、`@BotFather`と会話して作成・管理します。
>
>
> ![](./assets/15_30d22a0f-7e83-80a3-9025-e1fc0a7cdeb9.png)
>
>
> ![](./assets/16_30d22a0f-7e83-80c8-b4f8-edaa3a69552e.png)
>
>
> ![](./assets/17_30d22a0f-7e83-8020-a48d-dd2be45089ca.png)
>
>
> </details>


### 5. スキルの選択


![](./assets/18_30d22a0f-7e83-802c-9003-d2e265d919f2.png)


![](./assets/19_30d22a0f-7e83-803a-a434-d99e4a626ff4.png)


> OpenClawは付加機能をスキル、プラグインのような形で提供します。
> 基本的に必要なスキルだけ有効にして始めても問題ありません。
>
>
> 繰り返し行わせる作業は後でスキルにして追加できます。
>
> <details>
> <summary>高度な機能に必要な設定例</summary>
>
> 以下のような作業が必要な場合のみ有効にするのが安全です。
>
> - Googleマップで場所を探索
> - 画像生成
> - Notionデータの探索
> - 音声をテキストに変換（STT）
> - テキストを音声に変換（TTS）
>
> **Google Places**
>
>
> 場所検索に必要なGoogle APIキーの設定です。
>
>
> 例：「ソウル江南区でおすすめの高評価レストランを教えて」
>
>
> ![](./assets/20_30d22a0f-7e83-80ea-bec0-f2092ffd730c.png)
>
>
> **画像生成（Gemini、Nano Banana）**
>
>
> Geminiベースの画像生成機能を使用する際に設定します。
>
>
> ![](./assets/21_30d22a0f-7e83-8057-aeeb-cab0cf88d3b0.png)
>
>
> **Notion**
>
>
> Notionページからデータを参照する際に使用します。
>
>
> ![](./assets/22_30d22a0f-7e83-8006-a59f-c428e0ba5bcb.png)
>
>
> **画像生成（OpenAI）**
>
>
> ![](./assets/23_30d22a0f-7e83-809c-8b87-cd499c42219d.png)
>
>
> **Whisper（STT）**
>
>
> 音声ファイルをテキストに変換します。
>
>
> Telegramで音声メッセージを送るとテキストに変換して処理できます。
>
>
> ![](./assets/24_30d22a0f-7e83-809b-a7bb-d0ac4824e529.png)
>
>
> **ElevenLabs（TTS）**
>
>
> テキストを音声に変換する際に使用します。
>
>
> ![](./assets/25_30d22a0f-7e83-801d-b123-e98305c4cc29.png)
>
>
> </details>


### 6. Hookの設定


![](./assets/26_30d22a0f-7e83-80f4-ba8e-f046b7b530b2.png)


> 項目別の参考
> **boot-md**
>
> - gateway起動時に`BOOT.md`を自動実行して初期指示を読み込みます。
>
> **bootstrap-extra-files**
>
> - globまたはpathパターンでworkspaceの初期ファイルを自動注入します。
> - 個人的にはこのオプションだけ除いて有効化することを推奨します。
> - パスを誤って指定するとworkspaceが汚染される可能性があります。
>
> **command-logger**
>
> - すべてのコマンドイベントを中央監査ログファイルに記録します。
>
> **session-memory**
>
> - `/new`実行時にセッションコンテキストをメモリに自動保存します。


### 7. ボットの実行


![](./assets/27_30d22a0f-7e83-80da-b680-e7e95ec284d6.png)


> 💡 <details>
> <summary>macOSで実行許可が必要な場合</summary>
>
> ![](./assets/28_30d22a0f-7e83-80da-9cba-fe9769b0baf1.png)
>
>
> TUIで実行するかWeb UIで実行するかを選択します。
>
>
> Web UIの方が便利に見えますが、チャネルベースのアシスタントを使う予定ならTUIで十分です。
>
>
> </details>


実行画面


![](./assets/29_30d22a0f-7e83-80e0-aa50-dc0df8e91829.png)


### 8. Telegramユーザー認証


![](./assets/30_31022a0f-7e83-80ba-a460-ff3c09092256.png)


> ボットを作成後にメッセージを送るとユーザー認証が行われます。
> 任意のユーザーがボットを通じてOpenClawにアクセスしないよう認証が必要です。
>
>
> 認証コードはTelegramメッセージで送られます。
>
>
> 案内されたコマンドをコピーしてターミナルで手動実行すればよいです。
>
>
> ![](./assets/31_30d22a0f-7e83-8056-af82-d77955b2432a.png)


### 9. 自分の名前とボット名を決める


![](./assets/32_31022a0f-7e83-80a0-b6de-e328656450d4.png)


> 💡 ボットがユーザーを呼ぶ名前と、ユーザーがボットを呼ぶ名前を決めます。
> 設定後は通常のChatGPTのように会話して使えます。


### 10. 例


![](./assets/33_31022a0f-7e83-8083-89cd-ea0433d6ff7a.png)


![](./assets/34_31022a0f-7e83-8012-aede-f808b1d235e5.png)

