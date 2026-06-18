---
id: "104"
translationKey: "104"
slug: "104-synology-dsm-acme-sh-letsencrypt"
title: "How to Issue a Free SSL Certificate on Synology DSM | "
description: "A guide on how to issue and automatically renew a Let’s Encrypt free SSL certificate on Synology DSM using acme.sh and Cloudflare DNS validation. Covers synology_dsm deploy-hook configuration as well as resolving 2FA and Hostname errors."
categories:
  - etc
date: 2026-06-18T05:03:00.000Z
lastmod: 2026-06-18T06:09:00.000Z
toc: true
draft: false
images:
  - "assets/1_38322a0f-7e83-80ac-9410-f92e336bb81a.png"
---


![](./assets/1_38322a0f-7e83-80ac-9410-f92e336bb81a.png)


## Overview


Exposing DSM directly to the outside is risky, so using a VPN such as Tailscale, OpenVPN, or WireGuard is recommended.


In an environment where external access is blocked and the domain is matched to a private IP, registering a free certificate via the HTTP validation method is difficult.


This article explains **how to issue a Let’s Encrypt free SSL certificate with** [**acme.sh<strong>](http://acme.sh/)</strong> on a **Synology NAS (DSM)** and automatically install it into DSM.


---


## Prerequisites

- Domain: e.g., `plzhans.com`
- DNS: Cloudflare (recommended)
- Account for DSM automatic installation (an account without 2FA is required, see below)

---


## Issuing a Cloudflare API Token (Least Privilege)


For security, create a token that grants only the minimum permissions for a specific domain.


### Minimum Required Permissions

- DNS: Read, Edit
- Zone: Read

![](./assets/2_36122a0f-7e83-80e6-9c56-c0c62fc2aa95.png)


---


## Issuing the Certificate ([acme.sh](http://acme.sh/))


### Verify First with the Test Server


Repeatedly sending requests to the Production server can get you blocked. Use the test server until you have established a successful cycle.

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


### Actual (Production) Issuance


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


### Verifying the Issuance


```bash
acme.sh \
  --home ~/scripts/ssl \
  --list

# execute result
# Main_Domain	KeyLength	SAN_Domains	CA	Created	Renew
# plzhans.com	"ec-256"	*.plzhans.com	LetsEncrypt.org	2026-05-15T04:59:58Z	2026-07-13T04:59:58Z
```


Notes

- The token information you used is stored in the `account.conf` file
- The domain configuration is stored in, e.g., `~/ssl/plzhans.com_ecc/plzhans.com.conf`

---


## Installing the Issued Certificate into DSM (deploy-hook)


[acme.sh](http://acme.sh/) supports `synology_dsm` as a deploy-hook.

- If there is no certificate in DSM, the `SYNO_Create="1"` value must be set in order to create one
- If a test certificate has already been issued, you may need to delete it or use the `--force` option

### Deleting the Existing Certificate (If Needed)


```bash
acme.sh --remove --home ~/ssl -d "plzhans.com"
```


### Example DSM Automatic Installation Script


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


## Issue: When 2FA Blocks Automation


If 2FA is applied to the `SYNO_Username` account, it interferes with automation.


Solution

- Create a separate account (an administrator account is required)
- Operate it with minimal security measures for automation purposes
    - No external access
    - Grant only the necessary permissions
- Disable 2FA on that account

DSM Verification


![](./assets/3_36122a0f-7e83-808e-9e19-d5de5cd0c5e1.png)


---


## FAQ: Hostname/Certificate Matching Issues


When external access is blocked and the main domain (e.g., `wee-home.synology.me`) cannot be reached, a certificate matching failure may cause errors. This is because the command accesses via `https://{Hostname}:{port}` when it runs.


Choose one of the following three solutions

1. Specify `SYNO_Hostname` as a reachable domain that has a valid certificate
2. Specify the domain in the `/etc/hosts` file to bypass DNS lookup and connect to `127.0.0.1`
3. Use the `http` scheme

---


## References

- [https://github.com/acmesh-official/acme.sh/wiki/Synology-NAS-Guide](https://github.com/acmesh-official/acme.sh/wiki/Synology-NAS-Guide)
