---
id: "135"
translationKey: "135"
slug: "135-garage-webui-install-docker-compose"
title: "garage-webui 설치 - Garage 클러스터와 버킷을 브라우저에서 관리하기"
description: "Garage 에 garage-webui 를 붙여 레이아웃·버킷·키를 브라우저에서 관리한다. compose 서비스 하나와 htpasswd 로그인 설정."
categories:
  - "infra"
tags:
  - "docker"
  - "garage"
  - "infra"
  - "s3"
date: 2026-09-23T10:56:00.000Z
lastmod: 2026-09-23T11:13:00.000Z
toc: true
draft: false
images:
  - "assets/1_3e422a0f-7e83-81ac-be01-c24ca688240a.jpg"
---


![Garage 로고. 이 글은 Garage 에 garage-webui 를 붙여 브라우저에서 클러스터와 버킷을 관리한다](./assets/1_3e422a0f-7e83-81ac-be01-c24ca688240a.jpg)


## 개요


Garage 는 CLI 가 본체다. 다만 레이아웃을 짜고 버킷과 키를 엮는 일은 화면으로 보면 훨씬 빠르다.


Garage 에는 공식 웹 콘솔이 없고 서드파티 UI 가 여럿 있다. 이 글은 그중 가장 단순한 garage-webui 를 다룬다.


Garage 가 이미 돌고 있는 상태에서 compose 에 서비스 하나를 더하는 식으로 진행한다.


Garage 자체의 설치와 CLI 구성은 앞선 글에서 다룬다.

- [Garage 설치와 구성 - 도커로 띄우는 S3 호환 오브젝트 스토리지](../134-garage-docker-install-s3-object-storage/)

## 설치


### webui 서비스 추가


앞선 글의 compose 에 `webui` 서비스를 하나 더한다. 완성된 파일은 저장소에 있다. [sample/docker/garage-webui](https://github.com/plzhans/hans-blog/tree/master/sample/docker/garage-webui)


```yaml
# docker-compose.yml

services:
  garage:
    image: dxflrs/garage:v2.4.1
    container_name: garage
    restart: unless-stopped
    ports:
      - "3900:3900"     # S3 API, signed requests only
    # - "3901:3901"     # RPC, only needed to join other nodes
      - "3902:3902"     # static website hosting, public read
    # - "3903:3903"     # admin API, reached by webui over the compose network
    env_file:
      - .env
    volumes:
      - ./garage.toml:/etc/garage.toml:ro
      - ./meta:/var/lib/garage/meta
      - ./data:/var/lib/garage/data

  webui:
    image: khairul169/garage-webui:1.1.0
    container_name: garage-webui
    restart: unless-stopped
    depends_on:
      - garage
    ports:
      - "3909:3909"
    environment:
      API_BASE_URL: "http://garage:3903"
      S3_ENDPOINT_URL: "http://garage:3900"
      API_ADMIN_KEY: "${GARAGE_ADMIN_TOKEN}"
      AUTH_USER_PASS: "${AUTH_USER_PASS}"
    volumes:
      - ./garage.toml:/etc/garage.toml:ro
```


### 로그인 붙이기


계정과 비밀번호 해시 생성


```bash
# htpasswd -nBC 10 {id}
htpasswd -nBC 10 admin
```


프롬프트가 두 번 물어보고 마지막 줄에 `계정:해시` 형태로 찍는다. 이 줄을 통째로 복사한다.


```plain text
New password:
Re-type new password:
admin:$2y$10$H9W.......yn6ze54n2
```


.env 에 붙여넣기


```bash
# htpasswd -nBC 10 admin
AUTH_USER_PASS=admin:$2y$10$H9W.......yn6ze54n2
```


### 재시작


환경변수는 컨테이너를 만들 때 박힌다. 바꿔도 컨테이너를 다시 만들지 않으면 반영되지 않는다.


```bash
docker compose up -d --force-recreate

[+] Restarting 2/2
 ✔ Container garage-webui  Started                                                                                                                                                                                                        0.7s
 ✔ Container garage        Started
```


## WEB UI


### 접속


ex) http://192.168.0.10:3909


![브라우저로 garage-webui 3909 포트에 접속한 화면](./assets/2_3e422a0f-7e83-801b-bd4c-f96678ed2216.png)


### 대시보드


![webui 대시보드. 레이아웃을 짜기 전이라 Status 가 Unavailable 이고 Storage Nodes 가 0 이다](./assets/3_3e422a0f-7e83-800f-bd1d-eecc717e7220.png)


### 클러스터 생성


![Cluster 탭의 노드 목록. Zone 과 Capacity 가 비어 있다](./assets/4_3e422a0f-7e83-80fb-91b8-c75ac91a5559.png)


Node Assign


![Assign Node 대화상자에서 zone 과 capacity 를 입력한다](./assets/5_3e422a0f-7e83-80ec-bcda-c9a8b27bc277.png)


Node Apply


![스테이징된 레이아웃 변경안을 적용하는 단계](./assets/6_3e422a0f-7e83-804d-8b9f-f22fafdd481c.png)


생성 완료


![레이아웃 적용 후 노드가 저장소로 잡히고 Layout version 이 올라간 상태](./assets/7_3e422a0f-7e83-8094-a6bb-cf980da0a321.png)


## 버킷 생성


![Buckets 탭에서 새 버킷을 만든다](./assets/8_3e422a0f-7e83-8065-b9a1-fdb2dd89e8a5.png)


## 버킷에 권한 추가


### 키 생성


![Keys 탭에서 액세스 키를 발급한 결과](./assets/9_3e422a0f-7e83-8058-928e-f48667c16657.png)


### 버킷 이동


Manage 탭 이동


![버킷 상세의 Manage 탭으로 이동한다](./assets/10_3e422a0f-7e83-8043-ac16-fc8b72535b90.png)


퍼미션 연결


Permissions 항목에서 연결할 키에 필요한 권한을 준다


![Permissions 에서 액세스 키에 읽기·쓰기 권한을 준다](./assets/11_3e422a0f-7e83-8000-b52d-c6eae03bab52.png)


## 추가 옵션


### 정적 웹사이트 허용


Bucket 설정에서 Website Access Enabled


![버킷 설정에서 Website Access 를 켜 정적 웹사이트를 허용한다](./assets/12_3e422a0f-7e83-80e7-976b-e04fb757d7fc.png)


## 정리


CLI 로 하던 일을 브라우저로 옮겨왔을 뿐 동작은 같다. Assign 과 Apply 가 나뉘어 있는 것도, 키와 버킷을 따로 만들어 권한으로 잇는 것도 CLI 와 그대로다. webui 는 admin API 를 감싼 화면이라 Garage 쪽 개념을 알고 보면 헤맬 곳이 없다. 반대로 개념을 모르고 화면부터 보면 Assign 만 하고 Apply 를 빠뜨리는 식으로 막힌다.


염두에 둘 것은 둘이다. 공식 콘솔이 아니라 서드파티이므로 Garage 본체와 업데이트 주기가 다르다. 그리고 **인증이 기본으로 꺼져 있다.** `AUTH_USER_PASS` 를 걸지 않으면 3909 에 닿는 사람은 누구나 관리자가 된다. 내부 네트워크라도 열어둘 이유가 없다.


비밀번호를 바꾸려면 해시를 다시 만들고 컨테이너를 재생성해야 한다. 운영에서는 인증을 앞단 리버스 프록시로 옮기거나, 아예 포트를 노출하지 않고 VPN 안에서만 닿게 하는 편이 편하다. 

