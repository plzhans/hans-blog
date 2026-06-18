---
id: "102"
translationKey: "102"
slug: "102-age-recipients-team-encryption-guide"
title: "age 使い方まとめ: recipients でチームの秘密ファイルを暗号化し、秘密鍵で復号する"
description: "age でチームの秘密ファイルを公開鍵（recipients）で暗号化し、秘密鍵で復号する方法を整理します。鍵の生成、recipients の管理、GPG との違い、メンバー変更時に再暗号化が必要な理由まで併せて説明します。"
categories:
  - "infra"
tags:
  - "encrypt"
  - "env"
  - "image"
date: 2026-05-01T22:57:00.000Z
lastmod: 2026-06-18T07:13:00.000Z
toc: true
draft: false
images:
  - "assets/1_38322a0f-7e83-80a2-ba17-e65632a1b3af.png"
---


![](./assets/1_38322a0f-7e83-80a2-ba17-e65632a1b3af.png)


## 概要


### age とは？


age は、ファイルを**公開鍵（Recipient）ベースで簡単に暗号化・復号**できるツールです。


生成されるファイルは通常 `*.age` として保存し、秘密鍵はローカルにのみ保管します。


### age が解決する問題

- チームで機密設定ファイルを平文で共有せずに保存できます
- recipient（公開鍵）リストを知っていれば誰でも暗号化でき、秘密鍵を持つ人だけが復号できます
- 使い方がシンプルなので CI やスクリプトに組み込みやすいです

### GPG との違い（概要）

- **鍵の配布・検索**
    - GPG: 鍵サーバーに公開鍵をアップロードして検索・検証する文化があります
    - age: 鍵サーバーモデルは一般的ではなく、プロジェクト内の `recipients.txt` のようなファイルで recipient を管理する場合が多いです
- **機能範囲**
    - GPG: 署名、Web of Trust、メール暗号化など機能が幅広いです
    - age: ファイル暗号化に特化しています（シンプルさが利点）
- **チーム運用**
    - age: `recipients` ファイルにチームメンバーの公開鍵を追加・削除する方式が実務で直感的です

> :lock: 秘密鍵ファイル（age-key）は絶対にリモートリポジトリにアップロードしないでください。必要な場合は CI Secret または別のシークレットストアを使用します。


---


## インストール


### macOS


```bash
# Homebrew
brew install age
```


### Linux


```bash
# RHEL/CentOS/Amazon Linux
sudo yum install age

# Debian/Ubuntu
# sudo apt install age

# Fedora
# sudo dnf install age

# Arch
# sudo pacman -S age
```


### Windows


```bash
winget install FiloSottile.age
# Chocolatey: choco install age
```


---


## 基本的な使い方の流れ


## 1) 鍵の生成（秘密鍵ファイルの作成）


できるだけユーザーディレクトリの配下に作成します。


```bash
age-keygen -o ~/.config/age/key.txt
```


### 推奨保存場所の例

- macOS / Linux: `~/.config/age/key.txt`
- Windows: `%USERPROFILE%\.config\age\key.txt`

## 2) 秘密鍵ファイルの権限設定（Linux/macOS 推奨）


```bash
chmod 600 ~/.config/age/key.txt
```


## 3) 公開鍵（Recipient）の表示


```bash
age-keygen -y ~/.config/age/key.txt
```


---


## チーム共有方式（公開鍵を「登録」する概念）


age は通常、「鍵サーバーに登録」するのではなく、**プロジェクト内に recipient リストファイルを置いて共有**します。


> :technologist: 実務の感覚ではこのように使います。
> 1) チームメンバーはそれぞれの公開鍵を `recipients` ファイルに追加します。
> 2) 誰かが秘密ファイルを暗号化する際、`recipients` にある公開鍵で暗号化します。すると recipients に含まれる人はそれぞれの秘密鍵で復号できます。
> 3) 最小権限の原則に従い、その秘密を読む必要がある人だけを recipients に含めます。
> 4) recipients から誰かを削除しても、既存の `*.age` ファイルはそのままなのでアクセスは自動的にブロックされません。recipients を修正した後、ファイルを再暗号化（re-encrypt）して反映します。
> 5) そのため、メンバーや鍵の変動が多い環境では再暗号化の作業が煩わしいという欠点があります。


### recipients ファイルの例


例: `.age/recipients.txt`

- 1 行に公開鍵 1 つ
- 複数人なら複数行

```plain text
age1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
age1yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
```


暗号化の例（ファイルで recipient を指定）


```bash
age -R .age/recipients.txt -o secrets.env.age secrets.env
```


復号の例（秘密鍵で復号）


```bash
age -d -i ~/.config/age/key.txt -o secrets.env secrets.env.age
```


> :white_check_mark: まとめ: 「自分の公開鍵をどこに登録する？」は、通常リポジトリの recipients ファイルに追加することで解決します。
