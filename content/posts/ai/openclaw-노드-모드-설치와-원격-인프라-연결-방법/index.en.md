---
id: "107"
translationKey: "107"
slug: "107-openclaw-node-mode-remote-infra-setup"
title: "How to Install OpenClaw Node Mode and Connect Remote Infrastructure"
description: "This guide explains how to connect a remote server to a gateway using OpenClaw node mode. It covers the workflow from installation, run verification, device approval, to systemd service registration."
categories:
  - "ai"
tags:
  - "ai"
  - "OpenClaw"
date: 2026-06-29T00:00:00.000Z
lastmod: 2026-07-03T10:51:00.000Z
toc: true
draft: false
images:
  - "assets/1_39222a0f-7e83-8060-b7f3-e21076ffcbf3.png"
---


![](./assets/1_39222a0f-7e83-8060-b7f3-e21076ffcbf3.png)


## Overview


An OpenClaw node is a runtime environment for directly controlling remote infrastructure connected to a gateway.


By installing a node on a separate server, you can approve and connect that machine from the OpenClaw gateway, then perform remote operations.


This post covers the OpenClaw node installation process using npm, running in run mode, gateway approval, and registering a systemd user service.


This is useful when you need OS-level control while running AI tools like Stable Diffusion or Ollama, or API servers on a separate machine.


## Installation


Install the package


```bash
npm install -g openclaw@latest
```


Verify the installation


```bash
openclaw --version
```


## Manual Execution


### Running in run Mode


We will use install mode later, but first let's verify everything works properly using run mode.


```bash
openclaw node run --host wee-home.synology.me --port 18788 --tls --display-name "node-xxxx"
```


Result

- The device is in a pending state and needs to be approved from the gateway.

```bash
OpenClaw 2026.6.11 (e085fa1) — Your personal assistant, minus the passive-aggressive calendar reminders.

node host gateway connect failed: device pairing required (requestId: 0a4ac05b-c3f3-4e01-bcde-315ada55c0e8)
gateway connect failed: GatewayClientRequestError: device pairing required (requestId: 0a4ac05b-c3f3-4e01-bcde-315ada55c0e8)
node host gateway reconnect paused after close (1008): pairing required: device is not approved yet (requestId: 0a4ac05b-c3f3-4e01-bcde-315ada55c0e8) detail=PAIRING_REQUIRED; waiting for operator action
node host gateway closed (1008): pairing required: device is not approved yet (requestId: 0a4ac05b-c3f3-4e01-bcde-315ada55c0e8)
Warning: Detected unsettled top-level await at file:///home/ubuntu/.local/share/fnm/node-versions/v24.18.0/installation/lib/node_modules/openclaw/openclaw.mjs:772
```


### Gateway Approval


This step must be performed on the gateway, not on the current machine.


Check the device list


```bash
openclaw devices list
```


```bash
Pending (1)
┌──────────────────────────────────────┬─────────────────────────┬───────────────────────────┬────────────────────┬────────┬─────────────┐
│ Request                              │ Device                  │ Requested                 │ Approved           │ Age    │ Status      │
├──────────────────────────────────────┼─────────────────────────┼───────────────────────────┼────────────────────┼────────┼─────────────┤
│ 525b560b-5863-4676-988b-b080b7aa53c5 │ node-llm · 192.168.35.3 │ roles: node; scopes: none │ none               │ 2m ago │ new pairing │
└──────────────────────────────────────┴─────────────────────────┴───────────────────────────┴────────────────────┴────────┴─────────────┘
```


Approve the device


```bash
openclaw devices approve 525b560b-5863-4676-988b-b080b7aa53c5
```


```bash
Approved a4d8a6a6a62ec1e14a2a1622df746710aea0405631e1ebd69e6ef33e768748e2 (525b560b-5863-4676-988b-b080b7aa53c5)
```


### Verify Machine Node Connection


Run in run mode


```bash
openclaw node run --host wee-home.synology.me --port 18788 --tls --display-name "node-xxxx"
```


## Service Registration


If you set the OPENCLAW_GATEWAY_TOKEN environment variable before running install, the value will be written to the ~/.openclaw/node.systemd.env file.


If you are working in the same shell after running in run mode, the variable is already set. If not, set it again.


```bash
# Set the token environment variable
export OPENCLAW_GATEWAY_TOKEN={openclaw remote gateway token}

# Install the node service
openclaw node install --host {host} --port {port} --tls --display-name "node-xxxx"
```


Verify the environment variables after execution


```bash
# Check the environment file path used by the service
cat ~/.config/systemd/user/openclaw-node.service | grep EnvironmentFile
EnvironmentFile=-/home/ubuntu/.openclaw/node.systemd.env
```


### Start the Service


Install and start the service


```bash
systemctl --user start openclaw-node
```


### Check the Service


```bash
openclaw nodes status
```
