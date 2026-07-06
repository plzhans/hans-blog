---
id: "39222a0f-7e83-80fe-8b4d-ee6466d71c77"
translationKey: "39222a0f-7e83-80fe-8b4d-ee6466d71c77"
slug: "39222a0f-7e83-80fe-8b4d-ee6466d71c77-claude-code-ollama-local-llm"
title: "How to Use Claude Code with Ollama Local LLM"
description: "Learn how to connect Claude Code to an Ollama local LLM. This guide covers the Claude-compatible API, environment variables, model selection, and when a LiteLLM proxy is needed."
categories:
  - "ai"
tags:
  - "claude"
  - "ollama"
  - "visual-code"
date: 2026-07-03T00:00:00.000Z
lastmod: 2026-07-06T02:15:00.000Z
toc: true
draft: false
images:
  - "assets/1_39522a0f-7e83-80b7-877c-d1ff175d736c.png"
---


![](./assets/1_39522a0f-7e83-80b7-877c-d1ff175d736c.png)


## Overview


Claude Code is a development CLI tool that helps with writing code, editing files, and running commands from the terminal.


It provides a convenient development workflow, but continuous use of the Claude API or subscription-based environments incurs costs.


For personal projects or repetitive experimentation, these costs can become a burden.


This article explains how to replace the actual model execution with an Ollama local LLM while maintaining the Claude Code workflow.


The latest Ollama provides a controller compatible with the API paths used by Claude CLI, so it can directly receive Claude Code requests without a separate proxy.


The key settings are specifying the Claude-compatible API address, configuring authentication values, and mapping model names.


Model selection can be handled through environment variables, Ollama model aliases, or the CLI's `--model` parameter.


When using tools that lack a compatible API or when you need to combine multiple model providers, a proxy like LiteLLM can be used optionally.


## Installation


The installation process consists of four main steps.


### Installing the Local LLM Runtime


First, install a runtime that can run models locally. Ollama is a popular choice.


```bash
curl -fsSL https://ollama.com/install.sh | sh
```


After installation, verify that the service is running correctly.


```bash
ollama --version
```


### Downloading a Model


Download a model to use as a Claude Code replacement. For tasks that require code writing and command understanding, Qwen Coder series or Llama series models are good candidates to consider first.


```bash
ollama pull qwen2.5-coder:7b
```


Run a quick test to verify that the model works correctly.


```bash
ollama run qwen2.5-coder:7b
```


## Claude Tool Integration


### Preparing a Claude-Compatible API Endpoint


To use a local LLM with Claude Code or the VS Code Claude extension, you need an endpoint compatible with the API paths that Claude CLI calls.


Previously, Ollama's default API paths differed from the API structure expected by Claude tools.


This required either building a separate translation API or placing a proxy like LiteLLM in front to convert Claude-format requests into local LLM calls.


However, the latest Ollama now includes a built-in compatible API controller that operates identically to the API paths used by Claude CLI.


Therefore, with the latest Ollama, you can send Claude Code requests directly to Ollama without configuring a separate proxy.


This simplifies the setup and makes it easier to integrate a local LLM into the Claude development tool workflow.


Conversely, if the tool you are using does not support the Claude-compatible API or requires an API format that Ollama does not provide, proxy configuration is necessary.


In that case, you can use a tool like LiteLLM to convert request and response formats.


In summary, based on the latest Ollama, you should primarily use the `Claude tool -> Ollama Claude-compatible API` structure.


If the tool cannot use the Claude-compatible API provided by Ollama, choose the `tool -> LiteLLM or translation proxy -> model API required by the tool` structure.


### Changing the API Path


When using a Claude-compatible API endpoint, first configure the API address and authentication values.


This setting determines which API server the Claude tool sends requests to, independent of which model you use.


| Environment Variable | Description                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------- |
| ANTHROPIC_BASE_URL   | Specifies the Ollama Claude-compatible API address instead of the Claude API.                      |
| ANTHROPIC_AUTH_TOKEN | Used in gateway or proxy environments that require token-based authentication.                     |
| ANTHROPIC_API_KEY    | Used in environments that require API key-based authentication. A dummy value can be used with local Ollama. |


A simple configuration for direct connection to local Ollama is typically set up as follows.


```bash
export ANTHROPIC_BASE_URL=http://localhost:11434
export ANTHROPIC_API_KEY=dummy-key
```


Choose between `ANTHROPIC_AUTH_TOKEN` and `ANTHROPIC_API_KEY` depending on your gateway or compatible API implementation.


For a configuration that connects directly to local Ollama, assigning a dummy value to `ANTHROPIC_API_KEY` is usually sufficient.


### Model Selection Issue


After configuring the API address and authentication values, the next step is to match the model name.


In Claude CLI or VS Code Claude settings, change the request target to Ollama's Claude-compatible API, and specify the actual execution model as a locally installed Ollama model.


