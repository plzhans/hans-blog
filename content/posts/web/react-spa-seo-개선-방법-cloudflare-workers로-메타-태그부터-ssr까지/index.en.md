---
id: "128"
translationKey: "128"
slug: "128-react-spa-seo-cloudflare-workers-ssr"
title: "How to Improve React SPA SEO - From Meta Tags to SSR with Cloudflare Workers"
description: "Put a React SPA on static hosting and the raw HTML is an empty shell. A record of improving it step by step with nothing but Cloudflare Workers — no new server."
categories:
  - "web"
tags:
  - "cloudflare"
  - "react"
  - "seo"
  - "ssr"
  - "workers"
date: 2026-09-11T13:01:00.000Z
lastmod: 2026-09-11T13:01:00.000Z
toc: true
draft: false
images:
  - "assets/1_3d822a0f-7e83-8126-8051-dfd669349a3e.png"
---


![Cover image showing empty HTML being filled in as it passes through the edge, with a crawler reading the result](./assets/1_3d822a0f-7e83-8126-8051-dfd669349a3e.png)


## Overview

> This post is part of the [Cloudflare Workers Static Site Guide - From Deployment to SEO](../124-cloudflare-workers-static-site-guide/) series.

It's common to put a React SPA on static hosting and leave it there. Deployment is simple, and with no server there's nothing to operate. It costs almost nothing, too.


But once you start caring about search, you hit a wall. <strong>The reason is that the raw HTML the server emits has nothing in it for a search engine to read</strong>.


This post is a record of solving that problem with nothing but Cloudflare Workers — **without standing up a new backend server**. It's split into three stages. The further you go, the more you gain and the more work it takes.


**Stage 0 — do nothing.** The raw HTML is an empty shell. Most SPAs are here.


**Stage 1 — fill in the meta with Workers.** Title, description, OG, and structured data go into the response HTML. Low effort, clear payoff.


**Stage 2 — render the body with Workers too.** You render the actual screen on the server and put it in. It takes the most work, but now there's content for the crawler to read.


### What this post covers

- Why it's better to put it in yourself even though Google renders JS
- How to fill in `<head>` with Workers, and the traps along the way
- Splitting `entry-client` / `entry-server`, and `vite build --ssr`
- How to hand the data the server received over to the browser so you don't add API round trips
- The numbers that actually changed, and the traps I hit

### What it doesn't cover

- **What to fill each meta item with** — that's an SEO topic. See the SEO optimization post
- **How to use wrangler, request flow, deployment** — [Cloudflare Workers Static Site Hosting - Request Flow and Billing](../125-cloudflare-workers-static-assets-routing-billing/) · [How to Use wrangler - Local Development and Deployment for Cloudflare Workers](../126-cloudflare-workers-wrangler-dev-deploy/)
- **Edge cache and Tiered Cache** — [How to Set Up Caching in Cloudflare Workers - Edge Cache and Tiered Cache](../127-cloudflare-workers-cache-tiered-cache/)

### Prerequisites


I assume you've put a static site on Cloudflare before and have booted a Worker locally with `wrangler`. If this is your first time, it's better to read the deployment posts above first.


---


## The problem — the raw HTML has no content for a search engine to read


Let's take the HTML of a built SPA exactly as delivered.


```bash
curl -s https://example.com/products/1234
```


```html
<!doctype html>
<html lang="ko">
  <head>
    <title>My Service</title>
    <meta name="description" content="A generic site description" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/assets/index-a1b2c3.js"></script>
  </body>
</html>
```


A shell of about 1.6KB. No product name, no price, no description. All of it is created only after the JS runs and the API response arrives.


**For a human there's no problem at all.<strong> The browser runs the JS. The problem is </strong>when the reader doesn't run JS**.

- Link preview bots for KakaoTalk, LINE, and X
- Search engine crawlers that don't run JavaScript
- Various AI crawlers

To them, this page is <strong>an empty document titled "My Service"</strong>. It also means thousands of detail pages all carry the same title and the same description.


In a service I actually worked on, 80,000 detail pages all had an identical `<title>` and the inside of `<div id="root">` was <strong>0 characters</strong>.


