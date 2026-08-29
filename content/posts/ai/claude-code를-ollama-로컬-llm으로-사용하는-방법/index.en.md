---
id: "113"
translationKey: "113"
slug: "113-claude-code-ollama-local-llm"
title: "How to Use Claude Code with Ollama Local LLMs"
description: "Explains how to connect Claude Code to an Ollama local LLM. Covers the Claude-compatible API, environment variables, model selection, and when you need a LiteLLM proxy."
categories:
  - "ai"
tags:
  - "claude"
  - "ollama"
  - "visual-code"
date: 2026-07-03T00:00:00.000Z
lastmod: 2026-08-29T16:02:00.000Z
toc: true
draft: false
images:
  - "assets/1_39522a0f-7e83-80b7-877c-d1ff175d736c.png"
---


![A representative image showing a configuration for using an Ollama local LLM in Claude Code](./assets/1_39522a0f-7e83-80b7-877c-d1ff175d736c.png)


## Overview


Claude Code is a developer CLI tool that helps you write code, edit files, and run commands from the terminal.


It offers a convenient development workflow, but continuously using the Claude API or a subscription-based environment incurs cost.


For personal projects or repeated experimentation environments, this cost can become a burden.


This article summarizes how to keep Claude Code's usage flow while replacing the actual model execution with an Ollama local LLM.


Recent versions of Ollama provide a controller compatible with the API path used by the Claude CLI, so it can receive Claude Code requests directly without a separate proxy.


The core settings are specifying the Claude-compatible API address, setting the authentication value, and mapping the model name.


Model selection can be handled via environment variables, Ollama model aliases, or the CLI's `--model` parameter.


If you're using a tool that doesn't support a compatible API, or you need to combine multiple model providers, you can optionally use a proxy such as LiteLLM.


## Installation


The installation process consists of roughly four steps.


### Install a local LLM runtime


First, install a runtime that can run models locally. Ollama is a representative option.


```bash
curl -fsSL https://ollama.com/install.sh | sh
```


After installation, verify that the service is running correctly.


```bash
ollama --version
```


### Download the model to use


Download the model you'll use as a replacement for Claude Code. For tasks that require code writing and command comprehension, you can first consider models in the Qwen Coder or Llama families.


```bash
ollama pull qwen2.5-coder:7b
```


Do a quick test to confirm the model runs correctly.


```bash
ollama run qwen2.5-coder:7b
```


## Integrating with Claude tools


### Prepare a Claude-compatible API endpoint


To use a local LLM with Claude Code or the Claude extension for VS Code, you need an endpoint compatible with the API path called by the Claude CLI.


Previously, Ollama's default API path differed from the API structure expected by Claude tools.


So you had to either build a separate conversion API yourself or put a proxy like LiteLLM in front to convert Claude-format requests into local LLM calls.


However, recent versions of Ollama come with a built-in compatible API controller that behaves identically to the API path used by the Claude CLI.


So with a recent version of Ollama, you can send Claude Code's requests directly to Ollama without configuring a separate proxy.


This simplifies the configuration and makes it easier to attach a local LLM to the Claude development tool workflow.


Conversely, if the tool you're using doesn't support the Claude-compatible API, or requires an API format that Ollama doesn't provide, you'll need a proxy configuration.


In that case, you can use a tool like LiteLLM to convert the request and response formats.


In summary, with a recent version of Ollama, prefer the `Claude tool → Ollama Claude-compatible API` structure.


For a tool that can't use the Claude-compatible API provided by Ollama, choose the `tool → LiteLLM or a conversion proxy → the model API required by that tool` structure.


### Changing the API path


When using the Claude-compatible API endpoint, first align the API address and authentication value.


This setting, independent of which model you use, determines which API server the Claude tool sends requests to.


| Environment variable | Description |
| -------------------- | ----------------------------------------------------- |
| ANTHROPIC_BASE_URL   | Specifies Ollama's Claude-compatible API address instead of the Claude API. |
| ANTHROPIC_AUTH_TOKEN | Used in gateway or proxy environments that require a token-based auth method. |
| ANTHROPIC_API_KEY    | Used in environments that require an API key method. With a local Ollama, you can use a dummy value. |


A simple configuration that connects directly to a local Ollama is usually set up as follows.


```bash
export ANTHROPIC_BASE_URL=http://localhost:11434
export ANTHROPIC_API_KEY=dummy-key
```


Choose between `ANTHROPIC_AUTH_TOKEN` and `ANTHROPIC_API_KEY` depending on the gateway or compatible API implementation you're using.


For a configuration that connects directly to a local Ollama, it's usually enough to set a dummy value for `ANTHROPIC_API_KEY`.


### The model selection problem


Once the API address and authentication value are aligned, you next need to align the model name.


In the Claude CLI or the Claude-related settings in VS Code, change the request target to Ollama's Claude-compatible API, and specify the actual model to run as a locally installed Ollama model.


By default, the Claude CLI sends requests based on a Claude model name or a model alias.


For example, Ollama doesn't have a model with the exact same name as a Claude model.


