---
id: "89"
translationKey: "89"
slug: "89-gpg-encrypt-env-file"
title: "Encrypting .env Files with GPG for Safe Commits"
description: "When you must commit a .env file, encrypt it with GPG to block secret leaks: set up .gitignore rules, run gpg encrypt/decrypt commands, and define a default recipient so the repository stays secure."
categories:
  - "git"
tags:
  - "git"
  - "github"
  - "gpg"
date: 2026-02-16T17:42:00.000Z
lastmod: 2026-02-17T17:08:00.000Z
toc: true
draft: false
images:
  - "assets/1_30922a0f-7e83-803e-8671-fa8de7b1660a.png"
---


![](./assets/1_30922a0f-7e83-803e-8671-fa8de7b1660a.png)


# Overview


There are cases where you need to commit application configuration files or environment variable definition files to Git.


Sometimes a file gets committed carelessly because it only contains development environment passwords, or a file containing production environment passwords ends up being committed.


This article summarizes **how to hide secrets by encrypting the contents of a file when committing it**.


Several common approaches exist, but here we only cover **using GPG directly**.


### Common Methods for Encrypting File Contents

- gpg
- age
- git-crypt (Git filter-based encryption)
- sops (+age)

# Why GPG?


Many developers already use GPG for signing GitHub commits and tags.


The advantage is that you can use the same key for file encryption as well.


For installation and key generation, refer to the [Signing Git Commits with GPG](../88-github-gpg-commit-signing/) document.


If file encryption is your only goal, age may feel simpler.


# File Encryption/Decryption


**Prerequisite:** A GPG key must already be generated before proceeding.


## Important Points to Check First

- If a secret was **already included in a past commit**, the secret value **can still be viewed from that past commit** even if you add it to `.gitignore`.
- To completely remove it, you must **revoke/regenerate** the secret and **rewrite** the git commits.

## Exclude the Original File from Git


```shell
# Add .env to .gitignore
echo ".env" >> .gitignore

# If it's already being tracked, remove it from the index
# (keeps the local file but removes Git tracking)
git rm --cached .env
```


## File Encryption


### Notes

- `gpg --encrypt` does not update an existing file; it **creates a new output file each time**.
- It will ask whether to overwrite if the file already exists. Use the `--yes` option for automatic confirmation.

`.env` file example:


Creates an encrypted `.env` file from the `.env` file containing secrets.


```shell
# Encrypt with the specified recipient key and create .env.enc
gpg --encrypt -r plzhans@gmail.com --output .env.enc .env

# If you need to automate overwriting
# gpg --yes --encrypt -r plzhans@gmail.com --output .env.enc .env
```


## File Decryption


Creates the `.env` file containing secrets from the `.env.enc` file.


```shell
gpg --decrypt .env.enc > .env
```


# Other


## Specifying a Default Recipient

- Useful when specifying `-r` every time is cumbersome.
- `default-recipient`: Used by default when the `-r` option is not specified
- `encrypt-to`: Always included regardless of the `-r` option
- Configuration file: `~/.gnupg/gpg.conf`

```shell
# Default key
default-key {pub uuid}

# Default recipient
default-recipient {pub uuid}

# Always-include recipient (only if needed)
#encrypt-to {pub uuid}
```

