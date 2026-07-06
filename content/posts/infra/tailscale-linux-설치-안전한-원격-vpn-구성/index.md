---
id: "111"
translationKey: "111"
slug: "111-tailscale-linux-install-secure-remote-vpn"
title: "Tailscale Linux 설치 - 안전한 원격 VPN 구성"
description: "리눅스 서버에 Tailscale을 설치해 안전한 원격 VPN 환경을 구성하는 방법을 설명합니다. 아웃바운드 기반 연결, P2P 통신, DERP 릴레이, Serve와 Funnel 활용 방식을 함께 정리합니다."
categories:
  - "infra"
tags:
  - "linux"
  - "tailscale"
  - "vpn"
date: 2026-07-03T00:00:00.000Z
lastmod: 2026-07-03T10:39:00.000Z
toc: true
draft: false
images:
  - "assets/1_39222a0f-7e83-80b5-9302-c17947e91a83.png"
---


![](./assets/1_39222a0f-7e83-80b5-9302-c17947e91a83.png)


## 개요


Tailscale은 여러 장치를 하나의 개인 네트워크처럼 묶어주는 VPN 서비스다. 리눅스 서버, NAS, 노트북, 스마트폰이 서로 다른 장소에 있어도 같은 내부망에 있는 것처럼 연결할 수 있다.


일반적인 서버 접속은 외부에서 서버로 들어오는 인바운드 포트를 열어야 한다. 이 방식은 공유기 포트 포워딩, 방화벽 허용, 공인 IP 설정이 필요하고 잘못 설정하면 서버가 인터넷에 직접 노출될 수 있다.


Tailscale은 반대로 장치가 밖으로 나가는 아웃바운드 연결을 사용한다. 그래서 대부분의 환경에서 별도 포트 개방 없이 사용할 수 있다. 다만 회사망이나 보안 장비에서 아웃바운드 통신을 강하게 제한하는 경우에는 방화벽의 아웃바운드 정책 영향을 받을 수 있다.


동작 방식은 간단하다. 각 장치에 Tailscale 클라이언트를 설치하고 같은 계정의 tailnet에 등록한다. 등록된 장치는 고유한 tailnet IP를 받고 가능하면 장치끼리 직접 P2P로 통신한다. 직접 연결이 어려운 NAT나 방화벽 환경에서는 Tailscale의 중계 서버인 DERP를 통해 릴레이 방식으로 통신한다.


또한 Tailscale은 장치 이름 기반의 도메인을 제공한다. 


nginx 리버스 프록시처럼 `https://{device}.{tailnet}.ts.net` 형태의 주소로 내부 서비스를 연결할 수 있다. 


Serve 모드는 tailnet 안에서만 접근 가능한 프록시를 제공하고 Funnel 모드는 필요한 서비스를 인터넷에 공개할 때 사용한다.


## 설치


### 설치 스크립트 사용


```bash
curl -fsSL https://tailscale.com/install.sh | sudo sh
```


### 서비스 시작


enable 로 활성화 하고 —now 로 바로 시작


```bash
sudo systemctl enable --now tailscaled
```


## 실행


### 장치 등록


현재 머신을 지정한 계정의 tailscale 네트워크에 연결하기


ex) https://login.tailscale.com/a/xxxxxxxxxxxxx


```bash
sudo tailscale up

# Result
# To authenticate, visit:
# 
#         https://login.tailscale.com/a/xxxxxxxxxxxxx
```


### 계정 인증


Tailscale 계정 로그인


![](./assets/2_39122a0f-7e83-80f3-bd3f-ff3b63b6482c.png)


### 장치 연결


Connect 버튼을 클릭하여 서비스 접속


![](./assets/3_39122a0f-7e83-8005-91b2-d1f1a9a5967e.png)


![](./assets/4_39122a0f-7e83-80da-a100-ceea15213754.png)


### 장치 등록 완료


장치는 등록 되었지만 --accept-routes 옵션이 false 되었음 : peer 사이에 라우팅 연결 안했다는 뜻


```bash
# Result
# Success.
# Some peers are advertising routes but --accept-routes is false
```


상태 조회


```bash
ubuntu@a1-free:~$ tailscale status

# result
# xx.xx.184.107  a1-free           plzhans@        linux    -                            
# xx.xx.46.27    iphone-14-pro     plzhans@        iOS      -                                  
# xx.xx.192.32   plzhanss-macbook  plzhans@        macOS    -                           
# xx.xx.23.68    wee-home          tagged-devices  linux    -                            

# Health check:
#     - Some peers are advertising routes but --accept-routes is false
```


