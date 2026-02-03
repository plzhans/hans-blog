---
id: "63"
url: "/notion/63"
title: "Java Timezone"
tags:
  - "java"
  - "mysql"
categories:
  - "Develop"
date: 2024-06-14T02:46:00.000Z
lastmod: 2026-02-03T04:28:00.000Z
draft: false
---


## Timezone 설정은 왜?

- Mysql 기준으로 아래와 같이 기본 timezone 설정이 있어야함

```plain text
[mysqld]
default-time-zone=Asia/Seoul
```

- Timezone 설정이 되어있지 않으면 동작할때 모호해지는 경우가 있음
- 서버를 재시작 할 수 없고 바로 적용 되야하는 경우
    - sql로 수동 timezone 설정
        - SET GLOBAL time_zone='Asia/Seoul';
    - mysql 설정파일에 default-time-zone 넣기
- 위 방법을 사용할 수 없는 경우 아래 방법 사용

## **JPA hibernate properties**

- db에 기본 timezone 설정이 없는 경우 사용

```java
spring:
    jpa:
        hibernate:
            jdbc:
                time_zone: Asia/Seoul
```


## DB 연결 설정 추가

- jpa hibernate 설정에 추가하지 않고 커넥션스트링으로 추가하고 싶은 경우 사용

mysql 커넥션 예


```java
mysql://127.0.0.1:3306/db?serverTimezone=Asia/Seoul
```


mysql timezone 설정 보기


```sql
SELECT @@global.time_zone, @@session.time_zone;
```


Java 코드

- 필요한 경우가 아니면 비추

```java
TimeZone.setDefault(TimeZone.getTimeZone("Asia/Seoul"));
```

