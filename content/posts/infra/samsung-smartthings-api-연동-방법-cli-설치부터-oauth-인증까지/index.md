---
id: "110"
translationKey: "110"
slug: "110-samsung-smartthings-api-integration-cli-oauth"
title: "Samsung SmartThings API 연동 방법 - CLI 설치부터 OAuth 인증까지"
description: "Samsung SmartThings API 연동에 필요한 CLI 설치, OAuth 앱 생성, Redirect URI 설정, 토큰 발급, 디바이스 조회 방법을 단계별로 정리합니다."
categories:
  - "infra"
tags:
  - "iot"
  - "OpenClaw"
  - "smartthing"
date: 2026-06-29T00:00:00.000Z
lastmod: 2026-07-06T02:42:00.000Z
toc: true
draft: false
images:
  - "assets/1_39522a0f-7e83-8044-b526-d76309a8b4d4.png"
---


![](./assets/1_39522a0f-7e83-8044-b526-d76309a8b4d4.png)


## 개요


SmartThings는 삼성전자가 제공하는 IoT 플랫폼입니다. 


조명, 에어컨, TV, 센서, 플러그, 도어락 같은 스마트 홈 기기를 하나의 계정과 위치(Location) 단위로 연결하고 제어할 수 있게 해줍니다.


SmartThings API를 사용하면 SmartThings 앱에서만 하던 작업을 외부 서비스나 개인 서버에서도 자동화할 수 있습니다. 


예를 들어 등록된 기기 목록 조회, 기기 상태 확인, 전원 제어, 온도 설정, 자동화 조건 구성 같은 작업을 REST API 또는 SmartThings CLI로 처리할 수 있습니다.


이 글에서는 SmartThings API 연동을 위한 기본 준비 과정을 정리합니다. 전체 흐름은 다음과 같습니다.

1. SmartThings 계정과 기기를 준비합니다.
2. SmartThings CLI를 설치합니다.
3. CLI 로그인을 통해 계정 인증을 완료합니다.
4. API 호출에 필요한 앱 또는 토큰을 생성합니다.
5. 기기 목록과 권한 범위를 확인합니다.
6. 외부 애플리케이션에서 SmartThings API를 호출합니다.

개인 테스트나 간단한 자동화는 Personal Access Token(PAT)으로 빠르게 시작할 수 있습니다. 


다만 장기적으로 운영되는 서비스나 사용자 인증이 필요한 앱은 OAuth 기반 연동을 사용하는 것이 적합합니다.


## 설치


SmartThings API 연동을 시작하려면 먼저 SmartThings CLI를 설치합니다. 


CLI는 SmartThings API를 터미널에서 사용할 수 있게 해주는 공식 도구입니다. 


앱 생성, 인증, 디바이스 조회, 명령 실행 같은 작업을 CLI로 처리할 수 있습니다.


### macOS에서 Homebrew로 설치


macOS에서는 Homebrew를 사용하는 방식이 가장 간단합니다.


```bash
# SmartThings Community formula 신뢰
brew trust --formula smartthingscommunity/smartthings/smartthings-prerelease

# SmartThings CLI 설치
brew install smartthingscommunity/smartthings/smartthings

# 설치 확인
smartthings --version
```


`brew trust`는 SmartThings Community 탭에서 제공하는 formula를 신뢰하도록 등록하는 과정입니다. 이후 `brew install`로 SmartThings CLI를 설치합니다.


설치가 끝나면 `smartthings --version` 명령으로 정상 설치 여부를 확인합니다. 버전 정보가 출력되면 CLI를 사용할 준비가 된 상태입니다.


### Windows에서 설치


Windows에서는 SmartThings CLI 실행 파일을 내려받아 사용하는 방식이 적합합니다. 


