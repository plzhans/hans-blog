---
id: "17"
translationKey: "17"
slug: "17-windows-tortoisegit-icon-overlay-fix"
title: "Windows で TortoiseGit のアイコンオーバーレイが消えたときの対処法"
description: "Windows エクスプローラーで TortoiseGit の状態アイコンが表示されない場合、ShellIconOverlayIdentifiers の上限と優先度を確認します。レジストリ整理と Explorer の再起動でアイコンをすぐに復旧できます。"
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


> 💡 Windows エクスプローラーの状態アイコンが消えたら、オーバーレイハンドラーの登録数制限と優先順位の競合を疑います。  
> レジストリで TortoiseGit エントリを上位に並べれば解決します。


## 問題のまとめ

- Windows エクスプローラーに TortoiseGit の状態アイコンが表示されない
- アイコンオーバーレイを使うアプリが多いときによく起こる

## 症状

ファイルやフォルダーに表示されるはずの Git 状態アイコンが見えません。


![](./assets/2_2fd22a0f-7e83-8139-99e5-f498ff24f63f.png)


## 原因

- Windows エク스プローラーはアイコンオーバーレイハンドラーを無制限には読み込みません
- `ShellIconOverlayIdentifiers` に登録された一部だけが使用されます
- 制限は 15 件前後とされています
- 他アプリが多数登録すると、TortoiseGit 項目がアクティブ枠から押し出されます

## 解決方法

1) レジストリエディターを起動

- スタート → ファイル名を指定して実行 → `regedit`


![](./assets/3_2fd22a0f-7e83-81aa-a4e9-dcc8b9fff247.png)


2) 対象パスへ移動

次のパスへ移動します。

> HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\ShellIconOverlayIdentifiers


3) 変更前にバックアップ

- 念のため編集前にバックアップします
- `ShellIconOverlayIdentifiers` を右クリック → エクスポート

> ⚠️ キーを削除すると元に戻しにくいので、復元用にバックアップを必ず残します。


![](./assets/4_2fd22a0f-7e83-81b2-a6c1-e8329429fbc3.png)


4) 優先順位を調整

TortoiseGit のエントリを一覧の上部へ移動させます。

- TortoiseGit のキー名の先頭にスペースや数字を付与し、並び順を早めます
- 表示不要なオーバーレイ項目は削除を検討します
- 制限数に収まるよう整理します

変更前


![](./assets/5_2fd22a0f-7e83-81e0-b5b5-e2890b7f55bf.png)


変更後


![](./assets/6_2fd22a0f-7e83-81f2-af8d-e782336c5850.png)


## 適用手順

Explorer を再起動

再起動せずとも Explorer を再起動すれば反映されます。

- タスクマネージャーで `Windows Explorer` タスクを終了

    ![](./assets/7_2fd22a0f-7e83-81f0-b48a-c9aa3b417a97.png)

- `C:\Windows\explorer.exe` を実行して再度起動

    ![](./assets/8_2fd22a0f-7e83-817d-a1b1-f5e99bab2c4f.png)


    ![](./assets/9_2fd22a0f-7e83-8120-b5ac-facca1d24ad1.png)


### 確認

- エクスプローラーで `F5` を押して更新
- Git 状態アイコンが正常表示になるか確認します

    ![](./assets/10_2fd22a0f-7e83-81cc-9f4c-c4d185928c75.png)
