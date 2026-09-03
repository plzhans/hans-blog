---
id: "121"
translationKey: "121"
slug: "121-vpn-remote-access-guide"
title: "VPN/Remote Access Guide - Which One Should You Pick"
description: "A guide to choosing the right VPN approach among Tailscale, WireGuard, and wg-easy depending on your situation. Compares starting fast with no port forwarding against running your own server."
categories:
  - "networking"
tags:
  - "tailscale"
  - "vpn"
  - "wireguard"
date: 2026-09-03T00:00:00.000Z
lastmod: 2026-09-03T08:50:00.000Z
toc: true
draft: false
---


## Overview


To securely access your home server, NAS, or office internal network from outside, you need a VPN. This blog has posts covering three approaches, each with different characteristics, so you should pick the one that fits your situation.


## Where to Start

- **You need a quick personal/small-team VPN without port forwarding** → [Installing Tailscale on Linux - Secure Remote VPN Setup](../111-tailscale-linux-install-secure-remote-vpn/)
- **You want to run your own VPN server with fine-grained control** → [How to Install WireGuard and Set Up Client Connections](../116-wireguard-install-client-setup/)
- **You want to manage WireGuard through a web UI** → [Keeping the OpenVPN Client IP with a wg-easy WireGuard MASQUERADE Exception](../98-wg-easy-wireguard-masquerade-exclude-openvpn-client-ip/) (but see the caveat below)
- **You want to use OpenVPN** → It's the oldest and most widely used approach, with good client compatibility and plenty of documentation. This blog doesn't cover it yet, but a dedicated post is planned for the future.

## Tailscale — The Fastest Way to Get Started


Each device joins the tailnet through an outbound-only connection, so almost no port opening is required. When direct P2P doesn't work, it falls back to DERP relays. The post covers the tailnet IP, accept-routes, and serve/funnel modes for different situations.


→ [Installing Tailscale on Linux - Secure Remote VPN Setup](../111-tailscale-linux-install-secure-remote-vpn/)


## WireGuard — Running Your Own Server


Covers the full flow from generating server keys, configuring wg0.conf, opening the UDP port on the firewall, registering client peers, to internal network routing via MASQUERADE. Unlike Tailscale, you have to manage server operations and firewall rules yourself, but it's the right approach when you want to keep the entire infrastructure in your own hands.


→ [How to Install WireGuard and Set Up Client Connections](../116-wireguard-install-client-setup/)


## wg-easy — A Problem That Comes Up When Managing WireGuard via Web UI


wg-easy lets you manage WireGuard configuration conveniently through a web UI, but its default MASQUERADE setting causes the source IP of every request passing through the server to be rewritten to the VPN server's IP. To keep an OpenVPN client's actual private IP in the logs, you need to exclude specific ranges in the iptables NAT rules.


→ [Keeping the OpenVPN Client IP with a wg-easy WireGuard MASQUERADE Exception](../98-wg-easy-wireguard-masquerade-exclude-openvpn-client-ip/)
