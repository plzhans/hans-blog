---
id: "102"
translationKey: "102"
slug: "102-age-recipients-team-encryption-guide"
title: "age 사용법 정리: recipients로 팀 비밀 파일 암호화하고 개인키로 복호화"
description: "age로 팀 비밀 파일을 공개키(recipients)로 암호화하고 개인키로 복호화하는 방법을 정리한다. 키 생성, recipients 관리, GPG와 차이점, 구성원 변경 시 재암호화가 필요한 이유까지 함께 설명한다."
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


## 개요


### age란?


age는 파일을 <strong>공개키(Recipient) 기반으로 간단하게 암호화/복호화</strong>할 수 있는 도구다.


결과물은 보통 `*.age` 파일로 저장하며 개인키는 로컬에만 보관한다.


### age가 해결하는 문제

- 팀에서 민감한 설정 파일을 평문으로 공유하지 않고 저장한다
- recipient(공개키) 목록만 알면 누구나 암호화할 수 있고, 개인키를 가진 사람만 복호화할 수 있다
- 사용 흐름이 단순해서 CI/스크립트에 붙이기 쉽다

### GPG와의 차이(간략)

- **키 배포/검색**
    - GPG: 키 서버에 공개키를 업로드하고 검색/검증하는 문화가 있다
    - age: 키 서버 모델이 일반적이지 않고, 프로젝트 내 `recipients.txt` 같은 파일로 recipient를 관리하는 경우가 많다
- **기능 범위**
    - GPG: 서명, 웹오브트러스트, 이메일 암호화 등 기능이 넓다
    - age: 파일 암호화에 집중(단순함이 장점)
- **팀 운영**
    - age: `recipients` 파일에 팀원 공개키를 추가/삭제하는 방식이 실무에서 직관적이다

> 🔒 개인키 파일(age-key)은 절대 원격 저장소에 올리지 않는다. 필요한 경우 CI Secret 또는 별도 비밀 저장소를 사용한다.


---


## 설치


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


## 기본 사용 흐름


## 1) 키 생성(개인키 파일 만들기)


가급적 사용자 디렉토리 아래에 생성한다.


```bash
age-keygen -o ~/.config/age/key.txt
```


### 권장 저장 위치 예시

- macOS / Linux: `~/.config/age/key.txt`
- Windows: `%USERPROFILE%\.config\age\key.txt`

## 2) 개인키 파일 권한 설정(Linux/macOS 권장)


```bash
chmod 600 ~/.config/age/key.txt
```


## 3) 공개키(Recipient) 출력


```bash
age-keygen -y ~/.config/age/key.txt
```


---


## 팀 공유 방식(공개키 “등록” 개념)


age는 보통 “키 서버에 등록”하기보다, <strong>프로젝트 안에 recipient 목록 파일을 두고 공유</strong>한다.


> 🧑‍💻 실무 감각으로 보면 이렇게 쓴다.  
> 1) 팀원은 각자 공개키를 `recipients` 파일에 추가한다.  
> 2) 누군가 비밀 파일을 암호화할 때는 `recipients`에 있는 공개키들로 암호화한다. 그러면 recipients에 포함된 사람은 각자 개인키로 복호화할 수 있다.  
> 3) 최소 권한을 원칙으로, 해당 비밀을 읽어야 하는 사람만 recipients에 포함한다.  
> 4) recipients에서 누군가를 제거했다면 기존 `*.age` 파일은 그대로라서 접근이 자동으로 막히지 않는다. recipients 수정 후 파일을 다시 암호화(re-encrypt)해서 반영한다.  
> 5) 따라서 구성원이나 키에 변동이 잦은 환경에서는 재암호화 작업이 번거로운 단점이 있다.


### recipients 파일 예시


예: `.age/recipients.txt`

- 한 줄에 공개키 1개
- 여러 명이면 여러 줄

```plain text
age1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
age1yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
```


암호화 예시(파일로 recipient 지정)


```bash
age -R .age/recipients.txt -o secrets.env.age secrets.env
```


복호화 예시(개인키로 복호화)


```bash
age -d -i ~/.config/age/key.txt -o secrets.env secrets.env.age
```


> ✅ 요약: “내 공개키를 어디에 등록?”은 보통 레포의 recipients 파일에 추가하는 것으로 해결한다.

