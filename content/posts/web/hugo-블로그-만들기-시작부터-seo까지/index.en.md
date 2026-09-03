---
id: "123"
translationKey: "123"
slug: "123-hugo-blog-guide"
title: "Building a Hugo Blog - From Start to SEO"
description: "A step-by-step guide to building a blog with Notion→Hugo→GitHub Pages, connecting a custom domain, adding multilingual support, and applying security headers."
categories:
  - "web"
tags:
  - "github-pages"
  - "hugo"
  - "seo"
date: 2026-09-03T00:00:00.000Z
lastmod: 2026-09-03T12:52:00.000Z
toc: true
draft: false
---


## Overview


This blog itself was built in this exact order. From the pipeline of writing in Notion, converting to Markdown, building with Hugo, and deploying to GitHub Pages, to connecting a custom domain, adding multilingual support, and applying security headers — here's the order.


## Why This Combination


A static site doesn't need its own server to run, and hosting it for free on something like GitHub Pages already makes it fast and stable. The catch is that "static" tends to make the writing experience inconvenient — using Notion as a CMS solves that: you write in the editor you're already used to, and an API pulls the Notion page straight into Markdown for the build. Hugo was chosen because, among static site generators, it builds fast and has a solid theme ecosystem.


## The Overall Architecture


It flows as: Notion (writing) → sync script (Notion API converts to Markdown) → Hugo (static site build) → GitHub Actions (auto build/deploy on commit) → GitHub Pages (hosting) → Cloudflare (CDN/security headers). Write the post, flip its status to "publish request," and the rest of the automated pipeline takes care of everything.


## Build Order

1. Build the basic blog first → [Building a Blog with Hugo + GitHub](../94-hugo-github-blog/)
2. Connect your own domain → [Using a Custom Domain with GitHub Pages](../86-github-pages-custom-domain/)
3. Expand to multiple languages → [Adding Multilingual Support to a Hugo Site](../93-hugo-multilingual-seo-setup/)
4. Finish with security headers → [4 Security Headers Flagged by an SEO Audit — Applying Them on Cloudflare Without Code](../120-cloudflare-security-headers-hsts-csp/)

## Hugo + GitHub Blog — The Basic Pipeline


Covers the entire Notion→Markdown→Hugo build→GitHub Pages deployment flow. Includes installing Hugo, applying the m10c theme, automatic deployment via GitHub Actions, and common mistakes with baseURL configuration. Finishing just this stage already gives you a fully automated pipeline from writing to deployment.


→ [Building a Blog with Hugo + GitHub](../94-hugo-github-blog/)


## GitHub Pages Custom Domain — Connecting Your Own Domain


Covers CNAME/A/AAAA record configuration, the procedure for applying a custom domain on GitHub Pages, the difference in CNAME file handling between Actions deployment and branch deployment, and why a CAA record can prevent Enforce HTTPS from turning on. Using your own domain instead of a github.io subdomain gives you more than just branding — it also sends a more consistent signal to search engines.


→ [Using a Custom Domain with GitHub Pages](../86-github-pages-custom-domain/)


## Hugo Multilingual Support — Covering SEO Too


Covers configuring baseURL, sitemap, robots, JSON-LD, Open Graph, and meta description for a multilingual blog, and preventing duplicate content issues with hreflang/canonical. If you don't manage per-language sitemaps separately, it's easy to end up with indexing problems, so it's important to get the structure right from the start.


→ [Adding Multilingual Support to a Hugo Site](../93-hugo-multilingual-seo-setup/)


## Security Headers — Why an SEO Audit Flags Them


Covers why an SEO audit flags HSTS, CSP, X-Content-Type-Options, and Referrer-Policy, and how to manage headers with fixed values via Cloudflare Transform Rules while managing the frequently-changing CSP via an HTML meta tag. Since a static site has no server config file, these headers need to be handled separately at the CDN or meta-tag level.


→ [4 Security Headers Flagged by an SEO Audit — Applying Them on Cloudflare Without Code](../120-cloudflare-security-headers-hsts-csp/)


## Problems This Blog Has Actually Run Into


Contrary to the assumption that "a static site is simple," running it in practice kept surfacing unexpected problems.

- **Delayed Google indexing** — Even after submitting a sitemap, new posts can go unindexed for weeks if Googlebot doesn't come back to recrawl. Resubmitting the sitemap and checking GSC's URL inspection need to be a regular habit.
- **Image loading priority** — The first card image on a list page is an LCP (Largest Contentful Paint) candidate that needs eager loading, but "array index 0" and "the card that's actually rendered first" don't always match (things go wrong once an image-less post gets mixed into the main list).
- **Meta tag length** — Google truncates title and meta description based on a fixed pixel width (roughly 600–920px on desktop), not a character count, and Korean syllables render wider than Latin letters, so they get cut off earlier at the same character count.
- **Multilingual lastmod sync** — If you only edit the Korean source and don't touch the translations at the same time, the translated sitemap's lastmod drifts from the actual change date, hurting sitemap trustworthiness.

They all share one thing in common: whether the code is "logically correct" and whether it "actually behaves as intended on the live site" are two separate questions, so it's essential to make a habit of checking the live pages directly after every deploy.


## Next Steps


Once a site is established, ongoing SEO operations — managing Google Search Console indexing, checking sitemap coverage, optimizing performance (Core Web Vitals) — matter more. This blog keeps documenting the problems that come up along the way in dedicated posts.
