---
id: "3"
translationKey: "3"
slug: "3-git-svn-clone"
title: "SVN을 Git으로 이전하는 방법: git svn clone"
description: "SVN 저장소를 Git으로 이전할 때 git svn clone 사용법을 정리합니다. authors-file 작성과 -s(std-layout) 옵션 의미를 설명하고 설치 링크와 확인 명령으로 마이그레이션을 빠르게 시작하세요."
categories:
  - "git"
tags:
  - "git"
date: 2019-12-01T10:03:00.000Z
lastmod: 2026-02-27T10:03:00.000Z
toc: true
draft: false
images:
  - "assets/1_31222a0f-7e83-80a0-8b33-d762b23a0011.png"
---


![](./assets/1_31222a0f-7e83-80a0-8b33-d762b23a0011.png)


## 개요


이 글은 SVN 저장소를 Git으로 이전할 때


`git svn clone` 명령어를 어떻게 구성하는지 설명합니다.


**필요한 대상**

- SVN을 운영 중이지만 Git으로 점진 이전이 필요한 개발자
- SVN의 trunk, branches, tags 구조를 Git의 브랜치, 태그로 옮기려는 개발자

## Git 설치

- Windows: [Git for Windows](https://gitforwindows.org/)
- macOS: [Git - Downloads for macOS](https://git-scm.com/download/mac)

### Git 설치하면 git svn 그냥 사용 가능한가?


항상 그렇지는 않습니다.


설치한 Git 패키지에 `git svn`이 포함되지 않는 경우가 있습니다.


### Git 설치 링크

- Windows: [Git for Windows 다운로드](https://gitforwindows.org/)
- macOS: [git-scm macOS 다운로드](https://git-scm.com/download/mac)

설치 후 바로 확인


```bash
git svn --version
```


### git svn 없는 경우 설치

- Windows: Git for Windows를 설치했는데도 없다면, 설치 옵션에서 _Git SVN_ 구성요소가 제외됐는지 확인한 뒤 재설치합니다.
- macOS: [Homebrew](https://brew.sh/)로 `git-svn`을 추가 설치합니다.

## SVN → Git


### 핵심 명령어


```bash
git svn clone [svn 경로] --authors-file=[authors 경로] -s [git디렉토리]
```


### 옵션별 의미


**svn 경로**


SVN 저장소의 루트 URL을 넣습니다.


예시는 다음과 같습니다.


```bash
https://svn.example.com/repos/my-project
```


**옵션 --authors-file=[authors 경로]**


SVN 커밋 작성자 문자열을 Git 커밋 작성자 형식으로 매핑하기 위한 파일입니다.


이 옵션을 생략하면 author 정보가 기대와 다르게 들어가거나 이전 과정에서 경고가 발생할 수 있습니다.


authors 파일의 형식은 보통 다음 형태를 사용합니다.


```plain text
svnUser1 = 홍길동 <hong@example.com>
svnUser2 = 손원철 <hans3019@knou.ac.kr>
```


작성자 목록을 뽑는 방법은 환경마다 다릅니다.


대표적으로는 SVN 로그에서 author를 추출해 정리합니다.


**옵션 -s**


`-s`는 `--stdlayout`의 축약입니다.


SVN 저장소가 표준 레이아웃을 가진 경우에 사용합니다.


표준 레이아웃은 다음 디렉토리 구조를 의미합니다.

- `trunk`
- `branches`
- `tags`

`-s`를 주면 git svn이 위 디렉토리를 각각

- trunk → 기본 브랜치 히스토리
- branches → 원격 브랜치
- tags → 태그

SVN이 표준 레이아웃이 아니라면 `-s`를 쓰지 말고 아래처럼 명시적으로 경로를 지정합니다.


```bash
git svn clone [svn 경로] --authors-file=[authors 경로] \
  --trunk=TrunkDir --branches=BranchesDir --tags=TagsDir \
  [git디렉토리]
```


**옵션 git디렉토리**


Git으로 변환된 저장소를 생성할 로컬 디렉토리 경로입니다.


존재하지 않는 경로를 지정하면 디렉토리를 만들고 그 안에 클론합니다.


실행 예시


```bash
git svn clone https://svn.example.com/repos/my-project \
  --authors-file=./authors.txt \
  -s \
  my-project-git
```


### 이전 결과에서 확인할 것


**브랜치 확인**


```bash
cd my-project-git
git branch -a
```


원격 브랜치처럼 보이는 `remotes` 네임스페이스가 생깁니다.


**태그 확인**


```bash
git tag
```


SVN tags가 Git tag로 변환되어 있어야 합니다.


## 주의사항


### 작성자 매핑


authors 파일의 작성자 포맷을 지켜야 함


```shell
# {svn id} = {git_user_name} <git_user_email>
svnUser1 = 홍길동 <hong@example.com>
```


### 클론 시간이 너무 오래 걸림


SVN 이력 전체를 옮기기 때문에 svn에 히스토리가 많은 경우 시간이 많이 걸립니다.


실행 전에 다음 요인을 점검합니다.

- 네트워크 지연
- SVN 서버 응답 성능
- 리비전 범위 : 필요하면 특정 리비전부터 가져오는 옵션을 고려합니다.
- 최대 절전 모드 : 실행하는 머신이 데스크탑인 경우 절전모드 방지를 합니다.

### SVN 브랜치 이름이 Git에서 낯설게 보임


git svn은 SVN branches를 `remotes` 아래로 가져옵니다.


원하는 브랜치 이름으로 정리하려면 이전 완료 후 Git 브랜치로 로컬에 생성하고 추가로 정리 작업을 진행합니다.


### 마무리


SVN 표준 레이아웃을 따르는 저장소라면


`git svn clone ... -s` 한 줄로 trunk, branches, tags를 함께 이전할 수 있습니다.


authors 매핑만 정확히 준비하면


커밋 작성자까지 포함해 무리 없이 Git으로 옮길 수 있습니다.

