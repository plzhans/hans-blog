---
id: "97"
translationKey: "97"
slug: "97-amazon-linux-2023-arm64-ec2-docker-docker-compose-install"
title: "Installing Docker and Docker Compose on Amazon Linux 2023 ARM64 EC2"
categories:
  - "cloud"
tags:
  - "aws"
  - "docker"
  - "linux"
date: 2026-03-19T03:44:00.000Z
lastmod: 2026-03-19T03:44:00.000Z
toc: true
draft: false
images:
  - "assets/1_32822a0f-7e83-8061-b2db-e3359b83d6d3.png"
---


![](./assets/1_32822a0f-7e83-8061-b2db-e3359b83d6d3.png)


## Overview


This document summarizes the minimal installation steps to get Docker and Docker Compose running on an Amazon Linux 2023-based EC2 instance.


## Package Installation


`dnf` is the package manager used on RHEL-based distributions (e.g., Fedora, RHEL, Amazon Linux 2023).


It serves the same role as `apt-get` on Ubuntu/Debian or `yum` on CentOS.


It downloads and installs packages from repositories and automatically handles dependencies.


### Package Update


```bash
sudo dnf update -y
```


### Installing Docker


```bash
sudo dnf install -y docker
```


## Basic Configuration


### Enabling the Docker Service


The Docker daemon (dockerd) must actually be running for the `docker` command to work.


`enable --now` registers it to <strong>start immediately</strong> and <strong>start automatically after a reboot</strong>.


```bash
sudo systemctl enable --now docker
```


### Granting Docker Permissions to the Current User


By default, the Docker socket (`/var/run/docker.sock`) requires root privileges.


Adding your user to the `docker` group lets you use Docker without prefixing every command with `sudo`.


`newgrp docker` is a command used to <strong>apply the group change to the current session immediately</strong>.


The same effect is achieved by logging out and logging back in.


```bash
sudo usermod -aG docker $USER
newgrp docker
```


Verifying that Docker runs


```bash
docker version
```


In the Amazon Linux 2023 environment, `docker compose` is sometimes provided together with the Docker installation alone.


```bash
docker compose version
```


## When Docker Compose Needs to Be Installed Separately


If `docker compose version` fails, install the CLI plugin using the method below.


Create the directory


```bash
mkdir -p ~/.docker/cli-plugins
```


Installation: ARM64 (aarch64)


```bash
curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-aarch64 \
	-o ~/.docker/cli-plugins/docker-compose
```


For x86_64


```bash
curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
	-o ~/.docker/cli-plugins/docker-compose
```


Add execute permission


```bash
chmod +x ~/.docker/cli-plugins/docker-compose
```


Verifying the Docker Compose installation


```bash
docker compose version
```