Claude CLI sends requests based on Claude model names or model aliases by default.


For example, Ollama does not have models with the same names as Claude models.


Therefore, you need to match the model name sent by Claude tools to the local model name installed in Ollama.


In practice, the environment variable names and API paths may vary depending on the Claude CLI version and VS Code extension settings you are using.


A proxy like LiteLLM should only be used selectively when using an older version of Ollama or when you need to combine multiple model providers into a single endpoint.


The model selection issue can be addressed in three main ways.


CASE 1 : Controlling via Environment Variables


The first approach to consider is controlling Claude Code's API address, authentication values, and model selection through environment variables.


Without arbitrarily copying Ollama model names, you can directly specify the target and model name that Claude tools will request.


The environment variables primarily used for model selection are as follows.


| Environment Variable           | Description                                                                                                                            |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| ANTHROPIC_MODEL                | Specifies the default model for the current session.                                                                                   |
| ANTHROPIC_DEFAULT_SONNET_MODEL | Specifies the model to use when a Sonnet series alias is called.                                                                       |
| ANTHROPIC_DEFAULT_OPUS_MODEL   | Specifies the model to use when an Opus series alias is called.                                                                        |
| ANTHROPIC_DEFAULT_HAIKU_MODEL  | Specifies the model to use for Haiku series aliases or quick auxiliary tasks.                                                           |
| ANTHROPIC_SMALL_FAST_MODEL     | Previously used to specify the model for quick auxiliary tasks. In the latest configuration, ANTHROPIC_DEFAULT_HAIKU_MODEL is preferred. |


```bash
# Default session model
export ANTHROPIC_MODEL=qwen2.5-coder:7b

# Sonnet series alias model
export ANTHROPIC_DEFAULT_SONNET_MODEL=qwen2.5-coder:7b

# Opus series alias model
export ANTHROPIC_DEFAULT_OPUS_MODEL=qwen2.5-coder:14b

# Haiku series alias model
export ANTHROPIC_DEFAULT_HAIKU_MODEL=qwen2.5-coder:3b
```


With this setup, when Claude tools internally distinguish and call model aliases, each can use a different Ollama model.


For example, regular code editing and refactoring can be handled by `qwen2.5-coder:7b`, while simple summaries and quick auxiliary tasks can be handled by `qwen2.5-coder:3b`.


The legacy `ANTHROPIC_SMALL_FAST_MODEL` was previously used to specify the model for quick auxiliary tasks.


The latest documentation has consolidated this to use `ANTHROPIC_DEFAULT_HAIKU_MODEL`.


Therefore, for new configurations, use `ANTHROPIC_DEFAULT_HAIKU_MODEL` first, and only check `ANTHROPIC_SMALL_FAST_MODEL` when needed for older versions of Claude Code.


The environment variable approach makes the configuration intent clear.


Since it uses the Ollama model names as installed locally, there is no need to create separate model aliases.


It is also easy to test different model combinations across multiple terminals.


CASE 2 : Matching Model Names When Using Ollama


If controlling model names via environment variables is difficult, or if the tool calls Claude model names as fixed values, you can match the model names on the Ollama side.


For example, if the Claude tool always calls `claude-3-5-sonnet`, create a model alias with the same name in Ollama.


The actual execution model uses Qwen Coder, but only the externally exposed name matches the Claude model name.


```bash
ollama cp qwen2.5-coder:7b claude-3-5-sonnet
```


With this setup, the Claude tool requests with the original model name as-is.


Ollama finds and runs the local model registered under the same name.


This is useful when it is difficult to change the tool's model selection UI or settings.


The downside is that as model aliases increase, you have more names to manage.


Therefore, in personal development environments, it is best to use the environment variable approach first and only use the Ollama alias approach when you cannot directly control the model name.


CASE 3 : Specifying the model Parameter Directly at CLI Execution


If you need to switch models for a one-time execution, you can specify the `--model` parameter directly when running Claude CLI.


This approach is useful when you want to use a different model for a specific execution without changing environment variables.


```bash
claude --model qwen2.5-coder:7b
```


For example, if you normally have a default model set via environment variables but want to use a larger model for a specific task, run it as follows.


```bash
claude --model qwen2.5-coder:14b
```


The `--model` parameter applies only to that execution session.


It can also be used to test different models simultaneously across multiple terminals.


However, if you plan to use the same model repeatedly, specifying it via environment variables is easier to manage.


## Conclusion


Claude Code and the VS Code Claude environment provide a tool workflow that developers are already familiar with.


By replacing only the model execution part with a local LLM in this environment, you can reduce Claude infrastructure costs while maintaining a similar development workflow.


However, with local LLMs, response quality and speed vary depending on model size and hardware performance.


Complex refactoring or tasks requiring long context may produce lower quality results than Claude.


Therefore, it is practical to start applying this to repetitive tasks and personal projects where cost savings are important.
