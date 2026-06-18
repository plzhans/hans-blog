---
id: "3"
translationKey: "3"
slug: "3-git-svn-clone"
title: "How to migrate SVN to Git: git svn clone"
description: "A quick guide to using git svn clone when migrating an SVN repository to Git. Learn how to prepare an authors file, what the -s (std-layout) option means, and which install links and verification commands to use so you can start the migration right away."
categories:
  - "git"
tags:
  - "git"
date: 2019-12-01T10:03:00.000Z
lastmod: 2026-02-27T10:04:00.000Z
toc: true
draft: false
images:
  - "assets/1_31222a0f-7e83-80a0-8b33-d762b23a0011.png"
---


![](./assets/1_31222a0f-7e83-80a0-8b33-d762b23a0011.png)


## Overview


This article explains how to assemble the `git svn clone` command when moving an SVN repository to Git.


**Who should read this**

- Developers who still run SVN but need a gradual move to Git
- Developers who must map SVN trunk, branches, and tags onto Git branches and tags

## Installing Git

- Windows: [Git for Windows](https://gitforwindows.org/)
- macOS: [Git - Downloads for macOS](https://git-scm.com/download/mac)

### Does Git automatically provide git svn?

Not always.

Some Git packages are shipped without `git svn`.

### Install links

- Windows: [Download Git for Windows](https://gitforwindows.org/)
- macOS: [git-scm macOS download](https://git-scm.com/download/mac)

Check immediately after installing


```bash
git svn --version
```


### Installing git svn when it is missing

- Windows: If Git for Windows is installed but git svn is missing, reinstall and make sure the _Git SVN_ component is included.
- macOS: Use [Homebrew](https://brew.sh/) to install `git-svn` separately.

## SVN → Git


### Core command


```bash
git svn clone [svn path] --authors-file=[authors path] -s [git-directory]
```


### Option reference


**svn path**

Provide the root URL of the SVN repository.

Example:


```bash
https://svn.example.com/repos/my-project
```


**Option --authors-file=[authors path]**

This file maps SVN author strings to Git commit author format.

Without it, author info may be wrong or the migration will show warnings.

The authors file typically looks like this:


```plain text
svnUser1 = Hong Gil-dong <hong@example.com>
svnUser2 = Son Woncheol <hans3019@knou.ac.kr>
```


How you gather the author list depends on your environment; most teams extract it from SVN logs.

**Option -s**

`-s` is shorthand for `--stdlayout`.

Use it when the SVN repository follows the standard layout.

The standard layout contains:

- `trunk`
- `branches`
- `tags`

With `-s`, git svn treats the directories as follows:

- trunk → default branch history
- branches → remote branches
- tags → tags

If the SVN repo is not standard, omit `-s` and explicitly set the paths:


```bash
git svn clone [svn path] --authors-file=[authors path] \
  --trunk=TrunkDir --branches=BranchesDir --tags=TagsDir \
  [git-directory]
```


**Option git-directory**

The local path where the converted Git repository will be created.

If it does not exist, the directory is created before cloning.

Example run


```bash
git svn clone https://svn.example.com/repos/my-project \
  --authors-file=./authors.txt \
  -s \
  my-project-git
```


### What to verify after migration


**Check branches**


```bash
cd my-project-git
git branch -a
```


A `remotes` namespace appears that mirrors the SVN branches.

**Check tags**


```bash
git tag
```


SVN tags should now exist as Git tags.

## Notes


### Author mapping

Respect the author file format.


```shell
# {svn id} = {git_user_name} <git_user_email>
svnUser1 = Hong Gil-dong <hong@example.com>
```


### Cloning takes too long

The entire SVN history is copied, so repositories with many revisions will take time.

Before you run the command, review:

- Network latency
- SVN server performance
- Revision range: consider options that start from a specific revision if needed.
- Sleep/hibernation: keep desktop machines awake while the command runs.

### SVN branch names look odd in Git

`git svn` places SVN branches under the `remotes` namespace.

After migration, create local Git branches from the ones you need and tidy up the names.

### Wrapping up

If your SVN repository follows the standard layout,

`git svn clone ... -s` migrates trunk, branches, and tags in one shot.

With an accurate authors mapping,

you can bring over commit authorship without pain.
