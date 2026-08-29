---
id: "107"
translationKey: "107"
slug: "107-openclaw-node-mode-remote-infra-setup"
title: "How to Install OpenClaw Node Mode and Connect Remote Infrastructure"
description: "This post explains how to connect a remote server to a gateway using OpenClaw node mode. It covers the infrastructure control flow from installation, run verification, device approval, to systemd service registration."
categories:
  - "ai"
tags:
  - "ai"
  - "OpenClaw"
date: 2026-06-29T00:00:00.000Z
lastmod: 2026-08-29T16:02:00.000Z
toc: true
draft: false
images:
  - "assets/1_39222a0f-7e83-8060-b7f3-e21076ffcbf3.png"
---


![A representative image showing a configuration where OpenClaw node mode connects a remote server to a gateway to control infrastructure](./assets/1_39222a0f-7e83-8060-b7f3-e21076ffcbf3.png)


## Overview


OpenClaw node is a runtime environment for directly controlling remote infrastructure connected to a gateway.


By installing a node on a separate server, the OpenClaw gateway can approve and connect to that machine, and then perform remote operations on it.


This post covers how to install OpenClaw node using npm, run it in run mode, approve it on the gateway, and register it as a systemd user service.


This can be useful when you operate AI tools like Stable Diffusion or Ollama, or API servers, on a separate machine and also need OS-level control.


## Installation


Install the package


```bash
npm install -g openclaw@latest
```


Verify the installation


```bash
openclaw --version
```


## Direct Execution


### Running in run mode


We'll be using install mode, but let's first check with run mode that it runs correctly in advance.


```bash
openclaw node run --host wee-home.synology.me --port 18788 --tls --display-name "node-xxxx"
```


Result

- It's in a pending state; it needs to be approved on the gateway.

```bash
OpenClaw 2026.6.11 (e085fa1) — Your personal assistant, minus the passive-aggressive calendar reminders.

node host gateway connect failed: device pairing required (requestId: 0a4ac05b-c3f3-4e01-bcde-315ada55c0e8)
gateway connect failed: GatewayClientRequestError: device pairing required (requestId: 0a4ac05b-c3f3-4e01-bcde-315ada55c0e8)
node host gateway reconnect paused after close (1008): pairing required: device is not approved yet (requestId: 0a4ac05b-c3f3-4e01-bcde-315ada55c0e8) detail=PAIRING_REQUIRED; waiting for operator action
node host gateway closed (1008): pairing required: device is not approved yet (requestId: 0a4ac05b-c3f3-4e01-bcde-315ada55c0e8)
Warning: Detected unsettled top-level await at file:///home/ubuntu/.local/share/fnm/node-versions/v24.18.0/installation/lib/node_modules/openclaw/openclaw.mjs:772
```


### Approving on the gateway


This step must be done on the gateway, not on the current machine.


Check the list


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


Approve it


```bash
openclaw devices approve 525b560b-5863-4676-988b-b080b7aa53c5
```


```bash
Approved a4d8a6a6a62ec1e14a2a1622df746710aea0405631e1ebd69e6ef33e768748e2 (525b560b-5863-4676-988b-b080b7aa53c5)
```


### Verifying the machine node connection


Run in run mode


```bash
openclaw node run --host wee-home.synology.me --port 18788 --tls --display-name "node-xxxx"
```


## Service Registration


If you set the OPENCLAW_GATEWAY_TOKEN environment variable before running install, its value is recorded in the ~/.openclaw/node.systemd.env file.


If you're already working in the same shell after going through run mode, this is already set; if not, set it again.


```bash
# Set the token environment variable
export OPENCLAW_GATEWAY_TOKEN={openclaw remote gateway token}

# Install the node service
openclaw node install --host {host} --port {port} --tls --display-name "node-xxxx"
```


Check the environment variable after running it


```bash
# Check the location of the environment file used by the service
cat ~/.config/systemd/user/openclaw-node.service | grep EnvironmentFile
EnvironmentFile=-/home/ubuntu/.openclaw/node.systemd.env
```


### Starting the service


Install and start the service


```bash
systemctl --user start openclaw-node
```


### Checking the service


```bash
openclaw nodes status
```


## Related Posts

- [Building OpenClaw](../95-openclaw-setup/)
- [How to Install Ollama and Build a Local LLM Server](../112-ollama-local-llm-server-setup/)
- [How to Use Claude Code with Ollama Local LLM](../113-claude-code-ollama-local-llm/)