---


## "But doesn't Google render it?"


Yes. That part is true.


Google's official documentation states that Googlebot goes through three stages — **crawling → rendering → indexing** — and runs JS with headless Chromium in the rendering stage. The era of SPAs simply not getting indexed is over.


But the same documentation contains these sentences.

> Googlebot queues all pages with a `200` HTTP status code for rendering (...) the page may stay on this queue for **a few seconds, but it can take longer than that**.  
>   
> server-side or pre-rendering is still a great idea because it makes your website faster for users and crawlers, and **not all bots can run JavaScript**.

Read it and you get three things.

1. **Google does run it** — true
2. **Rendering goes into a queue** — not immediately at crawl time, but whenever resources free up. "It may be a few seconds, and it can take longer"
3. **Google's own documentation recommends SSR/prerendering** — and the reason it gives is "not all bots can run JavaScript"

Number 3 is the key. Google isn't the only counterpart for search traffic, and **for most other bots there's no public evidence about whether they run JavaScript.**

> In Korea you'd be curious about Naver's Yeti, but I **couldn't find official documentation** on whether Yeti runs JS. The claim that it "doesn't run it" is widespread, but I couldn't confirm the basis for it, so I won't assert it here. The confirmed facts alone are reason enough to improve things.

And one more thing. Even if Google eventually reads it, **link preview bots won't wait for you.** A shared link showing up without a title is a loss separate from indexing.


So the conclusion isn't "it's fine because Google handles it" but **"it's better to have it directly in the HTML."**


---


## Stage 1 — filling in meta tags with Workers


### The idea


Rendering the whole body is a lot of work. But **just filling in the title, description, OG, and structured data** already gets you a fair amount.

- The title and description shown in search results differ per page
- Link previews attach properly
- You can hand over "the facts about this page" in structured form via JSON-LD — even without a body

And all of this takes **nothing more than putting one thin layer in front of the static assets.**


### Decide where the Worker runs


Of the prerequisites mentioned in the overview, one applies directly to this stage. **The basic rule is "if the asset exists, the Worker doesn't run"** ([routing documentation](https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/)). A path like `/`, where `index.html` actually exists, won't go through the Worker if you leave it alone.


So you specify the paths that should.


```json
// wrangler.jsonc
{
  "main": "./cloudflare/workers/main.ts",
  "assets": {
    "binding": "ASSETS",
    "not_found_handling": "single-page-application",

    // HTML routes only. Never `true` - static asset requests are free,
    // but anything routed through the worker becomes billable.
    "run_worker_first": ["/", "/products/*"]
  }
}
```


The Worker **doesn't serve the assets in their place — it receives them and modifies them.** The structure is: pull the HTML shell out with `env.ASSETS.fetch(request)`, process it, and send it out.


### The Worker code


```typescript
// cloudflare/workers/main.ts
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Only touch HTML. Everything else passes through untouched.
    const asset = await env.ASSETS.fetch(request);
    if (!asset.headers.get('content-type')?.includes('text/html')) return asset;

    const path = new URL(request.url).pathname;
    const meta = await metaFor(path, env, ctx);
    // On failure, ship the shell unchanged. A generic title beats a broken one.
    if (!meta) return asset;

    return new HTMLRewriter()
      .on('title', {
        element(e) {
          e.setInnerContent(meta.title);
        },
      })
      .on('meta[name="description"]', {
        element(e) {
          e.setAttribute('content', meta.description);
        },
      })
      .on('head', {
        element(e) {
          e.append(headTags(meta), { html: true });
        },
      })
      .transform(asset);
  },
} satisfies ExportedHandler<Env>;
```


