---
id: "17"
translationKey: "17"
slug: "17-windows-tortoisegit-icon-overlay-fix"
title: "How to fix missing TortoiseGit icon overlays on Windows"
description: "When Windows Explorer hides TortoiseGit status icons, check the ShellIconOverlayIdentifiers limit and priority. Clean up the registry and restart Explorer to bring the overlays back instantly."
categories:
  - "git"
tags:
  - "git"
  - "TortoiseGit"
date: 2021-02-27T02:00:00.000Z
lastmod: 2026-02-27T15:15:00.000Z
toc: true
draft: false
images:
  - "assets/1_31422a0f-7e83-801f-a182-fce89d37a3c2.png"
---


![](./assets/1_31422a0f-7e83-801f-a182-fce89d37a3c2.png)


> 💡 When Windows Explorer loses the status icons, suspect the icon overlay handler cap and priority conflict.  
> Pushing the TortoiseGit entries to the top of the registry list restores the overlays.


## Problem summary

- Windows Explorer does not display TortoiseGit status icons
- The issue often appears when many programs install overlay handlers

## Symptoms

Git status icons that should appear on files and folders remain hidden.


![](./assets/2_2fd22a0f-7e83-8139-99e5-f498ff24f63f.png)


## Cause

- Windows Explorer only uses a limited number of icon overlay handlers
- Only part of the entries under `ShellIconOverlayIdentifiers` is loaded
- The limit is known to be around 15 entries
- When other software adds many handlers, the TortoiseGit entries can be pushed out of the active list

## Fix

1) Launch Registry Editor

- Start → Run → `regedit`


![](./assets/3_2fd22a0f-7e83-81aa-a4e9-dcc8b9fff247.png)


2) Move to the target path

Navigate to:

> HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\ShellIconOverlayIdentifiers


3) Back up before editing

- Always export a backup before changing anything
- Right-click `ShellIconOverlayIdentifiers` → Export

> ⚠️ Deleting keys is hard to undo. Keep the backup so you can restore the list if necessary.


![](./assets/4_2fd22a0f-7e83-81b2-a6c1-e8329429fbc3.png)


4) Adjust priority

The goal is to move the TortoiseGit entries toward the top:

- Prefix TortoiseGit key names with spaces or numbers so they sort earlier
- Remove overlay entries you do not need
- Keep the total count within the limit

Before


![](./assets/5_2fd22a0f-7e83-81e0-b5b5-e2890b7f55bf.png)


After


![](./assets/6_2fd22a0f-7e83-81f2-af8d-e782336c5850.png)


## Apply the change

Restart Explorer

You do not need to reboot. Restarting Explorer is enough.

- Use Task Manager to end the `Windows Explorer` task

    ![](./assets/7_2fd22a0f-7e83-81f0-b48a-c9aa3b417a97.png)

- Run `C:\Windows\explorer.exe` to launch it again

    ![](./assets/8_2fd22a0f-7e83-817d-a1b1-f5e99bab2c4f.png)


    ![](./assets/9_2fd22a0f-7e83-8120-b5ac-facca1d24ad1.png)


### Verification

- Press `F5` in Explorer
- Confirm that Git status icons appear again

    ![](./assets/10_2fd22a0f-7e83-81cc-9f4c-c4d185928c75.png)
