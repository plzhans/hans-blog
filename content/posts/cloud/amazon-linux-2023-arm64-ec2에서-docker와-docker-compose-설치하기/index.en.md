---
id: "97"
translationKey: "97"
slug: "97-amazon-linux-2023-arm64-ec2-docker-docker-compose-install"
title: "Installing Docker and Docker Compose on Amazon Linux 2023 ARM64 EC2"
description: "This post covers installing Docker with dnf on Amazon Linux 2023 ARM64 (aarch64) EC2, including service activation and configuring docker group permissions. It also covers installing the Docker Compose plugin and pinning its version, resolving permission denied and arm64 manifest errors, and limiting log size and cleaning up disk space."
categories:
  - "cloud"
tags:
  - "aws"
  - "docker"
  - "linux"
date: 2026-03-19T03:44:00.000Z
lastmod: 2026-08-29T14:40:00.000Z
toc: true
draft: false
images:
  - "assets/1_32822a0f-7e83-8061-b2db-e3359b83d6d3.png"
---


![A representative image showing the process of installing Docker and Docker Compose on Amazon Linux 2023 ARM64 EC2](./assets/1_32822a0f-7e83-8061-b2db-e3359b83d6d3.png)


## Overview


This post summarizes the minimal installation steps to get Docker and Docker Compose running on Amazon Linux 2023-based EC2.


## Installing packages


`dnf` is the package manager used on RHEL-based distributions (e.g., Fedora, RHEL, Amazon Linux 2023).


It plays the same role as `apt-get` on Ubuntu/Debian or `yum` on CentOS.


It downloads and installs packages from repositories and automatically resolves dependencies.


### Updating packages


```bash
sudo dnf update -y
```


### Installing Docker


```bash
sudo dnf install -y docker
```


## Basic configuration


### Enabling the Docker service


The `docker` command only works once the Docker daemon (dockerd) is actually running.


`enable --now` <strong>starts it immediately</strong> and registers it to <strong>start automatically after reboot</strong>.


```bash
sudo systemctl enable --now docker
```


### Granting Docker permissions to the current user


By default, the Docker socket (`/var/run/docker.sock`) requires root privileges.


Adding your user to the `docker` group lets you use Docker without prefixing every command with `sudo`.


`newgrp docker` is a command that <strong>immediately applies the group change to the current session</strong>.


The same effect is achieved by logging out and logging back in.


```bash
sudo usermod -aG docker $USER
newgrp docker
```


Verify that Docker runs


```bash
docker version
```


On Amazon Linux 2023, `docker compose` is sometimes provided together with the Docker installation.


```bash
docker compose version
```


## When a separate Docker Compose installation is needed


If `docker compose version` fails, install the CLI plugin using the method below.


Create the directory


```bash
mkdir -p ~/.docker/cli-plugins
```


Install: ARM64 (aarch64)


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


Verify the Docker Compose installation


```bash
docker compose version
```


## Common issues


### permission denied while trying to connect to the Docker daemon socket


This happens when `usermod -aG docker` was run, but the group has not yet been applied to the current shell.


```bash
# Check the groups recognized by the current shell
id -nG
```


If `docker` is not in the list, apply it to the current shell with `newgrp docker`. Since `newgrp` only applies to that shell, opening a new SSH session or logging out and back in will apply it automatically going forward.


### no matching manifest for linux/arm64/v8


This occurs when running an amd64-only image on an ARM64 instance. It's commonly encountered on A1 or Graviton-based instances.


First, check whether the image supports arm64.


```bash
docker manifest inspect {image-name} | grep architecture
```


There are three options.

- Use a tag that supports arm64. Most official images provide multi-architecture support.
- Build a multi-architecture image yourself with `docker buildx`.
- Run it emulated with `--platform linux/amd64`. This requires QEMU emulation and incurs significant performance degradation, so use it only as a temporary workaround.

### Containers don't come back up after reboot


`systemctl enable --now docker` only auto-starts the Docker daemon. Containers require a separately specified restart policy.


```bash
docker run -d --restart unless-stopped {image-name}
```


If you're using Compose, specify `restart: unless-stopped` on the service.


## Good things to clean up before going into production


### Limiting container log size


The default `json-file` driver accumulates logs without limit. This is a common cause of EC2 disk filling up.


```bash
# /etc/docker/daemon.json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```


Restart the daemon after configuring this. It does not apply to already running containers, so they need to be recreated.


```bash
sudo systemctl restart docker
```


### Pinning the Docker Compose version


The `releases/latest` address used earlier fetches a different version depending on when you download it. If you need a reproducible environment, pin the version.


```bash
# Specify the version you checked on the releases page
COMPOSE_VERSION={version-to-use}

curl -SL https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-linux-aarch64 \
	-o ~/.docker/cli-plugins/docker-compose

chmod +x ~/.docker/cli-plugins/docker-compose
docker compose version
```


### Disk cleanup


```bash
# Check usage
docker system df

# Clean up unused resources
docker system prune

# Also clean up unused images
docker system prune -a
```


`prune -a` also deletes images referenced only by non-running containers. On a production server, check what will be removed before running it.

## References

- [Deploy Docker containers on Amazon Linux 2023 (AWS official docs)](https://docs.aws.amazon.com/linux/al2023/ug/docker.html)
- [Install Docker Compose (Docker official docs)](https://docs.docker.com/compose/install/linux/)
