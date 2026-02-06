---
id: "69"
translationKey: "69"
slug: "69-git-deleted-branch-recovery"
title: "Git Deleted Branch Recovery"
tags:
  - "git"
categories:
  - "Git"
date: 2025-01-08T18:42:00.000+09:00
lastmod: 2026-02-06T06:28:00.000Z
draft: false
images:
  - "assets/1_2fd22a0f-7e83-8115-be9b-f7fde3548b1d.png"
---


## Goal


Recover to a **specific commit point that was deleted** in a separate branch.


## Situation


After deleting a branch, there may be cases where you need to **recover the branch to a commit that was worked on in that branch**.


---


## 1. Find Recovery Point (Commit Hash) with reflog


`reflog` is useful for finding commit hashes to recover because it keeps **records of where HEAD moved in the local repository** even after deleting a branch.


```shell
git reflog
```


### Select Recovery Target


In the reflog output, identify the **commit hash of the point you want to recover**.


![](./assets/1_2fd22a0f-7e83-8115-be9b-f7fde3548b1d.png)


---


## 2. Recreate Branch from Commit Hash


Create a new branch based on the found commit hash and check it out immediately.


```shell
# git checkout -b <new branch name to recover> <deleted commit hash>
git checkout -b repair-1234 f730c6ea10
```


---


## 3. Verify Recovery


Confirm that the branch was created normally and moved to that commit.


![](./assets/2_2fd22a0f-7e83-8139-80f5-f2d88f8baee1.png)
