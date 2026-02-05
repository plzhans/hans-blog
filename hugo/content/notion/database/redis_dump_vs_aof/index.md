---
id: "80"
url: "/notion/80"
title: "Redis dump vs aof"
description: "Redis 데이터 백업 및 퍼시스턴스 방법 완벽 가이드. RDB(Dump), AOF, Hybrid AOF 방식의 redis.conf 설정, 장단점 비교, 성능 최적화 및 선택 기준을 상황별로 제시. BGSAVE, fork, fsync, Copy-on-Write 메모리 관리 포함"
tags:
  - "database"
  - "redis"
categories:
  - "Database"
date: 2025-06-10T16:16:00.000+09:00
lastmod: 2026-02-05T10:12:00.000Z
draft: false
images:
  - "assets/1_2fd22a0f-7e83-818a-9822-e350339c6f6b.png"
---


![](./assets/1_2fd22a0f-7e83-818a-9822-e350339c6f6b.png)


## 📌 개요


Redis 데이터 백업 방법 3가지:

- **Dump (RDB)**: 주기적으로 데이터를 RDB 파일 형태로 저장
- **AOF**: 명령어를 처리 순서대로 AOF 파일에 기록
- **Hybrid AOF**: RDB와 AOF 장점을 결합한 방식
- Dump와 AOF는 각각 독립적인 퍼시스턴스 프로세스이며 두 파일은 상호 참조하지 않음

---


## 🗂️ Dump (RDB) 방식


메모리 데이터를 바이너리 형태로 주기적으로 RDB 파일에 저장


### 설정 방법 (`redis.conf`)


```bash
# RDB 스냅샷 활성화
save 900 1      # 900초(15분) 동안 1개 이상 키 변경 시
save 300 10     # 300초(5분) 동안 10개 이상 키 변경 시
save 60 10000   # 60초 동안 10000개 이상 키 변경 시

# RDB 파일명 및 저장 경로
dbfilename dump.rdb
dir /var/lib/redis

# RDB 압축 및 무결성
rdbcompression yes              # LZF 압축 사용 (CPU 증가, 파일 크기 감소)
rdbchecksum yes                 # CRC64 체크섬으로 무결성 검증 (약 10% 성능 저하)

# BGSAVE 동작 제어
stop-writes-on-bgsave-error yes # 백그라운드 저장 실패 시 쓰기 명령 거부
rdb-save-incremental-fsync yes  # 32MB마다 fsync 수행 (디스크 I/O 분산)

# 복제(Replication) 설정
repl-diskless-sync no           # 레플리카로 RDB를 디스크 없이 직접 전송 (no: 디스크 사용)
repl-diskless-sync-delay 5      # diskless sync 시작 전 대기 시간 (초)
```


### 장점

- 재시작 시 AOF 대비 **빠른 복구 속도**

### 단점

- 주기적 저장으로 인한 **데이터 유실 가능성** (dump 전 서버 중지 시)
- 파일 내용을 직접 확인 불가
- 파일 손상 시 복구 도구 필요 (직접 편집 불가)
- 바이너리 형태로 Redis 버전 호환성 문제 발생 가능

---


## 📝 AOF 방식


명령어를 처리 순서대로 AOF 파일에 평문 형태로 기록


### 설정 방법 (`redis.conf`)


```bash
# AOF 활성화
appendonly yes
appendfilename "appendonly.aof"

# AOF fsync 정책
appendfsync everysec            # 매초마다 디스크 동기화 (권장)
# appendfsync always            # 매 명령마다 동기화 (안전하지만 느림)
# appendfsync no                # OS가 결정 (빠르지만 위험)

# AOF rewrite 자동 실행 조건
auto-aof-rewrite-percentage 100 # 파일 크기가 100% 증가 시
auto-aof-rewrite-min-size 64mb  # 최소 64MB 이상일 때

# AOF rewrite 중 fsync 동작
no-appendfsync-on-rewrite no    # rewrite 중에도 fsync 수행 (권장)
# no-appendfsync-on-rewrite yes # rewrite 중 fsync 중단 (성능 향상, 유실 위험)

# 손상된 AOF 파일 로드
aof-load-truncated yes          # 파일 끝이 잘린 경우에도 로드 후 로그 남김
```


### 장점

- 명령어를 평문으로 기록하여 **로그처럼 확인 가능**
- 파일을 편집하여 필요한 부분만 **선택적 복구 가능**
- Redis 엔진 변경 시에도 복구 수월

### 단점

- 평문 저장으로 인한 **큰 파일 용량** (AOF rewrite로 해결)
- 재시작 시 순차 복구로 인한 **느린 복구 속도**

---


## 🔀 Hybrid AOF 방식


AOF rewrite 시 현재 메모리 상태를 파일 전반부에 바이너리로 기록하고, 후반부에는 명령어를 순서대로 기록


