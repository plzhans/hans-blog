---
id: "116"
translationKey: "116"
slug: "116-wireguard-install-client-setup"
title: "How to Install WireGuard and Set Up Client Access"
description: "This article explains how to install WireGuard VPN on a Linux server and configure key generation, firewall access, and service registration. It also covers Mac client conf configuration and GUI connection verification, so you can build a secure remote access environment."
categories:
  - "infra"
tags:
  - "linux"
  - "mac"
  - "vpn"
  - "wireguard"
date: 2026-07-10T08:20:00.000Z
lastmod: 2026-08-29T10:51:00.000Z
toc: true
draft: false
images:
  - "assets/1_39922a0f-7e83-8083-8055-de3d7910f539.png"
---


![A representative image showing WireGuard VPN being built on a Linux server and a client connecting to it](./assets/1_39922a0f-7e83-8083-8055-de3d7910f539.png)


## Overview


WireGuard is a tool that lets you set up a peer-to-peer VPN with a concise configuration and lightweight performance.


This article walks through the entire flow of installing WireGuard on a Linux server, setting up the server key, firewall, and service, and then connecting from a Mac client.


It covers, in order, server key generation, wg0 configuration, opening UDP port 51820, registering the client Peer, and verifying the connection, so you can follow the same steps to set it up.


## Server Installation


Since it runs as a system service, proceed as root.


### Basic Installation


```bash
apt install wireguard
```


Verify the installation


```bash
wg --version
```


### Generating the Server Key


```bash
mkdir -p /etc/wireguard
wg genkey | tee /etc/wireguard/server.key | wg pubkey | tee /etc/wireguard/server.pub

# Set permissions
chmod 600 /etc/wireguard/server.key
```


### Environment Configuration


Create the config file in advance


```bash
touch /etc/wireguard/wg0.conf
chmod 600 /etc/wireguard/wg0.conf
```


Configure the interface in the config file

- Register the server key
- If SaveConfig is enabled, editing this file and then stopping the server will overwrite the server state
- If you use SaveConfig mode, you need to control it via `wg set` and similar commands

```bash
# /etc/wireguard/wg0.conf
[Interface]
Address = 10.200.0.1/24
ListenPort = 51820
PrivateKey = {server key contents}
SaveConfig = false
```


### Inbound Configuration (Firewall Setup)


Even though this is peer-to-peer, the UDP server port must be open initially for the handshake.


Additionally, if you use iptables, you also need to open the port.


```bash
iptables -I INPUT 1 -p udp --dport 51820 -j ACCEPT

# ubuntu 24
# netfilter-persistent save

# Result
# run-parts: executing /usr/share/netfilter-persistent/plugins.d/15-ip4tables save
# run-parts: executing /usr/share/netfilter-persistent/plugins.d/25-ip6tables save
```


## Running the Server


Register and start the service


```bash
systemctl enable wg-quick@wg0
systemctl start wg-quick@wg0
```


Check with wg


```bash
wg

# Result
# interface: wg0
#  public key: Y9oH7jnQVVILuRnhekWDRh9s7gCOyOf2HerAfS5Iymw=
#  private key: (hidden)
```


Check the interface


```bash
ip addr show wg0

# Result
# 3: wg0: <POINTOPOINT,NOARP,UP,LOWER_UP> mtu 8920 qdisc noqueue state UNKNOWN group default qlen 1000
#     link/none 
#     inet 10.200.0.1/24 scope global wg0
#       valid_lft forever preferred_lft forever
```


## Client Installation


### Generating the User Client Key (local client work)

- You can generate the user's private key on the server, but it must not be left there after generation
- The server only needs to know the public key text
- After moving the generated private key to the client, delete it

If you're installing locally on a Mac and wg is not installed, you need to install it.


```bash
brew install wireguard-tools
```


### Generating the Key


```bash
# Create and move into the directory
mkdir -p ~/.wireguard
cd ~/.wireguard

# Generate the key: wg genkey | tee {KeyName}.key | wg pubkey > {KeyName}.pub
wg genkey | tee user.key | wg pubkey > user.pub
```


