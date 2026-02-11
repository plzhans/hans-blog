---
id: "94"
translationKey: "94"
slug: "94-hugo-github-blog"
title: "Building a Blog with Hugo + GitHub"
description: "A guide to building a personal blog using the Hugo static site generator and GitHub Pages. It covers the entire process step by step, from Hugo installation, m10c theme setup, and local development environment configuration to automated deployment pipeline setup with GitHub Actions. It also includes the reasons for choosing faster build speed compared to Jekyll and the Notion-Markdown based writing workflow."
tags:
  - "hugo"
  - "github-action"
  - "github-pages"
categories:
  - "Git"
date: 2026-01-29T10:44:00.000+09:00
lastmod: 2026-02-10T08:23:00.000Z
toc: true
draft: false
---


> 💡 **Build Environment**
> - Test environment: Mac
>
> - Deployment environment: GitHub Actions


# Introduction


I had been organizing technical content in Evernote and personal documents, and was preparing to run a blog using Notion's website feature.


However, Notion had limitations in customization, and using a custom domain also incurred additional costs, which made me think twice.


I considered switching to a vlog format or rewriting in Markdown and migrating to Jekyll as alternatives.


But I couldn't give up Notion, which is convenient for writing. The conclusion was to write in Notion and deploy as a static website!


This blog is currently operated with the following workflow. (Source: [https://github.com/plzhans/hans-blog](https://github.com/plzhans/hans-blog))


> Write in Notion → Convert to Markdown via Notion API → Build static site with Hugo → Deploy to GitLab Pages


# Goal

- Build documents written in md files with Hugo
- Automate deployment to GitHub Pages

## Why Hugo

- High number of GitHub Stars and actively being updated
- Faster than Jekyll when building over 1000 pages

# Choosing a Hugo Theme


I first selected a theme from [Hugo Themes](https://themes.gohugo.io/).


**Selected theme:** [m10c](https://themes.gohugo.io/themes/hugo-theme-m10c/)


**Theme selection criteria**

- SEO optimization support
- Multilingual site support

m10c does not perfectly support all features, but they can be supplemented with Hugo's layout overrides.


# Installing Hugo


**Installation documentation:** [Installation Guide](https://gohugo.io/installation/)


**Hugo documentation:** [Documentation](https://gohugo.io/documentation/)


## Mac Installation


```shell
# Install Hugo
brew install hugo

# Verify installation
hugo --version
```


# Creating a Hugo Site


## Project Initialization


```shell
# Create working directory
mkdir hugo && cd hugo

# Create Hugo site
hugo new site .

# Verify the result
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


## Installing the Theme


Install the theme using Git submodule.


```shell
# Initialize Git repository (if needed)
git init

# Add theme submodule
git submodule add https://github.com/vaga/hugo-theme-m10c.git themes/m10c

# Verify installation
ls -al themes/m10c
```


## Copying Sample Content (Optional)


```shell
# Copy theme's sample content
cp -R themes/m10c/exampleSite/content ./content

# Verify
ls -al ./content/
```


## Hugo Configuration


Replace the default configuration file `hugo.toml` with the theme's sample configuration.


```shell
# Remove existing configuration
rm hugo.toml

# Copy sample configuration
cp themes/m10c/exampleSite/config.toml ./hugo.toml
```


Open the `hugo.toml` file and modify the basic settings.


```toml
baseURL = "https://testblog.plzhans.com"
title = "Test blog"
theme = "m10c"
```


**Note:** Remove the `themesDir` setting and make sure `theme` matches the actual directory name.


## Running the Local Server


```shell
# Start development server
hugo server -D
```


Example output:


```javascript
Watching for changes in /Users/plzhans/temp/sample/hugo/...
Start building sites …
hugo v0.154.5+extended+withdeploy darwin/arm64 BuildDate=2026-01-11T20:53:23Z

Built in 2 ms
Environment: "development"
Web Server is available at http://localhost:57264/
Press Ctrl+C to stop
```


Access the displayed address in your browser to verify.


# Deploying to GitHub Pages


## Creating a Repository


Create a new repository on GitHub.


## Choosing a Deployment Strategy


Both Jekyll and Hugo manage source and build artifacts separately.


Jekyll is automatically detected and deployed by GitHub Pages, but Hugo requires manual deployment through GitHub Actions.


In this guide, we use Method 1 for the deployment strategy.


### Method 1: actions/deploy-pages

- Uses 1 repository
- Set GitHub Pages source to GitHub Actions
- Push to main branch → Hugo build → Upload artifacts → Auto deploy

### Method 2: peaceiris/actions-gh-pages

- Uses 1 repository
- Connect GitHub Pages to gh-pages branch
- Push to main branch → Hugo build → Commit to gh-pages branch

### Method 3: Separate Deployment Repository

- Uses 2 repositories (source repository, deployment repository)
- Push build artifacts to deployment repository

## GitHub Pages Configuration


Set Repository → Settings → Pages → Source to **GitHub Actions**


## Writing the GitHub Actions Workflow


Create the `.github/workflows/deploy-hugo.yml` file.


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


## Git Deployment


```shell
# Add remote repository
git remote add origin git@github.com:plzhans/hugo-sample.git

# Configure .gitignore
echo "/public/" >> .gitignore

# Commit all files
git add .
git commit -m "first commit"

# Create branch and push
git branch -M master
git push -u origin master
```


## Verifying Deployment


Check the workflow execution in the GitHub Actions tab and verify the deployed URL in Settings → Pages.


**Example URL:** [https://plzhans.github.io/hugo-sample/](https://plzhans.github.io/hugo-sample/)


## Important Notes


### baseURL Configuration


If the `baseURL` in `hugo.toml` or the `--baseURL` option during build is incorrect, CSS and image paths will be wrong, causing errors.


In this guide, the deployment URL is set in the `HUGO_BASEURL` environment variable of the GitHub Actions workflow.


## Related Articles

- Custom domain setup: [Using a Custom Domain with GitHub Pages](../86-github-pages-custom-domain/)
- (Coming soon) Automating Notion article deployment to GitHub Pages
