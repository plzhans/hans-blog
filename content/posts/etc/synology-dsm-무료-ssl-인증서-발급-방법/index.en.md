---
id: "104"
translationKey: "104"
slug: "104-synology-dsm-acme-sh-letsencrypt"
title: "How to Issue a Free SSL Certificate on Synology DSM | "
description: "A guide to issuing and auto-renewing a Let's Encrypt free SSL certificate on Synology DSM using acme.sh and Cloudflare DNS validation. Covers synology_dsm deploy-hook setup and troubleshooting 2FA and hostname errors."
categories:
  - "etc"
tags:
  - "dsm"
  - "synology-nas"
date: 2026-06-18T05:03:00.000Z
lastmod: 2026-06-18T07:16:00.000Z
toc: true
draft: false
images:
  - "assets/1_38322a0f-7e83-80ac-9410-f92e336bb81a.png"
---


![](./assets/1_38322a0f-7e83-80ac-9410-f92e336bb81a.png)


## Overview


Directly exposing DSM to the internet is risky, so using a VPN such as Tailscale, OpenVPN, or WireGuard is recommended.


In an environment where external access is blocked and the domain is mapped to a private IP, registering a free certificate via HTTP validation is difficult.


This article explains **how to issue a Let's Encrypt free SSL certificate on Synology NAS (DSM) using [acme.sh](http://acme.sh/) and automatically install it on DSM**.


---


## Prerequisites

- Domain: e.g. `plzhans.com`
- DNS: Cloudflare (recommended)
- An account for DSM auto-installation (a non-2FA account is required, see below)

---


## Issuing a Cloudflare API Token (Minimum Permissions)


For security, create a token with minimum permissions scoped to a specific domain.


### Minimum Required Permissions

- DNS: Read, Edit
- Zone: Read

![](./assets/2_36122a0f-7e83-80e6-9c56-c0c62fc2aa95.png)


---


## Issuing a Certificate ([acme.sh](http://acme.sh/))


### Test with the Staging Server First


Repeated requests to the production server may result in rate limiting. Use the staging server until you have a successful cycle.

- `--server letsencrypt_test`
- The `--issue` option is required for issuance

```bash
#!/bin/bash

export CF_Token="cloudflare_api_token"

acme.sh \
  --server letsencrypt_test \
  --log --debug \
  --home ~/ssl \
  --issue \
  --dns dns_cf \
  -d "plzhans.com" \
  -d "*.plzhans.com"
```


### Production Issuance


```bash
acme.sh \
  --server letsencrypt \
  --log --debug \
  --home ~/ssl \
  --issue \
  --dns dns_cf \
  -d "plzhans.com" \
  -d "*.plzhans.com"
```


### Verify Issuance


```bash
acme.sh \
  --home ~/scripts/ssl \
  --list

# execute result
# Main_Domain	KeyLength	SAN_Domains	CA	Created	Renew
# plzhans.com	"ec-256"	*.plzhans.com	LetsEncrypt.org	2026-05-15T04:59:58Z	2026-07-13T04:59:58Z
```


Notes

- The token information used is saved in the `account.conf` file
- Domain configuration is saved in e.g. `~/ssl/plzhans.com_ecc/plzhans.com.conf`

---


## Installing the Issued Certificate on DSM (deploy-hook)


[acme.sh](http://acme.sh/) supports `synology_dsm` as a deploy-hook.

- If no certificate exists on DSM, the `SYNO_Create="1"` value is required to create one
- If a test certificate has already been issued, you may need to delete it or use the `--force` option

### Removing an Existing Certificate (If Needed)


```bash
acme.sh --remove --home ~/ssl -d "plzhans.com"
```


### DSM Auto-install Script Example


```bash
#!/bin/bash

# syno server
export SYNO_Hostname="localhost"
export SYNO_Scheme="https"
export SYNO_Port="5001"

# syno account
export SYNO_Username='system-script'
export SYNO_Password='secret'

export SYNO_Create="1"

acme.sh \
  --deploy \
  --insecure \
  --home ~/ssl \
  --log --debug \
  --deploy-hook synology_dsm \
  -d "plzhans.com"

# execute result
# ...
# ret='0'
# Success
```


---


## Issue: 2FA Blocking Automation


If the `SYNO_Username` account has 2FA enabled, it will interfere with automation.


Solution

- Create a separate account (admin account required)
- Operate with minimum security measures for automation
    - No external access
    - Grant only the necessary permissions
- Disable 2FA for that account

DSM Verification


![](./assets/3_36122a0f-7e83-808e-9e19-d5de5cd0c5e1.png)


---


## FAQ: Hostname/Certificate Matching Issue


If external access is blocked and the primary domain is unreachable (e.g. `wee-home.synology.me`), a certificate matching error may occur because the command accesses `https://{Hostname}:{port}`.


Choose one of three solutions

1. Set `SYNO_Hostname` to an accessible domain with a valid certificate
2. Add a domain entry in the `/etc/hosts` file to bypass DNS resolution and connect to `127.0.0.1`
3. Use the `http` scheme instead

---


## References

- [https://github.com/acmesh-official/acme.sh/wiki/Synology-NAS-Guide](https://github.com/acmesh-official/acme.sh/wiki/Synology-NAS-Guide)
