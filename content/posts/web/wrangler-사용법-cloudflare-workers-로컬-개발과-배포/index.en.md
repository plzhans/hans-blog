---
id: "126"
translationKey: "126"
slug: "126-cloudflare-workers-wrangler-dev-deploy"
title: "How to Use wrangler - Local Development and Deployment for Cloudflare Workers"
description: "Installing wrangler and setting up types, booting workerd with wrangler dev, and deploying. Starting with the fact that wrangler dev is not a frontend dev server."
categories:
  - "web"
tags:
  - "build"
  - "cloudflare"
  - "workers"
date: 2026-09-11T13:01:00.000Z
lastmod: 2026-09-11T13:01:00.000Z
toc: true
draft: false
images:
  - "assets/1_3d822a0f-7e83-81f6-b43f-ee90a3347422.png"
---


![Cover image showing the Worker runtime you ran locally going up to the edge platform as is](./assets/1_3d822a0f-7e83-81f6-b43f-ee90a3347422.png)


## Overview

> This post is part of the [Cloudflare Workers Static Site Guide - From Deployment to SEO](../124-cloudflare-workers-static-site-guide/) series.

Working with Cloudflare Workers is effectively <strong>working with `wrangler`</strong>. Running locally and deploying both go through the same CLI.


But the name creates one misunderstanding. **`wrangler dev` is not a frontend dev server.** I got stuck on this for quite a while myself at first.


### What this post covers

- What you need to install — and the fact that <strong>your runtime dependencies don't grow</strong>
- Why you need to <strong>separate the type configuration</strong> for your Worker code
- What `wrangler dev` actually does, and how it differs from `vite dev`
- Why <strong>the static site build has to come first</strong>
- How to verify that the Worker actually modified the response
- Deployment — injecting per-environment values, and what to watch for in CI

### What it doesn't cover


The structure and request flow of Workers Static Assets are in [Cloudflare Workers Static Site Hosting - Request Flow and Billing](../125-cloudflare-workers-static-assets-routing-billing/).


### Prerequisites


Beyond having a Cloudflare account and being able to build a static site (`npm run build` → `dist/`), no prior knowledge is required.


---


## Installing wrangler