[GitHub 릴리스 페이지](https://github.com/SmartThingsCommunity/smartthings-cli/releases)에서 Windows용 압축 파일을 다운로드한 뒤 실행 파일을 `PATH`에 포함된 디렉터리에 배치합니다.

1. SmartThings CLI [GitHub 릴리스 페이지](https://github.com/SmartThingsCommunity/smartthings-cli/releases)로 이동합니다.
2. Windows용 압축 파일을 다운로드합니다.
3. 압축을 해제합니다.
4. `smartthings.exe` 파일을 원하는 디렉터리에 복사합니다.
5. 해당 디렉터리를 Windows 환경 변수 `PATH`에 추가합니다.
6. PowerShell 또는 명령 프롬프트를 새로 열고 설치 여부를 확인합니다.

```powershell
smartthings --version
```


`smartthings --version` 명령이 버전 정보를 출력하면 설치가 완료된 상태입니다. 명령을 찾을 수 없다는 오류가 나오면 `smartthings.exe`가 있는 경로가 `PATH`에 제대로 등록되었는지 확인합니다.


### Node.js 환경에서 npm으로 설치


Node.js가 이미 설치된 개발 환경이라면 npm으로 SmartThings CLI를 설치할 수 있습니다. 이 방식은 Windows, macOS, Linux에서 공통으로 사용할 수 있습니다.


```bash
npm install -g @smartthings/cli

smartthings --version
```


npm 방식은 Node.js 기반 개발 환경에서 편리합니다. 반대로 Node.js 의존성을 추가하고 싶지 않다면 OS별 실행 파일이나 Homebrew 설치 방식을 사용하는 것이 더 단순합니다.


### Linux에서 설치


Linux에서는 SmartThings CLI 릴리스 파일을 내려받아 실행 권한을 부여한 뒤 시스템 경로에 배치합니다. 배포판에 관계없이 사용할 수 있는 일반적인 설치 흐름입니다.


```bash
# 설치 디렉터리 생성
mkdir -p ~/bin

# SmartThings CLI Linux용 파일 다운로드 후 압축 해제
# 실제 파일명과 URL은 [GitHub 릴리스 페이지](https://github.com/SmartThingsCommunity/smartthings-cli/releases)의 최신 버전에 맞게 변경합니다.
tar -xzf smartthings-linux-x64.tar.gz

# 실행 파일 이동
mv smartthings ~/bin/

# 실행 권한 부여
chmod +x ~/bin/smartthings

# PATH 등록
echo 'export PATH="$HOME/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# 설치 확인
smartthings --version
```


셸로 zsh를 사용한다면 `~/.bashrc` 대신 `~/.zshrc`에 PATH를 등록합니다.


```bash
echo 'export PATH="$HOME/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```


서버 환경에서는 `/usr/local/bin`에 배치해 모든 사용자 계정에서 사용할 수도 있습니다.


```bash
sudo mv smartthings /usr/local/bin/
sudo chmod +x /usr/local/bin/smartthings

smartthings --version
```


## 앱 생성 및 인증


OAuth 기반 연동을 준비하려면 SmartThings CLI에서 앱을 생성합니다.


```bash
smartthings apps:create
```


명령을 실행하면 앱 이름, 설명, 권한 범위, 리다이렉트 URL 같은 정보를 입력하는 절차가 진행됩니다. 


이 과정에서 API 호출에 사용할 앱 정보를 등록합니다.


```bash
smartthings apps:create
✔ What kind of app do you want to create? (Currently, only OAuth-In apps are
supported.) OAuth-In App

More information on writing SmartApps can be found at
  https://developer.smartthings.com/docs/connected-services/smartapp-basics

✔ Display Name test-app
✔ Description test
✔ Icon Image URL (optional)
✔ Target URL (optional)

More information on OAuth 2 Scopes can be found at:
  https://www.oauth.com/oauth2-servers/scope/

To determine which scopes you need for the application, see documentation for the individual endpoints you will use in your app:
  https://developer.smartthings.com/docs/api/public/

✔ Select Scopes. r:devices:*, w:devices:*, x:devices:*, r:hubs:*, r:locations:*,
w:locations:*, x:locations:*, r:scenes:*, x:scenes:*, r:rules:*, w:rules:*, r:installedapps,
w:installedapps
✔ Add or edit Redirect URIs. Add Redirect URI.
✔ Redirect URI (? for help) https://httpbin.org/get
✔ Add or edit Redirect URIs. Finish editing Redirect URIs.
✔ Choose an action. Finish and create OAuth-In SmartApp.
Basic App Data:
───────────────────────────────────────────────────────────────
 Display Name     test-app
 App Id           72b65205-14ef-48cb-94eb-xxxxxxxxxxxx
 App Name         testapp-91735007-4498-4b3a-96f0-xxxxxxxxxxxx
 Description      test
 Single Instance  true
 Classifications  CONNECTED_SERVICE
 App Type         API_ONLY
───────────────────────────────────────────────────────────────


OAuth Info (you will not be able to see the OAuth info again so please save it now!):
───────────────────────────────────────────────────────────
 OAuth Client Id      19c1fcbf-988c-4bc0-bccf-xxxxxxxxxxxx
 OAuth Client Secret  1b95dfcf-2227-4b98-9547-xxxxxxxxxxxx
───────────────────────────────────────────────────────────
```


## API 사용


### API 연동 방식 선택


SmartThings API를 호출하는 방식은 크게 두 가지입니다.

- Personal Access Token(PAT)
    - 개인 테스트와 단순 자동화에 적합합니다.
    - 토큰 생성이 간단합니다.
    - 필요한 권한 범위를 직접 선택해서 발급합니다.
    - 장기 운영 서비스에는 적합하지 않을 수 있습니다.
- OAuth 앱
    - 외부 애플리케이션 또는 사용자 인증 기반 서비스에 적합합니다.
    - 사용자가 권한을 승인하는 구조로 동작합니다.
    - 액세스 토큰과 갱신 토큰 기반으로 운영할 수 있습니다.
    - 배포용 서비스라면 이 방식을 우선 검토합니다.

### OAuth 인증 및 토큰 발급


이 방식은 개발용입니다. 운영 환경에서는 직접 제어하는 HTTPS 콜백 URL을 사용하는 것이 안전합니다.


이 단계는 `smartthings apps:create`로 OAuth Client ID와 OAuth Client Secret을 발급받은 뒤 진행합니다.


웹서버를 따로 만들지 않을 경우 Redirect URI에는 임시 콜백 URL을 등록합니다.


```plain text
https://httpbin.org/get
```


인증 URL의 `redirect_uri`와 토큰 요청의 `redirect_uri`는 앱 생성 시 등록한 값과 완전히 같아야 합니다.


```plain text
https://api.smartthings.com/oauth/authorize?response_type=code&client_id=<client-id>&redirect_uri=https%3A%2F%2Fhttpbin.org%2Fget&scope=<scope>
```


승인 후 리다이렉트된 URL에서 `code` 값을 복사해 토큰 발급 요청에 사용합니다.


```bash
curl -X POST "https://api.smartthings.com/oauth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -u "<client-id>:<client-secret>" \
  -d "grant_type=authorization_code" \
  -d "code=<authorization-code>" \
  -d "redirect_uri=https://httpbin.org/get"
```


SmartThings API를 실제로 사용할 때는 삼성 SmartThings 공식 API 문서를 기준으로 엔드포인트, 권한 범위(scope), 요청/응답 형식을 확인해야 합니다.


공식 문서에서는 Devices, Locations, Scenes, Rules, Installed Apps 같은 주요 리소스별 API를 제공합니다. 기기 제어를 구현할 때는 먼저 디바이스 목록을 조회하고 각 디바이스의 capability와 command 구조를 확인한 뒤 명령 API를 호출하는 흐름으로 진행합니다.


참고 문서는 아래 링크를 사용합니다.

- [SmartThings Public API 문서](https://developer.smartthings.com/docs/api/public/)
- [SmartThings 개발자 문서](https://developer.smartthings.com/docs/)
- [SmartThings CLI 문서](https://developer.smartthings.com/docs/sdks/cli/)

간단한 테스트는 `curl`이나 Postman으로 시작하는 것이 좋습니다. 이후 실제 서비스나 자동화 스크립트에 적용할 때는 필요한 권한만 scope로 선택하고 토큰을 안전하게 보관합니다.


```bash
curl -X GET "https://api.smartthings.com/v1/devices" \
  -H "Authorization: Bearer <access-token>"
```


위 요청은 계정에 연결된 디바이스 목록을 조회합니다. 응답에서 디바이스 ID와 capability 정보를 확인한 뒤 상태 조회 또는 명령 실행 API로 확장하면 됩니다.


## CLI 사용


설치했던 cli 를 직접 사용하여 제어할 때  사용


로그인


```bash
smartthings login
```


명령을 실행하면 브라우저 기반 인증 절차가 진행됩니다. 


삼성 계정으로 로그인한 뒤 권한 요청을 승인하면 CLI에서 SmartThings 계정의 리소스에 접근할 수 있습니다.


로그인이 완료되면 아래 명령으로 등록된 위치를 확인합니다.


```bash
smartthings locations
```


연동된 기기 목록은 다음 명령으로 확인합니다.


```bash
smartthings devices
```


특정 기기의 상세 정보가 필요하면 디바이스 ID를 지정합니다.


```bash
smartthings devices <device-id>
```


## 마무리


이때 발급되는 OAuth Client ID와 Client Secret은 다시 확인할 수 없으므로 반드시 따로 보관해야 합니다.


웹서버를 운영하지 않는 테스트 환경에서는 `https://httpbin.org/get` 같은 임시 Redirect URI를 사용할 수 있습니다. 


단, 앱 생성 시 등록한 Redirect URI와 인증 URL, 토큰 발급 요청에 사용하는 `redirect_uri` 값은 모두 동일해야 합니다.


토큰 발급이 끝나면 SmartThings Public API 문서를 기준으로 필요한 엔드포인트와 scope를 확인합니다. 


일반적인 흐름은 디바이스 목록 조회, capability 확인, 상태 조회, 명령 실행 순서입니다.


CLI는 설치 확인과 간단한 기기 조회에 유용합니다. 


실제 서비스나 자동화 스크립트에서는 API 문서를 기준으로 필요한 권한만 선택하고 토큰과 Client Secret을 안전하게 관리하는 것이 중요합니다.

