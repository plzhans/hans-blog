---
id: "69"
translationKey: "69"
slug: "69-git-deleted-branch-recovery"
title: "Git Deleted Branch Recovery: Bringing It Back with reflog and fsck"
description: "A step-by-step guide to finding and recovering a deleted Git branch using reflog. Also covers how to find dangling commits with git fsck --lost-found when reflog has expired and has no record, along with gc retention periods."
categories:
  - "git"
tags:
  - "git"
date: 2025-01-09T06:30:00.000Z
lastmod: 2026-08-29T14:40:00.000Z
toc: true
draft: false
images:
  - "assets/1_30922a0f-7e83-80bb-9097-fc089c9b2d99.png"
---


![A cover image showing the process of finding and recovering a deleted Git branch using reflog](./assets/1_30922a0f-7e83-80bb-9097-fc089c9b2d99.png)


## Goal


<strong>Recover a specific deleted commit point</strong> into a separate branch.


## Situation


After deleting a branch, there are cases where you need to <strong>restore the branch back to the commit you were working on in that branch</strong>.


---


## 1. Finding the recovery point (commit hash) with reflog


Even if a branch has been deleted, `reflog` still keeps a <strong>local record of where HEAD has moved</strong>, so it's useful for finding the commit hash to recover.


```shell
git reflog
```


### Selecting the recovery target


In the reflog output, check the <strong>commit hash of the point you want to recover</strong>.


![A screen showing how to find the commit hash of the point to recover in the git reflog output](./assets/2_2fd22a0f-7e83-8115-be9b-f7fde3548b1d.png)


---


## 2. Recreating the branch from the commit hash


Create a new branch based on the commit hash you found, and check it out immediately.


```shell
# git checkout -b <name of the new branch to recover> <deleted commit hash>
git checkout -b repair-1234 f730c6ea10
```


---


## 3. Verifying the recovery


Check that the branch was created successfully and that it has moved to that commit.


![A screen confirming that the new branch was created and moved to that commit](./assets/3_2fd22a0f-7e83-8139-80f5-f2d88f8baee1.png)


---


## When there's no record in reflog


`reflog` is a record of where HEAD has moved on this computer. So it won't help in the following cases.

- The branch was never checked out on this computer
- The repository was freshly cloned
- The reflog entries have already expired

### reflog retention period


reflog entries don't stay forever. They get cleaned up according to the following settings when `git gc` runs.


```shell
# Retention period for reflog of reachable commits (default 90 days)
git config --get gc.reflogExpire

# Retention period for reflog of unreachable commits (default 30 days)
git config --get gc.reflogExpireUnreachable
```


Commits from a deleted branch usually become unreachable, so the <strong>default 30-day period</strong> is the practical recovery limit.


### Finding dangling commits directly


If it's not visible in reflog, check the object store directly.


```shell
git fsck --lost-found

# Result
# dangling commit f730c6ea10ffc0d1f2f8b0e9a1c3d5b7e9f10234
# dangling blob 8a9f2c1b...
```


After checking the contents of the commit you found, restore it as a branch.


```shell
# Check the commit contents
git show f730c6ea10

# Create the branch (without checking out)
git branch repair-1234 f730c6ea10
```


Note) If `git gc --prune` has already cleaned up that object, it cannot be recovered locally.


## If the branch was on a remote and got deleted


If the remote branch was deleted and there's no record locally either, you won't be able to find it with local reflog. In this case, it's faster to check whether the commit still remains in another team member's local repository.


When pushing the recovered branch back to the remote, run the following.


```shell
git push -u origin repair-1234
```


## Summary

- If it's right after deletion, `git reflog` is enough.
- If time has passed and it's gone from reflog, find the dangling commit with `git fsck --lost-found`.
- However, if `gc` has already cleaned up the objects, local recovery is impossible, so it's safer to tag important working branches before deleting them.

```shell
# How to leave a safety net before deleting
git tag backup/feature-1234 feature-1234
```
