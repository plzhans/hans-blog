---
id: "10"
translationKey: "10"
slug: "10-tortoisegit-clear-saved-authentication-data"
title: "Fixing TortoiseGit Authentication Errors: How to Clear Saved Authentication Data"
description: "A walkthrough of how to fix repeated Authentication failed errors in TortoiseGit by clearing saved authentication data via Clear in Saved Data. Covers cleaning up the Windows Credential Manager, checking credential.helper, preparing a PAT, and switching to SSH."
categories:
  - "git"
tags:
  - "git"
  - "gitlab"
  - "TortoiseGit"
date: 2020-09-03T16:46:00.000Z
lastmod: 2026-08-29T16:04:00.000Z
toc: true
draft: false
images:
  - "assets/1_31222a0f-7e83-80ae-9ee2-d7e9823934ad.png"
---


![A cover image showing how to fix an Authentication failed error by clearing the authentication data saved in TortoiseGit](./assets/1_31222a0f-7e83-80ae-9ee2-d7e9823934ad.png)


## Overview


Sometimes authentication keeps failing even after the Git server address has changed or the account has been switched.


The cause is that TortoiseGit stores the previous authentication data in Windows credentials or its own repository.


This post summarizes how to clear the saved authentication data in TortoiseGit.


## Symptoms

- The `Authentication failed` error keeps occurring
- Even though the account for the same repository has changed, TortoiseGit keeps trying to authenticate with the old account

## Cause

- The Git server was switched from GitHub to GitLab
- The HTTP(S) URL or the username has changed

## Solution


### Clearing Authentication Data in TortoiseGit


The procedure below clears the saved authentication data so that the login prompt appears again on the next Pull or Push.

1. In Windows Explorer, navigate to your Git working folder.
2. Right-click inside the folder.
3. Go to **TortoiseGit → Settings**.

    ![The screen for navigating to TortoiseGit → Settings from the Explorer right-click menu](./assets/2_2fd22a0f-7e83-81f2-a7bc-c7bc5c867533.png)

4. In the left-hand menu, select **Saved Data**.
5. In the **Authentication data** section, click **Clear**.

    This deletes the previously saved authentication data.


    ![The screen for clearing Authentication data under Saved Data in Settings](./assets/3_2fd22a0f-7e83-8185-97b3-f0be61b614d4.png)

6. Run `Pull` or `Push` again.
7. Re-enter your ID and password, or your token.
    > Note  
    > GitLab usually uses a Personal Access Token instead of a password.  
    > If you have 2FA enabled, prepare your token beforehand and enter it.

### Checks If It Isn't Being Cleared

- If multiple repository URLs are saved, authentication data for other URLs may still remain.
- Related entries may also remain in the Windows Credential Manager.
    - In Control Panel, check for Git-related entries under **Credential Manager → Windows Credentials**.

## Clearing Directly from the Windows Credential Manager


Authentication data that isn't cleared by TortoiseGit's Clear is often stored separately by Windows.

1. Go to Control Panel → User Accounts → <strong>Credential Manager</strong>.
2. Select the **Windows Credentials** tab.
3. Look for entries starting with `git:`, such as `git:https://github.com` or `git:https://gitlab.com`.
4. Expand the entry and click <strong>Remove</strong>.

If you'd like to check via a command first, use the following.


```powershell
cmdkey /list | findstr git
```


## Checking Which Credential Helper Is Being Used


The entity that actually holds the authentication data is the credential helper configured in Git. If you don't know where it's stored, you'll keep clearing the wrong place, so check the setting first.


```shell
git config --show-origin --get credential.helper
```

- `manager`: Managed by Git Credential Manager. Since it shows its own account selection window, you should check it together with the Windows Credentials.
- `wincred`: Stored in the Windows Credential Manager.
- If the value is empty, nothing is stored and you'll be prompted every time.

To clear the credentials for a specific host only, run the following.


```shell
printf "protocol=https\nhost=github.com\n\n" | git credential reject
```


## Preparing New Values to Enter


For security, both GitHub and GitLab use tokens instead of account passwords.
If you issue one in advance before clearing, you can enter it right away when the authentication prompt appears.

- GitHub: Settings → Developer settings → Personal access tokens
- GitLab: User Settings → Access Tokens

To clone and push, grant read and write permissions on the repository. It's safer not to grant broader permissions than necessary.


## If It Keeps Recurring, Consider Switching to SSH


If you keep having to fix HTTP(S) authentication data, you can switch the remote address to SSH instead. Once you register a key, you're free from token expiration or credential cache issues.


```shell
# Check the current remote address
git remote -v

# Change to an SSH address
git remote set-url origin git@github.com:{account-name}/{repository-name}.git
```


For the key generation and registration procedure, see the post [Accessing a Remote Repository with a Git SSH Key: From Key Generation to Registration](../13-git-ssh-key-setup-and-remote-access/).
