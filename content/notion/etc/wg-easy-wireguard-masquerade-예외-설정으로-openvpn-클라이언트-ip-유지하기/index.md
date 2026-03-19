---
id: "98"
translationKey: "98"
slug: "98-wg-easy-wireguard-masquerade-exclude-openvpn-client-ip"
title: "wg-easy WireGuard MASQUERADE 예외 설정으로 OpenVPN 클라이언트 IP 유지하기"
description: "wg-easy WireGuard에서 MASQUERADE 때문에 요청 IP가 VPN 서버로 바뀌는 문제를 정리합니다. iptables NAT 규칙에 목적지 대역 예외를 추가해 OpenVPN 클라이언트 사설 IP를 로그에 남기세요."
categories:
  - etc
date: 2026-03-19T05:07:00.000Z
lastmod: 2026-03-19T06:05:00.000Z
toc: true
draft: false
images:
  - "assets/1_32822a0f-7e83-8086-99d3-e8f53af5998c.png"
---


![](./assets/1_32822a0f-7e83-8086-99d3-e8f53af5998c.png)


## 요약


WireGuard(wg-easy)의 기본 NAT(MASQUERADE) 설정 때문에, 내부망(예: OpenVPN 사설망)으로 요청을 보낼 때 최종 서버에서는 VPN 서버 IP가 요청 IP로 보인다.


특정 대역을 MASQUERADE 대상에서 제외하면, OpenVPN 클라이언트의 사설 IP가 그대로 요청 IP로 전달된다.


wg-easy 기본 훅(PostUp / PostDown)에는 다음과 같은 NAT 규칙이 포함된다.

- `POSTROUTING` 체인에서 `-j MASQUERADE` 를 적용한다.
- 이 설정이 활성화되면, VPN 클라이언트 트래픽이 외부로 나갈 때 출발지 IP가 VPN 서버 IP로 변환된다.
- 그래서 OpenVPN 사설망 같은 내부 대역으로 접근할 때도, 최종 서버 로그에는 VPN 서버 IP가 남는다.

---


## 해결 방법: iptables


핵심은 <strong>MASQUERADE 적용에서 특정 목적지 대역을 제외</strong>하는 것이다.

- `iptables` NAT 규칙에 `! -d {제외할 대역}` 을 추가한다.
- 그러면 해당 목적지로 향하는 트래픽은 SNAT(MASQUERADE) 없이 전달된다.
- 결과적으로 최종 서버는 <strong>OpenVPN 클라이언트의 사설 IP를 요청 IP로 인식</strong>한다.
> 포인트  
> - 기존: `-A POSTROUTING -s {vpnCidr} -o {device} -j MASQUERADE`   
> - 변경: `-A POSTROUTING -s {vpnCidr} ! -d {excludeCidr} -o {device} -j MASQUERADE`

## 해결 방법 : wg-easy 사용하는 경우


wg-easy를 사용한다면 아래 메뉴에서 훅을 수정한다.

- wg-easy 관리 패널
- **Hooks** 메뉴
- PostUp / PostDown 스크립트

### 설정 예시


### 기존 설정


PostUp


```plain text
iptables -t nat -A POSTROUTING -s ipv4Cidr -o device -j MASQUERADE; iptables -A INPUT -p udp -m udp --dport port -j ACCEPT; iptables -A FORWARD -i wg0 -j ACCEPT; iptables -A FORWARD -o wg0 -j ACCEPT; ip6tables -t nat -A POSTROUTING -s ipv6Cidr -o device -j MASQUERADE; ip6tables -A INPUT -p udp -m udp --dport port -j ACCEPT; ip6tables -A FORWARD -i wg0 -j ACCEPT; ip6tables -A FORWARD -o wg0 -j ACCEPT;
```


PostDown


```plain text
iptables -t nat -D POSTROUTING -s ipv4Cidr -o device -j MASQUERADE; iptables -D INPUT -p udp -m udp --dport port -j ACCEPT; iptables -D FORWARD -i wg0 -j ACCEPT; iptables -D FORWARD -o wg0 -j ACCEPT; ip6tables -t nat -D POSTROUTING -s ipv6Cidr -o device -j MASQUERADE; ip6tables -D INPUT -p udp -m udp --dport port -j ACCEPT; ip6tables -D FORWARD -i wg0 -j ACCEPT; ip6tables -D FORWARD -o wg0 -j ACCEPT;
```


### 변경 설정


예시로 `172.31.0.0/20` 대역을 <strong>MASQUERADE 제외 대상</strong>으로 둔다.

- OpenVPN 사설망(최종 서버가 위치한 내부망)이 `172.31.0.0/20` 라면 이 대역으로 가는 요청은 SNAT를 하지 않는다.

PostUp


```plain text
iptables -t nat -A POSTROUTING -s ipv4Cidr ! -d 172.31.0.0/20 -o device -j MASQUERADE; iptables -A INPUT -p udp -m udp --dport port -j ACCEPT; iptables -A FORWARD -i wg0 -j ACCEPT; iptables -A FORWARD -o wg0 -j ACCEPT; ip6tables -t nat -A POSTROUTING -s ipv6Cidr -o device -j MASQUERADE; ip6tables -A INPUT -p udp -m udp --dport port -j ACCEPT; ip6tables -A FORWARD -i wg0 -j ACCEPT; ip6tables -A FORWARD -o wg0 -j ACCEPT;
```


PostDown


```plain text
iptables -t nat -D POSTROUTING -s ipv4Cidr ! -d 172.31.0.0/20 -o device -j MASQUERADE; iptables -D INPUT -p udp -m udp --dport port -j ACCEPT; iptables -D FORWARD -i wg0 -j ACCEPT; iptables -D FORWARD -o wg0 -j ACCEPT; ip6tables -t nat -D POSTROUTING -s ipv6Cidr -o device -j MASQUERADE; ip6tables -D INPUT -p udp -m udp --dport port -j ACCEPT; ip6tables -D FORWARD -i wg0 -j ACCEPT; ip6tables -D FORWARD -o wg0 -j ACCEPT;
```


### 전체 구조로 보기


아래는 변경 포인트가 어디에 들어가는지 한 번에 보기 위한 형태다.

> # IPv4 NAT (지정 대역 제외)  
> iptables -t nat -A POSTROUTING -s {{ipv4Cidr}} **! -d 172.31.0.0/20** -o {{device}} -j MASQUERADE;  
>   
> # WireGuard 포트 허용 (UDP)  
> iptables -A INPUT -p udp -m udp --dport {{port}} -j ACCEPT;  
>   
> # 포워딩 허용 (VPN → 외부)  
> iptables -A FORWARD -i wg0 -j ACCEPT;  
>   
> # 포워딩 허용 (외부 → VPN)  
> iptables -A FORWARD -o wg0 -j ACCEPT;  
>   
> # IPv6 NAT  
> ip6tables -t nat -A POSTROUTING -s {{ipv6Cidr}} -o {{device}} -j MASQUERADE;  
>   
> # IPv6 WireGuard 포트 허용  
> ip6tables -A INPUT -p udp -m udp --dport {{port}} -j ACCEPT;  
>   
> # IPv6 포워딩 허용 (VPN → 외부)  
> ip6tables -A FORWARD -i wg0 -j ACCEPT;  
>   
> # IPv6 포워딩 허용 (외부 → VPN)  
> ip6tables -A FORWARD -o wg0 -j ACCEPT;