It's Cloudflare's CLI. It handles both local execution and deployment. The list of commands is in the [Commands documentation](https://developers.cloudflare.com/workers/wrangler/commands/).


### The option of not installing it


`wrangler` is **a deployment tool, not application code.** So you can leave it out of your dependencies and pull it down only when you need it.


```bash
# As a devDependency
npm i -D wrangler
npx wrangler dev

# Or without installing - pin the major version
npx wrangler@4 dev
pnpm dlx wrangler@4 dev
```


The advantage of the latter is that **local and CI use the same version**, and the deployment tool never enters your app's `package.json`. The downside is the small download time each run.


Either way, **your runtime dependencies don't grow.** Cloudflare is what executes the Worker.


### Types are a separate package


Workers globals like `Fetcher`, `HTMLRewriter`, `ExecutionContext`, and `caches` come from the types package.


```bash
npm i -D @cloudflare/workers-types
```


**Why you need to separate the type configuration**


**The problem comes from having two execution environments inside one project.**


```plain text
src/                  runs in the browser   has document · no HTMLRewriter
cloudflare/workers/   runs on workerd       no document · has HTMLRewriter
```


The globals available are <strong>the opposite of each other</strong>, and TypeScript can't tell which is which just by looking at the file. It only knows what you wrote in tsconfig. So you have to tell it "which folder is which environment," and to do that you need two configurations.

> For reference, Workers is not Node. It's a third runtime with neither Node APIs like `fs` and `process` nor the browser's `document`. So you can't just reuse an existing Node configuration either.

If there's only one configuration, it's usually browser-based. Check Worker code with that configuration and the code below **passes compilation.**


```typescript
export default {
  async fetch(request: Request): Promise<Response> {
    // There is no document in a Worker. This still type-checks.
    const el = document.getElementById('root');
    return new Response(el?.textContent ?? '');
  },
};
```


Deploy it and it dies with `document is not defined`. **You've deferred to runtime something the type checker should have caught.**


There's a reverse direction too. Without `@cloudflare/workers-types`, `HTMLRewriter`, `ExecutionContext`, and `caches` all become "cannot find name."


**Cramming both into one configuration isn't the answer either.<strong> Put DOM and Workers types together and things like `Request`, `Response`, and `caches` — </strong>names that exist on both sides in different shapes**—get mixed up, and you end up with the wrong type.


So you split the configuration and tie it together with project references. Each configuration decides three things.


|           | What it decides                                                              |
| --------- | ---------------------------------------------------------------------------- |
| `include` | **Which folder** these rules apply to                                        |
| `lib`     | What to assume exists in the standard environment (`"DOM"` → `window`, `document`) |
| `types`   | Additional global packages (`@cloudflare/workers-types` → `HTMLRewriter`, `caches`) |


```json
// tsconfig.worker.json
{
  "extends": "./tsconfig.node.json",
  "compilerOptions": {
    // No DOM. Workers globals instead.
    "types": ["@cloudflare/workers-types"]
  },
  "include": ["src/worker"]
}
```


```json
// tsconfig.json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.worker.json" }
  ]
}
```


---


## Running locally — the most confusing part


### `wrangler dev` is not a frontend dev server


The `dev` in the name makes it easy to mistake for something like `vite dev`, but what it does is entirely different.


[`wrangler dev`](https://developers.cloudflare.com/workers/development-testing/) **boots the exact same runtime as the Cloudflare edge (`workerd`) locally, as a web server.** It runs, on your machine, the very program that will run in a Cloudflare data center once deployed. `HTMLRewriter`, `caches`, and `env.ASSETS` are all the same implementations as in production.


In other words, it's **"standing up a miniature of production locally"** — not a tool that watches your source and transforms it.


|                 | `vite dev`             | `wrangler dev`                        |
| --------------- | ---------------------- | ------------------------------------- |
| What it is      | frontend **dev server<strong> | a replica of the production </strong>runtime**  |
| Input           | `src/` source          | **build output (`dist/`)**            |
| Source changes  | applied instantly via HMR | not applied — **you have to rebuild** |
| Worker          | doesn't exist          | runs                                  |


### That's why the static site build comes first


`env.ASSETS` points at **"the pile of deployed static assets."** Without that pile, the Worker has nothing to pull from.


`--assets` is what tells it where to read that pile locally.


```bash
npx wrangler@4 dev --assets dist
#                            ^^^^ build output, not src/
```


The order is always this.


```bash
# 1. Build the static site first -> dist/
npm run build

# 2. Boot workerd with dist/ as its asset store
npx wrangler@4 dev --assets dist
```


```plain text
⛅️ wrangler 4.x
Ready on http://localhost:8787
```


**If you changed UI code, you have to start again from step 1.** `wrangler dev` only looks at `dist/`, so it has no idea you edited `src/`. Most instances of "I definitely changed it, so why is it the same?" are this.


Wrapping it in a script makes life easier.


```json
// package.json
{
  "scripts": {
    // cf- prefix: plain "worker" collides with Web Worker / Service Worker / worker_threads
    "preview:cf-worker": "npm run build && wrangler dev --assets dist"
  }
}
```


You can pin the port in the configuration.


```json
// wrangler.jsonc
{ "dev": { "port": 6173 } }
```


### Workflow


You don't keep both servers running at once.

- <strong>While building the UI</strong>, use `vite dev`. The Worker doesn't run.
- **Only when you've touched the Worker**, build and then verify with `wrangler dev`.

### Verify against the "raw response"


If your code modifies the response, **you must not look at the rendered screen.** The screen is what JS produced, so the Worker's work and the browser's work are mixed together. Even with the Worker bypassed entirely, the screen looks just as fine.


**View source in the browser**


```plain text
view-source:http://localhost:6173/products/1234
```


**The Elements panel in DevTools is no use here** — that's the current DOM, which is already after JS has run.


**The DevTools Network tab** — pick the document request and look at Response, and you get the body exactly as received. You can see the response headers too, which makes it the most accurate option.


**curl** — handy when you want to extract just one thing or run it from a script.


```bash
curl -s http://localhost:6173/products/1234 | head -20
curl -s -D - -o /dev/null http://localhost:6173/products/1234   # headers only
```


If the value didn't change, <strong>the Worker didn't run</strong>. Check first whether that path is in `run_worker_first`.


---


## Deployment


Once it checks out locally, ship it with the same CLI.


```bash
npx wrangler@4 deploy --assets dist
```


### Values that change per environment


Values that vary by environment — site URL, API URL, keys — are better **passed via the CLI than hard-coded into the configuration file** ([environment variables documentation](https://developers.cloudflare.com/workers/configuration/environment-variables/)). Write them into the file and they fork per environment, and when they drift apart things silently misbehave.


```bash
npx wrangler@4 deploy --assets dist \
  --name "prod-my-site" \
  --var SITE_URL:"https://example.com" \
  --var API_BASE_URL:"https://api.example.com"
```


CLI values beat the configuration file, so **you never have to write the same value in two places.**


```typescript
export interface Env {
  ASSETS: Fetcher;
  SITE_URL: string;
  API_BASE_URL: string;
}
```


### Leaving a deployment trail


`--tag` and `--message` are labels attached to a Worker version. They let the dashboard answer "which commit is currently live?"


```bash
npx wrangler@4 deploy --assets dist \
  --tag "$GIT_SHA" \
  --message "ref: $GIT_BRANCH"
```


Without them you're matching things up by eye when it's time to roll back.


### Running in CI


`wrangler` asks about various things at the end of a deploy (telemetry consent and so on). In CI there's nobody to answer, so it stops right there.


```bash
CI=true WRANGLER_SEND_METRICS=false npx wrangler@4 deploy --assets dist
```


Authentication goes through environment variables. wrangler reads these names directly, so there's no need to export them separately.


```plain text
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
```


### Don't deploy to a Worker that doesn't exist


`wrangler deploy --name X` **creates X if it doesn't exist<strong>, and overwrites it if it does. Convenient as that looks, </strong>a deploy with the wrong name silently "succeeds."** A stray Worker gets created while the site you're actually looking at doesn't change.


In CI it's safer to check existence once before deploying. Query the API for that name and look at **the status code only**.


```bash
# -o /dev/null  discard the body - we only want the status
# -w            print just the status code
code=$(curl -s -o /dev/null -w '%{http_code}' \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/scripts/$NAME")

case "$code" in
  2[0-9][0-9]) ;;                                  # exists - go ahead
  404) echo "no such Worker: $NAME" >&2; exit 1 ;; # typo, or first-ever deploy
  401|403) echo "token lacks Workers permission" >&2; exit 1 ;;
  *) echo "check failed (HTTP $code)" >&2; exit 1 ;;
esac
```


**You have to accept the whole 2xx range.** This endpoint returns the script body, and a Worker containing only static assets has an empty body, so you get a **204**. Check for `200` alone and every deploy after the first gets blocked.


And **you must separate "doesn't exist" (404) from "not authorized" (401/403).** Lump them together and, in a situation where the token simply lacks permission, you'll emit the wrong guidance — "it's the first time, so allow creation" — and following that advice gets the deploy killed at authentication again.


---


## Summary

- Runtime dependencies **don't grow.** Cloudflare executes the Worker. For development you only need `@cloudflare/workers-types` and `wrangler`.
- You can use `wrangler` **without installing it**, via `npx wrangler@4`. Pin the version and local and CI use the same one.
- <strong>Separate the type configuration</strong> for your Worker code. Check everything with one tsconfig and using `document` in a Worker passes, only breaking after deployment.
- <strong>`wrangler dev` is a local replica of the production runtime</strong>, not a frontend dev server. You have to build `dist/` first, and if you changed UI code you have to rebuild.
- Verify whether the Worker modified the response against the <strong>raw response</strong>. The rendered screen and the DevTools Elements panel can't tell the difference.
- Pass per-environment values via the **CLI `--var`**. Hard-code them in the configuration file and the same value ends up in two places, forking per environment.
- Deploying to a Worker that doesn't exist <strong>silently succeeds</strong>. In CI, check existence once.

### References

- [Local development](https://developers.cloudflare.com/workers/development-testing/) — `wrangler dev`
- [Wrangler commands](https://developers.cloudflare.com/workers/wrangler/commands/)
- [Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)
- [Environment variables](https://developers.cloudflare.com/workers/configuration/environment-variables/) — `--var`
- [Cloudflare Workers Static Site Hosting - Request Flow and Billing](../125-cloudflare-workers-static-assets-routing-billing/)
