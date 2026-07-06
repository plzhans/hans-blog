---
id: "5"
translationKey: "5"
slug: "5-mysql-workbench-tab-to-spaces"
title: "MySQL Workbench のタブをスペース4つに設定する方法"
description: "MySQL Workbench でタブ入力をスペース4つに変換する設定方法をまとめます。SQL コードの整列と Git diff の品質を改善する Indentation 設定について説明します。"
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


## 概要


SQL スクリプトを複数人で管理する場合、インデントのルールを統一することが重要です。タブとスペースが混在するとコードの整列が崩れ、Git diff で不要な変更が多く発生する可能性があります。


開発環境では、タブの代わりにスペース4つを使用するルールが一般的です。MySQL Workbench でも 6.2.4 以降のバージョンからタブ入力をスペースに変換する設定が提供されています。


## 設定


MySQL Workbench でタブをスペースに変換するには、Preferences メニューに移動します。


```plain text
Edit -> Preferences
```


![](./assets/2_2fd22a0f-7e83-81d0-bb9b-c695f5677785.png)


Preferences ウィンドウで `General Editors` 項目を選択し、`Indentation` 設定を変更します。


```plain text
General Editors -> Indentation

Tab key inserts spaces instead of tabs: チェック
Indent width: 4
Tab width: 4
```


![](./assets/3_2fd22a0f-7e83-81e1-a5cc-c18e6e106923.png)


設定を保存した後、SQL エディタでタブキーを入力するとタブ文字ではなくスペース4つが入力されます。すぐに反映されない場合は、開いているエディタを閉じてから再度開くか、MySQL Workbench を再起動します。


ストアドプロシージャエディタでは、設定が同じように適用されない場合があります。その場合は、SQL エディタで作成してからプロシージャに反映するか、別のエディタでフォーマットを整えてから貼り付ける方法で対応します。


参考資料: [MySQL Workbench General Editors Preferences](https://dev.mysql.com/doc/workbench/en/wb-preferences-general-editors.html)
