---
id: "115"
translationKey: "115"
slug: "115-oracle-cloud-always-free-a1-instance-ssh-security"
title: "오라클 클라우드 Always Free A1 인스턴스 생성 방법 - 공인 IP 연결과 SSH 보안 설정"
description: "Oracle Cloud Always Free A1(ARM) 인스턴스를 만드는 방법을 단계별로 정리합니다. 무료 스펙 선택부터 공인 IP 연결 SSH 키 설정 VCN Security List와 NSG로 SSH 22 포트 제한까지 포함합니다."
categories:
  - "cloud"
tags:
  - "infra"
  - "linux"
  - "oracle"
date: 2026-07-10T01:11:00.000Z
lastmod: 2026-07-10T03:44:00.000Z
toc: true
draft: false
images:
  - "assets/1_39922a0f-7e83-80a9-bd69-fd5331deb6ba.png"
---


![](./assets/1_39922a0f-7e83-80a9-bd69-fd5331deb6ba.png)


## 개요


Oracle Cloud Infrastructure(OCI) Always Free 티어로 A1(ARM) 인스턴스를 생성하는 방법을 정리한다.


작성일(2026-07-10) 기준 상시 무료 스펙은 2 OCPU 메모리 12GB 디스크 200GB이다.


OCPU 한도를 나눠 인스턴스를 2대로 구성해도 무료 범위 안에서 운영할 수 있다.


이 글에서는 Compute 인스턴스 생성부터 운영체제·스펙 선택 네트워크 SSH 키 부트 볼륨 설정 공인 IP 연결까지 다룬다.


이어서 VCN Security List의 기본 Any 인바운드 22 포트를 정리하고 Network Security Group 또는 VPN으로 접속을 제한하는 방법을 확인한다.


마지막에 SSH 접속 확인까지 포함한다.


## 오라클 서버 만들기


![](./assets/2_39922a0f-7e83-8092-ac0b-ccd0d183d2c0.png)


인스턴스 생성


Compute → Instacnes → [Create instance]


![](./assets/3_39922a0f-7e83-80d7-bdee-dd7bd3c068ad.png)


인스턴스 기본 정보


![](./assets/4_39922a0f-7e83-8085-974b-eec35383e592.png)


운영체제 선택


운영체제 선택은 자유지만 A1 은 ARM 프로세스이기 때문에 aarch64 중에 골라야 함.


![](./assets/5_39922a0f-7e83-8027-8a3e-f1c19be54abe.png)


사양 선택

- 작성일(2026-07-10) 기준 상시 무료 스팩 : 2 OCPU + Memory 12Gb + Disk 200GB
- 최대 사용량 제한이기 떄문에 OCPU를 1개만 사용하고 인스턴스를 2개를 만들어서 사용해도 무료임

![](./assets/6_39922a0f-7e83-80b6-90f5-f2dfaadd2f0b.png)


다음 단계


![](./assets/7_39922a0f-7e83-803b-b753-d669fe860de4.png)


보안 설정은 별도 진행


![](./assets/8_39922a0f-7e83-80a7-b5eb-d5d66f805a56.png)


네트워크 생성


![](./assets/9_39922a0f-7e83-8022-a00e-c41cfd3f8511.png)


SSH 생성 및 다운로드

- 서버 접속을 위한 SSH 비밀키를 다운로드하고 공개키도 같이 다운로드

![](./assets/10_39922a0f-7e83-80d4-8e2e-c03f64f47e4f.png)


볼륨(디스크) 생성

- 200기가까지 무료
- 디스크 관리를 별도로 해야할 이슈가 없어서 부트 볼륨으로 생성
- 부트 볼륨 + 블록 볼륨 합쳐서 200GB 까지 무료
- 부트 볼륨 : 메인 디스크
- 블록 볼륨 : 확장 디스크

![](./assets/11_39922a0f-7e83-80f8-b602-ed06022271ce.png)


리뷰 확인 후 생성


![](./assets/12_39922a0f-7e83-8026-8a1d-fc6fd073bc0e.png)


생성 중


![](./assets/13_39922a0f-7e83-8096-82b8-d4d26d3c693e.png)


