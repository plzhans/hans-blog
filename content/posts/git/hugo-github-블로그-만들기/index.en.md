---
id: "94"
translationKey: "94"
slug: "94-hugo-github-blog"
title: "Building a Hugo + GitHub Blog"
description: "Follow the Notion → Markdown → Hugo build → GitHub Pages deployment flow to stand up a personal blog. Install Hugo, apply the m10c theme, ship with GitHub Actions, and keep an eye on the baseURL setting so releases stay healthy."
categories:
  - "git"
tags:
  - "github-action"
  - "github-pages"
  - "hugo"
date: 2026-02-10T08:46:00.000Z
lastmod: 2026-02-27T16:08:00.000Z
toc: true
draft: false
images:
  - "assets/1_30a22a0f-7e83-80c6-b1d4-ed75cfa333a7.png"
---


![](./assets/1_30a22a0f-7e83-80c6-b1d4-ed75cfa333a7.png)


## Introduction


I have been collecting technical notes in Evernote and personal documents, and at one point I considered running a blog through Notion’s website feature.

Notion, however, has customization limits and charges more for custom domains, so I hesitated.

I weighed alternatives such as moving to [velog](https://velog.io/) or rewriting everything in Markdown to migrate to Jekyll.

In the end, I could not give up the convenience of drafting inside Notion. The conclusion: keep writing in Notion and deploy the finished content as a static site.

## Goal

- Build Markdown-based posts with Hugo
- Automate deployment to GitHub Pages

> 💡 **Environment**  
> - Test platform: Mac  
> - Deployment platform: GitHub Actions

**Why Hugo**

- Popular project with many GitHub stars and active updates
- Faster than Jekyll when you build 1,000+ pages

**This blog currently runs with the following workflow (source: [https://github.com/plzhans/hans-blog](https://github.com/plzhans/hans-blog))**

> Write in Notion  
> → Convert to Markdown via the Notion API  
>  
> → Build a static site with Hugo  
>  
> → Deploy to GitHub Pages

## Prerequisites

### Picking a Hugo theme

I started by choosing a theme from [Hugo Themes](https://themes.gohugo.io/).

**Theme of choice:** [m10c](https://themes.gohugo.io/themes/hugo-theme-m10c/)

**Selection criteria**

- SEO features
- Multilingual site support

m10c does not offer every feature out of the box, but Hugo’s layout overrides fill the gaps.

### Installing Hugo

**Installation guide:** [Installation Guide](https://gohugo.io/installation/)

**Reference docs:** [Documentation](https://gohugo.io/documentation/)

Mac example:

```shell
# Install Hugo
brew install hugo

# Verify the version
hugo --version
```

## Creating the Hugo site

### Initialize the project

```shell
# Create the working directory
mkdir hugo && cd hugo

# Scaffold the Hugo site
hugo new site .

# Inspect the result
tree
# .
# ├── archetypes
# │   └── default.md
# ├── assets
# ├── content
# ├── data
# ├── hugo.toml
# ├── i18n
# ├── layouts
# ├── static
# └── themes
```

### Install the theme

Install the theme as a Git submodule.

```shell
# Initialize Git if necessary
git init

# Add the theme submodule
git submodule add https://github.com/vaga/hugo-theme-m10c.git themes/m10c

# Verify
ls -al themes/m10c
```

### Copy sample content (optional)

```shell
# Copy sample content from the theme
cp -R themes/m10c/exampleSite/content ./content

# Check the result
ls -al ./content/
```

### Configure Hugo

Replace the default `hugo.toml` with the theme’s sample config.

```shell
# Remove the default config
rm hugo.toml

# Copy the sample config
cp themes/m10c/exampleSite/config.toml ./hugo.toml
```

Open `hugo.toml` and adjust the basics.

```toml
baseURL = "https://testblog.plzhans.com"
title = "Test blog"
theme = "m10c"
```

**Note:** Remove `themesDir` and make sure `theme` matches the actual directory name.

### Run the local server

```shell
# Start the dev server
hugo server -D
```

Sample output:

```javascript
Watching for changes in /Users/plzhans/temp/sample/hugo/...
Start building sites …
hugo v0.154.5+extended+withdeploy darwin/arm64 BuildDate=2026-01-11T20:53:23Z

Built in 2 ms
Environment: "development"
Web Server is available at http://localhost:57264/
Press Ctrl+C to stop
```

Visit the printed URL in your browser to verify the site.

## Deploying to GitHub Pages

### Create the repository

Start with a new GitHub repository.

### Choose a deployment strategy

Both Jekyll and Hugo keep the source tree separate from the build output.

GitHub Pages builds Jekyll automatically, but Hugo needs a GitHub Actions workflow.

Also consider the visibility of the source repository when you pick a strategy.

**Free plan**

- Only public repositories can be configured for Pages.
- If you want the source to stay private, use Method 3 so the source repo remains private while only the deployment repo is public.

**Paid plan**

- Pages can stay public even when the repository is private.

### Method 1: actions/deploy-pages

- Single repository
- Set the GitHub Pages source to GitHub Actions
- Push to `main` → Hugo build → Upload artifact → Auto deploy

### Method 2: peaceiris/actions-gh-pages

- Single repository
- Wire GitHub Pages to the `gh-pages` branch
- Push to `main` → Hugo build → Commit to `gh-pages`

### Method 3: Separate deployment repository

- Two repositories (source + deployment)
- Push the `public` build output to the deployment repository

### Method 4: Upload the artifacts elsewhere

- GitHub Pages is optional. Any web server that can host static files works.
- By default, Hugo writes build artifacts to `/public`.

> This guide uses Method 1 for the deployment workflow.

### Configure GitHub Pages

In Repository → Settings → Pages, set **Source** to **GitHub Actions**.

## Write the GitHub Actions workflow

Create `.github/workflows/deploy-hugo.yml`.

```yaml
name: Deploy Hugo

on:
  push:
    branches: [ master ]
   
permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

env:
  HUGO_BASEURL: https://plzhans.github.io/hugo-sample/

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    env:
      HUGO_CACHEDIR: /tmp/hugo_cache

    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          submodules: recursive
          fetch-depth: 1

      - name: Setup Hugo
        uses: peaceiris/actions-hugo@v3
        with:
          hugo-version: "latest"
          extended: true

      - name: Cache Hugo
        uses: actions/cache@v4
        with:
          path: $ env.HUGO_CACHEDIR 
          key: $ runner.os -hugomod-$ hashFiles('**/go.sum') 
          restore-keys: |
            $ runner.os -hugomod-

      - name: Build
        run: hugo --minify --gc --cleanDestinationDir --baseURL "$HUGO_BASEURL"

      - uses: actions/upload-pages-artifact@v3
        with:
          path: ./public

      - uses: actions/deploy-pages@v4
```

## Git deployment

```shell
# Add the remote
git remote add origin git@github.com:plzhans/hugo-sample.git

# Ignore build artifacts
echo "/public/" >> .gitignore

# Commit everything
git add . 
git commit -m "first commit"

# Create branch and push
git branch -M master
git push -u origin master
```

## Verify the deployment

Check the workflow run under the GitHub Actions tab, then confirm the deployed URL under Settings → Pages.

**Example:** [https://plzhans.github.io/hugo-sample/](https://plzhans.github.io/hugo-sample/)

## Notes

**baseURL**

If the `baseURL` in `hugo.toml` or the `--baseURL` build option is wrong, CSS and asset paths will fail.

In this guide, the deployment URL comes from the `HUGO_BASEURL` environment variable inside the GitHub Actions workflow.

## Related articles

- Custom domain setup: [Using a Custom Domain with GitHub Pages](../86-github-pages-custom-domain/)
- (Work in progress) Automating Notion-to-GitHub Pages deployments