[`HTMLRewriter`](https://developers.cloudflare.com/workers/runtime-apis/html-rewriter/) is <strong>a streaming HTML parser built into Workers</strong>. Rather than reading the whole string and substituting, it swaps tags out while the response is flowing. It costs almost nothing in memory or latency.


If the values you insert are human-written text, don't forget to escape them. If a product name contains & or ", the attribute breaks, and if a JSON-LD value contains , the browser cuts the script off right there.

> One minor trap. The handler has to return `void`, but `HTMLRewriter`'s methods return `Element` so you can chain them. Write it in the arrow shorthand like `element: (e) => e.setInnerContent(...)` and the types won't match. You have to use a block body or prefix it with `void`.

### The data comes from an API


To put the product name in the title, you need to know the value. You call the API from the Worker.

> The examples in this post are generalized from code that uses the public API of [console.plzhans.com](https://console.plzhans.com/), which I operate. That's also why `X-Client-Id` and `Origin` appear together in the code below — that API verifies calls by <strong>(client ID, registered Origin) pair</strong>. Depending on the API you use, this part may come down to a single `Authorization` header.

```typescript
/**
 * env comes from `wrangler deploy --var`, e.g.
 *   API_BASE_URL  https://api.example.com
 *   SITE_URL      https://example.com
 *   CLIENT_ID     pub_1a2b3c
 */
interface Env {
  ASSETS: Fetcher;
  API_BASE_URL: string;
  SITE_URL: string;
  CLIENT_ID: string;
}

async function fetchProduct(id: string, env: Env, ctx: ExecutionContext) {
  // https://api.example.com/products/1234
  const url = `${env.API_BASE_URL}/products/${id}`;

  try {
    const res = await fetch(url, {
      headers: {
        // Not a browser, so Origin is not set automatically.
        // Needed if the API validates (client id, Origin) as a pair.
        Origin: env.SITE_URL,
        'X-Client-Id': env.CLIENT_ID,
      },
      // Give up rather than delay the page.
      signal: AbortSignal.timeout(1500),
      // Edge-cache it. Most requests never reach the API.
      cf: { cacheTtl: 3600, cacheEverything: true },
    });
    if (!res.ok) return null;
    return (await res.json()) as Product;
  } catch {
    return null; // timeout or network error - fall back to the shell
  }
}
```


There are two important design principles here.


**① The page has to load even on failure.** Attaching meta is an auxiliary feature. The site must not die because the API did. So every failure path converges on "ship the shell unchanged."


How to apply the edge cache with the `cf` option is laid out in the [Request documentation](https://developers.cloudflare.com/workers/runtime-apis/request/).


**② Set a timeout.** A human only waits on a cache miss, and even then only the first byte is delayed. Still, there has to be an upper bound.


### What to attach


The string that `headTags()` produces is exactly what gets attached. What to put in it differs per service, but the items that pay off most in this spot are roughly these.

- **`canonical`** · and **`hreflang`** if you're multilingual
- **OG** (`og:title` · `og:description` · `og:image` · `og:url`) and **`twitter:card`**
- **JSON-LD** structured data

`canonical` and `hreflang` in particular have a clear reason to go here. <strong>Insert them from the screen with JS and, to a bot, they may as well not exist</strong>. JSON-LD can hand facts to a search engine **even without a body**, which makes it especially valuable at stage 1, where you can't render the body yet.

> What to fill each item with is an SEO topic, so I won't cover it here. This post's concern is **"where and how you slot it in."** How to write each item is covered separately in the SEO optimization post.

### What stage 1 gets you, and what it doesn't


|                    |                                                                            |
| ------------------ | -------------------------------------------------------------------------- |
| What you get       | per-page title and description, link previews, canonical/hreflang, structured data |
| What you don't get | **The body.** `<div id="root">` is still empty                             |


The payoff relative to the work is large. Stopping here is a perfectly fine choice.


That said, there's still no <strong>content</strong> for the crawler to read. There's no detail page body and no <strong>internal links connecting pages to each other</strong>. The latter matters more than you'd think — from the crawler's point of view, every detail page becomes an island with no connections.


---


## Stage 2 — rendering the body on the server


### The idea


**The Worker takes over** the rendering the browser was doing and puts it into the HTML. Since it runs your React components as they are, there's no need to hand-port markup. Change a style and the server HTML follows automatically.


The key is <strong>splitting the entry point in two</strong>.


```plain text
src/
  app/
    routes.tsx       route definitions only. no router is created here
    Providers.tsx    shared shell (StrictMode · i18n · QueryClient)
  entry-client.tsx   for the browser — hydrate
  entry-server.tsx   for the server — renderToReadableStream
```


### Before — a single entry point


```typescript
// src/main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from '@/app/App';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
```


```typescript
// src/app/App.tsx
const router = createBrowserRouter(routes);   // routes are defined in this same file

export default function App() {
  return <RouterProvider router={router} />;
}
```


There are three points in this code that can't run on the server.


| Code                              | Why                                                        |
| --------------------------------- | ---------------------------------------------------------- |
| `document.getElementById('root')` | there is no `document` on the server                        |
| `createBrowserRouter(...)`        | it uses the `history` API. there's no notion of a request URL |
| `new QueryClient()` at module top-level | there's only one per process, so **data gets mixed between requests** |


The third is the most dangerous. In the browser one tab means one user, so a global cache is correct — but on the server the same instance handles several requests at once. Product A's data goes out in product B's response.


### After ① Separate route definitions from router creation


```typescript
// src/app/routes.tsx
import type { RouteObject } from 'react-router-dom';

export const routes: RouteObject[] = [
  {
    element: <Root />,
    children: [
      { index: true, element: <Home /> },
      { path: 'products/:id', element: <ProductDetail /> },
    ],
  },
];
```


**The point is not creating the router here.<strong> The browser builds its router with `createBrowserRouter` and the server with [`createStaticHandler`](https://reactrouter.com/api/data-routers/createStaticHandler) — different routers, but </strong>the route array has to be the same.** If they differ, the screen the server rendered and the browser's first render diverge, and hydration breaks.


### After ② Share the Provider shell


```typescript
// src/app/Providers.tsx
export function Providers({
  queryClient,
  children,
}: {
  queryClient: QueryClient;
  children: ReactNode;
}) {
  return (
    <StrictMode>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </StrictMode>
  );
}

/**
 * A factory, not a module-level constant.
 * The server creates one per request and throws it away.
 */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
  });
}
```


If you use i18n, for the same reason it has to **receive its instance by injection**. Change the language on a global i18n and other requests being processed at the same time, in other languages, see that value too.


### After ③ The browser entry point


```typescript
// src/entry-client.tsx
import { createRoot, hydrateRoot } from 'react-dom/client';
import { hydrate, type DehydratedState } from '@tanstack/react-query';
import { Providers, createQueryClient } from '@/app/Providers';
import App from '@/app/App';

const queryClient = createQueryClient();

// Data the server rendered with. Absent on non-SSR routes and in dev.
const ssrState = (window as { __RQ_STATE__?: DehydratedState }).__RQ_STATE__;
if (ssrState) hydrate(queryClient, ssrState);

const container = document.getElementById('root')!;
const tree = (
  <Providers queryClient={queryClient}>
    <App />
  </Providers>
);

/*
  Adopt existing markup if there is any, otherwise render fresh.
  hydrateRoot attaches events without repainting - no flash.
  Hydrating an empty container makes React discard it and re-render everything.
*/
if (container.firstElementChild) {
  hydrateRoot(container, tree);
} else {
  createRoot(container).render(tree);
}
```


[`hydrateRoot`](https://react.dev/reference/react-dom/client/hydrateRoot) attaches only events without repainting the existing markup. Conversely, hydrate into an empty container and React treats it as a mismatch and re-renders everything. One entry point has to handle all three situations (an SSR'd route / a non-SSR'd route / the dev server), so this is where it branches.


### After ④ The server entry point


This is the heart of it.


```typescript
// src/entry-server.tsx
import { renderToReadableStream } from 'react-dom/server';
import {
  createStaticHandler,
  createStaticRouter,
  StaticRouterProvider,
} from 'react-router-dom';
import { dehydrate, type QueryClient } from '@tanstack/react-query';
import { Providers, createQueryClient } from '@/app/Providers';
import { routes } from '@/app/routes';

export type RenderResult = { html: string; state: string };

export async function render(
  url: string,
  seed: (queryClient: QueryClient) => void,
): Promise<RenderResult> {
  const queryClient = createQueryClient();
  seed(queryClient);

  const handler = createStaticHandler(routes);
  const context = await handler.query(new Request(url));
  if (context instanceof Response) {
    throw new Error(`unexpected Response: ${context.status}`);
  }
  const router = createStaticRouter(handler.dataRoutes, context);

  const stream = await renderToReadableStream(
    <Providers queryClient={queryClient}>
      <StaticRouterProvider router={router} context={context} hydrate={false} />
    </Providers>,
  );

  // Wait for React.lazy routes to resolve.
  await stream.allReady;

  return {
    html: await new Response(stream).text(),
    state: JSON.stringify(dehydrate(queryClient)),
  };
}
```


**Four things to know here**


**①** [**`react-dom/server`<strong>](https://react.dev/reference/react-dom/server) </strong>is already in React.** There's nothing extra to install. It's a subpath of the `react-dom` package. No new framework to adopt, no plugin.


On web-standard runtimes like Workers you use [`renderToReadableStream`](https://react.dev/reference/react-dom/server/renderToReadableStream) — not Node's `renderToPipeableStream`. Which build gets picked is decided by the Vite configuration that follows.


**② Why a streaming renderer and not `renderToString`.** If you lazy-load routes with `React.lazy`, `renderToString` renders only the Suspense fallback (the loading spinner) and stops there. A streaming renderer can wait until the lazy pieces resolve.


That said, streaming it out isn't the goal. What we want is **complete HTML that a crawler can read in one go**, so we wait for everything to finish with `await stream.allReady` and then take it as a string.


③ `hydrate={false}`. StaticRouterProvider by default contains loader data in a


**④ Hand the data along with `dehydrate`.** — more on that in the next section.


### Building — `vite build --ssr`


[**It's a feature built into Vite<strong>](https://vite.dev/guide/ssr)</strong>.** No plugin required.


```json
// package.json
{
  "scripts": {
    "build": "vite build && vite build --ssr src/entry-server.tsx --outDir dist-server"
  }
}
```


Two outputs come out of the same source.


```plain text
dist/         browser bundle — unchanged
dist-server/  server bundle — a single entry-server.js chunk
```


The Vite configuration needs two lines ([SSR options](https://vite.dev/config/ssr-options)).


```typescript
// vite.config.ts
export default defineConfig(({ isSsrBuild }) => ({
  ssr: {
    // Workers have no node_modules. Bundle every dependency in.
    // The default externalizes them, which fails at runtime with
    // "Cannot find package 'react'".
    noExternal: true,
    // Web-standard runtime, not Node. This is also what makes
    // react-dom/server resolve to the ReadableStream build.
    target: 'webworker',
  },
  build: {
    // The client build already copied public/. The server bundle does not need it.
    copyPublicDir: !isSsrBuild,
  },
}));
```


Leave out `noExternal: true` and it dies after deployment with `Cannot find package 'react'`. That's because Workers has no `node_modules`.


Build time grew by **1.7 seconds**. The 1.7MB server bundle only goes up to the Worker; it never goes down to users.


### Wiring it into the Worker


Two lines get added to the stage 1 Worker.


@@PLACEHOLDER_3@@


### Not adding API round trips matters


If the server fetched the data and rendered the screen, and then the browser calls the same API again the moment it boots, **you give back over the network what you gained from SSR.**


The fix is the `setQueryData` + `dehydrate` combination ([TanStack Query SSR guide](https://tanstack.com/query/latest/docs/framework/react/guides/ssr)).


```typescript
// server: seed the cache directly - no fetch
queryClient.setQueryData(getProductQueryKey(id), product);
```


```typescript
// browser: adopt that cache as-is
if (window.__RQ_STATE__) hydrate(queryClient, window.__RQ_STATE__);
```


There are two things to watch for.


**The query key has to be exactly the same on both sides.** One character off and the cache misses and the browser silently calls again. It doesn't error, which makes it hard to notice. It's safer to have both sides use the same key-building function.


**Without `staleTime`, a refetch fires right after mount.**


```typescript
useQuery({ ...options, staleTime: 60_000 });
```


Once I lined those two up, in my case both the detail and home pages ended up with <strong>0 additional API calls from the browser</strong>. Adding SSR actually reduced network round trips.


---


## Results


These are the same URLs fetched with `curl`.


|                          | Stage 0            | Stage 1 (meta) | Stage 2 (prerender) |
| ------------------------ | ------------------ | -------------- | ------------------- |
| `<title>`                | identical sitewide | **per page**   | per page            |
| OG · canonical           | none (JS only)     | **present**    | present             |
| JSON-LD                  | none               | **present**    | present             |
| `<div id="root">` body   | 0 chars            | 0 chars        | **1,745 chars**     |
| Internal links           | 0                  | 0              | **6**               |
| Extra browser API calls  | 1                  | 1              | **0**               |


### Does the render fit inside CPU 10ms


This is the most worrying part of stage 2. The free plan gives you 10ms of CPU per request, and **the time spent waiting on the API doesn't count** — what counts against the limit is only the CPU actually spent while React renders the tree. What's included and how it's measured is laid out in [Cloudflare Workers Static Site Hosting - Request Flow and Billing](../125-cloudflare-workers-static-assets-routing-billing/).


So what has to be measured is the cost of the render itself. I handed the data over in advance (i.e. no network) and repeated just the render.


```plain text
cpu       wall
run 1   53.1ms    49.0ms    (cold start)
run 2    6.8ms     5.5ms
run 3    7.1ms     5.5ms
run 4   12.7ms     5.1ms
run 5   12.1ms     4.7ms
```


**You shouldn't take these numbers at face value.<strong> Look at runs 4 and 5: work that took 5ms on the wall clock reports 12ms of CPU. That's because Node's `process.cpuUsage()` </strong>sums CPU across all threads** (GC and so on). This workload has no I/O, so the real render cost is closer to the `wall` side (**3–5ms**). On top of that, Node and `workerd` differ in runtime and in GC pressure. Treat these as values for gauging the order of magnitude only.


After deployment, requesting 12 different pages back to back produced no CPU-exceeded errors (1102). That said, it's <strong>a value each person has to verify for themselves, depending on page complexity</strong>. Rather than guessing, it's better to look at the actual CPU time recorded in Workers Logs.


When the edge cache hits, the API round trip disappears and the response finishes in **9.8ms**. That's wall-clock time, and the CPU portion of it is just the render.


### Verifying that hydration really matches


"No warnings, so it must match" is weak evidence. <strong>Production builds of React strip mismatch warnings</strong>, and React 19 sometimes passes over a mismatched node silently. I actually snuck an extra `<i>` into the server HTML and nothing at all was printed to the console.


A more reliable method is <strong>comparing the DOM from both paths directly</strong>.

1. Open it exactly as deployed and dump `#root`'s `innerHTML`
2. Strip only the markup the server inserted from the response so **the browser renders it alone**, then dump the same thing
3. Compare the two

In my case the structure matched completely, <strong>1,118 nodes to 1,118 nodes</strong>. The only differences were re-serialized notation the browser produced through the CSSOM, like `style="top:var(--x)"` versus `style="top: var(--x);"`.


---


## Traps I hit


### View source comes out on one line


React's server renderer has **no** indentation option. Dump every option `renderToReadableStream` reads from the installed `react-dom` and there isn't a single formatting-related item, and the option lists in the development and production bundles are identical — there's no hidden debug switch either.


This isn't laziness, it's <strong>because it can't be done</strong>. Whitespace used for indentation becomes real text nodes and breaks the hydration comparison, and whitespace between inline elements actually renders as a space.


If you want to read it, unfold it on the receiving end.


```bash
curl -s https://example.com/page | npx prettier --parser html | less
```


### Code that touches browser globals at module top level


Anything inside an effect (`useEffect`) doesn't run on the server, so it's safe. The problem is <strong>module scope</strong>. It dies the moment the server bundle is loaded.


```bash
grep -rnE "^(const|let|export const) .*(window|document|navigator|localStorage)" src
```


### Staging becomes a duplicate document of production


Add SSR and <strong>staging becomes a complete site with the same content as production</strong>. Before, there was no body, so even getting indexed did little harm — now the two compete.


```typescript
// Anything but production is excluded. Missing value fails closed.
if (env.APP_ENV !== 'production') {
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
}
```


Don't block it with `Disallow` in `robots.txt`. The crawl itself never happens, so there's no chance to read the `noindex`, and URLs that are already indexed stay there. **Open the crawl and block only the indexing.**


### Design the cache along with it, without fail


SSR **makes you call the API on every request.** Without an edge cache, origin load grows in proportion to page views. At stage 1 you could let it slide, since you were calling to attach one bit of meta — at stage 2 you can't.


How to apply it and the traps involved (that the cache is separate per data center, Tiered Cache, the conflict with `cache.put()`) are laid out in [How to Set Up Caching in Cloudflare Workers - Edge Cache and Tiered Cache](../127-cloudflare-workers-cache-tiered-cache/).


---


## How far should you go


You don't need to prerender everything.


| Path              | Stage              | Why                                                            |
| ----------------- | ------------------ | -------------------------------------------------------------- |
| Detail            | Stage 2            | there's content for the crawler to read. there are also many pages |
| Home              | Stage 2            | it's where the crawler arrives first, and the starting point of internal links |
| Search · listings | Stage 1            | the results depend on user input. the cache doesn't hit either |
| Terms · policies  | Stage 1 or `noindex` | they aren't indexing targets                                   |


**It's fine to stop at stage 1.** The payoff relative to the work is large, and link previews and search result titles are solved by that alone.


Stage 2 is only worth it for "pages that actually have a body for the crawler to read." And internal links — the point that, without links between detail pages in the HTML, every page is an isolated island to a crawler — is worth checking once.


---


## Summary

- **Google renders JS.** But it goes into a queue, and Google's own documentation recommends SSR, citing "not all bots can run JavaScript."
- **Stage 1**: fill in meta, OG, and JSON-LD with Workers + `HTMLRewriter`. Low effort, clear payoff.
- **Stage 2**: split the entry point into `entry-client` / `entry-server` and render the body on the server too.
- `react-dom/server` is **already in React**, and `vite build --ssr` is **already in Vite.** There's no new framework to adopt.
- Hand the data the server received over with `dehydrate` and **API round trips don't increase.**
- **You don't need to stand up a backend server.** If you're already putting a static site on Cloudflare, the additional infrastructure is zero and you can start on the free plan.

### References

- [Cloudflare Workers Static Site Hosting - Request Flow and Billing](../125-cloudflare-workers-static-assets-routing-billing/) — wrangler · running locally · deployment
- SEO optimization — what to fill it with — how to write canonical, OG, and JSON-LD items
- [JavaScript SEO Basics — Google Search Central](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)

**Cloudflare**

- [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/) · [SPA routing](https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/)
- [HTMLRewriter](https://developers.cloudflare.com/workers/runtime-apis/html-rewriter/)
- [Request `cf` options](https://developers.cloudflare.com/workers/runtime-apis/request/) — `cacheTtl` · `cacheEverything`
- [Cache API](https://developers.cloudflare.com/workers/runtime-apis/cache/) · [Tiered Cache](https://developers.cloudflare.com/cache/how-to/tiered-cache/)
- [Limits](https://developers.cloudflare.com/workers/platform/limits/) — CPU · subrequests

**React · Vite · libraries**

- [Server Rendering APIs](https://react.dev/reference/react-dom/server) · [`renderToReadableStream`](https://react.dev/reference/react-dom/server/renderToReadableStream) · [`hydrateRoot`](https://react.dev/reference/react-dom/client/hydrateRoot)
- [Vite SSR](https://vite.dev/guide/ssr) · [SSR options](https://vite.dev/config/ssr-options)
- [React Router `createStaticHandler`](https://reactrouter.com/api/data-routers/createStaticHandler)
- [TanStack Query SSR](https://tanstack.com/query/latest/docs/framework/react/guides/ssr)
