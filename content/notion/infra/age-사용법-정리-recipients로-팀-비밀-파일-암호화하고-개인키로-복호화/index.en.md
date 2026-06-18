---
id: "102"
translationKey: "102"
slug: "102-age-recipients-team-encryption-guide"
title: "age Usage Guide: Encrypt Team Secret Files with recipients and Decrypt with a Private Key"
description: "A guide to encrypting team secret files with public keys (recipients) and decrypting them with a private key using age. It also covers key generation, recipients management, differences from GPG, and why re-encryption is needed when members change."
categories:
  - "infra"
tags:
  - "encrypt"
  - "env"
  - "image"
date: 2026-06-18T05:57:00.000Z
lastmod: 2026-06-18T06:08:00.000Z
toc: true
draft: false
images:
  - "assets/1_38322a0f-7e83-80a2-ba17-e65632a1b3af.png"
---


![](./assets/1_38322a0f-7e83-80a2-ba17-e65632a1b3af.png)


## Overview


### What is age?


age is a tool that lets you <strong>simply encrypt/decrypt files based on public keys (Recipient)</strong>.


The result is usually saved as a `*.age` file, and the private key is kept only on the local machine.


### Problems age solves

- Store sensitive configuration files in a team without sharing them in plaintext
- Anyone who knows the recipient (public key) list can encrypt, and only those who hold the private key can decrypt
- The workflow is simple, making it easy to integrate into CI/scripts

### Differences from GPG (brief)

- **Key distribution/discovery**
    - GPG: There is a culture of uploading public keys to key servers and searching/verifying them
    - age: The key server model is not common; recipients are often managed within the project in a file such as `recipients.txt`
- **Feature scope**
    - GPG: Has a wide range of features such as signing, web of trust, and email encryption
    - age: Focuses on file encryption (simplicity is its strength)
- **Team operations**
    - age: Adding/removing team members' public keys in a `recipients` file is intuitive in practice

> 🔒 Never upload the private key file (age-key) to a remote repository. If needed, use CI Secrets or a separate secret store.


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


## Basic Workflow


## 1) Generate a key (create the private key file)


Preferably create it under your user directory.


```bash
age-keygen -o ~/.config/age/key.txt
```


### Recommended storage location examples

- macOS / Linux: `~/.config/age/key.txt`
- Windows: `%USERPROFILE%\.config\age\key.txt`

## 2) Set private key file permissions (recommended on Linux/macOS)


```bash
chmod 600 ~/.config/age/key.txt
```


## 3) Print the public key (Recipient)


```bash
age-keygen -y ~/.config/age/key.txt
```


---


## Team Sharing Approach (the concept of "registering" a public key)


Rather than "registering with a key server", age usually <strong>keeps a recipient list file inside the project and shares it</strong>.


> 🧑‍💻 From a practical standpoint, here is how it's used.  
> 1) Each team member adds their own public key to the `recipients` file.  
> 2) When someone encrypts a secret file, they encrypt it with the public keys in `recipients`. Then anyone included in recipients can decrypt it with their own private key.  
> 3) Following the principle of least privilege, only include in recipients the people who need to read that secret.  
> 4) If you remove someone from recipients, the existing `*.age` files remain unchanged, so access is not automatically blocked. After modifying recipients, re-encrypt the files to apply the change.  
> 5) Therefore, in environments where members or keys change frequently, re-encryption work is a cumbersome drawback.


### recipients file example


Example: `.age/recipients.txt`

- One public key per line
- Multiple lines if there are multiple people

```plain text
age1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
age1yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
```


Encryption example (specifying recipients via a file)


```bash
age -R .age/recipients.txt -o secrets.env.age secrets.env
```


Decryption example (decrypt with the private key)


```bash
age -d -i ~/.config/age/key.txt -o secrets.env secrets.env.age
```


> ✅ Summary: "Where do I register my public key?" is usually solved by adding it to the recipients file in the repository.
