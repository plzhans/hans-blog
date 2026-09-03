---
id: "115"
translationKey: "115"
slug: "115-oracle-cloud-always-free-a1-instance-ssh-security"
title: "Oracle Cloud Always Free A1インスタンスの作成方法 - パブリックIP接続とSSHセキュリティ設定"
description: "Oracle Cloud Always Free A1(ARM)インスタンスを作成する方法を段階的にまとめます。無料スペックの選択からパブリックIPの接続、SSHキーの設定、VCN Security ListとNSGによるSSH 22番ポートの制限までを含みます。"
categories:
  - "cloud"
tags:
  - "linux"
  - "oracle"
date: 2026-07-10T03:44:00.000Z
lastmod: 2026-09-03T07:31:00.000Z
toc: true
draft: false
images:
  - "assets/1_39922a0f-7e83-80a9-bd69-fd5331deb6ba.png"
---


![Oracle Cloud Always Free A1インスタンスを作成し、パブリックIPとSSHセキュリティを設定する過程を表した代表画像](./assets/1_39922a0f-7e83-80a9-bd69-fd5331deb6ba.png)


## 概要


Oracle Cloud Infrastructure(OCI)のAlways FreeティアでA1(ARM)インスタンスを作成する方法をまとめます。


作成時点(2026-07-10)の常時無料スペックは2 OCPU、メモリ12GB、ディスク200GBです。


OCPUの上限を分割してインスタンスを2台構成にしても、無料範囲内で運用できます。


この記事では、Computeインスタンスの作成からOS・スペックの選択、ネットワーク、SSHキー、ブートボリュームの設定、パブリックIPの接続までを扱います。


続いて、VCN Security Listのデフォルトで開いているAnyインバウンド22番ポートを整理し、Network Security GroupまたはVPNで接続を制限する方法を確認します。


最後にSSH接続確認までを含みます。


## Oracleサーバーの作成


![Oracle Cloudコンソールの Compute インスタンス画面](./assets/2_39922a0f-7e83-8092-ac0b-ccd0d183d2c0.png)


インスタンスの作成


Compute → Instacnes → [Create instance]


![Compute → Instances 一覧で Create instance ボタンを押す画面](./assets/3_39922a0f-7e83-80d7-bdee-dd7bd3c068ad.png)


インスタンスの基本情報


![インスタンス名や配置などの基本情報を入力する画面](./assets/4_39922a0f-7e83-8085-974b-eec35383e592.png)


OSの選択


OSの選択は自由ですが、A1はARMプロセッサーのため、aarch64の中から選ぶ必要があります。


![A1(ARM)用のaarch64イメージを選ぶOS選択画面](./assets/5_39922a0f-7e83-8027-8a3e-f1c19be54abe.png)


スペックの選択

- 作成時点(2026-07-10)の常時無料スペック:2 OCPU + Memory 12GB + Disk 200GB
- 最大使用量の制限のため、OCPUを1個だけ使ってインスタンスを2個作成しても無料です

![常時無料範囲である2 OCPU・メモリ12GBでスペックを指定する画面](./assets/6_39922a0f-7e83-80b6-90f5-f2dfaadd2f0b.png)


次のステップ


![基本設定を終えて次のステップに進む画面](./assets/7_39922a0f-7e83-803b-b753-d669fe860de4.png)


セキュリティ設定は別途進める


![作成ステップのセキュリティ設定はスキップし、後で別途進める画面](./assets/8_39922a0f-7e83-80a7-b5eb-d5d66f805a56.png)


ネットワークの作成


![インスタンスに接続するVCNとサブネットを作成するネットワーク設定画面](./assets/9_39922a0f-7e83-8022-a00e-c41cfd3f8511.png)


SSHキーの作成とダウンロード

- サーバー接続用のSSH秘密鍵をダウンロードし、公開鍵も一緒にダウンロード

![サーバー接続に使用するSSHキーペアを作成してダウンロードする画面](./assets/10_39922a0f-7e83-80d4-8e2e-c03f64f47e4f.png)


ボリューム(ディスク)の作成

- 200GBまで無料
- ディスクを別途管理する必要がないため、ブートボリュームとして作成
- ブートボリューム + ブロックボリューム合わせて200GBまで無料
- ブートボリューム:メインディスク
- ブロックボリューム:拡張ディスク

![無料上限200GB内でブートボリューム容量を指定する画面](./assets/11_39922a0f-7e83-80f8-b602-ed06022271ce.png)


レビュー確認後に作成


![作成直前に設定内容を確認するレビュー画面](./assets/12_39922a0f-7e83-8026-8a1d-fc6fd073bc0e.png)


作成中


![インスタンスがプロビジョニングされている画面](./assets/13_39922a0f-7e83-8096-82b8-d4d26d3c693e.png)


作成完了


![作成が完了したことを確認する画面](./assets/14_39922a0f-7e83-809e-a220-c3e4da1c9bc5.png)


