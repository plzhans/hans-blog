---
id: "120"
translationKey: "120"
slug: "120-cloudflare-security-headers-hsts-csp"
title: "SEO 감사가 지적한 보안 헤더 4개, Cloudflare에서 코드 없이 적용하기"
description: "SEO 감사 리포트가 HSTS·CSP·X-Content-Type-Options·Referrer-Policy를 지적하는 이유와 각 헤더의 역할을 정리합니다. 값이 고정된 헤더는 Cloudflare Transform Rules로, 자주 바뀌는 CSP는 HTML meta 태그로 나눠 관리하는 방법과 meta에서 frame-ancestors가 안 되기 때문에 X-Frame-Options가 필요한 이유를 다룹니다."
categories:
  - "web"
tags:
  - "browser"
  - "csp"
  - "https"
  - "seo"
date: 2026-08-30T01:25:00.000Z
lastmod: 2026-08-30T01:26:00.000Z
toc: true
draft: false
images:
  - "assets/1_701d659f-3d7c-4a91-b244-e22e9ba8c778.svg"
---


![Cloudflare와 HTML meta 태그로 보안 헤더를 나눠 적용하는 구성을 나타낸 대표 이미지](./assets/1_701d659f-3d7c-4a91-b244-e22e9ba8c778.svg)


![Cloudflare와 HTML meta 태그로 보안 헤더를 나눠 적용하는 구성을 나타낸 대표 이미지](./assets/2_3cb22a0f-7e83-805e-96d1-eef71485d603.png)


## 개요


SEO 감사 리포트에서 보안 헤더 네 개가 지적되는 경우가 있다. `Strict-Transport-Security`, `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`다.


처음 보면 이게 왜 SEO 항목인가 싶다. 결론부터 말하면 **이 헤더들이 검색 순위를 직접 올려주지는 않는다.**


이 글에서는 왜 SEO 감사에 보안 헤더가 들어오는지, 각 헤더가 무슨 일을 하는지, 그리고 Cloudflare를 앞단에 둔 정적 블로그에서 <strong>나중에 관리하기 편한 조합</strong>으로 적용하는 방법을 정리한다.


## 왜 SEO 리포트가 보안 헤더를 지적하나


### Lighthouse 점수에 포함돼 있다


대부분의 SEO 감사 도구는 Google Lighthouse를 기반으로 기술 SEO 점수를 낸다. Lighthouse의 네 개 카테고리 중 하나가 <strong>Best Practices</strong>이고 여기에 CSP, HSTS, `X-Content-Type-Options` 체크가 들어 있다.


엄밀히는 보안 위생 점검인데 SEO 감사 프레임워크 안에 편입돼 함께 보고되는 것이다. 검색 엔진이 이 헤더를 읽고 순위를 매기는 것이 아니다.


### 진짜 연결고리는 해킹당했을 때의 결과


실질적인 연결고리는 이 경로다.

1. XSS나 콘텐츠 인젝션으로 스팸 링크 또는 악성 스크립트가 삽입된다.
2. Google Safe Browsing이 검색 결과에 경고를 붙이거나 색인에서 제외한다.
3. 트래픽이 하루아침에 사라진다.

보안 헤더는 1번이 일어날 확률을 낮추는 예방 조치다. 감사 리포트가 이 항목을 높은 우선순위로 분류하는 것은 <strong>발생 확률이 높아서가 아니라 터졌을 때의 임팩트가 크기 때문</strong>이다.


> 💡 정리하면 "보안 헤더 → 순위 상승"이 아니라 "보안 헤더 부재 → 해킹 리스크 → (발생 시) 순위 붕괴"라는 간접적이고 비대칭적인 관계다.  
> 사용자 업로드도 로그인 폼도 없는 정적 블로그라면 공격 표면 자체가 작아서, 우선순위로 치면 치명적이라기보다 해두면 안전한 예방접종에 가깝다.


## 각 헤더가 하는 일


