---
id: "86"
translationKey: "86"
slug: "86-github-pages-custom-domain"
title: "Using a Custom Domain with GitHub Pages"
description: "This guide covers how to set up a custom domain instead of the default GitHub Pages URL (username.github.io/repository). It explains CNAME record configuration for your domain and Custom domain setup in GitHub Repository Settings, including HTTPS certificate options."
tags:
  - "github"
  - "github-action"
  - "github-pages"
  - "domain"
categories:
  - "Git"
date: 2026-02-04T18:07:00.000+09:00
lastmod: 2026-02-10T07:36:00.000Z
draft: false
images:
  - "assets/1_30222a0f-7e83-80d2-8bf8-df6ddbcd2239.png"
---


# Overview


GitHub Pages provides a default URL in the format `https://{username}.`[`github.io/{repository}/`](http://github.io/%7B저장소명%7D/). 

This document explains how to connect a custom domain.


# Using a Subdomain


This is for cases where you want to use a subdomain like `hugosample.plzhans.com`.


## DNS Configuration


Add a CNAME record in your domain's DNS settings.


![](./assets/1_30222a0f-7e83-80d2-8bf8-df6ddbcd2239.png)


**Configuration Example**

- Type: CNAME
- Name: Subdomain (e.g., hugosample)
- Value: {username}.[github.io](http://github.io/)

## GitHub Pages Configuration


Go to Repository → Settings → Pages → Custom domain and enter your custom domain.


**Example input:** hugosample.plzhans.com


![](./assets/2_30222a0f-7e83-80fe-875c-c3b270a89dd1.png)


# Using an Apex Domain


This is for cases where you want to use the domain root, such as `plzhans.com`.


## DNS Configuration


Set up A, AAAA, or ALIAS records depending on your DNS provider.


| Record Type    | Name | Value                                                                           |
| -------------- | ---- | ------------------------------------------------------------------------------- |
| A              | @    | 185.199.108.153<br>185.199.109.153<br>185.199.110.153<br>185.199.111.153                 |
| AAAA           | @    | 2606:50c0:8000::153<br>2606:50c0:8001::153<br>2606:50c0:8002::153<br>2606:50c0:8003::153 |
| ALIAS or ANAME | @    | USERNAME.github.io                                                              |


**Note:** If your DNS provider does not support ALIAS/ANAME records, use A records instead.


## GitHub Pages Configuration


Go to Repository → Settings → Pages → Custom domain and enter your custom domain.


**Example input:** plzhans.com


# Enabling HTTPS


Check the **Enforce HTTPS** option to automatically apply an HTTPS certificate.


> ⚠️ Certificate issuance and propagation may take up to 24 hours. If the HTTPS connection is not working, wait about a day and try again.


---


References

- [GitHub Official Documentation: Managing a Custom Domain](https://docs.github.com/ko/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)