インスタンスの表示


![作成されたインスタンスの詳細情報を確認する画面](./assets/15_39922a0f-7e83-8084-bc4a-e238dceadb28.png)


### インターネット外部接続 - パブリックネットワーク設定


インスタンス → ネットワーキング → VNIC へ移動


![インスタンス詳細からネットワーキングのVNIC設定へ移動する画面](./assets/16_39922a0f-7e83-8046-b637-df411681e5aa.png)


VNICのIPを編集


![VNICに接続されたパブリックIPを編集する画面](./assets/17_39922a0f-7e83-8085-98ab-ced4237b5b2a.png)


固定IPを作成して接続


![予約済みの固定パブリックIPを作成してVNICに接続する画面](./assets/18_39922a0f-7e83-8071-906a-cd2bbb3a9d22.png)


作成完了


![作成が完了したことを確認する画面](./assets/19_39922a0f-7e83-80bf-9719-d95fd3530508.png)


クイックナビゲーション


![インスタンス画面からVCN設定へ直接移動する経路](./assets/20_39922a0f-7e83-80b1-8b6d-e6ddb88534eb.png)


またはメニューから移動


![コンソールメニューを通じてVCN設定へ移動する経路](./assets/21_39922a0f-7e83-8077-b36b-feca3cc6e23d.png)


## セキュリティ設定


Oracle Cloudサーバーのセキュリティファイアウォールは、基本的にVCNのSecurity ListとNetwork Security Groupで制御します。


VCNのSecurity Listにはデフォルト設定でリモート接続用の22番ポートがAnyに開放されているため、追加の対応が必要です。


### VCNのデフォルトポリシーでAny(0.0.0.0/0)インバウンド22番をブロック


インスタンスからVCN設定へ移動


![インスタンス画面から該当VCNのSecurity Listへ移動する画面](./assets/22_39922a0f-7e83-80f8-8e86-c0a34468835e.png)


Anyで開放されているものを削除

- ICMPの削除は必要に応じて実施

![Security ListでAny(0.0.0.0/0)に開放されているインバウンドルールを削除する画面](./assets/23_39922a0f-7e83-80cf-a851-e0104b75f69e.png)


### 接続許可の設定


以下の方法から選択

1. VCN Security Listの項目に自分のIPを登録する。
2. インスタンスのVNIC Network Security GroupにIPを登録してアクセスを許可する。
3. 1番または2番の方法で一時的にアクセスを許可した後、VPN(Tailscale、OpenVPNなど)経由でアクセスする。

### VCN Network Security Groupでのアクセス許可


該当VCNで進めます


![VCN画面でNetwork Security Groupを作成する画面](./assets/24_39922a0f-7e83-8023-8e15-ea2368a12db7.png)


![Network Security Groupに接続を許可するIPと22番ポートのルールを登録する画面](./assets/25_39922a0f-7e83-8049-b8e1-c5f68ce25858.png)


該当インスタンスのPrimary VNIC設定へ移動


![インスタンスのPrimary VNIC設定へ移動する画面](./assets/26_39922a0f-7e83-8003-a815-d7739c3286c1.png)


接続後に保存


![Primary VNICにNetwork Security Groupを接続して保存する画面](./assets/27_39922a0f-7e83-80bc-b2f6-c9ec9d2d82d5.png)


## 接続確認


```bash
Welcome to Ubuntu 24.04.4 LTS (GNU/Linux 6.17.0-1011-oracle aarch64)

 * Documentation:  https://help.ubuntu.com
 * Management:     https://landscape.canonical.com
 * Support:        https://ubuntu.com/pro

This system has been minimized by removing packages and content that are
not required on a system that users do not log into.

To restore this content, you can run the 'unminimize' command.

The programs included with the Ubuntu system are free software;
the exact distribution terms for each program are described in the
individual files in /usr/share/doc/*/copyright.

Ubuntu comes with ABSOLUTELY NO WARRANTY, to the extent permitted by
applicable law.

To run a command as administrator (user "root"), use "sudo <command>".
See "man sudo_root" for details.

ubuntu@xxxxx:~$
```


## まとめ


OCI Always Free A1インスタンスは、無料枠内でARMサーバーをすぐに運用できる構成です。


パブリックIPを接続しないと外部からアクセスできず、デフォルトのSecurity ListのAnyインバウンド22番ポートは必ず整理する必要があります。


実務では、許可するIPをNSGに登録するか、TailscaleのようなVPNで迂回接続する方式を推奨します。


SSHキーは安全に保管し、外部に公開される22番ポートは最小限にするのが基本です。


ここまで進めれば、A1サーバーの作成から安全な接続経路までを備えた状態になります。

## 参考

- [Oracle Cloud Always Freeリソース(公式ドキュメント)](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm)
- [Security Lists(公式ドキュメント)](https://docs.oracle.com/en-us/iaas/Content/Network/Concepts/securitylists.htm)