### Strict-Transport-Security (HSTS)


브라우저에게 이 도메인은 앞으로 무조건 HTTPS로만 접속하라고 지시한다. `http://`로 요청이 발생해도 서버에 묻지 않고 브라우저가 즉시 `https://`로 바꾼다.


이미 301로 HTTPS 리다이렉트를 하고 있어도 <strong>그 첫 요청 순간은 평문</strong>이다. 공용 와이파이 같은 환경에서 공격자가 중간에서 가로채 가짜 페이지를 보여주는 SSL 스트리핑이 가능한 구간이 바로 여기다. HSTS는 그 구간을 없앤다.


### Content-Security-Policy (CSP)


스크립트, 이미지, 스타일을 어느 출처에서 불러올 수 있는지 정하는 화이트리스트다. 핵심 역할은 XSS 방어다.


외부 의존성(댓글 위젯, 애널리틱스 등) 중 하나가 공급망 공격을 당하거나, 콘텐츠 파이프라인 버그로 이스케이프되지 않은 텍스트가 HTML에 그대로 들어가는 사고가 나더라도, 허용되지 않은 출처의 스크립트 실행을 브라우저가 거부한다.


<strong>1차 방어선이 뚫려도 작동하는 2차 방어선</strong>이라고 보면 된다.


### X-Content-Type-Options: nosniff


브라우저가 서버가 알려준 `Content-Type`을 무시하고 파일 내용을 보고 종류를 스스로 추측하는 MIME sniffing을 막는다.


이 추측이 악용되면 실행되면 안 되는 파일이 스크립트로 실행되는 우회 경로가 생긴다. 사용자 업로드가 없는 블로그라면 리스크는 낮지만 부작용이 없어 그냥 켜두는 항목이다.


### Referrer-Policy


방문자가 다른 사이트로 이동하거나 외부 리소스를 불러올 때 어느 페이지에서 왔는지를 얼마나 넘길지 정한다.


요즘 브라우저는 아무것도 지정하지 않아도 기본값이 이미 `strict-origin-when-cross-origin`이다. 예전 기본값이던 `no-referrer-when-downgrade`는 프로토콜만 같으면 경로까지 포함한 전체 URL을 넘겼는데, 2020년 사양 개정으로 기준이 바뀌었다.


그래서 이 항목은 "지금 정보가 새고 있다"기보다 <strong>브라우저 기본값에 의존하지 않고 사이트가 원하는 정책을 명시해둔다</strong>는 의미가 크다. SEO보다는 방문자 프라이버시 성격이 강한 항목이다.


## 어디에 무엇을 둘 것인가


헤더를 전부 Cloudflare에 몰아넣을 수도 있고 전부 HTML에 넣을 수도 있다. 실제로 운영해 보면 <strong>값이 바뀌는 빈도</strong>가 기준이 된다.


| 헤더                        | 두는 곳       | 이유                       |
| ------------------------- | ---------- | ------------------------ |
| Strict-Transport-Security | Cloudflare | 한 번 켜면 바뀔 일이 없다          |
| X-Content-Type-Options    | Cloudflare | 값이 `nosniff` 하나로 고정이다    |
| Referrer-Policy           | Cloudflare | meta로도 되지만 헤더가 더 확실하다    |
| X-Frame-Options           | Cloudflare | 값이 고정이고, meta로는 대체할 수 없다 |
| Content-Security-Policy   | HTML meta  | 외부 서비스를 추가할 때마다 값이 바뀐다   |


CSP만 성격이 다르다. 애널리틱스를 교체하거나 댓글 위젯을 붙이면 그때마다 허용 출처를 고쳐야 하는데, 이걸 Cloudflare에 두면 **사이트를 손볼 때마다 대시보드에 들어가야 한다.** 사이트 저장소에서 같이 관리하는 편이 훨씬 편하다.


## Cloudflare에 둘 헤더


### 1. HSTS와 nosniff는 한 화면에서 끝난다


