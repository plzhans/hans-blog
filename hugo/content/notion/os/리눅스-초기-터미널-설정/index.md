---
id: "72"
url: "/notion/72"
title: "리눅스 초기 터미널 설정"
tags:
  - "os"
categories:
  - "OS"
date: 2025-06-10T07:04:00.000Z
lastmod: 2026-01-29T01:24:00.000Z
draft: true
---


## **필수 패키지 설치**


패키지 업데이트


```plain text
sudo apt-get update && sudo apt-get upgrade -f
```


## **터미널 테마 - starship**


폰트 설치


```plain text
sudo apt install fonts-firacode -y
```


starship 설치


```plain text
sudo curl -sS https://starship.rs/install.sh | sh
```


세션 실행할 때 자동 실행


```plain text
echo 'eval "$(starship init bash)"' >> ~/.bashrc
```