생성 완료


![](./assets/14_39922a0f-7e83-809e-a220-c3e4da1c9bc5.png)


인스턴스 보기


![](./assets/15_39922a0f-7e83-8084-bc4a-e238dceadb28.png)


### 인터넷 외부 연결 - Public network 설정


인스턴스 → 네트워킹 → VNIC 이동


![](./assets/16_39922a0f-7e83-8046-b637-df411681e5aa.png)


VNIC 의 IP 수정


![](./assets/17_39922a0f-7e83-8085-98ab-ced4237b5b2a.png)


고정 IP 생성 후 연결


![](./assets/18_39922a0f-7e83-8071-906a-cd2bbb3a9d22.png)


생성 완료


![](./assets/19_39922a0f-7e83-80bf-9719-d95fd3530508.png)


빠른 이동


![](./assets/20_39922a0f-7e83-80b1-8b6d-e6ddb88534eb.png)


또는 메뉴 이동


![](./assets/21_39922a0f-7e83-8077-b36b-feca3cc6e23d.png)


## 보안 설정


오라클 클라우드 서버의 보안 방화벽은 기본적으로 VCN 의 Security List와 Network Security Group 으로 제어 한다


VCN 의 SecurityList 에 기본 설정으로 원격 접속 22번 포트가 Any로 개방 되어 있어서 후속 조치가 필요하다.


### VCN 기본 정책에서 Any(0.0.0.0/0) 인바운드 22 차단


인스턴스에서 VCN 설정 이동


![](./assets/22_39922a0f-7e83-80f8-8e86-c0a34468835e.png)


Any 개방 된것 삭제

- ICMP 삭제는 필요시 진행

![](./assets/23_39922a0f-7e83-80cf-a851-e0104b75f69e.png)


### 접속 허용 설정


아래 방법중에 선택

1. VCN Security List 항목에서 내 IP 를 등록 함.
2. 인스턴스의 VNIC Network Security Group 으로 IP 등록해서 접근허용
3. 1번이나 2번 방법으로 임시 접근 허용하게 한 후 VPN 을 통해서 접근 (tailscape, openvpn 등등)

### VCN Network Security Group으로 접근 허용


해당 VCN 에서 진행


![](./assets/24_39922a0f-7e83-8023-8e15-ea2368a12db7.png)


![](./assets/25_39922a0f-7e83-8049-b8e1-c5f68ce25858.png)


해당 인스턴스 Primary VNIC 설정으로 이동


![](./assets/26_39922a0f-7e83-8003-a815-d7739c3286c1.png)


연결 후 저장


![](./assets/27_39922a0f-7e83-80bc-b2f6-c9ec9d2d82d5.png)


## 접속확인


```bash
Welcome to Ubuntu 24.04.4 LTS (GNU/Linux 6.17.0-1011-oracle aarch64)

 * Documentation:  https://help.ubuntu.com
 * Management:     https://landscape.canonical.com
 * Support:        https://ubuntu.com/pro

This system has been minimized by removing packages and content that are
not required on a system that users do not log into.

To restore this content, you can run the 'unminimize' command.

The programs included with the Ubuntu system are free software;
the exact distribution terms for each program are described in the
individual files in /usr/share/doc/*/copyright.

Ubuntu comes with ABSOLUTELY NO WARRANTY, to the extent permitted by
applicable law.

To run a command as administrator (user "root"), use "sudo <command>".
See "man sudo_root" for details.

ubuntu@xxxxx:~$
```


## 마무리


OCI Always Free A1 인스턴스는 무료 한도 안에서 ARM 서버를 바로 운영할 수 있는 구성이다.


공인 IP를 연결해야 외부에서 접근할 수 있고 기본 Security List의 Any 인바운드 22 포트는 반드시 정리해야 한다.


실무에서는 허용 IP를 NSG에 등록하거나 Tailscale 같은 VPN으로 우회 접속하는 방식을 권장한다.


SSH 키는 안전하게 보관하고 공개 노출된 22 포트는 최소화하는 것이 기본이다.


여기까지 진행하면 A1 서버 생성부터 안전한 접속 경로까지 갖춘 상태가 된다.

