---
id: "7"
translationKey: "7"
slug: "7-git-multi-account-ssh-config-alias-gitconfig-includeif"
title: "Git 複数アカウント設定のまとめ
ssh config alias と gitconfig includeIf"
description: "複数の Git アカウント環境で ~/.ssh/config のエイリアスで SSH キーを切り替え、~/.gitconfig includeIf でフォルダーごとにコミッター情報を自動分離する手順を整理しました。アカウント混線や認証ミスを減らす判断基準として活用してください。"
categories:
  - "git"
tags:
  - "git"
  - "github"
  - "gitlab"
date: 2025-05-15T09:05:00.000Z
lastmod: 2026-02-27T15:15:00.000Z
toc: true
draft: false
images:
  - "assets/1_31422a0f-7e83-8067-a237-f9c049b42ff3.png"
---


![](./assets/1_31422a0f-7e83-8067-a237-f9c049b42ff3.png)


## 概要


複数アカウント環境は大きく2つのパターンに分かれます。


状況に合う方法を選べば設定ミスや認証トラブルを減らせます。


私は `~/.gitconfig includeIf` 方式を推奨します。


利用シーン

- 個人用 GitHub アカウントと会社の GitLab アカウントを同時に使う場合。
- GitHub アカウントを複数持ち、リポジトリごとに別アカウントで push する必要がある場合。

---


## ~/.ssh/config のホストエイリアスで分岐する


<strong>同じリモートホストへ複数アカウントでアクセスする</strong>とき、SSH レベルで「どのホストにどのキーを使うか」を固定します。


Git のリモート URL にエイリアスを含めるので、リポジトリごとにどのアカウントかが明確になります。


デメリットは既存リモート URL をエイリアス形式へ手動で変換しなければならない点です。


> git@github.com:user/repo.git のようなアドレスを  
> git@github-personal:user/repo.git のようなエイリアス URL に手作業で置き換えます。


構成例


```javascript
# 個人 GitHub アカウント
Host github-personal
	HostName github.com
	User git
	IdentityFile ~/.ssh/id_ed25519_github_personal
	IdentitiesOnly yes

# 会社 GitLab アカウント
Host gitlab-work
	HostName gitlab.com
	User git
	IdentityFile ~/.ssh/id_ed25519_gitlab_work
	IdentitiesOnly yes
```


リモート URL 例

- GitHub: `git@github-personal:USER/REPO.git`
- GitLab: `git@gitlab-work:GROUP/REPO.git`

動作確認

- `ssh -T git@github-personal`
- `ssh -T git@gitlab-work`

> ⚠️ **よくあるミス**  
> - `ssh -T git@github.com` のようにデフォルトホストでテストすると意図しないキーが選ばれます。  
> - 同一ホストで複数アカウントを使う場合、エイリアスは必須です。


---


## ~/.gitconfig の includeIf でフォルダー基準に分岐する


<strong>ディレクトリ単位で Git 設定（ユーザー名やメールなど）を自動的に分離</strong>する方法です。


SSH キーの切り分けとは独立して、コミット署名や著者情報を安全に分けたいときに便利です。


個人用と業務用のトップディレクトリを分けてルールを定義します。


構成例


```javascript
# ~/.gitconfig
[includeIf "gitdir:~/work/"]
	path = ~/.gitconfig-work

[includeIf "gitdir:~/personal/"]
	path = ~/.gitconfig-personal
```


```javascript
# ~/.gitconfig-work
[user]
	name = Your Name
	email = your.name@company.com
```


```javascript
# ~/.gitconfig-personal
[user]
	name = Your Name
	email = your.name@gmail.com
```


---


## 違い


| 項目 | ~/.ssh/config のホストエイリアス | ~/.gitconfig includeIf（ディレクトリ基準） |
| ----- | -------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 目的 | リモート接続時にどの SSH キーを使うかを固定します。 | プロジェクトの場所に応じて `user.email`、`user.name`、`signingkey` などの Git 設定を自動的に分けます。 |
| 適用範囲 | SSH 接続単位。エイリアスホストを指定したリモート URL のみ対象です。 | Git リポジトリ単位。パスが条件に一致すると自動で適用されます。 |
| 分岐基準 | リモート URL のホスト部分（例: github-personal、gitlab-work）。 | ローカルディレクトリパス（例: ~/work/、~/personal/）。 |
| 変わる内容 | SSH が選ぶ IdentityFile、HostName、User など。 | コミット著者や署名設定など Git config の値。 |
| 長所 | 同じホスト（例: github.com）で複数アカウントのキーを安全に分離できます。 | 会社メールで個人リポジトリにコミットしてしまうミスを防ぎ、プロジェクトを移動してもルールが維持されます。 |
| 短所 | 既存リモート URL をエイリアス URL へ手作業で変換する必要があります。 | まずフォルダー構造を決める必要があり、ルールを誤ると意図と異なる設定が適用されます。 |
| 推奨シーン | GitHub アカウントが2つ以上、または GitHub と GitLab を同時に使う場合。 | 業務と個人プロジェクトをフォルダーで分け、コミット著者の分離が重要な場合。 |


> 2つの設定は競合しません。  
> - `~/.ssh/config` は「どのキーで接続するか」を分離します。  
> - `~/.gitconfig` は「どのユーザーでコミットするか」を分離します。
