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
lastmod: 2026-09-03T11:02:00.000Z
toc: true
draft: false
---


## Overview


To securely access your home server, NAS, or office internal network from outside, you need a VPN. Instead of exposing services directly to the internet via port forwarding, the basic idea is to connect through a VPN tunnel as if you were on the same network. This blog has posts covering three very different approaches (Tailscale, WireGuard, wg-easy) — even though they're all called "VPN," their setup, security model, and operational burden are completely different, so you should pick the one that fits your situation.

## Decision Criteria

Before picking an approach, it helps to think through these five points first.

- **NAT/firewall environment** — Is this an environment like a home server behind a router where opening ports is inconvenient or impossible, or a cloud server where you can attach a public IP directly?
- **Security model** — Do you need a zero-trust approach where every device that's allowed to connect is explicitly registered, or is a traditional server-client VPN enough?
- **Operational burden** — Can you afford to maintain the server infrastructure yourself (key management, firewall rules, updates), or would you rather leave it to a managed service?
- **Number of devices/users** — Do you just need one or two laptops connecting, or do multiple people need to connect with different permissions each?
- **Performance** — Does throughput matter, like for large file transfers, or is the traffic as light as an SSH session?

## Comparing the Approaches

| | Tailscale | WireGuard | wg-easy |
|---|---|---|---|
| Server operation | Not needed (managed) | Self-hosted | Self-hosted (web UI) |
| Port opening | Almost never needed | Required (UDP) | Required (UDP) |
| Setup difficulty | Low | High (CLI/config files) | Medium (web UI) |
| Fine-grained control | Low | High | Medium |
| Multi-user management | tailnet ACL | Manual (peer registration) | Managed via web UI |
| Best fit | Getting started fast, individuals/small teams | Full control over your own infrastructure | Managing WireGuard conveniently |

## Where to Start
- **You need a quick personal/small-team VPN without port forwarding** → [Installing Tailscale on Linux - Secure Remote VPN Setup](../111-tailscale-linux-install-secure-remote-vpn/)
- **You want to run your own VPN server with fine-grained control** → [How to Install WireGuard and Set Up Client Connections](../116-wireguard-install-client-setup/)
- **You want to manage WireGuard through a web UI** → [Keeping the OpenVPN Client IP with a wg-easy WireGuard MASQUERADE Exception](../98-wg-easy-wireguard-masquerade-exclude-openvpn-client-ip/) (but see the caveat below)
- **You want to use OpenVPN** → It's the oldest and most widely used approach, with good client compatibility and plenty of documentation. This blog doesn't cover it yet, but a dedicated post is planned for the future.

## Real-World Scenarios
- You want to open just one file on your home NAS from your laptop while traveling → Tailscale
- You want to give your team a standardized way to access several internal company servers → WireGuard
- You want teammates to register their own WireGuard config via a web UI QR code → wg-easy (make sure to set up the MASQUERADE exception)

## Tailscale — The Fastest Way to Get Started


Each device joins the tailnet through an outbound-only connection, so almost no port opening is required. When direct P2P doesn't work, it falls back to DERP relays. The post covers the tailnet IP, accept-routes, and serve/funnel modes for different situations. Since it uses the WireGuard protocol under the hood, performance is close to plain WireGuard — the key difference is that Tailscale handles key exchange, NAT traversal, and ACL management for you. If you just need to connect a laptop or two to a single home server, this is the first thing worth trying.


→ [Installing Tailscale on Linux - Secure Remote VPN Setup](../111-tailscale-linux-install-secure-remote-vpn/)


## WireGuard — Running Your Own Server


Covers the full flow from generating server keys, configuring wg0.conf, opening the UDP port on the firewall, registering client peers, to internal network routing via MASQUERADE. Unlike Tailscale, you have to manage server operations and firewall rules yourself, but it's the right approach when you want to keep the entire infrastructure in your own hands. Its kernel-level implementation means almost no overhead, and a single config file can reproduce the same setup across multiple servers and clients — a real advantage when you need to standardize infrastructure across many machines.


→ [How to Install WireGuard and Set Up Client Connections](../116-wireguard-install-client-setup/)


## wg-easy — A Problem That Comes Up When Managing WireGuard via Web UI


wg-easy lets you manage WireGuard configuration conveniently through a web UI, but its default MASQUERADE setting causes the source IP of every request passing through the server to be rewritten to the VPN server's IP. To keep an OpenVPN client's actual private IP in the logs, you need to exclude specific ranges in the iptables NAT rules. It trades away plain WireGuard's config-file management burden, but in exchange you need to separately check for these kinds of web-UI-specific default-value issues.


→ [Keeping the OpenVPN Client IP with a wg-easy WireGuard MASQUERADE Exception](../98-wg-easy-wireguard-masquerade-exclude-openvpn-client-ip/)

## Conclusion

All three ultimately come down to "who manages the infrastructure." If you don't want to manage anything, pick Tailscale. If you want full control, pick WireGuard. If you want web UI convenience in between, pick wg-easy (just double-check the defaults). This blog covers all three, so start with whichever post matches your situation.
