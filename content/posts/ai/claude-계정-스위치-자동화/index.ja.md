---
id: "101"
translationKey: "101"
slug: "101-claude-code-account-switch-macos-keychain"
title: "Claudeアカウントスイッチの自動化"
description: "ログアウトせずにClaude Codeアカウントを素早く切り替える方法をまとめます。macOS Keychainの認証情報をsecurityコマンドでバックアップ・置き換えする自動化スクリプトと、claudini・CCSwitcherのような専用ツールの使い方を併せて紹介します。"
categories:
  - "ai"
tags:
  - "claude"
  - "mac"
date: 2026-03-26T00:00:00.000Z
lastmod: 2026-08-29T09:31:00.000Z
toc: true
draft: false
images:
  - "assets/1_39522a0f-7e83-8009-a988-e146d610f764.png"
---


![macOS Keychain制御と専用ツールでClaude Codeアカウントを素早く切り替える構成を示す代表画像](./assets/1_39522a0f-7e83-8009-a988-e146d610f764.png)


## 概要


Claude Codeはアカウントの認証情報をOSごとのセキュアストレージに保管します。


macOSではKeychainに`Claude Code-credentials`項目として保存され、LinuxとWindowsではユーザーのホームディレクトリにある`.claude/.credentials.json`ファイルを使用します。


複数のClaudeアカウントを交互に使用する場合、毎回ログアウトとブラウザでのログインを繰り返すと作業の流れが途切れてしまいます。


この記事ではClaude Codeアカウントを素早く切り替える方法をまとめます。


主な方式は2つあります。


個人的には、単純なテストであれば直接スクリプトを組む方式で十分です。


頻繁に切り替えたり、GUI環境を好む場合はCCSwitcherのような専用ツールを使う方が安定します。


## CASE 1: macOS Keychain認証情報の直接制御


```bash
# 현재 Claude Code 인증 정보 백업
security find-generic-password -s "Claude Code-credentials" -w > ~/.claude-creds-work.json

# 기존 Keychain 항목 삭제
security delete-generic-password -s "Claude Code-credentials" 2>/dev/null

# 백업한 인증 정보를 Keychain에 다시 등록
security add-generic-password -s "Claude Code-credentials" -a "$USER" -w "$(cat ~/.claude-creds-work.json)"
```


上記のコマンドは、現在ログインしているClaude Codeの認証情報をファイルに保存した後、Keychain項目を置き換える流れです。アカウントごとに`~/.claude-creds-personal.json`、`~/.claude-creds-work.json`のようにファイルを分けておくと、素早く切り替えられます。


### 自動化スクリプト


```bash
# Claude switch account
claude-switch() {
  local account=$1
  local creds_file=~/".claude-creds-${account}.json"
  
  if [ ! -f "$creds_file" ]; then
    echo "❌ 계정 파일 없음: $creds_file"
    return 1
  fi
  
  # Keychain 업데이트
  security delete-generic-password -s "Claude Code-credentials" 2>/dev/null
  security add-generic-password -s "Claude Code-credentials" -a "$USER" -w "$(cat $creds_file)"
  
  echo "✅ Claude 계정 전환 완료: $account"
}

# 사용법: claude-switch personal / claude-switch work
```


## CASE 2: 専用ツールの使用


Keychainを直接制御する方式が負担に感じる場合は、アカウント切り替え専用のツールを使うのがよいでしょう。

- ターミナルベース: [claudini](https://github.com/kimrgrey/claudini)
- macOS GUIベース: [CCSwitcher](https://github.com/XueshiQiao/CCSwitcher)

`claudini`は、ターミナルでClaude Codeアカウントを切り替えたい場合に適しています。スクリプト方式と同様に、CLI中心で使用できます。


`CCSwitcher`は、macOSのメニューバーからアカウントを選択して切り替えられるGUIツールです。複数のアカウントを頻繁に行き来する環境であれば、自分でスクリプトを管理するより便利です。


### macOSではCCSwitcherがおすすめ


![macOSのメニューバーでCCSwitcherを使ってアカウントを選択する画面](./assets/2_33522a0f-7e83-801e-a9b4-d49c4d2fbf4d.png)


![CCSwitcherでClaudeアカウントを登録し切り替える画面](./assets/3_33522a0f-7e83-8000-a264-f0c9ff4e0f86.png)


![CCSwitcherでClaudeアカウントを登録し切り替える画面](./assets/4_33522a0f-7e83-80ac-9eb1-e13d144ca57a.png)


## まとめ


複数のClaude Codeアカウントを使用する場合、重要なのは認証情報をアカウントごとに分けておき、必要なタイミングで現在の認証情報に置き換えることです。


macOSではClaude Codeの認証情報がKeychainに保存されるため、`security`コマンドで直接バックアップし、置き換えることができます。


この方式は構造がシンプルで、別途ツールを必要としません。


ただし、認証情報ファイルを自分で管理する必要があるため、ファイルの権限と保管場所に気を配る必要があります。


アカウントの切り替えが頻繁に必要な場合は、専用ツールを使う方がよいでしょう。


ターミナル中心で作業するなら`claudini`を使用でき、macOSでGUIベースの切り替えを望むなら`CCSwitcher`が最も便利です。


認証情報はアカウントへのアクセス権限と同様に扱う必要があります。バックアップファイルは外部ストレージにアップロードせず、必要なユーザーだけが読み取れるように管理してください。
