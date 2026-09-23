---
id: "134"
translationKey: "134"
slug: "134-garage-docker-install-s3-object-storage"
title: "Garage 설치와 구성 - 도커로 띄우는 S3 호환 오브젝트 스토리지"
description: "missing field s3_region 부터 서명 리전 불일치까지. 도커 컴포즈로 Garage 를 띄워 버킷에 객체를 넣는 데까지."
categories:
  - "infra"
tags:
  - "docker"
  - "garage"
  - "infra"
  - "s3"
date: 2026-09-23T10:56:00.000Z
lastmod: 2026-09-23T10:56:00.000Z
toc: true
draft: false
images:
  - "assets/1_3e422a0f-7e83-816a-8dd3-fc8f62a53a59.jpg"
---


![aws CLI 가 보내는 같은 S3 API 요청이 엔드포인트만 바뀌어 AWS 대신 Garage 로 향하는 흐름](./assets/1_3e422a0f-7e83-816a-8dd3-fc8f62a53a59.jpg)


## 개요


AWS S3 를 쓰다 보면 언젠가 이런 생각이 든다. 파일 몇 개 올려놓는 데 매달 돈이 나가고, 데이터는 남의 계정 안에 있다. 집에 NAS 가 놀고 있는데 여기에 S3 를 대신할 걸 올릴 수는 없을까.


Garage 가 그 자리에 들어간다. Rust 로 만든 S3 호환 오브젝트 스토리지고, 바이너리 하나에 25MB 짜리 도커 이미지로 끝난다. 원래는 여러 지역에 흩어진 노드를 묶어 쓰라고 만든 물건이지만 단일 노드로도 잘 돈다.


다만 S3 를 쓰던 감각 그대로 접근하면 몇 군데서 막힌다. 설정 파일이 없으면 기동조차 안 되고, 버킷을 만들기 전에 해야 할 일이 하나 더 있고, 공개 읽기를 켜는 방법이 아예 다르다. 이 글은 그 지점들을 하나씩 짚으면서 컨테이너를 띄우고 객체를 넣었다 빼는 데까지 간다.


### 이 글에서 다루는 것

- Docker Compose 로 Garage v2.4.1 띄우기
- `garage.toml` 의 필수 항목과 생략 가능한 항목
- 시크릿을 `.env` 로 분리하기
- 레이아웃 할당. 버킷보다 먼저 해야 하는 작업
- 버킷과 액세스 키 생성, 권한 부여
- `aws` CLI 로 객체 업로드와 다운로드

터미널에서 CLI 로만 진행한다. 웹 콘솔과 도메인 연결, HTTPS, 정적 웹 호스팅은 각각 따로 다룰 만한 주제라 이어지는 글로 미룬다.


### S3 와 다른 세 가지


명령을 치기 전에 먼저 알아두면 덜 헤맨다. Garage 는 S3 API 를 흉내 내지만 내부 모델이 다르다. 차이가 드러나는 지점이 셋이다.


**ACL 과 버킷 정책이 없다.** `PutBucketAcl`, `PutBucketPolicy`, `PutObjectAcl` 전부 구현돼 있지 않다. 공식 문서는 이렇게 적는다.

> Garage implements none of them, and has its own system instead, built around a per-access-key-per-bucket logic.

권한은 오직 액세스 키 단위로만 존재한다. 그래서 "이 객체만 공개" 나 "`public/` 아래만 공개" 같은 걸 할 수 없다. 공개와 비공개를 나누려면 버킷을 쪼개야 한다.


**노드에 역할을 줘야 클러스터가 산다.** S3 는 버킷을 만들면 끝이지만 Garage 는 "이 노드가 얼마만큼의 용량을 어느 존에서 맡는다" 를 사람이 정해줘야 한다. 이걸 레이아웃이라 부르고, 짜기 전에는 버킷조차 만들 수 없다.


**TLS 를 제공하지 않는다.** 설정 구조체에 인증서 항목이 아예 없다. 세 엔드포인트가 전부 평문 HTTP 로 열린다. HTTPS 는 앞단에 리버스 프록시를 두거나 터널을 쓰는 식으로 해결한다.


## 설치


Docker 와 Docker Compose 가 설치돼 있어야 한다. 설치는 아래 글에서 다룬다.

