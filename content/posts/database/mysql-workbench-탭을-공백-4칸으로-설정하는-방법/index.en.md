---
id: "5"
translationKey: "5"
slug: "5-mysql-workbench-tab-to-spaces"
title: "How to Set MySQL Workbench Tabs to 4 Spaces"
description: "Learn how to configure MySQL Workbench to convert tab input to 4 spaces. This guide explains the Indentation settings to improve SQL code alignment and Git diff quality."
categories:
  - "database"
tags:
  - "database"
  - "mysql"
date: 2019-05-17T00:00:00.000Z
lastmod: 2026-07-06T03:18:00.000Z
toc: true
draft: false
images:
  - "assets/1_39522a0f-7e83-8007-b294-f7bfa76d8399.png"
---


![](./assets/1_39522a0f-7e83-8007-b294-f7bfa76d8399.png)


## Overview


When multiple people manage SQL scripts together, it is important to align indentation rules. Mixing tabs and spaces can break code alignment and generate many unnecessary changes in Git diffs.


In development environments, a common convention is to use 4 spaces instead of tabs. MySQL Workbench provides a setting to convert tab input to spaces starting from version 6.2.4.


## Configuration


To convert tabs to spaces in MySQL Workbench, navigate to the Preferences menu.


```plain text
Edit -> Preferences
```


![](./assets/2_2fd22a0f-7e83-81d0-bb9b-c695f5677785.png)


In the Preferences window, select the `General Editors` section and change the `Indentation` settings.


```plain text
General Editors -> Indentation

Tab key inserts spaces instead of tabs: Check
Indent width: 4
Tab width: 4
```


![](./assets/3_2fd22a0f-7e83-81e1-a5cc-c18e6e106923.png)


After saving the settings, pressing the tab key in the SQL editor will insert 4 spaces instead of a tab character. If the change does not take effect immediately, close and reopen any open editor tabs or restart MySQL Workbench.


The setting may not apply in the same way within the stored procedure editor. In that case, write the code in the SQL editor and then apply it to the procedure, or format it in a separate editor and paste it in.


Reference: [MySQL Workbench General Editors Preferences](https://dev.mysql.com/doc/workbench/en/wb-preferences-general-editors.html)
