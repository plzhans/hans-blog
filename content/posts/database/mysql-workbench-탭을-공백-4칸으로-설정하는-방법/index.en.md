---
id: "5"
translationKey: "5"
slug: "5-mysql-workbench-tab-to-spaces"
title: "How to Set Tabs to 4 Spaces in MySQL Workbench"
description: "This post summarizes how to configure the Indentation setting in MySQL Workbench so that tab input is converted to 4 spaces. It also covers batch-converting SQL files that already contain tabs using expand, pinning the team's rule with .editorconfig, and the impact on diff and blame."
categories:
  - "database"
tags:
  - "database"
  - "mysql"
date: 2019-05-17T00:00:00.000Z
lastmod: 2026-08-29T14:55:00.000Z
toc: true
draft: false
images:
  - "assets/1_39522a0f-7e83-8007-b294-f7bfa76d8399.png"
---


![A representative image showing the setting that converts tab input to 4 spaces in MySQL Workbench](./assets/1_39522a0f-7e83-8007-b294-f7bfa76d8399.png)


## Overview


When multiple people manage SQL scripts together, it's important to keep indentation rules consistent. If tabs and spaces are mixed, code alignment breaks and unnecessary changes can pile up in Git diffs.


In development environments, it's common to use a policy of 4 spaces instead of tabs. MySQL Workbench, from version 6.2.4 onward, also provides a setting that converts tab input into spaces.


## Configuration


To make MySQL Workbench convert tabs to spaces, go to the Preferences menu.


```plain text
Edit -> Preferences
```


![Screen showing navigation to the Edit → Preferences menu in MySQL Workbench](./assets/2_2fd22a0f-7e83-81d0-bb9b-c695f5677785.png)


In the Preferences window, select `General Editors`, then change the `Indentation` setting.


```plain text
General Editors -> Indentation

Tab key inserts spaces instead of tabs: check
Indent width: 4
Tab width: 4
```


![Screen showing the setting under Indentation in General Editors to use spaces instead of tabs](./assets/3_2fd22a0f-7e83-81e1-a5cc-c18e6e106923.png)


After saving the setting, pressing the tab key in the SQL editor window will insert 4 spaces instead of a tab character. If the change doesn't apply immediately, close and reopen any open editor windows, or restart MySQL Workbench.


In the procedure editor, the setting may not apply the same way. In that case, write the code in the SQL editor window and apply it to the procedure, or format it in a separate editor and paste it in.


Reference: [MySQL Workbench General Editors Preferences](https://dev.mysql.com/doc/workbench/en/wb-preferences-general-editors.html)


## Cleaning Up Files That Already Contain Tabs


This setting only applies to tabs entered going forward. Tab characters that already exist inside saved SQL files remain unchanged.


To convert them all at once from the command line, use `expand`.


```bash
# Convert a single file
expand -t 4 old.sql > new.sql

# Convert an entire directory (a backup is recommended before running)
find . -name "*.sql" -exec bash -c 'expand -t 4 "$1" > "$1.tmp" && mv "$1.tmp" "$1"' _ {} \;
```


If you're working on Windows, you can also open the file in VS Code and run `Convert Indentation to Spaces` from the command palette.


## Pinning the Team's Rule with .editorconfig


Workbench's Preferences apply only to that particular machine. If your team members use different editors, it's more reliable to place a `.editorconfig` file at the root of the repository.


```plain text
# .editorconfig
root = true

[*.sql]
indent_style = space
indent_size = 4
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true
```


Most editors, such as VS Code, IntelliJ, and Vim, recognize this file. However, **MySQL Workbench does not read** **`.editorconfig`.** For Workbench, you need to configure it separately using the Preferences setting described above.


## How Indentation Affects Diffs


When tabs and spaces are mixed, lines where only the indentation changed—while the logic stays the same—end up cluttering the diff. During review, the actual changes get buried, and `git blame` ends up pointing to the wrong commit.


If you're cleaning up a file that's already mixed, it's better to **separate the commit that only fixes indentation** from other changes. Mixing it with functional changes makes review difficult.


```bash
git commit -m "chore: SQL 들여쓰기를 공백 4칸으로 통일"
```


When you want to view a diff while ignoring whitespace changes, use the options below.


```bash
# Diff that ignores whitespace changes
git diff -w

# Blame that ignores whitespace changes
git blame -w
```
