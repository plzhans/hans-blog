---
id: "13"
translationKey: "13"
slug: "13-git-ssh-key-setup-and-remote-access"
title: "Git SSH 키로 원격 저장소 접속하기: 키 생성부터 등록까지"
description: "Git 원격 저장소를 SSH로 접속하는 전체 흐름을 정리합니다. HTTPS와 차이점을 비교하고 Ed25519 키 생성과 chmod 권한 설정 그리고 GitHub·GitLab 공개키 등록과 ssh -T 테스트로 인증 문제를 빠르게 해결하세요."
categories:
  - "git"
tags:
  - "git"
  - "github"
  - "gitlab"
date: 2025-02-16T09:15:00.000Z
lastmod: 2026-02-27T15:14:00.000Z
toc: true
draft: false
images:
  - "assets/1_31422a0f-7e83-80d2-875f-dc4e50a32f38.png"
---


![](./assets/1_31422a0f-7e83-80d2-875f-dc4e50a32f38.png)


## 개요


Git 원격 저장소에 접근할 때는 HTTPS와 SSH 프로토콜을 주로 사용한다.


처음에는 브라우저 로그인과 웹 자격증명 흐름이 익숙해서 HTTPS로 시작하는 경우가 많다.


하지만 장기적으로는 SSH가 운영 부담을 줄이고 자동화에도 유리하다.


## HTTP(S) vs SSH 비교


| 비교 항목         | HTTPS                                   | SSH                                       |
| ------------- | --------------------------------------- | ----------------------------------------- |
| 인증 방식         | 아이디와 비밀번호 또는 PAT 같은 토큰 기반 인증을 사용한다.     | 로컬 개인키와 서버에 등록한 공개키로 인증한다.                |
| 자격증명 입력 빈도    | 환경이 바뀌면 다시 로그인하거나 저장된 자격증명을 점검해야 한다.    | 키를 등록하면 이후 push pull에서 입력 과정이 거의 없다.      |
| 만료와 정책 변경     | 토큰 만료 정책과 권한 설정 영향이 크다.                 | 키 만료가 없는 구성이 많아서 인증 장애 요인이 줄어든다.          |
| 멀티 계정과 멀티 리모트 | 호스트와 계정 조합이 늘수록 토큰 관리가 복잡해진다.           | `~/.ssh/config`로 호스트 별칭과 키를 분리해서 운영하기 쉽다. |
| 자동화와 배포       | CI에 토큰을 시크릿으로 넣어야 해서 노출 위험을 계속 관리해야 한다. | 배포용 전용 키로 접근 범위를 좁히는 구성이 깔끔하다.            |


### SSH를 사용해야 하는 이유

- **인증 흐름이 단순해진다**
    - 키를 등록한 뒤에는 자격증명 입력과 갱신 작업이 줄어든다.
- **운영 장애 포인트가 줄어든다**
    - 토큰 만료와 권한 설정 실수 같은 이슈를 피하기 쉽다.
- **계정 분리와 협업 구성이 편해진다**
    - 개인 GitHub와 회사 GitLab을 동시에 쓰는 환경에서 키를 분리해 관리하기 좋다.
- **자동화가 안전해진다**
    - 토큰을 URL이나 로그에 남길 위험이 줄어든다.
    - 읽기 전용 배포 키 같은 형태로 권한을 최소화하기 쉽다.

### SSH 사용의 단점

- **초기 설정이 과정을 초보자에게 어렵다**
    - 키 생성과 공개키 등록 과정이 처음에는 낯설다.
    - `~/.ssh/config`를 쓰기 시작하면 설정 실수로 접속 대상이 바뀌는 문제가 생길 수 있다.
- **키 파일 관리가 필요하다**
    - 개인키가 유출되면 계정 접근 권한이 탈취될 수 있다.
    - 키에 패스프레이즈를 걸지 않으면 로컬이 털렸을 때 피해가 커진다.
    - 반대로 패스프레이즈를 걸면 ssh-agent 같은 추가 구성이 필요해질 수 있다.
- **키 회전과 폐기 관리가 번거롭다**
    - 노트북 교체나 재설치가 잦으면 키를 다시 만들고 등록해야 한다.
    - 사용하지 않는 키를 방치하면 접근 경로가 늘어난다.

## 실무자 관점에서 SSH 사용법


### 실제 SSH 사용 흐름


SSH는 공개키 인증 방식이라서 초반에 한 번 키 발급과 등록을 끝내면 이후 인증은 SSH 클라이언트와 OS가 처리한다.


그래서 사용자 입장에서는 별도로 자격증명을 입력하거나 갱신을 신경 쓸 일이 줄어든다.


대신 개인키 파일이 외부에 유출되지 않도록 주의해야 한다.


### 사전 준비 절차

1. 작업자 머신에서 개인키와 공개키를 발급한다.
2. 발급한 공개키를 원격 저장소 서비스에 등록한다.
    - GitHub
    - GitLab
