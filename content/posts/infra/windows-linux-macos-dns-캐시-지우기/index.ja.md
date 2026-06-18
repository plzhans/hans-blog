---
id: "6"
translationKey: "6"
slug: "6-flush-dns-cache"
title: "Windows/Linux/macOSでDNSキャッシュをクリアする"
description: "DNSレコード変更後に接続できないとき、Windows・Linux・macOSでDNSキャッシュをフラッシュする方法をまとめました。ipconfig、resolvectl、mDNSResponderコマンドとTTL・ブラウザキャッシュの確認で伝播遅延を素早く診断します。"
categories:
  - etc
date: 2026-02-22T16:11:00.000Z
lastmod: 2026-02-22T16:13:00.000Z
toc: true
draft: false
images:
  - "assets/1_30f22a0f-7e83-8064-b489-d30573976c05.png"
---


![](./assets/1_30f22a0f-7e83-8064-b489-d30573976c05.png)


## 概要


実務作業中、ドメイン設定でDNSレコードを変更したにもかかわらず、ローカルPCやサーバーに即座に反映されない場合があります。


これはOSやアプリケーション（ブラウザなど）がDNSの応答をローカルにキャッシュしているためです。


この記事では、Windows、Linux、macOSでローカルDNSキャッシュをクリアする方法をまとめます。


> ⚠️ **ローカルキャッシュをクリアしても即座に反映されない場合があります**
> ローカルキャッシュをクリアしても、DNSリゾルバーやネームサーバーのキャッシュポリシーにより**TTLが残っている場合**は変更がすぐに伝播されないことがあります。
>
>
> この場合は**一定時間が経過してから**新しいレコードが反映されます。
>
>
> ブラウザを使用中の場合、ブラウザ自体のキャッシュにより以前の結果が表示されることがあるため、<strong>実行中のブラウザをすべて終了</strong>してから再度確認してください。


## DNSとは？


<strong>DNS（Domain Name System）</strong>はインターネットの電話帳のような役割を果たすシステムです。


人間が読めるドメイン名（例：[plzhans.com](https://plzhans.com/)）をコンピューターが理解できるIPアドレス（例：185.199.111.153）に変換します。


### DNSの主な機能

- **ドメイン名の変換：** ユーザーが入力したドメイン名をIPアドレスに変換
- **キャッシュ：** よく使われるドメイン情報をローカルに保存して高速アクセスを可能にする
- **分散データベース：** 世界中に分散されたサーバーを通じて安定したサービスを提供

## DNSキャッシュをクリアする理由

- WebサイトのIPアドレスが変更された場合
- DNS関連のネットワーク問題の解決
- 古いDNS情報による接続エラーの修正
- セキュリティおよびプライバシー保護

---


## WindowsでDNSキャッシュをクリアする


Windowsではコマンドプロンプト（CMD）を管理者権限で実行してDNSキャッシュをクリアできます。


### WindowsでDNSキャッシュをクリアする方法

1. **コマンドプロンプトを管理者権限で実行：** スタートメニューで「cmd」を検索し、右クリックして「管理者として実行」を選択します。
2. **コマンドの入力：** 以下のコマンドを入力してEnterキーを押します。

```bash
ipconfig /flushdns
```


**結果の確認：**「DNSリゾルバーキャッシュは正常にフラッシュされました」というメッセージが表示されれば正常に完了しています。


実行例


```plain text
C:\>ipconfig /flushdns

Windows IP 構成

DNS リゾルバー キャッシュは正常にフラッシュされました。
```


**注意：** 管理者権限がないとコマンドが実行されないため、必ず管理者権限でコマンドプロンプトを実行してください。


---


## LinuxでDNSキャッシュをクリアする


Linuxではディストリビューションと使用しているDNSサービスによってDNSキャッシュをクリアする方法が異なります。


### systemd-resolvedを使用している場合（Ubuntu 17.04以降、Debianなど）


```bash
sudo systemd-resolve --flush-caches
```


または


```bash
sudo resolvectl flush-caches
```


### nscdを使用している場合


```bash
sudo /etc/init.d/nscd restart
```


または


```bash
sudo systemctl restart nscd
```


### dnsmasqを使用している場合


```bash
sudo /etc/init.d/dnsmasq restart
```


または


```bash
sudo systemctl restart dnsmasq
```


### DNSキャッシュの確認


systemd-resolvedのキャッシュ統計を確認するには：


```bash
sudo systemd-resolve --statistics
```


**注意：** Linuxシステムはデフォルトでは DNS キャッシュを使用しない場合が多いです。


DNSキャッシュサービスがインストールされていない場合は、別途キャッシュをクリアする必要はありません。


---


## macOSでDNSキャッシュをクリアする


macOSではターミナルからDNSキャッシュをクリアできます。ほとんどのバージョンでは以下のコマンドで十分です。


### 推奨（ほとんどのmacOS）


```bash
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder
```

{{< details summary="旧バージョンの場合は？" >}}
`dscacheutil`がない場合や動作しない場合は、以下のみを試してください。


```bash
sudo killall -HUP mDNSResponder
```
{{< /details >}}


### 確認・注意事項

- コマンド実行時に管理者パスワードの入力が必要です。
- 成功しても別途出力がない場合があります。
- 変化がない場合はブラウザのDNSキャッシュも一緒にクリアするか（ブラウザを再起動）、ネットワークを再接続してみてください。
