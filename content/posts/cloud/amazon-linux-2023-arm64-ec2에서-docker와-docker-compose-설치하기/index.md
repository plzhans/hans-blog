---
id: "97"
translationKey: "97"
slug: "97-amazon-linux-2023-arm64-ec2-docker-docker-compose-install"
title: "Amazon Linux 2023 ARM64 EC2에서 Docker와 Docker Compose 설치하기"
description: "Amazon Linux 2023 ARM64(aarch64) EC2에서 dnf로 Docker를 설치하고 서비스 활성화와 docker 그룹 권한까지 구성하는 방법을 정리합니다. Docker Compose 플러그인 설치와 버전 고정, permission denied·arm64 manifest 오류 해결, 로그 용량 제한과 디스크 정리까지 함께 다룹니다."
categories:
  - "cloud"
tags:
  - "aws"
  - "docker"
  - "linux"
date: 2026-03-19T03:44:00.000Z
lastmod: 2026-09-03T07:31:00.000Z
toc: true
draft: false
images:
  - "assets/1_32822a0f-7e83-8061-b2db-e3359b83d6d3.png"
---


![Amazon Linux 2023 ARM64 EC2에 Docker와 Docker Compose를 설치하는 과정을 나타난 대표 이미지](./assets/1_32822a0f-7e83-8061-b2db-e3359b83d6d3.png)


## 개요


Amazon Linux 2023 기반 EC2에서 Docker와 Docker Compose를 동작시키는 최소 설치 절차를 정리한다.


## 패키지 설치


`dnf`는 RHEL 계열(예: Fedora, RHEL, Amazon Linux 2023)에서 사용하는 패키지 매니저다.


Ubuntu/Debian의 `apt-get`이나 CentOS의 `yum`과 같은 역할을 한다.


리포지토리에서 패키지를 내려받아 설치하고 의존성을 자동으로 처리한다.


### 패키지 업데이트


```bash
sudo dnf update -y
```


### Docker 설치


```bash
sudo dnf install -y docker
```


## 기본 설정


### Docker 서비스 활성화


Docker 데몬(dockerd)이 실제로 실행되어야 `docker` 명령이 동작한다.


`enable --now`는 <strong>지금 바로 시작</strong>하고 <strong>재부팅 후에도 자동 시작</strong>되도록 등록한다.


```bash
sudo systemctl enable --now docker
```


### 현재 사용자에게 Docker 권한 부여


기본적으로 Docker 소켓(`/var/run/docker.sock`)은 root 권한이 필요하다.


`docker` 그룹에 사용자를 추가하면 매번 `sudo`를 붙이지 않고도 Docker를 사용할 수 있다.


`newgrp docker`는 <strong>현재 세션에 그룹 변경을 즉시 반영</strong>하기 위한 명령이다.


로그아웃 후 재로그인해도 동일하게 적용된다.


```bash
sudo usermod -aG docker $USER
newgrp docker
```


Docker 실행 확인


```bash
docker version
```


Amazon Linux 2023 환경에서는 Docker 설치만으로 `docker compose`가 함께 제공되는 경우가 있다.


```bash
docker compose version
```


## Docker Compose 별도 설치가 필요한 경우


`docker compose version`이 실패하면 아래 방식으로 CLI 플러그인을 설치한다.


디렉토리 생성


```bash
mkdir -p ~/.docker/cli-plugins
```


설치: ARM64(aarch64)


```bash
curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-aarch64 \
	-o ~/.docker/cli-plugins/docker-compose
```


x86_64 기준


```bash
curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
	-o ~/.docker/cli-plugins/docker-compose
```


실행 권한 추가


```bash
chmod +x ~/.docker/cli-plugins/docker-compose
```


Docker Compose 설치 확인


```bash
docker compose version
```


## 자주 겪는 문제


### permission denied while trying to connect to the Docker daemon socket


`usermod -aG docker`를 실행했지만 현재 셸에 그룹이 반영되지 않은 상태다.


```bash
# 현재 셸이 인식하는 그룹 확인
id -nG
```


`docker`가 목록에 없다면 `newgrp docker`로 현재 셸에 반영한다. `newgrp`은 그 셸에만 적용되므로, SSH 세션을 새로 열거나 로그아웃 후 다시 접속하면 이후로는 자동으로 적용된다.


### no matching manifest for linux/arm64/v8


ARM64 인스턴스에서 amd64 전용 이미지를 실행할 때 나온다. A1이나 Graviton 계열에서 자주 만난다.


먼저 해당 이미지가 arm64를 지원하는지 확인한다.


```bash
docker manifest inspect {이미지명} | grep architecture
```


선택지는 세 가지다.

- arm64를 지원하는 태그를 사용한다. 대부분의 공식 이미지는 멀티아키텍처를 제공한다.
- `docker buildx`로 직접 멀티아키텍처 이미지를 빌드한다.
- `--platform linux/amd64`로 에뮬레이션 실행한다. QEMU 에뮬레이션이 필요하고 성능 저하가 크므로 임시 방편으로만 쓴다.

### 재부팅 후 컨테이너가 올라오지 않는다


`systemctl enable --now docker`는 Docker 데몬만 자동 시작한다. 컨테이너는 재시작 정책을 따로 지정해야 한다.


```bash
docker run -d --restart unless-stopped {이미지명}
```


Compose를 쓴다면 서비스에 `restart: unless-stopped`를 지정한다.


## 운영 전 정리해두면 좋은 것


### 컨테이너 로그 용량 제한


기본 `json-file` 드라이버는 로그를 제한 없이 쌓는다. EC2 디스크가 가득 차는 흔한 원인이다.


```bash
# /etc/docker/daemon.json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```


설정 후 데몬을 재시작한다. 이미 실행 중인 컨테이너에는 적용되지 않으므로 다시 생성해야 한다.


```bash
sudo systemctl restart docker
```


### Docker Compose 버전 고정


앞에서 사용한 `releases/latest` 주소는 내려받는 시점에 따라 다른 버전을 가져온다. 재현 가능한 환경이 필요하면 버전을 고정한다.


```bash
# 릴리스 페이지에서 확인한 버전을 지정한다
COMPOSE_VERSION={사용할 버전}

curl -SL https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-linux-aarch64 \
	-o ~/.docker/cli-plugins/docker-compose

chmod +x ~/.docker/cli-plugins/docker-compose
docker compose version
```


### 디스크 정리


```bash
# 사용량 확인
docker system df

# 미사용 리소스 정리
docker system prune

# 미사용 이미지까지 정리
docker system prune -a
```


`prune -a`는 실행 중이 아닌 컨테이너가 참조하는 이미지까지 삭제한다. 운영 서버에서는 삭제 대상을 확인한 뒤 실행한다.


## 참고

- [Amazon Linux 2023에서 Docker 배포하기(AWS 공식 문서)](https://docs.aws.amazon.com/linux/al2023/ug/docker.html)
- [Docker Compose 설치(Docker 공식 문서)](https://docs.docker.com/compose/install/linux/)
