---
id: "95"
translationKey: "95"
slug: "95-openclaw-setup"
title: "OpenClaw(オープンクロー)構築 "
description: "OpenClaw(OpenClaw AIエージェントフレームワーク)をローカルにインストールし、onboardでモデル・チャンネル・スキルを設定する過程をまとめました。Telegramボット認証とセキュリティ警告のチェックポイントに沿って、安全にエージェントを実行しましょう。"
categories:
  - "ai"
tags:
  - "ai"
  - "OpenClaw"
date: 2026-02-23T10:10:00.000Z
lastmod: 2026-08-29T16:02:00.000Z
toc: true
draft: false
images:
  - "assets/1_30c22a0f-7e83-80ee-9c2c-c2ff88b811d4.png"
---


![OpenClawのインストールとonboard設定の過程を示す画面](./assets/1_30c22a0f-7e83-80ee-9c2c-c2ff88b811d4.png)


## 概要


### OpenClawとは


OpenClawは、開発者が自律的に動作するAIエージェントを構築できるようにする<strong>Node.jsベースのオープンソースフレームワーク</strong>です。


Claude、GPTなど様々なモデルと連携できます。


ファイルの読み取り、コマンドの実行、外部サービスの呼び出しといった作業をツールとして接続し、自動化できます。


公式サイト: [OpenClaw](https://openclaw.ai/)


### 主な特徴

- **マルチモーダル入力,** テキスト、画像、ファイルなど複数の形式の入力を処理します。
- **ツール統合,** ファイルシステムアクセス、Web検索、API呼び出しといった機能をツールとして追加し拡張します。
- **セキュリティ重視の設計,** サンドボックス、アクセス制御、ホワイトリストといった仕組みを提供します。
- **拡張可能な構造,** プラグイン方式で機能を追加しやすくなっています。

## インストール


OpenClawはインストールスクリプトを提供します。


Node.jsなどの必須ユーティリティも一緒にインストールします。


インストールドキュメント: [https://docs.openclaw.ai/install](https://docs.openclaw.ai/install)


### 基本インストールモード


基本インストールでは、インストール直後に**onboard(対話型初期設定)**に進みます。


設定が終わると実行段階に進みます。


```shell
# macOS / Linux / WSL2
curl -fsSL https://openclaw.ai/install.sh | bash

# Windows (PowerShell)
iwr -useb https://openclaw.ai/install.ps1 | iex
```

{{< details summary="手動インストールのみが必要な場合" >}}
onboardなしでインストールのみ行いたい場合は、以下のオプションを使用します。


```shell
# macOS / Linux / WSL2
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --no-onboard

# Windows (PowerShell)
& ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard
```


インストール後は、以下の順序で進めます。


```shell
# 設定する
openclaw onboard

# 実行する
openclaw gateway start
```
{{< /details >}}


### 基本インストール画面


![インストールスクリプトを実行した基本インストール画面](./assets/2_30d22a0f-7e83-80f1-9217-fccc404257dc.png)


## 初期設定(onboard)


基本インストールモードを進めると、インストール後にonboardに進みます。


設定は対話型UIで進みます。


設定ファイルはデフォルトで`~/.openclaw/openclaw.json`に記録されます。


onboardを途中で中断しても、再度実行すれば続きから編集できます。


必要であれば初期化して再設定することもできます。


### 1. セキュリティ警告への同意


![onboardの最初のステップであるセキュリティ警告への同意画面](./assets/3_30d22a0f-7e83-808b-b444-f99cdc23c20e.png)


> <details>  
> <summary>⚠️ **セキュリティ警告 — 必ずお読みください**</summary>  
>   
> > OpenClawは趣味のプロジェクトであり、まだベータ段階です。    
> > 予期しない問題や未完成の機能が存在する可能性があります。    
> > このボットは、ツールが有効化されている場合<strong>ファイルの読み取りや作業の実行</strong>を行うことがあります。    
> > 不適切なプロンプトはボットを騙して<strong>安全でない動作</strong>を実行させる可能性があります。    
> > 基本的なセキュリティおよびアクセス制御に不慣れな場合は、OpenClawの実行はお勧めしません。    
> > ツールを有効化したりインターネットに公開したりする前に、経験のある人の助けを借りてください。  
>   
>   
> **重要:** OpenClawはツールが有効化されると、ファイルの読み取りやコマンドの実行が可能になります。  
>   
>   
> 外部に公開されると非常に危険になる可能性があるため、デフォルト設定のまま公開チャンネルに接続しない方が安全です。  
>   
>   
> 例えば、チャットボットにファイルを読んでほしいと頼むと、そのまま出力してしまうことがあります。  
>   
>   
> ![チャットボットにファイルを要求すると、内容をそのまま出力する例の画面](./assets/4_31022a0f-7e83-80dc-a51c-c26d7be8c0f0.png)  
>   
>   
> </details>


### 2. インストールモードの選択


![onboardでインストールモードを選ぶ画面](./assets/5_30d22a0f-7e83-8014-b12d-d1e1b342ba91.png)


![OpenClawのインストールとonboard設定の過程を示す画面](./assets/6_30d22a0f-7e83-80a8-a129-f6a2ad9dbd00.png)


> <details>  
> <summary>Manualモードは、ゲートウェイとワークスペースを手動で指定する際に使用します。</summary>  
>   
> **ゲートウェイの選択(通常はローカルマシン)**  
>   
>   
> ![Manualモードでゲートウェイを直接指定する画面](./assets/7_30d22a0f-7e83-803c-ad18-f3beec531690.png)  
>   
>   
> **ワークスペースパスの指定**  
>   
>   
> デフォルトパスは`~/.openclaw/workspace`  
>   
>   
> ![ワークスペースパスを指定する画面](./assets/8_30d22a0f-7e83-8045-8f43-f8e216bb19b0.png)  
>   
>   
> </details>


### 3. モデルおよび認証プロバイダーの選択


![使用するモデルと認証プロバイダーを選ぶ画面](./assets/9_30d22a0f-7e83-804c-aba4-d28f3ce24fa0.png)


> 必要なプロバイダーを有効化すればよいです。  
> 選択すると認証手続きを案内してくれます。  
>   
> <details>  
> <summary>Claude(Anthropic)の例</summary>  
>   
> 一部のエージェントは自動でインストールされることもあります。  
>   
>   
> 手動インストールが必要な場合もあります。  
>   
>   
> ![Claudeエージェントをインストールする画面](./assets/10_31022a0f-7e83-80d8-bbd1-c82743ef6e3e.png)  
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
> ![claude setup-tokenで発行したトークンを確認する画面](./assets/11_31022a0f-7e83-80f4-a282-d0d5d905b104.png)  
>   
>   
> モデルの選択は、通常デフォルト値のままでも構いません。  
>   
>   
> 必要であればいつでも変更できます。  
>   
>   
> ![使用するモデルを選択する画面](./assets/12_31022a0f-7e83-80d3-a320-ec6f7664dcab.png)  
>   
>   
> </details>


> ChatGPTのようなクラウドモデルは、APIキー方式の場合、使用量に応じた課金になることがあります。  
> ただし、サブスクリプション型のアカウントを使用している場合でも、APIキーなしで連携できる方法があるので確認してみる価値があります。  
>   
> - ChatGPT: OpenAI Codex (ChatGPT OAuth)  
> - Claude: Anthropic token (setup-tokenを貼り付け)  
> - Gemini: Google Gemini CLI OAuth


### 4. チャンネルの選択


![接続するメッセンジャーチャンネルを選ぶ画面](./assets/13_30d22a0f-7e83-807b-978a-fc624c5ddcf8.png)


![OpenClawのインストールとonboard設定の過程を示す画面](./assets/14_30d22a0f-7e83-8064-9991-fa23e5a937f4.png)


> 使いたいメッセンジャーチャンネルを選択します。  
> Telegramは無料なので選ばれることが多いです。  
>   
> <details>  
> <summary>Telegramボットトークンの生成と入力</summary>  
>   
> Telegramボットは管理者コンソールではなく、`@BotFather`と会話して生成・管理します。  
>   
>   
> ![Telegramの@BotFatherと会話してボットを生成する画面](./assets/15_30d22a0f-7e83-80a3-9025-e1fc0a7cdeb9.png)  
>   
>   
> ![OpenClawのインストールとonboard設定の過程を示す画面](./assets/16_30d22a0f-7e83-80c8-b4f8-edaa3a69552e.png)  
>   
>   
> ![OpenClawのインストールとonboard設定の過程を示す画面](./assets/17_30d22a0f-7e83-8020-a48d-dd2be45089ca.png)  
>   
>   
> </details>


### 5. スキルの選択


![使用するスキルを選ぶ画面](./assets/18_30d22a0f-7e83-802c-9003-d2e265d919f2.png)


![OpenClawのインストールとonboard設定の過程を示す画面](./assets/19_30d22a0f-7e83-803a-a434-d99e4a626ff4.png)


> OpenClawは付加機能をスキル、プラグインといった形で提供します。  
> 基本的には必要なスキルだけをオンにして始めればよいです。  
>   
>   
> 繰り返し行わせる作業は、後でスキルとして作って追加できます。  
>   
> <details>  
> <summary>高度な機能に必要な設定例</summary>  
>   
> 以下のような作業が必要な場合にのみ有効化する方が安全です。  
>   
> - Googleマップでの場所検索  
> - 画像生成  
> - Notionデータの検索  
> - 音声をテキストに変換(STT)  
> - テキストを音声に変換(TTS)  
>   
> **Google Places**  
>   
>   
> 場所検索に必要なGoogle APIキーの設定です。  
>   
>   
> 例: 「ソウル江南区で評価の高いおすすめのレストランを教えて」  
>   
>   
> ![場所検索用のGoogle Places APIキーを設定する画面](./assets/20_30d22a0f-7e83-80ea-bec0-f2092ffd730c.png)  
>   
>   
> **画像生成(Gemini, Nano Banana)**  
>   
>   
> Geminiベースの画像生成機能を使用する際に設定します。  
>   
>   
> ![Gemini(Nano Banana)画像生成スキルを設定する画面](./assets/21_30d22a0f-7e83-8057-aeeb-cab0cf88d3b0.png)  
>   
>   
> **Notion**  
>   
>   
> Notionページのデータを参照する際に使用します。  
>   
>   
> ![Notion連携スキルを設定する画面](./assets/22_30d22a0f-7e83-8006-a59f-c428e0ba5bcb.png)  
>   
>   
> **画像生成(OpenAI)**  
>   
>   
> ![OpenAI画像生成スキルを設定する画面](./assets/23_30d22a0f-7e83-809c-8b87-cd499c42219d.png)  
>   
>   
> **Whisper(STT)**  
>   
>   
> 音声ファイルをテキストに変換します。  
>   
>   
> Telegramで音声メッセージを送ると、これをテキストに変換して処理できます。  
>   
>   
> ![音声をテキストに変換するWhisper(STT)の設定画面](./assets/24_30d22a0f-7e83-809b-a7bb-d0ac4824e529.png)  
>   
>   
> **ElevenLabs(TTS)**  
>   
>   
> テキストを音声に変換する際に使用します。  
>   
>   
> ![テキストを音声に変換するElevenLabs(TTS)の設定画面](./assets/25_30d22a0f-7e83-801d-b123-e98305c4cc29.png)  
>   
>   
> </details>


### 6. Hookの設定


![使用するHookを選ぶ画面](./assets/26_30d22a0f-7e83-80f4-ba8e-f046b7b530b2.png)


> 項目別の参考  
> **boot-md**  
>   
> - gateway起動時に`BOOT.md`を自動実行し、初期指示をロードします。  
>   
> **bootstrap-extra-files**  
>   
> - globまたはpathパターンでworkspaceの初期ファイルを自動的に注入します。  
> - 個人的にはこのオプションだけを除いて有効化することをお勧めします。  
> - パスを誤って指定すると、workspaceが汚染される可能性があります。  
>   
> **command-logger**  
>   
> - すべてのコマンドイベントを中央の監査ログファイルに記録します。  
>   
> **session-memory**  
>   
> - `/new`実行時にセッションコンテキストを自動的にメモリに保存します。


### 7. ボットの実行


![onboard設定を終えてボットを実行する画面](./assets/27_30d22a0f-7e83-80da-b680-e7e95ec284d6.png)


> 💡 <details>  
> <summary>macOSで実行許可が必要な場合</summary>  
>   
> ![macOSで実行許可を求める画面](./assets/28_30d22a0f-7e83-80da-9cba-fe9769b0baf1.png)  
>   
>   
> TUIで実行するかWeb UIで実行するかを選択します。  
>   
>   
> Web UIの方が便利そうに見えますが、チャンネルベースのアシスタントを使う予定であればTUIでも十分です。  
>   
>   
> </details>


実行画面


![ゲートウェイが実行された画面](./assets/29_30d22a0f-7e83-80e0-aa50-dc0df8e91829.png)


### 8. Telegramユーザー認証


![Telegramボットにメッセージを送ってユーザー認証を開始する画面](./assets/30_31022a0f-7e83-80ba-a460-ff3c09092256.png)


> ボットを作成した後、メッセージを送るとユーザー認証が進みます。  
> 誰でもボットを通じてOpenClawにアクセスできてはいけないため、認証が必要です。  
>   
>   
> 認証コードはTelegramメッセージとして送られてきます。  
>   
>   
> 案内されたコマンドをコピーしてターミナルで手動実行すればよいです。  
>   
>   
> ![Telegramで受け取った認証コードをターミナルで入力する画面](./assets/31_30d22a0f-7e83-8056-af82-d77955b2432a.png)


### 9. 自分の呼び名とボット名を決める


![ユーザーの呼び名とボット名を決める画面](./assets/32_31022a0f-7e83-80a0-b6de-e328656450d4.png)


> 💡 ボットがユーザーを呼ぶ名前と、ユーザーがボットを呼ぶ名前を決めます。  
> 設定後は、通常のChatGPTのように会話しながら使うことができます。


### 10. 例


![設定を終えたボットと実際に会話する例の画面](./assets/33_31022a0f-7e83-8083-89cd-ea0433d6ff7a.png)


![OpenClawのインストールとonboard設定の過程を示す画面](./assets/34_31022a0f-7e83-8012-aede-f808b1d235e5.png)


## エラーと解決策


---


### nodeの要求バージョンの変更


原因: 22.12以上を使用する必要があるが、20.11を使用中


```bash
❯ openclaw help
openclaw requires Node >=22.12.0.
Detected: node 20.11.1 (exec: /Users/plzhans/.nvm/versions/node/v20.11.1/bin/node).
```


解決策

- グローバル領域にインストールしたが、グローバルのnodeバージョンが20.11のまま
- グローバル領域を基準とした解決策

```bash
# バージョン確認
❯ node -v

# 実行中のプロセスを確認
ps -ef | grep openclaw

# 参考までに、プロセスを止めてもサービスやランチャーとして登録されていれば自動的に再起動します
# サービスやランチャーとして登録されている場合は、ランチャーを停止する必要があります
# mac基準: 実行中のopenclawを探す
launchctl list | grep openclaw

# 実行中のopenclawを停止
launchctl unload ~/Library/LaunchAgents/ai.openclaw.gateway.plist


# 新しいバージョンをインストールし、デフォルトバージョンを変更
nvm install 22
nvm use 22
nvm alias default 22
```


## 関連記事

- [OpenClawノードモードのインストールとリモートインフラ接続方法](../107-openclaw-node-mode-remote-infra-setup/)
- [Ollamaのインストールとローカル LLMサーバー構築方法](../112-ollama-local-llm-server-setup/)
- [Claude CodeをOllamaローカルLLMとして使用する方法](../113-claude-code-ollama-local-llm/)
</content>
</invoke>
