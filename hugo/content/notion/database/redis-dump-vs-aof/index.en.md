---
id: "80"
translationKey: "80"
slug: "80-redis-dump-vs-aof"
title: "Redis dump vs aof"
description: "A complete guide to Redis data backup and persistence methods. Covers redis.conf configuration for RDB (Dump), AOF, and Hybrid AOF approaches, compares their pros and cons, and provides performance optimization tips and selection criteria by use case. Includes BGSAVE, fork, fsync, and Copy-on-Write memory management."
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


## 📌 Overview


Three Redis data backup methods:

- **Dump (RDB)**: Periodically saves data as RDB files
- **AOF**: Records commands to AOF files in execution order
- **Hybrid AOF**: Combines advantages of RDB and AOF
- Dump and AOF are independent persistence processes and the two files do not reference each other

---


## 🗂️ Dump (RDB) Method


Periodically saves in-memory data to RDB files in binary format


### Configuration (`redis.conf`)


```bash
# Enable RDB snapshots
save 900 1      # If at least 1 key changed in 900 seconds (15 minutes)
save 300 10     # If at least 10 keys changed in 300 seconds (5 minutes)
save 60 10000   # If at least 10000 keys changed in 60 seconds

# RDB filename and directory
dbfilename dump.rdb
dir /var/lib/redis

# RDB compression and integrity
rdbcompression yes              # Use LZF compression (increases CPU, reduces file size)
rdbchecksum yes                 # Verify integrity with CRC64 checksum (about 10% performance overhead)

# BGSAVE behavior control
stop-writes-on-bgsave-error yes # Refuse write commands if background save fails
rdb-save-incremental-fsync yes  # Perform fsync every 32MB (distributes disk I/O)

# Replication settings
repl-diskless-sync no           # Transfer RDB to replicas directly without disk (no: uses disk)
repl-diskless-sync-delay 5      # Wait time before starting diskless sync (seconds)
```


### Advantages

- **Faster recovery** compared to AOF on restart

### Disadvantages

- **Potential data loss** due to periodic saves (if server stops before dump)
- File contents cannot be directly inspected
- Recovery tools needed if file corrupts (cannot edit directly)
- Binary format may cause Redis version compatibility issues

---


## 📝 AOF Method


Records commands in plain text to AOF files in execution order


### Configuration (`redis.conf`)


```bash
# Enable AOF
appendonly yes
appendfilename "appendonly.aof"

# AOF fsync policy
appendfsync everysec            # Sync to disk every second (recommended)
# appendfsync always            # Sync after every command (safe but slow)
# appendfsync no                # Let OS decide (fast but risky)

# AOF rewrite automatic execution conditions
auto-aof-rewrite-percentage 100 # When file size increases by 100%
auto-aof-rewrite-min-size 64mb  # When at least 64MB

# fsync behavior during AOF rewrite
no-appendfsync-on-rewrite no    # Perform fsync even during rewrite (recommended)
# no-appendfsync-on-rewrite yes # Stop fsync during rewrite (better performance, risk of loss)

# Load corrupted AOF file
aof-load-truncated yes          # Load and log if file end is truncated
```


### Advantages

- **Log-like visibility** by recording commands in plain text
- **Selective recovery** possible by editing the file
- Recovery easier even when Redis engine changes

### Disadvantages

- **Large file size** due to plain text storage (solved by AOF rewrite)
- **Slow recovery** on restart due to sequential replay

---


## 🔀 Hybrid AOF Method


During AOF rewrite, saves current memory state as binary in the first part of the file, followed by commands in order in the latter part


### Configuration (`redis.conf`)


```bash
# Enable Hybrid AOF (Redis 4.0+)
appendonly yes
aof-use-rdb-preamble yes        # Write beginning of AOF file in RDB format

# Other AOF settings same as AOF method
appendfsync everysec
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb
```


### Advantages

- **Reduced data loss** by recording immediately on command processing
- **Fast recovery** like RDB + **stability** of AOF

### Disadvantages

- Binary part has same disadvantages as existing RDB

---


## 🎯 Selection Guide


### Universal Choice


**Hybrid AOF + Infrequent Dump**

- Use Hybrid AOF by default for fast restart and low loss rate
- Set long Dump period if additional backup needed

### When Restart Speed is Not Critical


**Dump + Optional AOF**

- Set appropriate Dump period
- Add AOF if data loss is a concern
- Consider disk I/O and CPU load

### Full Caching Server (Data Loss Acceptable)


**Minimize Persistence**

- Disable persistence
- Or set long AOF/Dump periods

---


## ⚡ Performance Checklist


### Monitor BGSAVE Execution Frequency


```bash
redis-cli INFO persistence
```


**Items to Check**

- `rdb_bgsave_in_progress`: Whether BGSAVE currently in progress (1: in progress, 0: not)
- `rdb_last_save_time`: Last RDB save time (Unix timestamp)

### fork/COW Memory Pressure


> ⚠️ **Caution**
> RDB uses the `fork()` system call to perform background saves.
>
> - With large data and many write operations, **Copy-on-Write** can cause momentary increases in memory usage and latency
>
> - This is a fundamental characteristic of the RDB method and **cannot be completely removed by configuration alone**
>
> - In environments with insufficient memory, consider **AOF or Hybrid AOF** methods


---


## 📖 Key Terms


### fork


**Process duplication system call**

- Duplicates the currently running process to create a child process
- Redis calls fork() during BGSAVE so the child process saves RDB file in background
- Parent process continues processing client requests while child focuses on saving snapshot

**Characteristics**

- Only memory page table copied at fork() moment (actual memory is shared)
- fork itself is very fast even with large data (few milliseconds)
- fork may fail if insufficient memory

### fsync


**Disk synchronization system call**

- Forces data in OS buffer cache to be written to physical disk
- Ensures data is safely saved to disk even during power failure or system crash

**Usage in AOF**

- `appendfsync everysec`: Calls fsync every second (balances performance and stability)
- `appendfsync always`: fsync after every command (safest but slow)
- `appendfsync no`: Does not call fsync, leaves to OS (fast but risk of data loss)

**Performance Impact**

- fsync is relatively slow operation as it waits for disk I/O
- Faster on SSD than HDD but still costly

### COW (Copy-on-Write)


**Write-time memory copy management technique**

- Immediately after fork(), parent and child processes share same physical memory
- Only when either side **modifies** memory is that page actually copied

**RDB Save Scenario**

1. Redis calls fork() to create child process
2. Child process starts saving RDB file (memory sharing state)
3. Parent process modifies data due to client requests
4. Only modified memory pages are copied (COW occurs)
5. More writes mean more memory pages copied

**Memory Impact**

- In worst case, can increase to nearly twice Redis memory usage
- Minimal additional memory usage with few writes
- Large data + high write load = memory pressure and increased latency
