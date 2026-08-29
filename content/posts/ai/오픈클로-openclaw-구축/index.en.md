---
id: "95"
translationKey: "95"
slug: "95-openclaw-setup"
title: "Setting Up OpenClaw "
description: "A summary of installing OpenClaw (OpenClaw AI agent framework) locally and configuring the model, channel, and skills through onboard. Follow along with the Telegram bot authentication and security warning checkpoints to run the agent safely."
categories:
  - "ai"
tags:
  - "ai"
  - "OpenClaw"
date: 2026-02-23T10:10:00.000Z
lastmod: 2026-08-29T16:02:00.000Z
toc: true
draft: false
images:
  - "assets/1_30c22a0f-7e83-80ee-9c2c-c2ff88b811d4.png"
---


![Screen showing the OpenClaw installation and onboard setup process](./assets/1_30c22a0f-7e83-80ee-9c2c-c2ff88b811d4.png)


## Overview


### What is OpenClaw


OpenClaw is a <strong>Node.js-based open-source framework</strong> that lets developers build autonomously operating AI agents.


It can be integrated with various models such as Claude and GPT.


Tasks like reading files, running commands, and calling external services can be connected as tools to automate them.


Official site: [OpenClaw](https://openclaw.ai/)


### Key Features

- **Multimodal input,** processes multiple forms of input such as text, images, and files.
- **Tool integration,** extends functionality by attaching capabilities such as file system access, web search, and API calls as tools.
- **Security-first design,** provides mechanisms such as sandboxing, access control, and whitelisting.
- **Extensible structure,** easy to add features through a plugin-based approach.

## Installation


OpenClaw provides an installation script.


It also installs required utilities such as Node.js together.


Installation docs: [https://docs.openclaw.ai/install](https://docs.openclaw.ai/install)


### Default Installation Mode


The default installation enters **onboard (interactive initial setup)** right after installation.


Once the setup is finished, it moves on to the run step.


```shell
# macOS / Linux / WSL2
curl -fsSL https://openclaw.ai/install.sh | bash

# Windows (PowerShell)
iwr -useb https://openclaw.ai/install.ps1 | iex
```

{{< details summary="If you only need a manual installation" >}}
If you want to install only, without onboard, use the option below.


```shell
# macOS / Linux / WSL2
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --no-onboard

# Windows (PowerShell)
& ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard
```


After installation, proceed in the order below.


```shell
# Configure
openclaw onboard

# Run
openclaw gateway start
```
{{< /details >}}


### Default Installation Screen


![Default installation screen after running the installation script](./assets/2_30d22a0f-7e83-80f1-9217-fccc404257dc.png)


## Initial Setup (onboard)


If you proceed with the default installation mode, you enter onboard after installation.


The setup proceeds through an interactive UI.


The configuration file is written to `~/.openclaw/openclaw.json` by default.


Even if you interrupt onboard midway, you can resume editing by running it again.


If needed, you can also reset and configure it again.


### 1. Agree to the Security Warning


![Security warning agreement screen at the first step of onboard](./assets/3_30d22a0f-7e83-808b-b444-f99cdc23c20e.png)


> <details>  
> <summary>⚠️ **Security Warning — Please Read Carefully**</summary>  
>   
> > OpenClaw is a hobby project and is still in beta.    
> > Unexpected issues or incomplete features may exist.    
> > This bot can <strong>read files or execute tasks</strong> when tools are enabled.    
> > A malicious prompt could trick the bot into performing <strong>unsafe actions</strong>.    
> > If you are not familiar with basic security and access control, running OpenClaw is not recommended.    
> > Get help from someone experienced before enabling tools or exposing it to the internet.  
>   
>   
> **Important:** OpenClaw can read files or execute commands once tools are enabled.  
>   
>   
> If exposed externally it can become very dangerous, so it is safer not to connect it to a public channel with the default settings as-is.  
>   
>   
> For example, if you ask the chatbot to read a file, it may output it verbatim.  
>   
>   
> ![Example screen where the chatbot outputs a file's content verbatim after being asked for it](./assets/4_31022a0f-7e83-80dc-a51c-c26d7be8c0f0.png)  
>   
>   
> </details>


### 2. Choose Installation Mode


![Screen for choosing the installation mode in onboard](./assets/5_30d22a0f-7e83-8014-b12d-d1e1b342ba91.png)


![Screen showing the OpenClaw installation and onboard setup process](./assets/6_30d22a0f-7e83-80a8-a129-f6a2ad9dbd00.png)


> <details>  
> <summary>Manual mode is used when you want to specify the gateway and workspace manually.</summary>  
>   
> **Choose Gateway (usually the local machine)**  
>   
>   
> ![Screen for directly specifying the gateway in Manual mode](./assets/7_30d22a0f-7e83-803c-ad18-f3beec531690.png)  
>   
>   
> **Specify Workspace Path**  
>   
>   
> Default path is `~/.openclaw/workspace`  
>   
>   
> ![Screen for specifying the workspace path](./assets/8_30d22a0f-7e83-8045-8f43-f8e216bb19b0.png)  
>   
>   
> </details>


### 3. Choose Model and Auth Provider


![Screen for choosing the model and auth provider to use](./assets/9_30d22a0f-7e83-804c-aba4-d28f3ce24fa0.png)


> Just enable the provider(s) you need.  
> Once selected, it walks you through the authentication process.  
>   
> <details>  
> <summary>Claude (Anthropic) example</summary>  
>   
> Some agents are installed automatically.  
>   
>   
> In some cases a manual installation is required.  
>   
>   
> ![Screen for installing the Claude agent](./assets/10_31022a0f-7e83-80d8-bbd1-c82743ef6e3e.png)  
>   
>   
> Verify the token  
>   
>   
> ```shell  
> claude setup-token  
> ```  
>   
>   
> ![Screen for checking the token issued via claude setup-token](./assets/11_31022a0f-7e83-80f4-a282-d0d5d905b104.png)  
>   
>   
> You can usually keep the default for model selection.  
>   
>   
> You can change it anytime if needed.  
>   
>   
> ![Screen for selecting the model to use](./assets/12_31022a0f-7e83-80d3-a320-ec6f7664dcab.png)  
>   
>   
> </details>


> Cloud models like ChatGPT may incur usage-based billing if you use an API key method.  
> However, even if you use a subscription account, there is a way to integrate without an API key, so it's worth checking out.  
>   
> - ChatGPT: OpenAI Codex (ChatGPT OAuth)  
> - Claude: Anthropic token (paste in setup-token)  
> - Gemini: Google Gemini CLI OAuth


### 4. Choose Channel


![Screen for choosing the messenger channel to connect](./assets/13_30d22a0f-7e83-807b-978a-fc624c5ddcf8.png)


![Screen showing the OpenClaw installation and onboard setup process](./assets/14_30d22a0f-7e83-8064-9991-fa23e5a937f4.png)


> Choose the messenger channel you want.  
> Telegram is often chosen because it's free.  
>   
> <details>  
> <summary>Create and enter a Telegram bot token</summary>  
>   
> A Telegram bot isn't created or managed through an admin console — you create and manage it by chatting with `@BotFather`.  
>   
>   
> ![Screen for creating a bot by chatting with Telegram's @BotFather](./assets/15_30d22a0f-7e83-80a3-9025-e1fc0a7cdeb9.png)  
>   
>   
> ![Screen showing the OpenClaw installation and onboard setup process](./assets/16_30d22a0f-7e83-80c8-b4f8-edaa3a69552e.png)  
>   
>   
> ![Screen showing the OpenClaw installation and onboard setup process](./assets/17_30d22a0f-7e83-8020-a48d-dd2be45089ca.png)  
>   
>   
> </details>


### 5. Choose Skills


![Screen for choosing the skills to use](./assets/18_30d22a0f-7e83-802c-9003-d2e265d919f2.png)


![Screen showing the OpenClaw installation and onboard setup process](./assets/19_30d22a0f-7e83-803a-a434-d99e4a626ff4.png)


> OpenClaw provides additional functionality in forms such as skills and plugins.  
> By default, it's fine to start by turning on only the skills you need.  
>   
>   
> Tasks you have it perform repeatedly can later be turned into a skill and attached.  
>   
> <details>  
> <summary>Example settings needed for advanced features</summary>  
>   
> It's safer to enable these only when you need tasks like the following.  
>   
> - Searching for places on Google Maps  
> - Image generation  
> - Searching Notion data  
> - Speech-to-text (STT)  
> - Text-to-speech (TTS)  
>   
> **Google Places**  
>   
>   
> This is the Google API key setup needed for place search.  
>   
>   
> Example: "Recommend a highly rated restaurant in Gangnam-gu, Seoul"  
>   
>   
> ![Screen for setting the Google Places API key for place search](./assets/20_30d22a0f-7e83-80ea-bec0-f2092ffd730c.png)  
>   
>   
> **Image Generation (Gemini, Nano Banana)**  
>   
>   
> Set this up when using Gemini-based image generation features.  
>   
>   
> ![Screen for setting up the Gemini (Nano Banana) image generation skill](./assets/21_30d22a0f-7e83-8057-aeeb-cab0cf88d3b0.png)  
>   
>   
> **Notion**  
>   
>   
> Used when referencing data from Notion pages.  
>   
>   
> ![Screen for setting up the Notion integration skill](./assets/22_30d22a0f-7e83-8006-a59f-c428e0ba5bcb.png)  
>   
>   
> **Image Generation (OpenAI)**  
>   
>   
> ![Screen for setting up the OpenAI image generation skill](./assets/23_30d22a0f-7e83-809c-8b87-cd499c42219d.png)  
>   
>   
> **Whisper (STT)**  
>   
>   
> Converts a voice file into text.  
>   
>   
> If you send a message by voice in Telegram, it can convert it to text for processing.  
>   
>   
> ![Screen for setting up Whisper (STT), which converts speech to text](./assets/24_30d22a0f-7e83-809b-a7bb-d0ac4824e529.png)  
>   
>   
> **ElevenLabs (TTS)**  
>   
>   
> Used to convert text into speech.  
>   
>   
> ![Screen for setting up ElevenLabs (TTS), which converts text to speech](./assets/25_30d22a0f-7e83-801d-b123-e98305c4cc29.png)  
>   
>   
> </details>


### 6. Configure Hooks


![Screen for choosing the hooks to use](./assets/26_30d22a0f-7e83-80f4-ba8e-f046b7b530b2.png)


> Notes per item  
> **boot-md**  
>   
> - Automatically runs `BOOT.md` when the gateway starts, loading the initial instructions.  
>   
> **bootstrap-extra-files**  
>   
> - Automatically injects initial workspace files using glob or path patterns.  
> - Personally, I'd recommend enabling everything except this option.  
> - Specifying the wrong path can pollute the workspace.  
>   
> **command-logger**  
>   
> - Logs all command events to a central audit log file.  
>   
> **session-memory**  
>   
> - Automatically saves the session context to memory when `/new` is run.


### 7. Run the Bot


![Screen for running the bot after finishing onboard setup](./assets/27_30d22a0f-7e83-80da-b680-e7e95ec284d6.png)


> 💡 <details>  
> <summary>If execution permission is required on macOS</summary>  
>   
> ![Screen requesting execution permission on macOS](./assets/28_30d22a0f-7e83-80da-9cba-fe9769b0baf1.png)  
>   
>   
> Choose whether to run with the TUI or the Web UI.  
>   
>   
> The web UI looks more convenient, but if you plan to use a channel-based assistant, the TUI is enough too.  
>   
>   
> </details>


Run screen


![Screen after the gateway has started running](./assets/29_30d22a0f-7e83-80e0-aa50-dc0df8e91829.png)


### 8. Telegram User Authentication


![Screen for starting user authentication by sending a message to the Telegram bot](./assets/30_31022a0f-7e83-80ba-a460-ff3c09092256.png)


> After creating the bot, sending it a message starts the user authentication process.  
> Authentication is required because just any user shouldn't be able to access OpenClaw through the bot.  
>   
>   
> The authentication code is delivered as a Telegram message.  
>   
>   
> Just copy the guided command and run it manually in the terminal.  
>   
>   
> ![Screen for entering, in the terminal, the authentication code received via Telegram](./assets/31_30d22a0f-7e83-8056-af82-d77955b2432a.png)


### 9. Decide How You're Addressed and the Bot's Name


![Screen for deciding the user's form of address and the bot's name](./assets/32_31022a0f-7e83-80a0-b6de-e328656450d4.png)


> 💡 Decide the name the bot will call you and the name you'll call the bot.  
> After configuring this, you can chat with it like a regular ChatGPT.


### 10. Example


![Example screen of actually chatting with the bot after finishing setup](./assets/33_31022a0f-7e83-8083-89cd-ea0433d6ff7a.png)


![Screen showing the OpenClaw installation and onboard setup process](./assets/34_31022a0f-7e83-8012-aede-f808b1d235e5.png)


## Errors and Solutions


---


### Node Requirement Mismatch


Cause: needs 22.12 or higher, but 20.11 is in use


```bash
❯ openclaw help
openclaw requires Node >=22.12.0.
Detected: node 20.11.1 (exec: /Users/plzhans/.nvm/versions/node/v20.11.1/bin/node).
```


Solution

- Installed in the global scope, but the global node version in use is 20.11
- Solution based on the global scope

```bash
# Check version
❯ node -v

# Check the running process
ps -ef | grep openclaw

# Note: even if you kill the process, if it's registered as a service or launcher it will auto-restart
# If it's registered as a service or launcher, you need to stop the launcher
# For mac: find the running openclaw
launchctl list | grep openclaw

# Stop the running openclaw
launchctl unload ~/Library/LaunchAgents/ai.openclaw.gateway.plist


# Install the new version and change the default version
nvm install 22
nvm use 22
nvm alias default 22
```


## Related Posts

- [How to Install OpenClaw Node Mode and Connect to Remote Infrastructure](../107-openclaw-node-mode-remote-infra-setup/)
- [How to Install Ollama and Build a Local LLM Server](../112-ollama-local-llm-server-setup/)
- [How to Use Claude Code with Ollama Local LLM](../113-claude-code-ollama-local-llm/)
</content>
</invoke>
