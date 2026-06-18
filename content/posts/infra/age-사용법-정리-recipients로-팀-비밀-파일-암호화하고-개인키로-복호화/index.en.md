---
id: "102"
translationKey: "102"
slug: "102-age-recipients-team-encryption-guide"
title: "age Usage Guide: Encrypt Team Secret Files with Recipients and Decrypt with Private Keys"
description: "A guide to encrypting team secret files with public keys (recipients) and decrypting them with private keys using age. Covers key generation, recipients management, differences from GPG, and why re-encryption is needed when team members change."
categories:
  - "infra"
tags:
  - "encrypt"
  - "env"
  - "image"
date: 2026-05-01T22:57:00.000Z
lastmod: 2026-06-18T07:17:00.000Z
toc: true
draft: false
images:
  - "assets/1_38322a0f-7e83-80a2-ba17-e65632a1b3af.png"
---


![](./assets/1_38322a0f-7e83-80a2-ba17-e65632a1b3af.png)


## Overview


### What is age?


age is a tool for **simple file encryption/decryption based on public keys (Recipients)**.


The output is typically saved as `*.age` files, and private keys are kept only locally.


### Problems age Solves

- Store sensitive configuration files in a team without sharing them in plaintext
- Anyone with the recipient (public key) list can encrypt, and only those with the private key can decrypt
- The workflow is simple enough to easily integrate with CI/scripts

### Differences from GPG (Brief)

- **Key Distribution/Discovery**
    - GPG: There is a culture of uploading public keys to key servers for search and verification
    - age: The key server model is not common; recipients are often managed in a file like `recipients.txt` within the project
- **Feature Scope**
    - GPG: Wide range of features including signing, web of trust, email encryption, etc.
    - age: Focused on file encryption (simplicity is the advantage)
- **Team Operations**
    - age: Adding/removing team member public keys in a `recipients` file is intuitive in practice

> :lock: Never upload private key files (age-key) to remote repositories. Use CI Secrets or a separate secret store when needed.


---


## Installation


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


## Basic Usage Flow


## 1) Key Generation (Create a Private Key File)


It is recommended to create the key under the user directory.


```bash
age-keygen -o ~/.config/age/key.txt
```


### Recommended Storage Locations

- macOS / Linux: `~/.config/age/key.txt`
- Windows: `%USERPROFILE%\.config\age\key.txt`

## 2) Set Private Key File Permissions (Recommended for Linux/macOS)


```bash
chmod 600 ~/.config/age/key.txt
```


## 3) Display the Public Key (Recipient)


```bash
age-keygen -y ~/.config/age/key.txt
```


---


## Team Sharing Method (The Concept of "Registering" Public Keys)


age typically **shares a recipient list file within the project** rather than "registering on a key server".


> :technologist: In practice, it works like this.
> 1) Each team member adds their public key to the `recipients` file.
> 2) When someone encrypts a secret file, they encrypt it with the public keys in `recipients`. Then anyone included in recipients can decrypt it with their own private key.
> 3) Following the principle of least privilege, only those who need to read the secret are included in recipients.
> 4) If someone is removed from recipients, existing `*.age` files remain as-is, so access is not automatically revoked. After modifying recipients, re-encrypt the files to apply the change.
> 5) Therefore, in environments where team members or keys change frequently, re-encryption can be cumbersome.


### Recipients File Example


Example: `.age/recipients.txt`

- One public key per line
- Multiple people means multiple lines

```plain text
age1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
age1yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
```


Encryption example (specifying recipients via file)


```bash
age -R .age/recipients.txt -o secrets.env.age secrets.env
```


Decryption example (decrypt with private key)


```bash
age -d -i ~/.config/age/key.txt -o secrets.env secrets.env.age
```


> :white_check_mark: Summary: "Where do I register my public key?" is usually resolved by adding it to the recipients file in the repository.