## VPN 통신


크게 3가지 방법이 있다.

1. tailnet 내부 ip 사용
2. accept-routes 로 라우팅 통해서 vpn 장치 노드간에 통신
3. serve 모드로 vpn 장치 노드간에 통신
4. funnel 모드로 인터넷 누구나 연결 가능 (단, HTTP / HTTPS 가능)

## VPN: tailnet ip 방식


tailnet에 연결 되면 기본적으로 tailnet 전용 사설 ip가 생긴다


기본 설치할때 자동 설치됨

- tune 모드를 이용하기 때문에 내부에 tailscale0 가상 라우터가 생겨있다고 가정

![](./assets/5_39222a0f-7e83-8039-8753-d1d39530060e.png)


## VPN : accept-routes  방식


tailscale 인프라를 쓰지 않고 내부 통신을 하기 때문에 트래픽에 자유로움


### Tailscale 설정

1. 콘솔 이동 : [https://login.tailscale.com/admin](https://login.tailscale.com/admin)
2. Subnet 확인

![](./assets/6_39122a0f-7e83-8041-bf0e-e29819c42c91.png)


### 머신 설정

1. tailscale peer 라우팅  수락

이제부터 tailscale admin 으로부터 라우팅 정보를 받아와서 동기화 함


```bash
tailscale set --accept-routes=true
```

1. 라우팅 체크

nas 사설 ip 가 192.168.35.x 인경우 


```bash
ip route show table all | grep 192.168.35

# Result
# 192.168.35.0/24 dev tailscale0 table 52
```

1. 다른 장치 연결 확인

tailscale p2p 방식을 사용하기 때문에 장비간에 inbound 정책 아니라 outbound 정책을 영향 받음. 


보통 홀펀칭을 시도하고 실패하면 릴레이로 대체 됨.


```bash
nc -vz 192.168.35.3 1022

# Result
# Connection to 192.168.35.3 1022 port [tcp/*] succeeded!
```


## VPN : serve 모드


{장비이름}.tailnet.ts.net 통해서 접근 가능


tailscale 서버를 사용하기 때문에 트래픽 제한이 있음


참고 : [https://tailscale.com/docs/reference/tailscale-cli/serve](https://tailscale.com/docs/reference/tailscale-cli/serve)


```bash
# Client -> xxxxx.tailnet.ts.net:443 -> xxxxx:3000
sudo tailscale serve --https=443 / http://127.0.0.1:3000

# Client -> xxxxx.tailnet.ts.net:80 -> xxxxx:3000
sudo tailscale serve --http=80 / http://127.0.0.1:3000

# Client -> xxxxx.tailnet.ts.net:1111 -> xxxxx:2222
sudo tailscale serve --tcp=1111 tcp://127.0.0.1:2222
```


## VPN : funnel 모드


https://{장비이름}.tailnet.ts.net 통해서 접근 가능


tailscale 서버를 사용하기 때문에 트래픽 제한이 있음


참고 : [https://tailscale.com/docs/reference/tailscale-cli/funnel](https://tailscale.com/docs/reference/tailscale-cli/funnel?utm_source=chatgpt.com)


```bash
# Client -> xxxxx.tailnet.ts.net:443 -> xxxxx:3000
sudo tailscale funnel 3000

# Result
# Available on the internet:
# https://xxxxx.<tailnet>.ts.net
# |-- / proxy http://127.0.0.1:3000
```


## 참고사항


### synology dsm 에 내장된 패키지 tailscale 사용하는 경우


작성일 기준(2006.07.03)으로 tailnet 내장 패키지가 tune 서버가 활성화 되지 않는다


해결책 : 강제 활성화


```bash
# tune 활성화
sudo /var/packages/Tailscale/target/bin/tailscale configure-host

# 재시작
sudo synosystemctl restart pkgctl-Tailscale.service
```


재시작하거나 업데이트 사라질 수 있으므로 dsm 작업 스케쥴러 등록

- 제어판 → 작업 스케쥴러 → 생성 → 트리거된 작업 → 사용자 정의 스크립트
    - 사용자 : root
    - 이벤트 : 부트업
    - 사용자 정의 스크립트

        ```bash
        /var/packages/Tailscale/target/bin/tailscale configure-host
        synosystemctl restart pkgctl-Tailscale.service
        ```