SSL/TLS → Edge Certificates → **HTTP Strict Transport Security (HSTS)** → Enable HSTS


| 설정                              | 설명                                   |
| ------------------------------- | ------------------------------------ |
| Max Age Header                  | 1개월 ~ 12개월. 0으로 두면 비활성               |
| Apply HSTS policy to subdomains | 하위 도메인까지 정책 적용                       |
| Preload                         | 브라우저 프리로드 목록 등재용                     |
| No-Sniff Header                 | `X-Content-Type-Options: nosniff` 추가 |


마지막 항목 덕분에 `nosniff`는 이 화면에서 같이 해결된다.


> ⚠️ **HSTS는 되돌리기 어렵다**  
> HSTS를 켠 뒤에는 아래 작업을 하면 안 된다.  
>   
> - DNS 레코드를 Proxied에서 DNS only로 변경  
> - Cloudflare 일시 중지  
> - HTTPS를 HTTP로 리다이렉트  
> - 인증서 만료 등으로 SSL 비활성화  
>   
> Cloudflare 문서는 HSTS를 비활성화하거나 설정한 Max Age가 지나기 전에 HTTPS를 제거하면 그 기간 동안 방문자가 사이트에 접근할 수 없게 된다고 경고한다. 처음에는 Max Age를 짧게 두고 문제가 없는 것을 확인한 뒤 늘려가는 편이 안전하다.


### 2. 나머지는 Transform Rules로 지정한다


Rules → Transform Rules → Create rule → **HTTP Response Header Modification**

- Rule name : 예) `Security Headers`
- When incoming requests match : Hostname equals `blog.example.com`
- Then : **Set static** 액션을 추가

| 헤더 이름           | 값                               |
| --------------- | ------------------------------- |
| Referrer-Policy | strict-origin-when-cross-origin |
| X-Frame-Options | SAMEORIGIN                      |


조건을 모든 요청으로 두지 말고 <strong>hostname으로 범위를 좁히는 편</strong>이 좋다. 같은 zone에 다른 서브 도메인이 있으면 의도치 않게 함께 적용된다.


`X-Frame-Options`는 다른 사이트가 내 페이지를 프레임에 넣는 것을 막아 클릭재킹을 방어한다. `SAMEORIGIN`은 같은 출처에서만 허용, `DENY`는 어디서도 불가다. `ALLOW-FROM`은 폐기된 값이라 최신 브라우저는 이 값이 있으면 헤더 전체를 무시한다.


> 💡 **왜 여기에 CSP가 없나**  
> CSP도 이 규칙에 액션으로 넣을 수 있다. 다만 외부 서비스를 하나 추가할 때마다 Cloudflare에 들어와 정책 문자열을 고쳐야 해서 번거롭다. 그래서 CSP는 뒤에서 HTML `meta` 태그로 관리한다.  
>   
>   
> 대신 `meta`로는 `frame-ancestors`를 쓸 수 없으므로, 클릭재킹 방어 몫을 여기 `X-Frame-Options`가 맡는다.


> 📌 **참고 : Managed Transforms 프리셋은 권하지 않는다**  
> Rules → Managed Transforms에는 <strong>Add security headers</strong>라는 프리셋 토글이 있다. 편해 보이지만 이 프리셋이 붙이는 값은 다음과 같다.  
>   
> - `x-content-type-options: nosniff`  
> - `x-frame-options: SAMEORIGIN`  
> - `referrer-policy: same-origin`  
> - `x-xss-protection: 1; mode=block`  
> - `expect-ct: max-age=86400, enforce`  
>   
> `referrer-policy`가 `same-origin`으로 붙어 앞에서 지정한 `strict-origin-when-cross-origin`과 값이 겹치고, `x-xss-protection`과 `expect-ct`는 현재 브라우저에서 사실상 의미가 없는 레거시 헤더다.  
>   
>   
> 레거시 헤더가 그대로 남아 있다는 점에서 알 수 있듯 프리셋은 최신 권고를 즉시 반영하지 않고, 값이 언제 바뀔지도 이쪽에서 통제할 수 없다. 어차피 규칙 하나에 액션 두세 개면 끝나므로 직접 지정하는 편을 권한다.


