---
id: "95"
translationKey: "95"
slug: "95-openclaw-setup"
title: "Setting Up OpenClaw"
description: "Install the OpenClaw AI agent framework locally, walk through the onboard flow to configure models, channels, and skills, and follow the Telegram bot authentication and security checkpoints to run agents safely."
categories:
  - "ai"
tags:
  - "ai"
  - "OpenClaw"
date: 2026-02-23T10:10:00.000Z
lastmod: 2026-02-23T15:30:00.000Z
toc: true
draft: false
images:
  - "assets/1_30c22a0f-7e83-80ee-9c2c-c2ff88b811d4.png"
---


![](./assets/1_30c22a0f-7e83-80ee-9c2c-c2ff88b811d4.png)


## Overview


### What is OpenClaw


OpenClaw is an **open-source Node.js-based framework** that allows developers to build autonomously operating AI agents.


It can integrate with various models such as Claude and GPT.


Tasks such as reading files, executing commands, and calling external services can be connected as tools for automation.


Official site: [OpenClaw](https://openclaw.ai/)


### Key Features

- **Multimodal input,** processes multiple input types including text, images, and files.
- **Tool integration,** extends functionality by attaching tools such as file system access, web search, and API calls.
- **Security-focused design,** provides mechanisms such as sandboxing, access control, and whitelisting.
- **Extensible architecture,** easy to add features in a plugin-based manner.

## Installation


OpenClaw provides an installation script.


It also installs required utilities such as Node.js.


Installation docs: [https://docs.openclaw.ai/install](https://docs.openclaw.ai/install)


### Default Installation Mode


The default installation proceeds directly to **onboard (interactive initial setup)** after installation.


Once setup is complete, it moves on to the execution stage.


```shell
# macOS / Linux / WSL2
curl -fsSL https://openclaw.ai/install.sh | bash

# Windows (PowerShell)
iwr -useb https://openclaw.ai/install.ps1 | iex
```

{{< details summary="If you only need the installation without onboard" >}}
To install without onboard, use the following option.


```shell
# macOS / Linux / WSL2
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --no-onboard

# Windows (PowerShell)
& ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard
```


After installation, proceed in the following order.


```shell
# Configure
openclaw onboard

# Start
openclaw gateway start
```
{{< /details >}}


### Default Installation Screen


![](./assets/2_30d22a0f-7e83-80f1-9217-fccc404257dc.png)


## Initial Setup (onboard)


Proceeding with the default installation mode will enter onboard after installation.


Configuration is done through an interactive UI.


The configuration file is recorded in `~/.openclaw/openclaw.json` by default.


Even if onboard is interrupted midway, you can resume editing by running it again.


You can also reset and reconfigure if needed.


### 1. Security Warning Acknowledgment


![](./assets/3_30d22a0f-7e83-808b-b444-f99cdc23c20e.png)


> <details>
> <summary>⚠️ **Security Warning — Please Read Carefully**</summary>
>
> > OpenClaw is a hobby project and is still in beta.
> > Unexpected issues or incomplete features may exist.
> > This bot can **read files or execute operations** when tools are enabled.
> > Malicious prompts can trick the bot into performing **unsafe actions**.
> > Running OpenClaw is not recommended for those unfamiliar with basic security and access control.
> > Seek assistance from an experienced person before enabling tools or exposing to the internet.
>
>
> **Important:** OpenClaw can read files or execute commands when tools are enabled.
>
>
> Exposing it publicly can be very dangerous, so it is safer not to connect it to public channels with default settings.
>
>
> For example, if you ask the chatbot to read a file, it can output it directly.
>
>
> ![](./assets/4_31022a0f-7e83-80dc-a51c-c26d7be8c0f0.png)
>
>
> </details>


### 2. Select Installation Mode


![](./assets/5_30d22a0f-7e83-8014-b12d-d1e1b342ba91.png)


![](./assets/6_30d22a0f-7e83-80a8-a129-f6a2ad9dbd00.png)


> <details>
> <summary>Manual mode is used when specifying the gateway and workspace manually.</summary>
>
> **Gateway selection (usually the local machine)**
>
>
> ![](./assets/7_30d22a0f-7e83-803c-ad18-f3beec531690.png)
>
>
> **Specify workspace path**
>
>
> Default path is `~/.openclaw/workspace`
>
>
> ![](./assets/8_30d22a0f-7e83-8045-8f43-f8e216bb19b0.png)
>
>
> </details>


### 3. Select Model and Authentication Provider


![](./assets/9_30d22a0f-7e83-804c-aba4-d28f3ce24fa0.png)


> Enable the providers you need.
> Selecting one will guide you through the authentication process.
>
> <details>
> <summary>Claude (Anthropic) example</summary>
>
> Some agents are installed automatically.
>
>
> Manual installation may be required in some cases.
>
>
> ![](./assets/10_31022a0f-7e83-80d8-bbd1-c82743ef6e3e.png)
>
>
> Token verification
>
>
> ```shell
> claude setup-token
> ```
>
>
> ![](./assets/11_31022a0f-7e83-80f4-a282-d0d5d905b104.png)
>
>
> Model selection usually works fine with default values.
>
>
> You can change it anytime as needed.
>
>
> ![](./assets/12_31022a0f-7e83-80d3-a320-ec6f7664dcab.png)
>
>
> </details>


> Cloud models like ChatGPT may charge based on usage if using an API key.
> However, there are also integration methods that work without an API key for subscription-based accounts, so it is worth checking.
>
> - ChatGPT: OpenAI Codex (ChatGPT OAuth)
> - Claude: Anthropic token (paste setup-token)
> - Gemini: Google Gemini CLI OAuth


### 4. Select Channel


![](./assets/13_30d22a0f-7e83-807b-978a-fc624c5ddcf8.png)


![](./assets/14_30d22a0f-7e83-8064-9991-fa23e5a937f4.png)


> Select the messenger channel you want.
> Telegram is free, which is why many people choose it.
>
> <details>
> <summary>Creating and entering a Telegram bot token</summary>
>
> Telegram bots are created and managed by chatting with `@BotFather`, not through an admin console.
>
>
> ![](./assets/15_30d22a0f-7e83-80a3-9025-e1fc0a7cdeb9.png)
>
>
> ![](./assets/16_30d22a0f-7e83-80c8-b4f8-edaa3a69552e.png)
>
>
> ![](./assets/17_30d22a0f-7e83-8020-a48d-dd2be45089ca.png)
>
>
> </details>


### 5. Select Skills


![](./assets/18_30d22a0f-7e83-802c-9003-d2e265d919f2.png)


![](./assets/19_30d22a0f-7e83-803a-a434-d99e4a626ff4.png)


> OpenClaw provides additional features in the form of skills and plugins.
> It is fine to start with only the essential skills enabled.
>
>
> Tasks you repeat frequently can be turned into skills and added later.
>
> <details>
> <summary>Example settings required for advanced features</summary>
>
> It is safer to enable these only when needed for the following tasks.
>
> - Searching places on Google Maps
> - Image generation
> - Browsing Notion data
> - Voice to text (STT)
> - Text to voice (TTS)
>
> **Google Places**
>
>
> Google API key settings required for place searches.
>
>
> Example: "Recommend highly rated restaurants in Gangnam, Seoul"
>
>
> ![](./assets/20_30d22a0f-7e83-80ea-bec0-f2092ffd730c.png)
>
>
> **Image Generation (Gemini, Nano Banana)**
>
>
> Configure when using the Gemini-based image generation feature.
>
>
> ![](./assets/21_30d22a0f-7e83-8057-aeeb-cab0cf88d3b0.png)
>
>
> **Notion**
>
>
> Used when referencing data from Notion pages.
>
>
> ![](./assets/22_30d22a0f-7e83-8006-a59f-c428e0ba5bcb.png)
>
>
> **Image Generation (OpenAI)**
>
>
> ![](./assets/23_30d22a0f-7e83-809c-8b87-cd499c42219d.png)
>
>
> **Whisper (STT)**
>
>
> Converts audio files to text.
>
>
> Sending a voice message on Telegram allows it to be converted to text and processed.
>
>
> ![](./assets/24_30d22a0f-7e83-809b-a7bb-d0ac4824e529.png)
>
>
> **ElevenLabs (TTS)**
>
>
> Used when converting text to speech.
>
>
> ![](./assets/25_30d22a0f-7e83-801d-b123-e98305c4cc29.png)
>
>
> </details>


### 6. Hook Configuration


![](./assets/26_30d22a0f-7e83-80f4-ba8e-f046b7b530b2.png)


> Reference for each item
> **boot-md**
>
> - Automatically runs `BOOT.md` at gateway startup to load initial instructions.
>
> **bootstrap-extra-files**
>
> - Automatically injects workspace initial files using glob or path patterns.
> - Personally, I recommend enabling all options except this one.
> - Incorrectly specifying the path can corrupt the workspace.
>
> **command-logger**
>
> - Records all command events in a central audit log file.
>
> **session-memory**
>
> - Automatically saves session context to memory when `/new` is executed.


### 7. Running the Bot


![](./assets/27_30d22a0f-7e83-80da-b680-e7e95ec284d6.png)


> 💡 <details>
> <summary>If execution permission is required on macOS</summary>
>
> ![](./assets/28_30d22a0f-7e83-80da-9cba-fe9769b0baf1.png)
>
>
> Choose whether to run with TUI or Web UI.
>
>
> The Web UI may look more convenient, but if you plan to use a channel-based assistant, TUI is sufficient.
>
>
> </details>


Execution screen


![](./assets/29_30d22a0f-7e83-80e0-aa50-dc0df8e91829.png)


### 8. Telegram User Authentication


![](./assets/30_31022a0f-7e83-80ba-a460-ff3c09092256.png)


> After creating the bot and sending a message, user authentication is performed.
> Authentication is necessary because arbitrary users should not be able to access OpenClaw through the bot.
>
>
> The authentication code is delivered via a Telegram message.
>
>
> Copy the provided command and run it manually in the terminal.
>
>
> ![](./assets/31_30d22a0f-7e83-8056-af82-d77955b2432a.png)


### 9. Setting Your Name and Bot Name


![](./assets/32_31022a0f-7e83-80a0-b6de-e328656450d4.png)


> 💡 Set the name the bot will call you and the name you will call the bot.
> After setup, you can use it like a regular ChatGPT conversation.


### 10. Examples


![](./assets/33_31022a0f-7e83-8083-89cd-ea0433d6ff7a.png)


![](./assets/34_31022a0f-7e83-8012-aede-f808b1d235e5.png)

