---
id: "7"
translationKey: "7"
slug: "7-git-multi-account-ssh-config-alias-gitconfig-includeif"
title: "Setting up multiple Git accounts
ssh config alias vs gitconfig includeIf"
description: "This guide explains how to route SSH keys with ~/.ssh/config aliases and how to split commit author settings per folder with ~/.gitconfig includeIf in a multi-account Git setup. Use it to reduce account mix-ups and authentication mistakes."
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


## Overview


Working with multiple accounts usually falls into two patterns.


Choosing the approach that fits the situation minimizes configuration errors and authentication issues.


I personally recommend the `~/.gitconfig includeIf` method.


When this helps

- You use a personal GitHub account alongside a company GitLab account.
- You have multiple GitHub accounts and need to push from different repositories with different identities.

---


## Branching with ~/.ssh/config host aliases


<strong>When you need to access the same remote host with multiple accounts</strong>, you can pin which key to use at the SSH level.


Because the Git remote URL contains the alias, each repository clearly maps to an account.


The downside is that you must convert existing remote URLs to their alias-based counterparts.


> Addresses like git@github.com:user/repo.git must be manually rewritten to alias-based URLs such as
> git@github-personal:user/repo.git.


Example configuration


```javascript
# Personal GitHub account
Host github-personal
	HostName github.com
	User git
	IdentityFile ~/.ssh/id_ed25519_github_personal
	IdentitiesOnly yes

# Company GitLab account
Host gitlab-work
	HostName gitlab.com
	User git
	IdentityFile ~/.ssh/id_ed25519_gitlab_work
	IdentitiesOnly yes
```


Remote URL examples

- GitHub: `git@github-personal:USER/REPO.git`
- GitLab: `git@gitlab-work:GROUP/REPO.git`

Verification

- `ssh -T git@github-personal`
- `ssh -T git@gitlab-work`

> ⚠️ **Common mistakes**  
> - Testing with the default host such as `ssh -T git@github.com` can pick an unintended key.  
> - When you use multiple accounts on the same host, aliases are mandatory.


---


## Branching by folder with ~/.gitconfig includeIf


<strong>This method automatically separates Git settings (user name, email, etc.) by directory.</strong>


Independent of SSH key separation, it is useful when you want to isolate commit authors and signing keys safely.


Just create top-level directories for personal and work projects and apply the rules.


Example configuration


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


## Differences


| Item | ~/.ssh/config host aliases | ~/.gitconfig includeIf (directory-based) |
| ----- | -------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Purpose | Fix which SSH key is used when connecting to a remote host. | Automatically split Git settings such as `user.email`, `user.name`, and `signingkey` based on the project path. |
| Scope | Applies per SSH connection. Only remote URLs that reference the alias host are affected. | Applies per Git repository. When the repository path matches the rule, the config is applied automatically. |
| Branching key | The host segment of the remote URL, e.g., github-personal, gitlab-work. | The local directory path, e.g., ~/work/, ~/personal/. |
| What changes | SSH picks the specified IdentityFile, HostName, User, etc. | Git config values such as commit author and signing settings. |
| Pros | Reliably separates multiple account keys on the same host (e.g., github.com). | Prevents accidentally committing to personal repos with your company email; the rule persists even when you move projects. |
| Cons | You must manually convert existing remote URLs to alias-based URLs. | You must define the folder structure first, and mistakes in the rules can apply the wrong settings. |
| Recommended for | You maintain two or more GitHub accounts or use GitHub and GitLab simultaneously. | You organize work and personal projects in separate folders and need strict commit author separation. |


> The two configurations do not conflict.  
> - `~/.ssh/config` separates **which key you use to connect**.  
> - `~/.gitconfig` separates **which identity you use to commit**.
