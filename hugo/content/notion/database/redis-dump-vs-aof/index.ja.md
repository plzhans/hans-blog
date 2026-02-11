---
id: "80"
translationKey: "80"
slug: "80-redis-dump-vs-aof"
title: "Redis dump vs aof"
description: "Redisデータバックアップと永続化方法の完全ガイド。RDB(Dump)、AOF、Hybrid AOF方式のredis.conf設定、長所と短所の比較、性能最適化および選択基準を状況別に提示。BGSAVE、fork、fsync、Copy-on-Writeメモリ管理を含む"
tags:
  - "database"
  - "redis"
categories:
  - "Database"
date: 2025-06-10T16:16:00.000+09:00
lastmod: 2026-02-06T06:28:00.000Z
toc: true
draft: false
images:
  - "assets/1_2fd22a0f-7e83-818a-9822-e350339c6f6b.png"
---


![](./assets/1_2fd22a0f-7e83-818a-9822-e350339c6f6b.png)


## 📌 概要


Redisデータバックアップ方法3つ:

- **Dump (RDB)**: 定期的にデータをRDBファイル形式で保存
- **AOF**: コマンドを処理順にAOFファイルに記録
- **Hybrid AOF**: RDBとAOFの長所を組み合わせた方式
- DumpとAOFはそれぞれ独立した永続化プロセスであり、2つのファイルは相互参照しない

---


## 🗂️ Dump (RDB) 方式


メモリデータをバイナリ形式で定期的にRDBファイルに保存


### 設定方法 (`redis.conf`)


```bash
# RDBスナップショット有効化
save 900 1      # 900秒(15分)間に1個以上のキー変更時
save 300 10     # 300秒(5分)間に10個以上のキー変更時
save 60 10000   # 60秒間に10000個以上のキー変更時

# RDBファイル名および保存パス
dbfilename dump.rdb
dir /var/lib/redis

# RDB圧縮および整合性
rdbcompression yes              # LZF圧縮使用 (CPU増加、ファイルサイズ減少)
rdbchecksum yes                 # CRC64チェックサムで整合性検証 (約10%性能低下)

# BGSAVE動作制御
stop-writes-on-bgsave-error yes # バックグラウンド保存失敗時に書き込みコマンド拒否
rdb-save-incremental-fsync yes  # 32MBごとにfsync実行 (ディスクI/O分散)

# レプリケーション設定
repl-diskless-sync no           # レプリカにRDBをディスクなしで直接転送 (no: ディスク使用)
repl-diskless-sync-delay 5      # diskless sync開始前の待機時間 (秒)
```


### 長所

- 再起動時にAOFに比べて**速い復旧速度**

### 短所

- 定期的保存による**データ損失の可能性** (dump前のサーバー停止時)
- ファイル内容を直接確認不可
- ファイル破損時に復旧ツール必要 (直接編集不可)
- バイナリ形式でRedisバージョン互換性問題が発生する可能性

---


## 📝 AOF 方式


コマンドを処理順にAOFファイルに平文形式で記録


### 設定方法 (`redis.conf`)


```bash
# AOF有効化
appendonly yes
appendfilename "appendonly.aof"

# AOF fsyncポリシー
appendfsync everysec            # 毎秒ディスク同期 (推奨)
# appendfsync always            # 毎コマンドごとに同期 (安全だが遅い)
# appendfsync no                # OSが決定 (速いが危険)

# AOF rewrite自動実行条件
auto-aof-rewrite-percentage 100 # ファイルサイズが100%増加時
auto-aof-rewrite-min-size 64mb  # 最小64MB以上の時

# AOF rewrite中のfsync動作
no-appendfsync-on-rewrite no    # rewrite中もfsync実行 (推奨)
# no-appendfsync-on-rewrite yes # rewrite中fsync中断 (性能向上、損失リスク)

# 破損したAOFファイルロード
aof-load-truncated yes          # ファイル末尾が切れた場合もロード後ログ記録
```


### 長所

- コマンドを平文で記録して**ログのように確認可能**
- ファイルを編集して必要な部分だけ**選択的復旧可能**
- Redisエンジン変更時も復旧が容易

### 短所

- 平文保存による**大きなファイル容量** (AOF rewriteで解決)
- 再起動時の順次復旧による**遅い復旧速度**

---