So you need to align the model name that the Claude tool passes with the local model name installed in Ollama.


In practice, the environment variable names or API path may differ depending on the version of the Claude CLI you use and how the VS Code extension is configured.


A proxy like LiteLLM should only be used selectively, when you're using an older version of Ollama or need to combine multiple model providers behind a single endpoint.


The model selection problem can generally be organized into the following three approaches.


CASE 1: Controlling via environment variables


The first approach to consider is controlling Claude Code's API address, authentication value, and model selection through environment variables.


Instead of arbitrarily copying an Ollama model name, you can directly specify the target and model name the Claude tool will request.


The environment variables mainly used for model selection are as follows.


| Environment variable | Description |
| ------------------------------ | ------------------------------------------------------------------------------- |
| ANTHROPIC_MODEL                | Specifies the default model to use in the current session. |
| ANTHROPIC_DEFAULT_SONNET_MODEL | Specifies the model to use when the Sonnet-family alias is called. |
| ANTHROPIC_DEFAULT_OPUS_MODEL   | Specifies the model to use when the Opus-family alias is called. |
| ANTHROPIC_DEFAULT_HAIKU_MODEL  | Specifies the model to use for the Haiku-family alias or fast auxiliary tasks. |
| ANTHROPIC_SMALL_FAST_MODEL     | Previously used to specify the fast auxiliary task model. In a recent setup, ANTHROPIC_DEFAULT_HAIKU_MODEL is preferred. |


```bash
# default session model
export ANTHROPIC_MODEL=qwen2.5-coder:7b

# Sonnet-family alias model
export ANTHROPIC_DEFAULT_SONNET_MODEL=qwen2.5-coder:7b

# Opus-family alias model
export ANTHROPIC_DEFAULT_OPUS_MODEL=qwen2.5-coder:14b

# Haiku-family alias model
export ANTHROPIC_DEFAULT_HAIKU_MODEL=qwen2.5-coder:3b
```


With this setup, when the Claude tool internally distinguishes model aliases in its calls, it can use a different Ollama model for each.


For example, general code edits and refactoring are handled by `qwen2.5-coder:7b`, while simple summaries or fast auxiliary tasks are handled by `qwen2.5-coder:3b`.


The previous `ANTHROPIC_SMALL_FAST_MODEL` was used to specify the fast auxiliary task model.


The recent documentation is organized around using `ANTHROPIC_DEFAULT_HAIKU_MODEL` instead.


So for a new setup, prefer `ANTHROPIC_DEFAULT_HAIKU_MODEL` first, and only check `ANTHROPIC_SMALL_FAST_MODEL` alongside it when it's needed for an older version of Claude Code.


The environment variable approach makes the configuration intent clear.


Since it uses the locally installed Ollama model name as-is, there's no need to create a separate model alias.


It's also easy to test different model combinations across multiple terminals.


CASE 2: Aligning the same model name when using Ollama


If it's difficult to control the model name via environment variables, or a tool always calls a fixed Claude model name, you can align the same model name on the Ollama side.


For example, if a Claude tool always calls `claude-3-5-sonnet`, you create an Ollama model alias with the same name.


The actual model that runs is Qwen Coder, but only the name exposed externally is aligned with the Claude model name.


```bash
ollama cp qwen2.5-coder:7b claude-3-5-sonnet
```


This way, the Claude tool still requests the original model name.


Ollama finds and runs the local model registered under the same name.


This is useful when it's difficult to change the tool's model selection UI or settings.


The downside is that as the number of model aliases grows, there are more names to manage.


So in a personal development environment, it's better to prefer the environment variable approach first, and use the Ollama alias approach only when you can't directly control the model name.


CASE 3: Specifying the model parameter directly at CLI runtime


If you need to change the model for a one-off run, you can specify the `--model` parameter directly when running the Claude CLI.


This approach is useful when you want to use a different model for a specific run only, without changing the environment variables.


```bash
claude --model qwen2.5-coder:7b
```


For example, if you normally specify the default model via an environment variable but want to use a larger model only for a specific task, you would run it as follows.


```bash
claude --model qwen2.5-coder:14b
```


The `--model` parameter applies only to that run session.


It can also be used to test different models simultaneously across multiple terminals.


However, if you plan to repeatedly use the same model, specifying it via an environment variable is easier to manage.


## Wrap-up


Claude Code and the VS Code Claude environment provide a tool usage flow developers are already familiar with.


By replacing only the model execution part of this environment with a local LLM, you can reduce Claude infrastructure costs while maintaining a similar development workflow.


However, a local LLM's response quality and speed vary depending on the model size and hardware performance.


For complex refactoring or tasks that require long context, the quality may be lower than Claude's.


So it's realistic to start applying this to repetitive tasks and personal projects where cost reduction matters.


## Related Posts

- [Setting Up OpenClaw](../95-openclaw-setup/)
- [How to Install OpenClaw Node Mode and Connect to Remote Infrastructure](../107-openclaw-node-mode-remote-infra-setup/)
- [How to Install Ollama and Set Up a Local LLM Server](../112-ollama-local-llm-server-setup/)
