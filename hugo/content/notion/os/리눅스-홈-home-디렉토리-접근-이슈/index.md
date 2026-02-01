---
id: "40"
url: "/notion/40"
title: "리눅스 홈(/home) 디렉토리 접근 이슈"
tags:
  - "os"
categories:
  - "OS"
date: 2022-03-17T07:49:00.000Z
lastmod: 2026-01-29T01:24:00.000Z
draft: true
---


# **웹서버 SELinux 관련 이슈**


### **httpd 관련 서비스 /home 디렉토리 접근 불가**

- nginx와 같은 httpd 서비스는 기본적으로 /home 하위 디렉토리 접근 불가
- home 디렉토리의 문맥 설정이 기본적으로 user_home_t 로 되어 있어서 nginx에서 접근 불가
- 문맥 설정을 변경해준다. httpd_sys_content_t

```plain text
# 문맥 조회
ls -Z

# 문맥 변경
chcon -R -t httpd_sys_content_t (dir)
```


### **httpd 관련 서비스 네트워크 커넥트 문제**

- nginx와 같은 httpd 서비스 내에서 내부 proxy에 연결 되지 않는 문제
- httpd_can_network_connect 설정을 허용해 준다.(기본값 0)

```plain text
setsebool -P httpd_can_network_connect 1
```

