---
id: "6"
translationKey: "6"
slug: "6-flush-dns-cache"
title: "Clearing DNS Cache on Windows/Linux/macOS"
description: "When DNS changes fail to appear, flush the cache on Windows, Linux, and macOS with ipconfig, resolvectl, and mDNSResponder commands, and check TTL and browser caches to diagnose propagation delays quickly."
categories:
  - etc
date: 2026-02-22T16:11:00.000Z
lastmod: 2026-02-22T16:13:00.000Z
toc: true
draft: false
images:
  - "assets/1_30f22a0f-7e83-8064-b489-d30573976c05.png"
---


![](./assets/1_30f22a0f-7e83-8064-b489-d30573976c05.png)


## Overview


During practical work, there are cases where DNS records are changed in domain settings but the changes are not immediately reflected on the local PC or server.


This happens because the OS or applications (such as browsers) cache DNS responses locally.


This article summarizes how to flush the local DNS cache on Windows, Linux, and macOS.


> ⚠️ **Flushing the local cache may not result in immediate reflection**
> Even after flushing the local cache, changes may not propagate immediately if **TTL still remains** due to the caching policy of DNS resolvers or name servers.
>
>
> In this case, new records will only take effect **after some time has passed**.
>
>
> If you are using a browser, you may still see old results due to the browser's own cache, so **close all running browsers** and check again.


## What is DNS?


<strong>DNS (Domain Name System)</strong> is a system that acts like the internet's phone book.


It translates human-readable domain names (e.g., [plzhans.com](https://plzhans.com/)) into IP addresses that computers can understand (e.g., 185.199.111.153).


### Main Functions of DNS

- **Domain name translation:** Converts domain names entered by users into IP addresses
- **Caching:** Stores frequently used domain information locally for faster access
- **Distributed database:** Provides stable service through servers distributed around the world

## Reasons to Flush DNS Cache

- When the IP address of a website has changed
- Resolving DNS-related network issues
- Fixing connection errors caused by outdated DNS information
- Security and privacy protection

---


## Clearing DNS Cache on Windows


On Windows, you can clear the DNS cache by running Command Prompt (CMD) as an administrator.


### Steps to Clear DNS Cache on Windows

1. **Run Command Prompt as administrator:** Search for "cmd" in the Start menu, right-click it, and select "Run as administrator."
2. **Enter the command:** Type the following command and press Enter.

```bash
ipconfig /flushdns
```


**Verify the result:** If the message "Successfully flushed the DNS Resolver Cache" appears, the process completed successfully.


Example output


```plain text
C:\>ipconfig /flushdns

Windows IP Configuration

Successfully flushed the DNS Resolver Cache.
```


**Note:** Without administrator privileges the command will not execute, so be sure to run Command Prompt as an administrator.


---


## Clearing DNS Cache on Linux


On Linux, the method for clearing the DNS cache varies depending on the distribution and the DNS service in use.


### When using systemd-resolved (Ubuntu 17.04 and later, Debian, etc.)


```bash
sudo systemd-resolve --flush-caches
```


Or


```bash
sudo resolvectl flush-caches
```


### When using nscd


```bash
sudo /etc/init.d/nscd restart
```


Or


```bash
sudo systemctl restart nscd
```


### When using dnsmasq


```bash
sudo /etc/init.d/dnsmasq restart
```


Or


```bash
sudo systemctl restart dnsmasq
```


### Checking the DNS Cache


To check the cache statistics of systemd-resolved:


```bash
sudo systemd-resolve --statistics
```


**Note:** Linux systems often do not use DNS caching by default.


If no DNS caching service is installed, there is no need to flush the cache separately.


---


## Clearing DNS Cache on macOS


On macOS, you can flush the DNS cache from the Terminal. The following commands are sufficient for most versions.


### Recommended (most macOS versions)


```bash
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder
```

{{< details summary="Older versions?" >}}
If `dscacheutil` is unavailable or does not work, try only the following.


```bash
sudo killall -HUP mDNSResponder
```
{{< /details >}}


### Notes/Cautions

- Administrator password input is required when running the commands.
- There may be no output even if successful.
- If there is no change, try clearing the browser's DNS cache as well (restart the browser) or reconnecting to the network.