### Important! Register the User Key on the Server


Register the peer information in the wg0.conf file

- You can configure multiple Peers
- AllowedIPs forwards requests sent to it to the corresponding Peer

```bash
# /etc/wireguard/wg0.conf append

# plzhans
[Peer]
PublicKey = {public key contents}
AllowedIPs = 10.200.0.2/32
```


Restart the server


```bash
systemctl restart wg-quick@wg0
```


## Client Connecting to the Server


Understanding this as characteristic of peer-to-peer communication, you can just set up the reverse of the server configuration.


### WireGuard Client Configuration


Verify the installation


```bash
wg --version
wg-quick --version
```


### User Client Connection (local client work)

- Endpoint: External public IP
- PersistentKeepalive: Keep alive time

```bash
# ~/.wireguard/xx-server.conf

[Interface]
PrivateKey = {user private key contents}
Address = 10.200.0.2/24

[Peer]
PublicKey = {server key contents}
Endpoint = {server public IP}:51820
AllowedIPs = 10.200.0.1/32
PersistentKeepalive = 25
```


### Running the Client


```bash
sudo wg-quick up ~/.wireguard/xx-server.conf

# stop
sudo wg-quick down ~/.wireguard/xx-server.conf
```


### Checking the Client Status

- If you see this line, the connection is finally established: latest handshake: 5 seconds ago

```bash
wg

# Result
# interface: utun12
#   public key: b69QMnldUd60JLXEUc4j8QzKI/1su1h4e6scx/YgrHE=
#   private key: (hidden)
#   listening port: 64874

# peer: Y9oH7jnQVVILuRnhekWDRh9s7gCOyOf2HerAfS5Iymw=
#   endpoint: 161.33.140.98:51820
#   allowed ips: 10.200.0.1/32
#   latest handshake: 5 seconds ago
#   transfer: 92 B received, 180 B sent
#   persistent keepalive: every 25 seconds
```


### Using a Client GUI Tool


Import the client conf file you created earlier.


import


![A screen showing the client conf file being imported into the WireGuard GUI client](./assets/2_39922a0f-7e83-80c1-ad8d-df9d68816cd4.png)


Verify the registration


![A screen showing that the imported tunnel is registered in the GUI client list](./assets/3_39922a0f-7e83-804b-a53f-e609694788ff.png)


Verify the connection


![A screen showing that the VPN tunnel is connected in the GUI client](./assets/4_39922a0f-7e83-8053-94f8-de82008e95e9.png)


## Verifying Access to the Private Server


### Checking VPN IP SSH Access


```bash
nc -vz 10.200.0.1 22
Connection to 10.200.0.1 port 22 [tcp/ssh] succeeded!
```


## IP Routing


Now you need to configure access from the local client, via the VPN server, to the internal network (using MASQUERADE).


The following assumes:

- The server's private network: 10.200.0.0/24
- The server's network interface: enp0s6

```bash
# /etc/wireguard/wg0.conf append
[Interface]
...

# IP FORWARD
PostUp = sysctl -w net.ipv4.ip_forward=1
PostUp = iptables -t nat -A POSTROUTING -s 10.200.0.0/24 -o enp0s6 -j MASQUERADE
PostUp = iptables -I FORWARD 1 -i %i -j ACCEPT
PostUp = iptables -I FORWARD 1 -o %i -j ACCEPT

PostDown = iptables -t nat -D POSTROUTING -s 10.200.0.0/24 -o enp0s6 -j MASQUERADE
PostDown = iptables -D FORWARD -i %i -j ACCEPT
PostDown = iptables -D FORWARD -o %i -j ACCEPT
```


## Wrap-up


Once you've completed everything from server installation to client connection verification, you can access internal services such as SSH via the VPN IP.


When adding a Peer, you only need to register the public key and AllowedIPs on the server, and keep the private key only on the client.


With a GUI client, simply importing the generated conf file allows you to connect the same way.


The SaveConfig option and the firewall's UDP port are common sources of mistakes during operation, so it's a good idea to double-check them before configuring.