## 🔀 Hybrid AOF 方式


AOF rewrite時に現在のメモリ状態をファイルの前半部にバイナリで記録し、後半部にはコマンドを順に記録


### 設定方法 (`redis.conf`)


```bash
# Hybrid AOF有効化 (Redis 4.0以上)
appendonly yes
aof-use-rdb-preamble yes        # AOFファイルの前半部をRDB形式で作成

# その他AOF設定はAOF方式と同一
appendfsync everysec
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb
```


### 長所

- コマンド処理時に即座に記録して**データ損失の可能性減少**
- RDBのような**速い復旧** + AOFの**安定性**確保

### 短所

- バイナリ部分は既存RDBの短所と同一

---


## 🎯 選択ガイド


### 一般的な選択


**Hybrid AOF + 低頻度のDump**

- 速い再起動と低い損失率のためのHybrid AOF基本使用
- 追加バックアップが必要な場合、Dump周期を長く設定

### 再起動速度が重要でない場合


**Dump + 選択的AOF**

- Dump周期を適切に設定
- データ損失が懸念される場合はAOF追加設定
- ただし、ディスクI/OとCPU負荷を考慮する必要

### 完全キャッシングサーバー (データ損失許容)


**永続化最小化**

- 永続化無効化
- またはAOF/Dump周期を長く設定

---


## ⚡ 性能チェック事項


### BGSAVE実行頻度モニタリング


```bash
redis-cli INFO persistence
```


**確認項目**

- `rdb_bgsave_in_progress`: 現在BGSAVE進行中かどうか (1: 進行中, 0: 非進行)
- `rdb_last_save_time`: 最後のRDB保存時間 (Unix timestamp)

### fork/COWメモリ圧迫


> ⚠️ **注意事項**
> RDBは`fork()`システムコールを使用してバックグラウンドで保存を実行します。
>
> - データが大きく書き込み作業が多い場合、**Copy-on-Write**により瞬間的にメモリ使用量とlatencyが増加
>
> - これはRDB方式の根本的な特性であり、**設定オプションだけでは完全に除去不可**
>
> - メモリ余裕が不足している環境では**AOFまたはHybrid AOF**方式を検討


---


## 📖 主要用語説明


### fork


**プロセス複製システムコール**

- 現在実行中のプロセスを複製して子プロセスを生成
- RedisはBGSAVE時にfork()を呼び出して子プロセスがバックグラウンドでRDBファイル保存
- 親プロセスは引き続きクライアント要求を処理し、子プロセスはスナップショット保存にのみ集中

**特徴**

- fork()呼び出し瞬間、メモリページテーブルのみコピー (実際のメモリは共有)
- 大容量データでもfork自体は非常に速い (数ミリ秒)
- メモリ不足時にfork失敗の可能性

### fsync


**ディスク同期システムコール**

- OSバッファキャッシュにあるデータを物理ディスクに強制記録
- 電源遮断やシステムクラッシュ時もデータがディスクに安全に保存されることを保証

**AOFでの使用**

- `appendfsync everysec`: 1秒ごとにfsync呼び出し (性能と安定性のバランス)
- `appendfsync always`: 毎コマンドごとにfsync (最も安全だが遅い)
- `appendfsync no`: fsync呼び出しなし、OSに任せる (速いがデータ損失リスク)

**性能影響**

- fsyncはディスクI/Oを待つ必要があるため、比較的遅い作業
- SSDではHDDより速いが、依然としてコストが大きい

### COW (Copy-on-Write)


**書き込み時コピーメモリ管理技法**

- fork()直後には親と子プロセスが同一の物理メモリを共有
- どちらか一方がメモリを**修正**する時のみ、該当ページを実際にコピー

**RDB保存時のシナリオ**

1. Redisがfork()を呼び出して子プロセス生成
2. 子プロセスがRDBファイル保存開始 (メモリ共有状態)
3. 親プロセスがクライアント要求でデータ修正
4. 修正されたメモリページのみコピー (COW発生)
5. 書き込みが多いほど、より多くのメモリページがコピーされる

**メモリ影響**

- 最悪の場合、Redisメモリ使用量のほぼ2倍まで増加する可能性
- 書き込みが少ない場合、メモリ追加使用量最小化
- 大容量データ + 高い書き込み負荷 = メモリ圧迫およびlatency増加