## CSP는 HTML meta 태그로 관리한다


CSP는 `meta` 태그로도 지정할 수 있다. 사이트 템플릿의 `head` 안에 넣어두면 외부 서비스를 추가할 때 **저장소에서 코드와 함께 고치면 된다.** Cloudflare에 들어갈 일이 없어진다.


```html
<meta http-equiv="Content-Security-Policy" content="default-src 'self'">
```


Hugo라면 테마의 `baseof.html`을 오버라이딩해 `head` 안에 넣는다.


### 정책 값 예시


Google Analytics와 giscus 댓글을 쓰는 블로그라면 이런 형태가 된다.


```plain text
default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://giscus.app; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://www.google-analytics.com https://analytics.google.com https://giscus.app; frame-src https://giscus.app; base-uri 'self'; form-action 'self'; object-src 'none'
```


> ⚠️ 위 예시의 `script-src`에는 `'unsafe-inline'`이 들어가 있다. 태그 매니저처럼 인라인 스크립트를 삽입하는 도구를 쓰면 빼기 어렵다.  
> 다만 `'unsafe-inline'`이 들어가는 순간 CSP의 XSS 방어 효과는 크게 떨어진다. 이 트레이드오프를 알고 쓰는 것과 모르고 쓰는 것은 다르다.


### meta로 되는 것과 안 되는 것


헤더마다 meta 지원 여부가 다르다. 이 글에서 다룬 헤더를 정리하면 이렇다.


| 헤더                                  | meta 지정 | 비고                         |
| ----------------------------------- | ------- | -------------------------- |
| Content-Security-Policy             | 가능      | 일부 지시문은 무시된다               |
| Referrer-Policy                     | 가능      | `name="referrer"` 형태로 쓴다   |
| Content-Security-Policy-Report-Only | 불가      | 사양에서 meta 미지원              |
| X-Frame-Options                     | 불가      | meta에 넣어도 효과가 없다           |
| X-Content-Type-Options              | 불가      | 응답 헤더 전용                   |
| Strict-Transport-Security           | 불가      | 응답 헤더 전용. HTTPS 응답으로만 유효하다 |


CSP는 meta로 지정할 수 있지만 다음 지시문은 meta에서 무시된다.

- `frame-ancestors`
- `report-uri`
- `report-to`
- `sandbox`

앞의 정책 값 예시에 `frame-ancestors`를 넣지 않고 클릭재킹 방어를 `X-Frame-Options`에 맡긴 이유가 이것이다.


`Content-Security-Policy-Report-Only`도 meta 요소에서는 지원되지 않는다.


Report-Only를 못 쓰므로 처음부터 강제로 적용된다. 정책을 좁게 잡아두고 배포한 뒤 **브라우저 개발자 도구 콘솔을 열어 차단되는 요청이 없는지 확인하면서 넓혀간다.** 굳이 관찰 단계를 거치고 싶다면 그때만 Cloudflare 헤더로 `Content-Security-Policy-Report-Only`를 임시 적용했다가, 값이 확정되면 meta로 옮기는 방법도 있다.


### Referrer-Policy를 meta로 쓸 때


Cloudflare를 쓰지 않거나 Transform Rules를 쓸 수 없는 환경이라면 `Referrer-Policy`는 meta로도 넣을 수 있다.


```html
<meta name="referrer" content="strict-origin-when-cross-origin">
```


헤더 이름은 하이픈이 있는 `Referrer-Policy`인데 meta에서는 `http-equiv`가 아니라 하이픈 없는 `name="referrer"`를 쓴다. 이름이 달라서 헷갈리기 쉬운 부분이다.


### 가능하면 헤더를 쓴다


