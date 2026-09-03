---
id: "98"
translationKey: "98"
slug: "98-wg-easy-wireguard-masquerade-exclude-openvpn-client-ip"
title: "wg-easy WireGuard MASQUERADE 除外設定でOpenVPNクライアントIPを維持する方法"
description: "wg-easy WireGuardでMASQUERADEによりリクエストIPがVPNサーバーIPに置き換わる原因と解決策をまとめます。iptables NATルールで特定の宛先帯域を除外し、OpenVPNクライアントのプライベートIPをそのままログに残します。"
categories:
  - "networking"
tags:
  - "vpn"
date: 2026-03-19T06:06:00.000Z
lastmod: 2026-09-03T11:08:00.000Z
toc: true
draft: false
images:
  - "assets/1_32822a0f-7e83-8086-99d3-e8f53af5998c.png"
---


![WireGuard MASQUERADEで特定の帯域を除外し、OpenVPNクライアントのプライベートIPをそのまま維持する構成を示す代表画像](./assets/1_32822a0f-7e83-8086-99d3-e8f53af5998c.png)


## 概要


WireGuard(wg-easy)のデフォルトNAT(MASQUERADE)設定のため、内部網(例: OpenVPNプライベート網)にリクエストを送ると、最終サーバー側ではVPNサーバーIPがリクエストIPとして見えます。


特定の帯域をMASQUERADE対象から除外すると、OpenVPNクライアントのプライベートIPがそのままリクエストIPとして伝わります。


wg-easyのデフォルトフック(PostUp / PostDown)には、次のようなNATルールが含まれています。

- `POSTROUTING` チェーンで `-j MASQUERADE` が適用されます。
- この設定が有効になると、VPNクライアントのトラフィックが外部に出る際、送信元IPがVPNサーバーIPに変換されます。
- そのため、OpenVPNプライベート網のような内部帯域にアクセスする場合も、最終サーバーのログにはVPNサーバーIPが残ります。

---


## 解決方法: iptables


ポイントは<strong>MASQUERADEの適用から特定の宛先帯域を除外</strong>することです。

- `iptables` のNATルールに `! -d {除外する帯域}` を追加します。
- そうすると、その宛先へ向かうトラフィックはSNAT(MASQUERADE)なしで転送されます。
- 結果として、最終サーバーは<strong>OpenVPNクライアントのプライベートIPをリクエストIPとして認識</strong>します。
> ポイント  
> - 変更前: `-A POSTROUTING -s {vpnCidr} -o {device} -j MASQUERADE`   
> - 変更後: `-A POSTROUTING -s {vpnCidr} ! -d {excludeCidr} -o {device} -j MASQUERADE`

## 解決方法: wg-easyを使用する場合


wg-easyを使用している場合は、以下のメニューでフックを修正します。

- wg-easy管理パネル
- **Hooks** メニュー
- PostUp / PostDown スクリプト

### 設定例


### 既存の設定


PostUp


```plain text
iptables -t nat -A POSTROUTING -s ipv4Cidr -o device -j MASQUERADE; iptables -A INPUT -p udp -m udp --dport port -j ACCEPT; iptables -A FORWARD -i wg0 -j ACCEPT; iptables -A FORWARD -o wg0 -j ACCEPT; ip6tables -t nat -A POSTROUTING -s ipv6Cidr -o device -j MASQUERADE; ip6tables -A INPUT -p udp -m udp --dport port -j ACCEPT; ip6tables -A FORWARD -i wg0 -j ACCEPT; ip6tables -A FORWARD -o wg0 -j ACCEPT;
```


PostDown


```plain text
iptables -t nat -D POSTROUTING -s ipv4Cidr -o device -j MASQUERADE; iptables -D INPUT -p udp -m udp --dport port -j ACCEPT; iptables -D FORWARD -i wg0 -j ACCEPT; iptables -D FORWARD -o wg0 -j ACCEPT; ip6tables -t nat -D POSTROUTING -s ipv6Cidr -o device -j MASQUERADE; ip6tables -D INPUT -p udp -m udp --dport port -j ACCEPT; ip6tables -D FORWARD -i wg0 -j ACCEPT; ip6tables -D FORWARD -o wg0 -j ACCEPT;
```


### 変更後の設定


例として `172.31.0.0/20` 帯域を<strong>MASQUERADE除外対象</strong>とします。

- OpenVPNプライベート網(最終サーバーが位置する内部網)が `172.31.0.0/20` であれば、この帯域宛のリクエストはSNATされません。

PostUp


```plain text
iptables -t nat -A POSTROUTING -s ipv4Cidr ! -d 172.31.0.0/20 -o device -j MASQUERADE; iptables -A INPUT -p udp -m udp --dport port -j ACCEPT; iptables -A FORWARD -i wg0 -j ACCEPT; iptables -A FORWARD -o wg0 -j ACCEPT; ip6tables -t nat -A POSTROUTING -s ipv6Cidr -o device -j MASQUERADE; ip6tables -A INPUT -p udp -m udp --dport port -j ACCEPT; ip6tables -A FORWARD -i wg0 -j ACCEPT; ip6tables -A FORWARD -o wg0 -j ACCEPT;
```


PostDown


```plain text
iptables -t nat -D POSTROUTING -s ipv4Cidr ! -d 172.31.0.0/20 -o device -j MASQUERADE; iptables -D INPUT -p udp -m udp --dport port -j ACCEPT; iptables -D FORWARD -i wg0 -j ACCEPT; iptables -D FORWARD -o wg0 -j ACCEPT; ip6tables -t nat -D POSTROUTING -s ipv6Cidr -o device -j MASQUERADE; ip6tables -D INPUT -p udp -m udp --dport port -j ACCEPT; ip6tables -D FORWARD -i wg0 -j ACCEPT; ip6tables -D FORWARD -o wg0 -j ACCEPT;
```


### 全体構造で見る


以下は変更ポイントがどこに入るかを一度に確認するための形です。

> # IPv4 NAT (指定帯域を除外)  
> iptables -t nat -A POSTROUTING -s {{ipv4Cidr}} **! -d 172.31.0.0/20** -o {{device}} -j MASQUERADE;  
>   
> # WireGuardポートの許可 (UDP)  
> iptables -A INPUT -p udp -m udp --dport {{port}} -j ACCEPT;  
>   
> # フォワーディング許可 (VPN → 外部)  
> iptables -A FORWARD -i wg0 -j ACCEPT;  
>   
> # フォワーディング許可 (外部 → VPN)  
> iptables -A FORWARD -o wg0 -j ACCEPT;  
>   
> # IPv6 NAT  
> ip6tables -t nat -A POSTROUTING -s {{ipv6Cidr}} -o {{device}} -j MASQUERADE;  
>   
> # IPv6 WireGuardポートの許可  
> ip6tables -A INPUT -p udp -m udp --dport {{port}} -j ACCEPT;  
>   
> # IPv6フォワーディング許可 (VPN → 外部)  
> ip6tables -A FORWARD -i wg0 -j ACCEPT;  
>   
> # IPv6フォワーディング許可 (外部 → VPN)  
> ip6tables -A FORWARD -o wg0 -j ACCEPT;

## 関連記事

- [VPN・リモートアクセスガイド - 何を選べばいいか](../121-vpn-remote-access-guide/)
- [WireGuardのインストールとクライアント接続設定方法](../116-wireguard-install-client-setup/)
- [Tailscale Linuxインストール - 安全なリモートVPN構成](../111-tailscale-linux-install-secure-remote-vpn/)
