---
id: "131"
translationKey: "131"
slug: "131-robots-txt-ai-crawler-content-signals"
title: "Controlling AI Crawlers with robots.txt - How to Allow Search, Training and Agents Separately"
description: "AI crawlers have added more to write in robots.txt. A rundown of per-purpose bot names, Google-Extended and Content-Signal."
categories:
  - "web"
tags:
  - "ai"
  - "cloudflare"
  - "seo"
date: 2026-09-16T14:55:00.000Z
lastmod: 2026-09-16T14:55:00.000Z
toc: true
draft: false
images:
  - "assets/1_3dd22a0f-7e83-81b3-9ca5-fb1ae5e5862d.jpg"
---


![Crawlers reading robots.txt, with search and agent bots passing through while the training crawler turns back](./assets/1_3dd22a0f-7e83-81b3-9ca5-fb1ae5e5862d.jpg)


## Overview


robots.txt started as a 1994 mailing list agreement and only became a standard in 2022 with [RFC 9309](https://www.rfc-editor.org/rfc/rfc9309.html).


The rules are simple. You put one text file at the site root and write down **who** (`User-agent`) is allowed to crawl **where** (`Disallow` / `Allow`).


There was no problem in the past, because crawlers effectively had one purpose — build a search index and send people back your way through links. The exchange held up.


AI crawlers broke that exchange. They take the same thing but send nobody back. They use it to train models and read it live at the moment a user asks a question. From a site's point of view those three are **entirely different things**, and robots.txt had no field to write them down separately. So fields are being added right now.


### What this article covers

- What traditional robots.txt handled, and its structural limits
- The entries AI has added — bots split by purpose, tokens that aren't crawlers, `Content-Signal`
- Why it matters now, and what to open or block depending on the kind of site

---


## What we traditionally wrote in robots.txt


The syntax is effectively four lines.


```plain text
User-agent: *
Disallow: /admin/
Disallow: /*?sort=
Allow: /

Sitemap: https://example.com/sitemap.xml
```


The uses were usually one of these four.

- **Excluding paths nobody needs to see** — `/admin/`, pages behind login, staging copies
- **Saving crawl budget** — URLs like sort and filter query parameters, where effectively the same page balloons into hundreds
- **Giving different rules per bot** — writing a separate `User-agent: Googlebot` group
- **Pointing to the sitemap** — `Sitemap:` is the only standard channel for telling crawlers where to start

Two things need stating up front here.

1. **It has no force.** robots.txt is not a firewall but a **request**. Honoring it is the bot's choice.
Nothing happens to a bot that ignores it. To really block them you have to block at the server or WAF.
2. **Disallow is not an indexing block.**
It can even go the other way. Blocking crawling means the crawler **cannot read** that page's `noindex` meta tag, so it may leave just the URL in search results based on external links alone.
If you want something out of the index, leave crawling open and let `noindex` be read.

And the third limit, the heart of this article — **there are only two axes.** Who, and where. There is no place to write **what it will be used for**.


---


## What AI has added


### ① One company runs several bots


With no field for purpose, the workaround vendors chose was **minting a separate bot name for each purpose**. Today the major vendors have mostly split into three: training, search, and live user requests.

- **OpenAI** — `GPTBot` (training), `OAI-SearchBot` (search index), `ChatGPT-User` (a live visit the moment a user asks about a link)
- **Anthropic** — `ClaudeBot` (training), `Claude-SearchBot` (search), `Claude-User` (user request)
- **Perplexity** — `PerplexityBot`, `Perplexity-User`
- **Meta** — `Meta-ExternalAgent`
- **Common Crawl** — `CCBot`. This one isn't owned by a specific model but is a **public dataset**. Several models train on that dataset

That makes branching like this possible.


```plain text
# Search welcome, training declined
User-agent: OAI-SearchBot
Allow: /

User-agent: GPTBot
Disallow: /
```


The structural limit remains, though. **This is a blocklist.** You have to know every bot name yourself. The day a vendor creates a new bot, your robots.txt falls behind. Maintaining that list never ends.


### ② "Tokens" that aren't crawlers appeared


`Google-Extended` and `Applebot-Extended` are **not bot names.** No crawler shows up under those names.


Take Google. Google's crawler is just `Googlebot`. That bot comes and takes the page. But the data it takes is used both for the search index and for training Gemini.


That creates a problem. Block `Googlebot` because you dislike training, and **you disappear from search too.** There was no way to separate the two.


So Google made `Google-Extended` separately. It leaves crawling as it is and is **a switch that says only "don't use what you took for training."**


```plain text
User-agent: Google-Extended
Disallow: /
```


Write this and `Googlebot` still comes as usual. Your search ranking stays the same. Only the training side drops out.


The significance isn't small. It is **the first case of robots.txt controlling use rather than access.** The character of the file shifted from "don't crawl this" to "crawling is fine, just don't use it for that."


### ③ `Content-Signal`, which writes the purpose directly


Rather than chasing bot names, the idea of **making the purpose axis part of the syntax** is Cloudflare's [Content Signals Policy](https://contentsignals.org/), released in September 2025.


```plain text
User-agent: *
Allow: /

Content-Signal: search=yes, ai-input=yes, ai-train=no
```


There are three values.

- `search` — building a search index and sending people back through links
- `ai-input` — feeding content in as input at the moment an answer is generated (RAG, grounding)
- `ai-train` — training or fine-tuning a model

Each is `yes` or `no`. **Leaving one out means "no stated intent."** It is neither permission nor prohibition.


The nice part is that you don't need to know bot names. One `User-agent: *` plus three purpose lines applies to newly created bots as well. On the other hand, it should be made clear that **this is still not enforcement.** Content Signals is not a technical block but a **statement of intent.** Its purpose is to include human-readable license wording inside robots.txt so that "I didn't know" stops being an excuse. It is grounds, not enforcement.


How it actually gets used is shown right below with this blog's configuration.


### ④ Standardization is under way too


The IETF has formed an [AI Preferences (aipref) working group](https://datatracker.ietf.org/wg/aipref/about/) to refine purpose vocabulary and the ways of attaching it into a standard. It is still at the draft stage, but the direction is the same as `Content-Signal` — **define a vocabulary per purpose** and let it be attached **through HTTP response headers** as well as robots.txt. Once it can go on headers, intent can be stated for individual files like images and PDFs, beyond the page level.


### ⑤ Easy to confuse — `llms.txt` is not a permissions file


Some files get mentioned alongside it but are different in character.

- **`llms.txt`** — has **nothing to do** with allowing or blocking. It is closer to a **guide**, a markdown list of key documents arranged so an LLM can understand the site. It is not a replacement for robots.txt
- **`ai.txt`** — a separate file aimed at opting out of training data. Adoption has been low, and things are effectively consolidating around `Content-Signal`

### ⑥ And what robots.txt cannot block — AI agents


This is the murkiest point right now.


An AI agent that drives a browser directly is **not a crawler.** It is an **agent acting on someone's behalf**, coming in once because a person told it to "summarize this page." Since robots.txt was a convention for automated crawlers in the first place, the prevailing reading is that it does not apply in principle to a one-off access a user explicitly requested. That is exactly why separate names like `ChatGPT-User` and `Claude-User` exist.


On top of that, the User-Agent string is simply **self-declared.** Anyone determined enough can pretend to be an ordinary browser. That is why Cloudflare, in its post on [holding mixed-use crawlers accountable](https://blog.cloudflare.com/accountable-mixed-use-ai-crawlers/), asks for two things — since a site has no way to branch when a single crawler does both search and training, **split bots by purpose** and **prove identity with a cryptographic signature** instead of a UA string (Web Bot Auth). The argument is to move from a regime that trusts names to one that verifies signatures.


---


## So why should you care


Traditional search crawlers were never much of a problem. Googlebot drops by periodically and takes only what changed. In return it sends people via search results. The load is small and you get something back, so there was no particular reason to block it.


AI crawlers are different. The point of collection for training is to sweep the whole site. It doesn't look only at what changed; it takes everything there is. The scale of a single visit doesn't compare to a search crawler. On this blog alone, one AI crawler took seven times as many requests as Googlebot.


That isn't free.

- For a static blog it's bandwidth. **On a dynamic site or one backed by an API, it turns straight into server load**
- Unlike search, **there is nothing coming back.** Even when cited in an AI answer, few people follow the link
- Once an article has gone into training, it **cannot be undone**

That said, blocking everything is not the answer. **The answer depends on the kind of site.**

- **Personal blogs and technical docs** — being read is the point. Blocking search, let alone the path to being cited in AI answers (`ai-input`), costs you more
- **News, paid content, creative work** — the content itself is the product. Closing `ai-train` is the default
- **Commerce and internal services** — training value is low and often all that's left is load. Better to pick off the bulk-collection types first

In the end robots.txt has become a file for deciding **not "open or block" but "open it for what."**


### How this blog has it set up


It's a personal tech blog, so all three are open. These are articles written to be read, so I saw no reason to block training either.


```plain text
User-agent: *
Allow: /

Content-Signal: search=yes, ai-input=yes, ai-train=yes

Sitemap: https://blog.plzhans.com/sitemap.xml
```

- `Allow: /` — no path restrictions. There's nothing on this site to hide
- `Content-Signal` — search, AI answers and training all `yes`
- `Sitemap:` — **this actually reduces load.** Instead of sweeping the site blindly, crawlers look at the list and take only what they need. Blocking isn't the only tool

With Hugo, turn on `enableRobotsTXT = true` in `hugo.toml` and put the above in `layouts/robots.txt`, and it will be generated at build time. Hugo creates `sitemap.xml` on its own.


---


## Wrapping up

- robots.txt used to be a file that only wrote down who could crawl where. Now it has to write down what the crawled content will be used for as well.
- Blocking by splitting bot names is a blocklist, so it never ends. Content-Signal reduced it to three: search, ai-input and ai-train.
- For a personal blog it is better to leave search and ai-input open. The one to think about is ai-train.
- robots.txt is a request to the very end. To enforce it you have to cut the request off at the server.

If you use Cloudflare, it supports that as a feature.

- [Blocking AI Bots with Cloudflare - Managed robots.txt and AI Crawl Control](../132-cloudflare-ai-crawl-control-managed-robots-txt/) — Managed robots.txt · Block AI bots · AI Crawl Control

### References

- [RFC 9309 — Robots Exclusion Protocol](https://www.rfc-editor.org/rfc/rfc9309.html)
- [Content Signals Policy](https://contentsignals.org/)
- [Cloudflare Blog — Accountable mixed-use AI crawlers](https://blog.cloudflare.com/accountable-mixed-use-ai-crawlers/)
- [IETF AI Preferences (aipref) WG](https://datatracker.ietf.org/wg/aipref/about/)