meta로 지정할 수 있는 항목이라도 헤더를 쓸 수 있다면 헤더에 두는 편이 낫다. meta에는 <strong>정책이 비어 있는 구간</strong>이 있기 때문이다.

- **meta보다 앞선 콘텐츠에는 적용되지 않는다.** CSP 사양은 meta 요소를 문서에서 가능한 한 앞에 두라고 강하게 권고하면서, meta에 앞서는 콘텐츠에는 정책이 적용되지 않는다고 명시한다. 특히 `Link` 응답 헤더로 프리로드된 리소스와 meta보다 위에 있는 `link`·`script` 요소는 차단되지 않는다. 헤더는 파싱이 시작되기 전에 이미 확정돼 있어 이 구간이 없다.
- **파싱된 뒤에는 바꿀 수 없다.** 사양상 meta가 파싱된 뒤에는 `content` 속성을 수정해도 무시된다. `Referrer-Policy`는 meta를 동적으로 삽입하면 동작이 예측 불가능해지고, 정책이 충돌하면 `no-referrer`가 적용된다. 의도한 값과 다른 값이 걸릴 수 있다.
- **HTML 문서 안에만 존재한다.** RSS/Atom 피드, `sitemap.xml`, `static`에 그대로 둔 파일, CDN이 자체적으로 내보내는 오류 페이지에는 meta가 없다. 헤더는 그 응답들에도 붙는다.

정리하면 **헤더로 지정할 수 있으면 헤더에 두고, CSP처럼 값이 자주 변경되어 저장소에서 코드와 함께 관리하는 이점이 더 큰 경우에만 meta로 내린다.**


같은 정책을 헤더와 meta에 동시에 두는 것은 피한다. 값이 어긋나면 어느 쪽이 적용됐는지 추적하기 어렵고, `Referrer-Policy`는 충돌 시 `no-referrer`로 떨어질 수 있다.


## 적용 확인


Cloudflare에 설정한 헤더는 응답을 직접 확인한다.


```bash
curl -sI https://blog.plzhans.com | grep -i -E "strict-transport|x-content-type|referrer-policy|x-frame-options"
```


CSP는 응답 헤더가 아니라 HTML 안에 들어가므로 페이지 소스나 브라우저 개발자 도구의 Elements 탭에서 확인한다. 차단된 요청이 있으면 콘솔에 위반 내역이 남는다.


## 마무리

- 이 헤더들은 순위를 올려주는 항목이 아니라 최악의 상황을 막는 보험이다.
- 값이 고정된 헤더는 Cloudflare에, 자주 바뀌는 CSP는 사이트 저장소에 두면 관리가 편하다.
- Managed Transforms 프리셋은 레거시 헤더가 섞여 있으니 Transform Rules로 직접 지정한다.
- HSTS, `X-Content-Type-Options`, `X-Frame-Options`는 meta로 지정할 수 없다. 헤더로만 동작한다.
- meta CSP는 `frame-ancestors`와 Report-Only를 쓸 수 없다. 클릭재킹 방어는 `X-Frame-Options`로 채운다.
- meta는 그보다 앞선 콘텐츠와 HTML 이외의 응답에 적용되지 않는다. 선택할 수 있다면 헤더가 안전하다.

## 참고

- [HTTP Strict Transport Security (HSTS) - Cloudflare SSL/TLS docs](https://developers.cloudflare.com/ssl/edge-certificates/additional-options/http-strict-transport-security/)
- [Managed Transforms reference - Cloudflare Rules docs](https://developers.cloudflare.com/rules/transform/managed-transforms/reference/)
- [Content-Security-Policy: frame-ancestors - MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors)
- [Content-Security-Policy-Report-Only - MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy-Report-Only)
- [X-Frame-Options - MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Frame-Options)
- [X-Content-Type-Options - MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Content-Type-Options)
- [meta name="referrer" - MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/name/referrer)
- [Content Security Policy Level 3 - W3C](https://w3c.github.io/webappsec-csp/)
