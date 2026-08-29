---
id: "69"
translationKey: "69"
slug: "69-git-deleted-branch-recovery"
title: "Git 削除ブランチの復元: reflog と fsck で蘇らせる"
description: "削除した Git ブランチを reflog で見つけて復元する手順をまとめました。reflog が期限切れで記録がない場合に git fsck --lost-found で dangling コミットを探す方法と、gc の保存期間についても確認します。"
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


![削除した Git ブランチを reflog で見つけて復元する過程を示す代表画像](./assets/1_30922a0f-7e83-80bb-9097-fc089c9b2d99.png)


## 目標


別のブランチに<strong>削除した特定のコミット時点を復元</strong>します。


## 状況


ブランチを削除した後、<strong>そのブランチで作業していたコミットにブランチを再び復元</strong>する必要がある場合があります。


---


## 1. reflog で復元ポイント(コミットハッシュ)を見つける


`reflog` はブランチを削除しても<strong>ローカルで HEAD が移動した記録</strong>を残しているため、復元するコミットハッシュを見つけるのに役立ちます。


```shell
git reflog
```


### 復元対象の選択


reflog の出力から<strong>復元したい時点のコミットハッシュ</strong>を確認します。


![git reflog の出力から復元する時点のコミットハッシュを見つける画面](./assets/2_2fd22a0f-7e83-8115-be9b-f7fde3548b1d.png)


---


## 2. コミットハッシュでブランチを作り直す


見つけたコミットハッシュを基準に新しいブランチを作成し、すぐにチェックアウトします。


```shell
# git checkout -b <復元する新しいブランチ名> <削除したコミットハッシュ>
git checkout -b repair-1234 f730c6ea10
```


---


## 3. 復元の確認


ブランチが正常に作成され、該当コミットに移動したかを確認します。


![新しいブランチが作成され、該当コミットに移動したことを確認する画面](./assets/3_2fd22a0f-7e83-8139-80f5-f2d88f8baee1.png)


---


## reflog に記録がない場合


`reflog` はこのコンピューター上で HEAD が動いた記録です。そのため、以下の場合には役立ちません。

- このコンピューターで該当ブランチを一度もチェックアウトしたことがない場合
- リポジトリを新しくクローンした場合
- reflog の項目がすでに期限切れになっている場合

### reflog の保存期間


reflog は無期限には残りません。`git gc` が動作する際、以下の設定に従って整理されます。


```shell
# 到達可能なコミットの reflog 保存期間(デフォルト90日)
git config --get gc.reflogExpire

# 到達不可能なコミットの reflog 保存期間(デフォルト30日)
git config --get gc.reflogExpireUnreachable
```


削除したブランチのコミットは通常到達不可能な状態になるため、<strong>デフォルト値である30日</strong>が実質的な復元の限界です。


### dangling コミットを直接探す


reflog に表示されない場合は、オブジェクトストアを直接確認します。


```shell
git fsck --lost-found

# Result
# dangling commit f730c6ea10ffc0d1f2f8b0e9a1c3d5b7e9f10234
# dangling blob 8a9f2c1b...
```


見つけたコミットの内容を確認した後、ブランチとして蘇らせます。


```shell
# コミット内容の確認
git show f730c6ea10

# ブランチ作成(チェックアウトなし)
git branch repair-1234 f730c6ea10
```


注意) `git gc --prune` が該当オブジェクトまで整理した後であれば、ローカルでは復元できません。


## リモートにあったブランチを削除した場合


リモートブランチを削除し、ローカルにも記録がない場合、ローカルの reflog では見つけることができません。この場合は、他のチームメンバーのローカルリポジトリに該当コミットが残っているか確認するほうが早いです。


復元したブランチを再びリモートにアップロードする際は、以下のように実行します。


```shell
git push -u origin repair-1234
```


## まとめ

- 削除直後であれば `git reflog` で十分です。
- 時間が経って reflog から消えた場合は、`git fsck --lost-found` で dangling コミットを探します。
- ただし `gc` がオブジェクトまで整理してしまった場合、ローカルでの復元は不可能なので、重要な作業ブランチは削除する前にタグを付けておくほうが安全です。

```shell
# 削除前に安全装置を残しておく方法
git tag backup/feature-1234 feature-1234
```