- [Amazon Linux 2023 ARM64 EC2에서 Docker와 Docker Compose 설치하기](../97-amazon-linux-2023-arm64-ec2-docker-docker-compose-install/)

### docker-compose 구성


이 글에 나오는 설정 파일은 저장소에 그대로 있다. [sample/docker/garage](https://github.com/plzhans/hans-blog/tree/master/sample/docker/garage)


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
    # - "3902:3902"     # static website hosting, public read
    # - "3903:3903"     # admin API
    env_file:
      - .env
    volumes:
      - ./garage.toml:/etc/garage.toml:ro
      - ./meta:/var/lib/garage/meta
      - ./data:/var/lib/garage/data
```


### 필수 파일 설정


garage 설정 파일이 없으면 기동 되지 않는다. 


docker 내에 설정 파일이 포함되어 있지 않으므로 직접 연결해야한다.


```toml
# garage.toml

# required, no defaults
metadata_dir = "/var/lib/garage/meta"
data_dir     = "/var/lib/garage/data"

# 1 for single node, 3 is the recommended cluster setting
replication_factor = 1

rpc_bind_addr = "[::]:3901"

# db_engine   = "lmdb"              # default since v0.9
# rpc_public_addr = "127.0.0.1:3901"  # advertised to other nodes, multi-node only
# rpc_secret is injected as GARAGE_RPC_SECRET

[s3_api]
api_bind_addr = "[::]:3900"
s3_region     = "garage"          # required, no default
# root_domain = ".s3.garage.localhost"   # enables vhost-style, path-style works without it

[admin]
api_bind_addr = "[::]:3903"
# admin_token is injected as GARAGE_ADMIN_TOKEN

# whole section optional, root_domain required once it exists
# [s3_web]
# bind_addr   = "[::]:3902"
# root_domain = ".web.garage.localhost"
# index       = "index.html"
```


`replication_factor` 는 단일 노드라면 `1` 로 둔다. 기본값이 없어서 빼면 `The option replication_factor is required.` 로 기동이 멈춘다. 


문서가 권하는 3 으로 두면 노드가 셋 붙기 전까지 쓰기가 전부 거부된다.


`[s3_api]` 의 `root_domain` 은 생략하면 기본 도메인이 생기는 게 아니라 **vhost-style 요청 자체가 꺼진다.**


도메인을 설정하면 domain 앞에 서브 도메인으로 생성되고 생략하면 기존 호스트 뒤에 path 에 버킷이 붙는다


ex) domain → `mybucket.s3.plzhans.com`


ex) no domain → `http://192.168.0.10:3900/mybucket`


시크릿 둘은 `garage.toml` 에 박지 않고 `.env` 로 넣는다. 두 값 모두 openssl 로 만든다.


```plain text
# openssl rand -hex 32
GARAGE_RPC_SECRET=

# openssl rand -base64 32
GARAGE_ADMIN_TOKEN=
```


meta, data 부팅때 필요해서 미리 만들어 둔다


```bash
mkdir data meta
```


### 실행


```bash
docker compose up -d
docker compose logs -f
```


## 초기 구성 - 레이아웃과 버킷, 액세스 키


여기서부터는 CLI 로 레이아웃을 짜고 버킷과 키를 만든다. 같은 일을 브라우저에서 하고 싶다면 아래 글을 보면 된다.

- [garage-webui 설치 - Garage 클러스터와 버킷을 브라우저에서 관리하기](../135-garage-webui-install-docker-compose/)

### 상태 체크


```bash
docker compose exec garage /garage status
```


Zone 비어 있음


```plain text
2026-09-23T09:33:06.972398Z  INFO garage_net::netapp: Connected to 127.0.0.1:3901, negotiating handshake...
2026-09-23T09:33:07.014538Z  INFO garage_net::netapp: Connection established to 6409899f54d1d72f
==== HEALTHY NODES ====
ID                Hostname      Address          Tags  Zone  Capacity          DataAvail  Version
6409899f54d1d72f  ee6cfc6c37ff  172.26.0.2:3901              NO ROLE ASSIGNED             v2.4.1
```


### 레이아웃 할당 - zone 과 capacity


```bash
# docker compose exec garage /garage layout assign -z {zone name} -c <disk size> <node_id>
docker compose exec garage /garage layout assign -z dc1 -c 1024G 6409899f54d1d72f
```


스테이징 상태


```plain text
2026-09-23T09:33:57.157611Z  INFO garage_net::netapp: Connected to 127.0.0.1:3901, negotiating handshake...
2026-09-23T09:33:57.199700Z  INFO garage_net::netapp: Connection established to 6409899f54d1d72f
Role changes are staged but not yet committed.
Use `garage layout show` to view staged role changes,
and `garage layout apply` to enact staged changes.
```


적용


```bash
docker compose exec garage /garage layout apply --version 1
```


```plain text
2026-09-23T09:36:41.403866Z  INFO garage_net::netapp: Connected to 127.0.0.1:3901, negotiating handshake...
2026-09-23T09:36:41.445720Z  INFO garage_net::netapp: Connection established to 6409899f54d1d72f
==== COMPUTATION OF A NEW PARTITION ASSIGNATION ====

Partitions are replicated 1 times on at least 1 distinct zones.

Optimal partition size:                     3.7 GiB
Usable capacity / total cluster capacity:   953.7 GiB / 953.7 GiB (100.0 %)
Effective capacity (replication factor 1):  953.7 GiB

dc1                 Tags  Partitions        Capacity   Usable capacity
  6409899f54d1d72f  []    256 (256 new)     953.7 GiB  953.7 GiB (100.0%)
  TOTAL                   256 (256 unique)  953.7 GiB  953.7 GiB (100.0%)


New cluster layout with updated role assignment has been applied in cluster.
Data will now be moved around between nodes accordingly.
```


생성 완료. 상태 다시 체크


```bash
docker compose exec garage /garage layout show
```


### 버킷 생성


```bash
docker compose exec garage /garage bucket create mybucket
```


생성 완료


```plain text
2026-09-23T09:38:56.805982Z  INFO garage_net::netapp: Connected to 127.0.0.1:3901, negotiating handshake...
2026-09-23T09:38:56.847685Z  INFO garage_net::netapp: Connection established to 6409899f54d1d72f
==== BUCKET INFORMATION ====
Bucket:          9db3bec13c42ac19396bac4cac65fa3e02d7d3f13aa900039194570362d766a1
Created:         2026-09-23 09:38:56.848 +00:00

Size:            0 B (0 B)
Objects:         0

Website access:  false

Global alias:    mybucket

==== KEYS FOR THIS BUCKET ====
Permissions  Access key    Local aliases
```


### 액세스키 생성


```bash
docker compose exec garage /garage key create my-app-key
```


생성 완료


```plain text
2026-09-23T09:40:14.566030Z  INFO garage_net::netapp: Connected to 127.0.0.1:3901, negotiating handshake...
2026-09-23T09:40:14.607746Z  INFO garage_net::netapp: Connection established to 6409899f54d1d72f
==== ACCESS KEY INFORMATION ====
Key ID:              GK05...
Key name:            my-app-key
Secret key:          5f98a...
Created:             2026-09-23 09:40:14.608 +00:00
Validity:            valid
Expiration:          never

Can create buckets:  false

==== BUCKETS FOR THIS KEY ====
Permissions  ID  Global aliases  Local aliases
```


액세스키 버킷에 권한 추가


```bash
docker compose exec garage /garage bucket allow --read --write mybucket --key my-app-key
```


등록 완료


```plain text
2026-09-23T09:41:35.840001Z  INFO garage_net::netapp: Connected to 127.0.0.1:3901, negotiating handshake...
2026-09-23T09:41:35.882581Z  INFO garage_net::netapp: Connection established to 6409899f54d1d72f
==== BUCKET INFORMATION ====
Bucket:          9db3bec13c42ac19396bac4cac65fa3e02d7d3f13aa900039194570362d766a1
Created:         2026-09-23 09:38:56.848 +00:00

Size:            0 B (0 B)
Objects:         0

Website access:  false

Global alias:    mybucket

==== KEYS FOR THIS BUCKET ====
Permissions  Access key                              Local aliases
RW           GK05...                      my-app-key
```


## API 테스트


이제 `aws` CLI 로 실제 객체를 넣어본다. Garage 는 다른 기기에서 접근하는 게 자연스러우니 엔드포인트를 주소로 지정한다. 아래 `192.168.0.10` 은 예시이므로 Garage 가 도는 기기의 주소로 바꾼다.


```bash
export AWS_ACCESS_KEY_ID=GK...
export AWS_SECRET_ACCESS_KEY=...
export AWS_REGION=garage
export AWS_EC2_METADATA_DISABLED=true
```


`AWS_EC2_METADATA_DISABLED` 를 켜두는 게 좋다. 켜지 않으면 CLI 가 EC2 메타데이터 서비스를 찾느라 잠시 멈추는 경우가 있다.


### 리전이 맞아야 서명이 통과한다


`AWS_REGION` 을 빼먹거나 다른 값으로 두면 이렇게 된다.


```javascript
An error occurred (AuthorizationHeaderMalformed) when calling the ListBuckets operation:
Authorization header malformed, unexpected scope: '20260923/us-east-1/s3/aws4_request',
expected: '20260923/garage/s3/aws4_request'
```


연결은 됐는데 서명에서 막힌 것이다. 다행히 에러가 기대하는 스코프를 그대로 알려주므로 `garage.toml` 의 `s3_region` 과 맞추면 된다.


### 넣고 빼기


리전을 맞추면 목록부터 나온다.


```bash
aws --endpoint-url http://192.168.0.10:3900 s3 ls
```


```javascript
2026-09-23 18:38:56 mybucket
```


파일을 하나 올린다.


```bash
echo "hello garage" > hello.txt
aws --endpoint-url http://192.168.0.10:3900 s3 cp hello.txt s3://mybucket/test/hello.txt
```


```javascript
upload: ./hello.txt to s3://mybucket/test/hello.txt
```


확인한다.


```bash
aws --endpoint-url http://192.168.0.10:3900 s3api head-object \
  --bucket mybucket --key test/hello.txt
```


```json
{
    "AcceptRanges": "bytes",
    "LastModified": "2026-09-23T09:45:12+00:00",
    "ContentLength": 13,
    "ETag": "\"d719760daa49cdebc41dfdd40474cb37\"",
    "ContentType": "text/plain",
    "Metadata": {}
}
```


`ContentType` 은 CLI 가 확장자를 보고 추론해 보낸 값이다. `ETag` 는 내용의 MD5 인데, 단일 업로드라서 그렇고 멀티파트로 올리면 계산 방식이 달라진다.


내려받아 원본과 비교하면 왕복이 온전한지 확인할 수 있다.


```bash
aws --endpoint-url http://192.168.0.10:3900 s3 cp s3://mybucket/test/hello.txt roundtrip.txt
diff hello.txt roundtrip.txt
```


## 버킷 주소 방식 - path-style 과 vhost-style


### path-style 이 기본이다


위 명령들이 별도 설정 없이 그대로 먹은 이유가 있다. `root_domain` 을 생략했으므로 Garage 가 Host 헤더를 보지 않고 경로에서 버킷을 찾는다.


```javascript
http://192.168.0.10:3900/mybucket/test/hello.txt
                         ^^^^^^^^ bucket
```


### vhost-style 로 바꾸기


AWS 가 path-style 방식을 구식으로 밀어내면서 요즘 SDK 들은 호스트 이름에 버킷을 넣는 vhost-style 을 기본으로 잡는다. 


```bash
# garage.toml

# ...

[s3_api]
# ...
root_domain = ".s3.plzhans.com"
```


설정 파일은 기동할 때만 읽으므로 재시작만 하면 된다.


```bash
docker compose restart garage
```


최종 경로. `mybucket.s3.plzhans.com` 이 Garage 호스트로 풀려야 하므로 와일드카드 DNS 레코드가 필요하다.


```bash
http://mybucket.s3.plzhans.com:3900/test/hello.txt
       ^^^^^^^^ bucket
```


---


## 주요 명령어


**상태 확인**


```bash
docker compose exec garage /garage status
docker compose exec garage /garage stats
docker compose exec garage /garage health
```


**레이아웃**


```bash
docker compose exec garage /garage layout show
docker compose exec garage /garage layout assign -z dc1 -c 500G <node_id>
docker compose exec garage /garage layout apply --version 1
docker compose exec garage /garage layout revert
```


**키**


```bash
docker compose exec garage /garage key create my-app-key
docker compose exec garage /garage key list
docker compose exec garage /garage key info my-app-key
docker compose exec garage /garage key delete my-app-key
```


**버킷**


```bash
docker compose exec garage /garage bucket create mybucket
docker compose exec garage /garage bucket list
docker compose exec garage /garage bucket info mybucket
docker compose exec garage /garage bucket allow --read --write mybucket --key my-app-key
docker compose exec garage /garage bucket deny --write mybucket --key my-app-key
docker compose exec garage /garage bucket website --allow mybucket
docker compose exec garage /garage bucket alias mybucket s3.plzhans.com
docker compose exec garage /garage bucket delete mybucket
```


---


## FAQ


### s3_region 은 AWS 리전이 아니다


`s3_region` 을 보면 "어느 리전에 만들지" 로 읽힌다. 그게 아니다.


AWS 에서 리전은 세 역할을 겸한다. 데이터가 물리적으로 놓이는 위치, 엔드포인트 주소, 그리고 SigV4 서명 스코프. Garage 에는 리전이라는 개념이 없다. 클러스터 하나가 전부다. 그런데 S3 프로토콜을 흉내 내려면 서명에 리전 문자열이 반드시 들어가야 한다. `s3_region` 은 그 선언이고, 세 역할 중 서명 스코프 하나만 남은 껍데기다. 값이 무엇이든 데이터는 움직이지 않는다.


Garage 에서 물리적 위치는 레이아웃의 존이 정한다.


### s3_region 지정하지 않으면 오류 발생


```javascript
garage | Error: TOML decode error: TOML parse error at line 14, column 1
garage |    |
garage | 14 | [s3_api]
garage |    | ^^^^^^^^
garage | missing field `s3_region`
```


에러가 `[s3_api]` 줄을 가리켜서 섹션 자체가 잘못된 줄 알기 쉽다. 실제로는 그 안의 필드 하나가 빠진 것이다. 설정 문서에는 `s3_region` 의 기본값이 `"garage"` 라고 적혀 있는데, 이건 관례적으로 쓰는 값이라는 뜻이지 생략하면 채워준다는 뜻이 아니다. 소스에는 `pub s3_region: String` 으로 기본값 없이 선언돼 있다.


문서에 "default" 라고 적힌 값을 믿고 지우면 이렇게 된다. `metadata_dir` · `data_dir` · `rpc_bind_addr` · `replication_factor` · `s3_region` 다섯 개는 전부 채워야 한다.


---


## 정리


Garage 는 S3 API 를 말하지만 S3 가 아니다. 버킷을 만들기 전에 노드에 역할을 줘야 하고, 권한은 키 단위로만 존재하며, 설정 파일 없이는 기동조차 하지 않는다. 이 세 가지만 알고 시작하면 나머지는 순조롭다.


반대로 작게 시작하기에는 좋다. 바이너리 하나에 설정 파일 한 장, 필수 항목은 다섯 개뿐이다. 도커 컴포즈 파일 열다섯 줄로 S3 호환 스토리지가 생기고, `aws` CLI 가 그대로 붙는다.


여기까지가 바닥이다. 실제로 쓰려면 도메인을 붙이고 HTTPS 를 씌워야 하는데, Garage 자신은 TLS 를 하지 않으므로 앞단이 필요하다. 공개 파일을 웹에 내보내는 것도 S3 API 가 아니라 별도 엔드포인트가 맡는다. 그 이야기는 다음 글에서 이어간다.


### 참고

- [Garage 공식 문서](https://garagehq.deuxfleurs.fr/documentation/quick-start/)
- [Garage 설정 레퍼런스](https://garagehq.deuxfleurs.fr/documentation/reference-manual/configuration/)
- [Garage S3 호환성 목록](https://garagehq.deuxfleurs.fr/documentation/reference-manual/s3-compatibility/)
- [dxflrs/garage on Docker Hub](https://hub.docker.com/r/dxflrs/garage)
- [이 글의 설정 파일 - sample/docker/garage](https://github.com/plzhans/hans-blog/tree/master/sample/docker/garage)
