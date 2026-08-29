---
id: "5"
translationKey: "5"
slug: "5-mysql-workbench-tab-to-spaces"
title: "MySQL Workbenchでタブをスペース4つに設定する方法"
description: "MySQL Workbenchでタブ入力をスペース4つに変換するIndentation設定の方法をまとめます。すでにタブが入っているSQLファイルをexpandで一括変換する方法や、.editorconfigでチームのルールを固定する方法、diff・blameへの影響についても併せて解説します。"
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


![MySQL Workbenchでタブ入力をスペース4つに変える設定を示す代表画像](./assets/1_39522a0f-7e83-8007-b294-f7bfa76d8399.png)


## 概要


SQLスクリプトを複数人で管理する場合、インデントのルールを揃えることが重要です。タブとスペースが混在すると、コードの整列が崩れ、Gitのdiffで不要な変更が多く発生することがあります。


開発環境では、タブの代わりにスペース4つを使うポリシーがよく採用されます。MySQL Workbenchもバージョン6.2.4以降、タブ入力をスペースに変換する設定を提供しています。


## 設定


MySQL Workbenchでタブをスペースに変えるには、Preferencesメニューに移動します。


```plain text
Edit -> Preferences
```


![MySQL WorkbenchのEdit → Preferencesメニューに移動する画面](./assets/2_2fd22a0f-7e83-81d0-bb9b-c695f5677785.png)


Preferencesウィンドウで`General Editors`項目を選択したあと、`Indentation`設定を変更します。


```plain text
General Editors -> Indentation

Tab key inserts spaces instead of tabs: チェック
Indent width: 4
Tab width: 4
```


![General EditorsのIndentationでタブの代わりにスペースを使うよう設定する画面](./assets/3_2fd22a0f-7e83-81e1-a5cc-c18e6e106923.png)


設定を保存したあとSQL編集画面でタブキーを入力すると、タブ文字ではなくスペース4つが入力されます。すぐに反映されない場合は、開いている編集画面を閉じて再度開くか、MySQL Workbenchを再起動してください。


プロシージャエディタでは設定が同じように適用されないことがあります。この場合はSQL編集画面で記述したあとプロシージャに反映するか、別のエディタでフォーマットを整えてから貼り付ける方法で対応します。


参考ドキュメント: [MySQL Workbench General Editors Preferences](https://dev.mysql.com/doc/workbench/en/wb-preferences-general-editors.html)


## すでにタブが入っているファイルを整理する


この設定は今後入力するタブにのみ適用されます。すでに保存されているSQLファイル内のタブ文字はそのまま残ります。


コマンドラインで一括変換するには`expand`を使用します。


```bash
# ファイル1つを変換
expand -t 4 old.sql > new.sql

# ディレクトリ全体を変換（実行前にバックアップを推奨）
find . -name "*.sql" -exec bash -c 'expand -t 4 "$1" > "$1.tmp" && mv "$1.tmp" "$1"' _ {} \;
```


Windowsで作業する場合は、VS Codeでファイルを開き、コマンドパレットから`Convert Indentation to Spaces`を実行する方法もあります。


## .editorconfigでチームのルールを固定する


WorkbenchのPreferencesはそのPCのみに適用されます。チームメンバーごとに使うエディタが異なる場合は、リポジトリのルートに`.editorconfig`を置くほうが確実です。


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


VS Code、IntelliJ、Vimなど、ほとんどのエディタがこのファイルを認識します。ただし、**MySQL Workbenchは****`.editorconfig`****を読み込みません。** Workbench側は前述のPreferences設定で別途合わせる必要があります。


## インデントがdiffに与える影響


タブとスペースが混在すると、ロジックはそのままなのにインデントだけが変わった行がdiffに大量に含まれてしまいます。レビュー時に実際の変更点が埋もれてしまい、`git blame`も見当違いのコミットを指すようになります。


すでに混在してしまったファイルを整理する場合は、**インデント整理のみを行うコミットを分離する**ほうが良いです。機能変更と混ざるとレビューが難しくなります。


```bash
git commit -m "chore: SQL 들여쓰기를 공백 4칸으로 통일"
```


空白の変更を無視して見たい場合は、以下のオプションを使用します。


```bash
# 空白の変更を無視したdiff
git diff -w

# 空白の変更を無視したblame
git blame -w
```