3. 원격 저장소 접근 URL을 SSH 경로로 사용한다.
    - HTTPS URL 예시: [`https://github.com/org/repo.git`](https://github.com/plzhans/hans-blog.git)
    - SSH URL 예시: `git@github.com:plzhans/hans-blog.git`

### HTTP(S) 사용할 때와 다른 점

- 원격 저장소 접근 시 아이디와 비밀번호를 입력하지 않는다.
    - 개인키를 보유한 상태 자체가 자격 증명 역할을 한다.
- 개인키 파일이 외부에 유출되지 않도록 주의해야 한다.
    - 가능하면 패스프레이즈를 설정한다.
    - 개인키 권한을 최소화한다.
    - 불필요해진 키는 원격 저장소에서 제거한다.

## 자격증명은 실제로 어떻게 이루어지나?


SSH 인증은 "Git이 인증한다"기보다는 Git이 `ssh` 클라이언트를 호출하면


SSH가 로컬 키와 설정을 참고해서 원격 서버에 공개키 인증을 수행하는 흐름이다.


### 인증 흐름 요약

1. Git이 원격 URL(예: `git@github.com:org/repo.git`)을 보고 전송 계층으로 SSH를 선택한다.
2. Git이 `ssh` 프로세스를 실행한다.(내부적으로 `ssh -T` 비슷한 형태로 접속)
3. `ssh`가 설정 파일과 키 후보를 확인한다.
    - `~/.ssh/config`(사용자 설정)
    - 기본 키 파일(아래 참고)
4. `ssh-agent`가 실행 중이면 에이전트에 로드된 키를 먼저 사용한다.
    - 키에 패스프레이즈가 있으면 최초 1회만 입력하고 에이전트가 캐싱한다.
5. 원격 서버는 등록된 공개키 목록과 대조한다.
    - 서버가 보낸 챌린지를 개인키로 서명한다.
    - 검증이 통과하면 세션이 열리고 Git 데이터 전송이 진행된다.

### 기본적으로 참조하는 파일

- 사용자 SSH 설정: `~/.ssh/config`
- 사용자 키 디렉토리: `~/.ssh/`
- macOS / Linux 기본 개인키 후보(OpenSSH 기본값)
    - `~/.ssh/id_ed25519`
    - `~/.ssh/id_rsa`
    - 공개키: 위 파일명에 `.pub`가 붙는다.(예: `~/.ssh/id_ed25519.pub`)
- windows 기본 개인키 후보
    - Windows는 보통 두 가지 SSH 환경이 섞일 수 있어서 "어떤 ssh.exe를 쓰는지"가 중요하다.
    - 그렇더라도 기본 키 파일 위치 자체는 보통 사용자 프로필의 `.ssh`이다.
        - `C:\\Users\\<USER>\\.ssh\\id_ed25519`
        - `C:\\Users\\<USER>\\.ssh\\config`
- known_hosts(서버 진위 확인): `~/.ssh/known_hosts`

## SSH 키 생성


GitHub는 기본적으로 Ed25519 방식을 권장한다. (참고: [Github Generating a new SSH key](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent))


```shell
# Ed25519 권장
ssh-keygen -t ed25519 -C "your_email@example.com"

# 구형 시스템이라 Ed25519를 지원하지 않으면 RSA 사용
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"
```


> 🔒 **개인키 권한(chmod)을 꼭 확인한다.**  
> 개인키 파일 권한이 너무 열려 있으면 OpenSSH가 키 사용을 거부할 수 있다.  
>   
>   
> 각 파일별 권한 예시  
>   
>   
> ```shell  
> # directory  
> chmod 700 ~/.ssh  
>   
> # private key   
> chmod 600 ~/.ssh/id_ed25519  
>   
> # public key  
> chmod 644 ~/.ssh/id_ed25519.pub  
> ```


## 원격 저장소에 키 등록


원격 저장소 서비스(GitHub, GitLab)는 <strong>계정 설정에서 SSH 공개키를 등록</strong>하는 방식으로 인증을 설정한다.


등록 대상은 공개키 파일이다. (개인키는 로컬에만 둔다.)


**등록 절차 요약**

1. 로컬에서 공개키 내용을 복사한다.
    - 예시: `cat ~/.ssh/id_ed25519.pub`
2. GitHub 또는 GitLab의 개인 설정에서 **SSH Keys** 메뉴로 이동한다.
    - GitHub: Settings → SSH and GPG keys → New SSH key
    - GitLab: Preferences → SSH Keys
3. 복사한 공개키를 붙여넣고 이름을 지정한 뒤 저장한다.
    - 키 이름은 `macbook-2026`, `work-laptop`처럼 장비 기준으로 정리한다.
4. 연결 테스트로 등록 여부를 확인한다.
    - GitHub: `ssh -T git@github.com`
    - GitLab: `ssh -T git@gitlab.com`

> ⚠️ **실수 포인트**  
> - 등록하는 키는 공개키(`.pub`)다.  
> - 개인키는 절대 업로드하지 않는다.  
> - 키를 여러 개 운영한다면 키 이름을 장비 또는 용도 기준으로 통일한다.


## 원격 저장소 멀티 계정 사용하기


개인 계정과 회사 계정을 병행으로 사용하는 경우


아래 방법으로 멀티 계정을 분리해서 운영할 수 있다.

- `~/.ssh/config`
    - 원격 호스트를 개인용과 회사용으로 별칭을 나눈다.
    - 별칭마다 사용할 SSH 키를 지정한다.
- `~/.gitconfig`
    - 상위 폴더 기준으로 git 설정을 분리한다.
    - 폴더마다 사용할 계정 정보를 지정한다.

자세한 설정은 아래 문서에서 확인한다.


> [Git 멀티 계정 설정 방법 정리  
> ssh config alias vs gitconfig includeIf](../7-git-multi-account-ssh-config-alias-gitconfig-includeif/)

