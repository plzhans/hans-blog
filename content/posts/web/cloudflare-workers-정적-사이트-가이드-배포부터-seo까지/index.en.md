---
id: "124"
translationKey: "124"
slug: "124-cloudflare-workers-static-site-guide"
title: "Cloudflare Workers Static Site Guide - From Deployment to SEO"
description: "Putting a static site on Cloudflare, then layering code in front of it to improve SEO. A signpost for a four-part series."
categories:
  - "web"
tags:
  - "cloudflare"
  - "seo"
  - "workers"
date: 2026-09-11T13:01:00.000Z
lastmod: 2026-09-11T13:01:00.000Z
toc: true
draft: false
images:
  - "assets/1_3d822a0f-7e83-818c-8060-c230fe8eebe7.png"
---


![Series cover image with a Cloudflare Workers edge node at the center, connecting the four parts: hosting, local development, caching, and SEO](./assets/1_3d822a0f-7e83-818c-8060-c230fe8eebe7.png)


## Overview


It's common to take an SPA built with React or Vue, or a static site generated with Hugo, drop it on a CDN, and leave it at that. Deployment is simple, and with no server there's nothing to operate.


But before long you hit a moment of **"I want to touch the response, but there's no server."** That's when you want per-page meta tags, or to show crawlers the actual content, or to attach one more response header.


If you're already on Cloudflare, you can do that **without standing up a new server**. You layer a bit of code in front of your static assets. This series breaks that process into four parts.


## Reading order

1. [Cloudflare Workers Static Site Hosting - Request Flow and Billing](../125-cloudflare-workers-static-assets-routing-billing/) — structure and request flow. When does the Worker run, and when are you billed
2. [How to Use wrangler - Local Development and Deployment for Cloudflare Workers](../126-cloudflare-workers-wrangler-dev-deploy/) — how to run it locally and ship it
3. [How to Set Up Caching in Cloudflare Workers - Edge Cache and Tiered Cache](../127-cloudflare-workers-cache-tiered-cache/) — once you start calling external APIs
4. [How to Improve React SPA SEO - From Meta Tags to SSR with Cloudflare Workers](../128-react-spa-seo-cloudflare-workers-ssr/) — from meta injection to server rendering

Part 1 is the concepts, part 2 is the tooling. Those two are better read in order. Parts 3 and 4 you can pick up when you need them.


## Why Workers


**Zero additional infrastructure.** If Cloudflare is already serving your assets, you're just adding code on top of that. Nothing new to deploy, and no extra server whose death takes the site down with it.


**You can start on the free plan.** Up to 100,000 requests a day are free, and static asset requests aren't billable at all.


**It runs at the edge.** It executes in a data center close to the user, so there's no round trip to the origin.


It's not a silver bullet, of course. Constraints like 10ms of CPU per request (free plan) mean heavy computation doesn't fit. The series covers where that boundary lies, too.


## What each part covers


### Part 1 - Static site hosting


What Workers Static Assets is, and <strong>the order in which a request flows</strong>, laid out in a sequence diagram.


The key points are the basic rule that **"if the asset exists, the Worker doesn't run"** and `run_worker_first`, which inverts it. Where the billing happens is covered here too — static assets are free and only requests that actually ran the Worker get counted, so narrowing the paths that go through the Worker translates directly into cost.


→ [Cloudflare Workers Static Site Hosting - Request Flow and Billing](../125-cloudflare-workers-static-assets-routing-billing/)


### Part 2 - How to use wrangler


From installing `wrangler` to deploying. That your runtime dependencies don't grow, why you need to <strong>separate the type configuration</strong> for your Worker code, and the single most confusing thing about it.


**`wrangler dev` is not a frontend dev server.<strong> It runs the same runtime as production (`workerd`) locally, so it consumes </strong>build output**, not source. Not knowing this gets you stuck repeating "I definitely changed it, so why is it the same?"


→ [How to Use wrangler - Local Development and Deployment for Cloudflare Workers](../126-cloudflare-workers-wrangler-dev-deploy/)


### Part 3 - How to set up caching


Once your Worker starts calling external APIs, you need a cache. Without one, origin load grows in proportion to page views.


There are two ways to do it, and **there's a basis for choosing.<strong> And the fact that the edge cache is </strong>separate per data center** is obvious once you know it, but without that knowledge you'll waste a lot of time wondering "why isn't the cache hitting?"


→ [How to Set Up Caching in Cloudflare Workers - Edge Cache and Tiered Cache](../127-cloudflare-workers-cache-tiered-cache/)


### Part 4 - How to improve React SPA SEO


This is the destination of the series. When you put an SPA on static hosting, **the HTML the server emits has nothing for a search engine to read.**


Google does render JS, but whether that's good enough is worth questioning, and Google's own documentation recommends SSR. This part solves the problem in <strong>stages 0 → 1 → 2</strong>: from the lightweight approach of just filling in meta tags, to splitting `entry-client` / `entry-server` and rendering the body itself on the server.


→ [How to Improve React SPA SEO - From Meta Tags to SSR with Cloudflare Workers](../128-react-spa-seo-cloudflare-workers-ssr/)


## What this series doesn't cover


Storage bindings like KV, R2, and D1, Durable Objects, and Cron Triggers are outside the scope of this series. It only goes as far as putting one thin layer in front of a static site.
