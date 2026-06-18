---
id: "10"
translationKey: "10"
slug: "10-tortoisegit-clear-saved-authentication-data"
title: "Fixing TortoiseGit Authentication Errors: How to Clear Saved Authentication Data"
description: "I put together the steps to clear saved authentication data via Saved Data's Clear when Authentication failed keeps repeating in TortoiseGit after a Git server change. Resolve it all at once, down to checking the Windows Credential Manager."
categories:
  - "git"
tags:
  - "git"
  - "gitlab"
  - "TortoiseGit"
date: 2020-09-03T16:46:00.000Z
lastmod: 2026-06-18T02:47:00.000Z
toc: true
draft: false
images:
  - "assets/1_31222a0f-7e83-80ae-9ee2-d7e9823934ad.png"
---


![](./assets/1_31222a0f-7e83-80ae-9ee2-d7e9823934ad.png)


## Overview


There are cases where authentication keeps failing even though you changed the Git server address or switched accounts.


The cause is that TortoiseGit stores the previous authentication data in the Windows credentials or in its own store.


This article summarizes how to clear the saved authentication data in TortoiseGit.


## Symptoms

- The `Authentication failed` error keeps occurring
- It tries to authenticate with the old account even though the account on the same repository has changed

## Cause

- You switched the Git server from GitHub to GitLab
- The HTTP(S) URL or username changed

## Solution


### Clearing the authentication data in TortoiseGit


The following procedure clears the saved authentication data so that the login prompt appears again on the next Pull or Push.

1. In Windows Explorer, navigate to your Git working folder.
2. Right-click inside the folder.
3. Go to **TortoiseGit → Settings**.

    ![](./assets/2_2fd22a0f-7e83-81f2-a7bc-c7bc5c867533.png)

4. Select **Saved Data** from the left menu.
5. Click **Clear** in the **Authentication data** area.

    This action deletes the previously saved authentication data.


    ![](./assets/3_2fd22a0f-7e83-8185-97b3-f0be61b614d4.png)

6. Run `Pull` or `Push` again.
7. Re-enter your ID and password or token.
    > Note
    > GitLab usually uses a Personal Access Token instead of a password.
    > If you use 2FA, prepare the token and then enter it.

### Checks when it cannot be deleted

- If the repository URL is saved under multiple entries, authentication data for another URL may remain.
- Related entries may also remain in the Windows Credential Manager.
    - In Control Panel, check for Git-related entries under **Credential Manager → Windows Credentials**.
