---
id: "6"
translationKey: "6"
slug: "6-flush-dns-cache"
title: "Windows/Linux/macOS DNS 캐시 지우기"
description: "DNS 레코드 변경 후 접속이 안 될 때 Windows·Linux·macOS에서 DNS 캐시를 플러시하는 방법을 정리합니다. ipconfig, resolvectl, mDNSResponder 명령과 TTL·브라우저 캐시 확인으로 전파 지연을 빠르게 진단하세요."
categories:
  - "infra"
tags:
  - "dns"
date: 2026-02-22T16:11:00.000Z
lastmod: 2026-02-24T15:41:00.000Z
toc: true
draft: false
images:
  - "assets/1_30f22a0f-7e83-8064-b489-d30573976c05.png"
---


![](./assets/1_30f22a0f-7e83-8064-b489-d30573976c05.png)


## 개요


실무 작업을 하다 보면 도메인 설정에서 DNS 레코드를 변경했는데도 로컬 PC나 서버에서 즉시 반영되지 않는 경우가 있습니다.


이는 OS나 애플리케이션(브라우저 등)이 DNS 응답을 로컬에 캐싱하기 때문입니다.


이 글에서는 Windows, Linux, macOS에서 로컬 DNS 캐시를 비우는 방법을 정리합니다.


> ⚠️ **로컬 캐시를 비워도 즉시 반영되지 않을 수 있습니다**  
> 로컬 캐시를 비워도 DNS 리졸버나 네임서버의 캐싱 정책에 의해 **TTL이 남아 있으면** 변경이 바로 전파되지 않을 수 있습니다.  
>   
>   
> 이 경우에는 **일정 시간이 지난 뒤에야** 새로운 레코드가 반영됩니다.  
>   
>   
> 브라우저를 사용 중이라면 브라우저 자체 캐시 때문에 이전 결과가 보일 수 있으니, <strong>실행 중인 브라우저를 모두 종료</strong>한 뒤 다시 확인하세요.


## DNS란?


<strong>DNS(Domain Name System)</strong>는 인터넷의 전화번호부와 같은 역할을 하는 시스템입니다. 


사람이 읽을 수 있는 도메인 이름(예: [plzhans.com](https://plzhans.com/))을 컴퓨터가 이해할 수 있는 IP 주소(예: 185.199.111.153)로 변환해줍니다.


### DNS의 주요 기능

- **도메인 이름 변환:** 사용자가 입력한 도메인 이름을 IP 주소로 변환
- **캐싱:** 자주 사용되는 도메인 정보를 로컬에 저장하여 빠른 접속 가능
- **분산 데이터베이스:** 전 세계에 분산된 서버를 통해 안정적인 서비스 제공

## DNS 캐시를 지우는 이유

- 웹사이트의 IP 주소가 변경되었을 때
- DNS 관련 네트워크 문제 해결
- 오래된 DNS 정보로 인한 접속 오류 수정
- 보안 및 개인정보 보호

---


## Windows에서 DNS 캐시 지우기


Windows에서는 명령 프롬프트(CMD)를 관리자 권한으로 실행하여 DNS 캐시를 지울 수 있습니다.


### Windows에서 DNS 캐시 지우는 방법

1. **명령 프롬프트를 관리자 권한으로 실행:** 시작 메뉴에서 "cmd"를 검색하고, 마우스 오른쪽 버튼을 클릭한 후 "관리자 권한으로 실행"을 선택합니다.
2. **명령어 입력:** 다음 명령어를 입력하고 Enter 키를 누릅니다.

```bash
ipconfig /flushdns
```


**결과 확인:** "DNS 확인자 캐시를 플러시했습니다"라는 메시지가 표시되면 성공적으로 완료된 것입니다.


실행 예시


```plain text
C:\>ipconfig /flushdns

Windows IP 구성

DNS 확인자 캐시를 플러시했습니다.
```


**참고:** 관리자 권한이 없으면 명령어가 실행되지 않으므로 반드시 관리자 권한으로 명령 프롬프트를 실행해야 합니다.


---


## Linux에서 DNS 캐시 지우기


Linux에서는 배포판과 사용 중인 DNS 서비스에 따라 DNS 캐시를 지우는 방법이 다릅니다.


### systemd-resolved 사용 시 (Ubuntu 17.04 이상, Debian 등)


```bash
sudo systemd-resolve --flush-caches
```


또는


```bash
sudo resolvectl flush-caches
```


### nscd 사용 시


```bash
sudo /etc/init.d/nscd restart
```


또는


```bash
sudo systemctl restart nscd
```


### dnsmasq 사용 시


```bash
sudo /etc/init.d/dnsmasq restart
```


또는


```bash
sudo systemctl restart dnsmasq
```


### DNS 캐시 확인


systemd-resolved의 캐시 통계를 확인하려면:


```bash
sudo systemd-resolve --statistics
```


**참고:** Linux 시스템은 기본적으로 DNS 캐시를 사용하지 않는 경우가 많습니다. 


DNS 캐싱 서비스가 설치되어 있지 않다면 별도로 캐시를 지울 필요가 없습니다.


---


## macOS에서 DNS 캐시 지우기


macOS에서는 터미널에서 DNS 캐시를 비울 수 있습니다. 대부분의 버전에서는 아래 명령으로 충분합니다.


### 권장(대부분의 macOS)


```bash
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder
```

{{< details summary="구버전 ?" >}}
`dscacheutil`이 없거나 동작하지 않으면 아래만 시도합니다.


```bash
sudo killall -HUP mDNSResponder
```
{{< /details >}}


### 확인/주의

- 명령 실행 시 관리자 비밀번호 입력이 필요합니다.
- 성공해도 별도 출력이 없을 수 있습니다.
- 변화가 없으면 브라우저 DNS 캐시도 함께 비우거나(브라우저 재시작) 네트워크를 재연결해보세요.
