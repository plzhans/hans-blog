---
id: "86"
translationKey: "86"
slug: "86-github-pages-custom-domain"
title: "Github pages 커스텀 도메인 사용하기"
description: "GitHub Pages에 커스텀 도메인을 연결할 때 필요한 CNAME·A/AAAA 레코드 설정과 Pages의 Custom domain 적용 절차를 정리했습니다. Actions와 브랜치 배포의 CNAME 파일 처리 차이, dig로 DNS 확인, CAA 레코드 때문에 Enforce HTTPS가 안 켜지는 원인까지 다룹니다."
categories:
  - "web"
tags:
  - "domain"
  - "github"
  - "github-action"
  - "github-pages"
date: 2026-02-10T07:34:00.000Z
lastmod: 2026-08-30T01:20:00.000Z
toc: true
draft: false
images:
  - "assets/1_30a22a0f-7e83-80e7-8f4c-f143df1f0d00.png"
---


![GitHub Pages에 커스텀 도메인을 연결하고 HTTPS를 적용하는 과정을 나타낸 대표 이미지](./assets/1_30a22a0f-7e83-80e7-8f4c-f143df1f0d00.png)


# 개요


GitHub Pages는 기본적으로 `https://{계정명}.`[`github.io/{저장소명}/`](http://github.io/%7B저장소명%7D/) 형식의 URL을 제공한다. 


이 문서는 커스텀 도메인을 연결하는 방법을 설명한다.


# 서브(하위) 도메인 사용


`hugosample.plzhans.com`과 같은 서브 도메인을 사용하는 경우다.


## DNS 설정


도메인 DNS 설정에서 CNAME 레코드를 추가한다.


![서브도메인을 {계정명}. github.io 로 연결하는 CNAME 레코드 등록 화면](./assets/2_30222a0f-7e83-80d2-8bf8-df6ddbcd2239.png)


**설정 예시**

- Type: CNAME
- Name: 서브도메인 (예: hugosample)
- Value: {계정명}.[github.io](http://github.io/)

## GitHub Pages 설정


Repository → Settings → Pages → Custom domain에서 커스텀 도메인을 입력한다.


**입력 예시:** hugosample.plzhans.com


![Repository Settings → Pages의 Custom domain에 도메인을 입력하는 화면](./assets/3_30222a0f-7e83-80fe-875c-c3b270a89dd1.png)


# Apex 도메인 사용


`plzhans.com`과 같이 도메인 루트를 사용하는 경우다.


## Apex 도메인이란


`www`나 `blog` 같은 서브 도메인을 붙이지 않은 도메인 자체를 말한다. 루트 도메인, 네이키드 도메인(naked domain), zone apex 라고도 부른다.

- Apex : `plzhans.com`
- 서브 도메인 : `www.plzhans.com`, `blog.plzhans.com`

> 💡 **왜 apex에는 CNAME을 쓸 수 없나**  
> 서브 도메인은 CNAME 한 줄로 끝나는데 apex는 IP를 직접 적는 A 레코드를 쓴다. 이유는 DNS 규격에 있다.  
>   
>   
> CNAME 레코드는 같은 이름에 다른 레코드와 함께 존재할 수 없다. 그런데 apex에는 존(zone)을 누가 관리하는지 알려주는 SOA와 NS 레코드가 반드시 있어야 한다. 결국 apex에 CNAME을 넣으면 필수 레코드와 충돌하므로 표준을 따르는 DNS라면 등록 자체가 거부된다.  
>   
>   
> GitHub Pages가 서브 도메인과 달리 apex에 대해서만 IP 네 개를 안내하는 것도 이 때문이다.  
>   
> <details>  
> <summary>Cloudflare에서는 apex에 CNAME이 들어간다</summary>  
>   
> Cloudflare를 쓰다가 apex에 CNAME을 넣었는데 그냥 되더라, 하는 경우가 있다. **CNAME Flattening** 기능 덕분이다.  
>   
>   
> Cloudflare가 CNAME이 가리키는 대상을 대신 조회해서 최종 IP 주소를 찾아낸 뒤, 외부 질의에는 CNAME이 아니라 IP로 응답한다. 설정 화면에는 CNAME으로 보이지만 실제 응답은 A 레코드라 표준과 충돌하지 않는다. 일부 상황에서는 기본으로 동작하고 그렇지 않은 경우에는 설정에서 켜야 한다.  
>   
>   
> 참고 : [Cloudflare CNAME flattening](https://developers.cloudflare.com/dns/cname-flattening/)  
>   
>   
> 다른 DNS 업체가 제공하는 ALIAS 또는 ANAME 레코드도 같은 문제를 푸는 비슷한 방식이다.  
>   
>   
> </details>


## DNS 설정


DNS 제공업체에 따라 A, AAAA 또는 ALIAS 레코드를 설정한다.


| 레코드 타입         | Name | Value                                                                           |
| -------------- | ---- | ------------------------------------------------------------------------------- |
| A              | @    | 185.199.108.153<br>185.199.109.153<br>185.199.110.153<br>185.199.111.153                 |
| AAAA           | @    | 2606:50c0:8000::153<br>2606:50c0:8001::153<br>2606:50c0:8002::153<br>2606:50c0:8003::153 |
| ALIAS 또는 ANAME | @    | USERNAME.github.io                                                              |


**참고:** ALIAS/ANAME 레코드를 지원하지 않는 DNS 제공업체는 A 레코드를 사용한다.


## GitHub Pages 설정


Repository → Settings → Pages → Custom domain에서 커스텀 도메인을 입력한다.


**입력 예시:** plzhans.com


# HTTPS 활성화


**Enforce HTTPS** 옵션을 체크하면 HTTPS 인증서가 자동으로 적용된다.


> ⚠️ 인증서 발급과 전파에는 최대 24시간이 소요될 수 있다. HTTPS 연결이 되지 않는다면 하루 정도 기다린 후 다시 시도한다.


# 배포 방식에 따른 CNAME 파일 처리


Settings에서 Custom domain을 저장하면 GitHub가 배포 소스에 `CNAME` 파일을 만든다. 이 파일을 어떻게 다루는지는 배포 방식에 따라 다르다.

- **GitHub Actions 워크플로로 배포하는 경우** : `CNAME` 파일은 무시되며 필요하지 않다. Settings에 저장한 값이 그대로 유지된다.
- **브랜치(gh-pages 등)에서 배포하는 경우** : 커스텀 도메인이 저장소의 `CNAME` 파일로 관리된다. 빌드 결과물로 브랜치를 통째 덮어쓰는 배포 도구를 쓰면 이 파일이 사라지면서 Settings의 Custom domain이 초기화된다.

브랜치 배포에서 도메인이 계속 풀린다면 빌드 결과물에 `CNAME`이 포함되도록 만든다. Hugo라면 `static/CNAME`에 도메인 한 줄을 넣어두면 빌드할 때마다 `public/CNAME`으로 복사된다.


```plain text
# hugo/static/CNAME
hugosample.plzhans.com
```


# DNS 설정 확인


설정한 뒤 실제로 어떤 값이 응답하는지 확인한다.


```bash
# 서브 도메인 (CNAME)
dig +short hugosample.plzhans.com CNAME

# Apex 도메인 (A)
dig +short plzhans.com A
```


서브 도메인은 `{계정명}.github.io`가 나와야 하고 apex 도메인은 앞서 정리한 GitHub Pages IP 네 개가 나와야 한다. 값이 다르면 DNS 제공업체 설정을 다시 확인한다.


# HTTPS가 활성화되지 않을 때


Enforce HTTPS 체크박스가 비활성 상태로 남아 있다면 인증서가 아직 발급되지 않은 것이다.


먼저 CAA 레코드를 확인한다. 도메인에 CAA 레코드를 사용 중이라면 `letsencrypt.org`를 허용하는 항목이 반드시 있어야 한다. 없으면 인증서 발급 자체가 실패한다.


```bash
dig +short plzhans.com CAA
```


그래도 활성화되지 않으면 Custom domain을 비워 저장했다가 다시 입력해 발급을 재시도한다.


# Apex와 www 같이 쓰기


`plzhans.com`으로 접속하든 `www.plzhans.com`으로 접속하든 같은 사이트가 열리게 하는 설정이다. HTTPS를 쓰는 사이트라면 둘 다 준비해두는 편을 권장한다.


헷갈리기 쉬운 지점은 <strong>Pages 설정 화면과 DNS에 넣는 값이 다르다는 점</strong>이다. Custom domain 입력란에는 한 줄만 넣고, 나머지 한쪽은 DNS 레코드로만 연결해둔다.


### 1. Pages에는 apex 도메인만 입력한다


Repository → Settings → Pages → Custom domain 에 `plzhans.com`만 입력한다. `www.plzhans.com`을 여기에 따로 넣지 않는다.


### 2. DNS에는 두 종류를 모두 등록한다


| 레코드 타입 | Name | Value                                | 어떤 접속을 받는가                                 |
| ------ | ---- | ------------------------------------ | ------------------------------------------ |
| A      | @    | 앞서 정리한 GitHub Pages IP 4개            | [plzhans.com](http://plzhans.com/)         |
| CNAME  | www  | {계정명}.[github.io](http://github.io/) | [www.plzhans.com](http://www.plzhans.com/) |


### 3. 리다이렉트는 GitHub가 알아서 한다


위처럼 두면 `www.plzhans.com`으로 들어온 요청을 GitHub가 `plzhans.com`으로 자동 리다이렉트한다. 리다이렉트 규칙을 따로 생성할 필요는 없다.


> ⚠️ `www` CNAME 레코드를 등록하지 않으면 `www` 주소는 연결되지 않는다. 리다이렉트는 DNS가 GitHub를 가리키고 있어야 동작한다.


참고로 `www.www.plzhans.com`처럼 `www.www`로 시작하는 도메인은 설정할 수 없다.


# Hugo 사용하는 경우 사이트 baseURL 맞추기


커스텀 도메인 연결이 끝나면 정적 사이트 생성기의 `baseURL`도 같은 주소로 바꿔야 한다. 값이 이전 `github.io` 주소로 남아 있으면 도메인은 열리지만 CSS와 이미지 경로가 깨진다.


설정 위치는 [Hugo + Github 블로그 만들기](../94-hugo-github-blog/) 글을 참고한다.


---


참고

- [GitHub 공식 문서: 커스텀 도메인 관리](https://docs.github.com/ko/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)

## 관련 글

- [Hugo + Github 블로그 만들기](../94-hugo-github-blog/)
- [hugo site 다국어 지원하기](../93-hugo-multilingual-seo-setup/)