### 설정 방법 (`redis.conf`)


```bash
# Hybrid AOF 활성화 (Redis 4.0 이상)
appendonly yes
aof-use-rdb-preamble yes        # AOF 파일 앞부분을 RDB 형식으로 작성

# 기타 AOF 설정은 AOF 방식과 동일
appendfsync everysec
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb
```


### 장점

- 명령어 처리 시 즉시 기록하여 **데이터 유실 가능성 감소**
- RDB처럼 **빠른 복구** + AOF의 **안정성** 확보

### 단점

- 바이너리 부분은 기존 RDB 단점 동일

---


## 🎯 선택 가이드


### 보편적 선택


**Hybrid AOF + 낮은 빈도의 Dump**

- 빠른 재시작과 낮은 유실률을 위한 Hybrid AOF 기본 사용
- 추가 백업이 필요한 경우 Dump 주기를 길게 설정

### 재시작 속도가 중요하지 않은 경우


**Dump + 선택적 AOF**

- Dump 주기를 적절히 설정
- 데이터 유실이 우려되면 AOF 추가 설정
- 단, 디스크 I/O와 CPU 부하 고려 필요

### 완전 캐싱 서버 (데이터 유실 허용)


**퍼시스턴스 최소화**

- 퍼시스턴스 비활성화
- 또는 AOF/Dump 주기를 길게 설정

---


## ⚡ 성능 체크 사항


### BGSAVE 실행 빈도 모니터링


```bash
redis-cli INFO persistence
```


**확인 항목**

- `rdb_bgsave_in_progress`: 현재 BGSAVE 진행 중 여부 (1: 진행중, 0: 미진행)
- `rdb_last_save_time`: 마지막 RDB 저장 시간 (Unix timestamp)

### fork/COW 메모리 압박


> ⚠️ **주의사항**  
> RDB는 `fork()` 시스템 콜을 사용하여 백그라운드로 저장을 수행합니다.  
>   
> - 데이터가 크고 쓰기 작업이 많은 경우 **Copy-on-Write**로 인해 순간적으로 메모리 사용량과 latency가 증가  
>   
> - 이는 RDB 방식의 근본적인 특성이므로 **설정 옵션만으로 완전히 제거 불가**  
>   
> - 메모리 여유가 부족한 환경에서는 **AOF 또는 Hybrid AOF** 방식을 고려


---


## 📖 주요 용어 설명


### fork


**프로세스 복제 시스템 콜**

- 현재 실행 중인 프로세스를 복제하여 자식 프로세스를 생성
- Redis는 BGSAVE 시 fork()를 호출하여 자식 프로세스가 백그라운드에서 RDB 파일 저장
- 부모 프로세스는 계속 클라이언트 요청을 처리하고, 자식 프로세스는 스냅샷 저장에만 집중

**특징**

- fork() 호출 순간 메모리 페이지 테이블만 복사 (실제 메모리는 공유)
- 대용량 데이터에서도 fork 자체는 매우 빠름 (수 밀리초)
- 메모리 부족 시 fork 실패 가능

### fsync


**디스크 동기화 시스템 콜**

- OS 버퍼 캐시에 있는 데이터를 물리 디스크로 강제 기록
- 전원 차단이나 시스템 크래시 시에도 데이터가 디스크에 안전하게 저장되도록 보장

**AOF에서의 사용**

- `appendfsync everysec`: 1초마다 fsync 호출 (성능과 안정성 균형)
- `appendfsync always`: 매 명령마다 fsync (가장 안전하지만 느림)
- `appendfsync no`: fsync 호출 안 함, OS에 맡김 (빠르지만 데이터 유실 위험)

**성능 영향**

- fsync는 디스크 I/O를 기다려야 하므로 상대적으로 느린 작업
- SSD에서는 HDD보다 빠르지만 여전히 비용이 큼

### COW (Copy-on-Write)


**쓰기 시 복사 메모리 관리 기법**

- fork() 직후에는 부모와 자식 프로세스가 동일한 물리 메모리를 공유
- 어느 한쪽에서 메모리를 **수정**할 때만 해당 페이지를 실제로 복사

**RDB 저장 시나리오**

1. Redis가 fork()를 호출하여 자식 프로세스 생성
2. 자식 프로세스가 RDB 파일 저장 시작 (메모리 공유 상태)
3. 부모 프로세스가 클라이언트 요청으로 데이터 수정
4. 수정된 메모리 페이지만 복사 (COW 발생)
5. 쓰기가 많을수록 더 많은 메모리 페이지가 복사됨

**메모리 영향**

- 최악의 경우 Redis 메모리 사용량의 거의 2배까지 증가 가능
- 쓰기가 적으면 메모리 추가 사용량 최소화
- 대용량 데이터 + 높은 쓰기 부하 = 메모리 압박 및 latency 증가
