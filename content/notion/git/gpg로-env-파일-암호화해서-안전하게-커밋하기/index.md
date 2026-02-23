---
id: "89"
translationKey: "89"
slug: "89-gpg-encrypt-env-file"
title: "GPG로 .env 파일 암호화해서 안전하게 커밋하기"
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


# 개요


애플리케이션 설정 파일이나 환경 변수 정의 파일을 Git에 커밋해야 하는 경우가 있습니다.


개발 환경 비밀번호라서 무심코 커밋해버리거나 운영(프로덕션) 환경의 비밀번호가 포함된 채로 커밋되는 경우도 종종 있습니다.


이 글에서는 **​비밀 정보가 포함된 파일을 커밋할 때 내용을 암호화해 은닉하는 방법**​을 정리합니다.


대표적인 접근은 여러 가지가 있지만 여기서는 **GPG를 직접 사용하는 방식**​만 다룹니다.


### 추천하는 파일 내용 암호화에 자주 쓰는 방법

- gpg
- age
- git-crypt (Git 필터 기반 암호화)
- sops (+age)

# 왜 GPG?


GitHub 커밋/태그 서명 때문에 이미 GPG를 쓰는 경우가 많습니다.


동일한 키로 파일 암호화까지 이어갈 수 있다는 점이 장점입니다.


설치/키 생성은 [Git에서 GPG로 커밋 서명하기](../88-github-gpg-commit-signing/) 문서를 참고하세요.


파일 암호화만 목적이라면 age가 더 단순하게 느껴질 수도 있습니다.


# 파일 암호화/복호화


**​사전 요구사항:** 아래 과정을 진행하기 전에 GPG 키가 발급되어 있어야 합니다.


## 먼저 확인할 점(중요)

- **​이미 과거 커밋에 포함**​된 적이 있다면 `.gitignore`에 추가해도 **​과거 커밋에서 비밀값을 열람할 수 있습니다.**
- 완전히 없애려면 비밀값을 **​폐기/재발급**​하고 git 커밋을 **​재작성**​해야 합니다.

## 원본 파일은 Git에서 제외


```shell
# .gitignore에 .env 추가
echo ".env" >> .gitignore

# 혹시 이미 추적 중이라면 인덱스에서 제거
# (로컬 파일은 남겨두고 Git 추적만 제거)
git rm --cached .env
```


## 파일 암호화


### 주의사항

- `gpg --encrypt`는 기존 파일을 업데이트하는 개념이 아니라, **​매번 출력 파일을 새로 생성**​합니다.
- 파일이 이미 있을 때 덮어쓰냐고 물어봅니다. 자동 동의는 `--yes` 옵션을 사용합니다.

`.env` 파일 예시:


비밀이 포함된 .env 파일로 암호화 된  .env 파일을 만듭니다.


```shell
# 지정한 recipient(수신자) 키로 암호화해서 .env.enc 생성
gpg --encrypt -r plzhans@gmail.com --output .env.enc .env

# 덮어쓰기까지 자동화가 필요하면
# gpg --yes --encrypt -r plzhans@gmail.com --output .env.enc .env
```


## 파일 복호화


.env.enc 파일로 비밀이 포함된 .env 파일을 만듭니다.


```shell
gpg --decrypt .env.enc > .env
```


# 기타


## 기본 recipient 지정하기

- 매번 `-r`을 지정하기 번거로운 경우 사용할 수 있습니다.
- `default-recipient`: `-r` 옵션이 없을 때 기본으로 사용
- `encrypt-to`: `-r` 옵션과 상관없이 무조건 포함
- 설정 파일: `~/.gnupg/gpg.conf`

```shell
# 기본 키
default-key {pub uuid}

# 기본 recipient
default-recipient {pub uuid}

# 무조건 포함 recipient (필요한 경우만)
#encrypt-to {pub uuid}
```

