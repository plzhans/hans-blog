---
id: "101"
translationKey: "101"
slug: "101-claude-code-account-switch-macos-keychain"
title: "Claude 계정 스위치 자동화"
description: "Claude Code 계정을 로그아웃 없이 빠르게 전환하는 방법을 정리합니다. macOS Keychain의 인증 정보를 security 명령으로 백업·교체하는 자동화 스크립트와 claudini·CCSwitcher 같은 전용 도구 사용법을 함께 다룹니다."
categories:
  - "ai"
tags:
  - "claude"
  - "mac"
date: 2026-03-26T00:00:00.000Z
lastmod: 2026-08-29T09:31:00.000Z
toc: true
draft: false
images:
  - "assets/1_39522a0f-7e83-8009-a988-e146d610f764.png"
---


![Claude Code 계정을 macOS Keychain 제어와 전용 도구로 빠르게 전환하는 구성을 나타난 대표 이미지](./assets/1_39522a0f-7e83-8009-a988-e146d610f764.png)


## 개요


Claude Code는 계정 인증 정보를 OS별 보안 저장소에 보관합니다. 


macOS에서는 Keychain에 `Claude Code-credentials` 항목으로 저장되며 Linux와 Windows에서는 사용자 홈 디렉터리의 `.claude/.credentials.json` 파일을 사용합니다.


여러 Claude 계정을 번갈아 사용하는 경우 매번 로그아웃과 브라우저 로그인을 반복하면 작업 흐름이 끊깁니다. 


이 글에서는 Claude Code 계정을 빠르게 전환하기 위한 방법을 정리합니다.


핵심 방식은 두 가지입니다.


개인적으로 단순한 테스트는 직접 스크립트 방식으로 충분합니다. 


자주 전환하거나 GUI 환경을 선호한다면 CCSwitcher 같은 전용 도구를 사용하는 편이 더 안정적입니다.


## CASE 1 : macOS Keychain 인증 정보 직접 제어


```bash
# 현재 Claude Code 인증 정보 백업
security find-generic-password -s "Claude Code-credentials" -w > ~/.claude-creds-work.json

# 기존 Keychain 항목 삭제
security delete-generic-password -s "Claude Code-credentials" 2>/dev/null

# 백업한 인증 정보를 Keychain에 다시 등록
security add-generic-password -s "Claude Code-credentials" -a "$USER" -w "$(cat ~/.claude-creds-work.json)"
```


위 명령은 현재 로그인된 Claude Code 인증 정보를 파일로 저장한 뒤 Keychain 항목을 교체하는 흐름입니다. 계정별로 `~/.claude-creds-personal.json`, `~/.claude-creds-work.json`처럼 파일을 나누어두면 빠르게 전환할 수 있습니다.


### 자동화 스크립트


```bash
# Claude switch account
claude-switch() {
  local account=$1
  local creds_file=~/".claude-creds-${account}.json"
  
  if [ ! -f "$creds_file" ]; then
    echo "❌ 계정 파일 없음: $creds_file"
    return 1
  fi
  
  # Keychain 업데이트
  security delete-generic-password -s "Claude Code-credentials" 2>/dev/null
  security add-generic-password -s "Claude Code-credentials" -a "$USER" -w "$(cat $creds_file)"
  
  echo "✅ Claude 계정 전환 완료: $account"
}

# 사용법: claude-switch personal / claude-switch work
```


## CASE 2 : 전용 도구 사용


직접 Keychain을 제어하는 방식이 부담스럽다면 계정 전환 전용 도구를 사용하는 것이 좋습니다.

- 터미널 기반: [claudini](https://github.com/kimrgrey/claudini)
- macOS GUI 기반: [CCSwitcher](https://github.com/XueshiQiao/CCSwitcher)

`claudini`는 터미널에서 Claude Code 계정을 전환하고 싶은 경우에 적합합니다. 스크립트 방식과 비슷하게 CLI 중심으로 사용할 수 있습니다.


`CCSwitcher`는 macOS 메뉴바에서 계정을 선택해 전환할 수 있는 GUI 도구입니다. 여러 계정을 자주 오가는 환경이라면 직접 스크립트를 관리하는 것보다 편합니다.


### macOS에서는 CCSwitcher 추천


![macOS 메뉴바에서 CCSwitcher로 계정을 선택하는 화면](./assets/2_33522a0f-7e83-801e-a9b4-d49c4d2fbf4d.png)


![CCSwitcher에서 Claude 계정을 등록하고 전환하는 화면](./assets/3_33522a0f-7e83-8000-a264-f0c9ff4e0f86.png)


![CCSwitcher에서 Claude 계정을 등록하고 전환하는 화면](./assets/4_33522a0f-7e83-80ac-9eb1-e13d144ca57a.png)


## 마무리


Claude Code 계정을 여러 개 사용하는 경우 핵심은 인증 정보를 계정별로 분리해두고 필요한 시점에 현재 인증 정보로 교체하는 것입니다.


macOS에서는 Claude Code 인증 정보가 Keychain에 저장되므로 `security` 명령으로 직접 백업하고 교체할 수 있습니다. 


이 방식은 구조가 단순하고 별도 도구가 필요 없습니다. 


다만 인증 정보 파일을 직접 관리해야 하므로 파일 권한과 보관 위치를 신경 써야 합니다.


계정 전환이 자주 필요하다면 전용 도구를 사용하는 편이 좋습니다. 


터미널 중심으로 작업한다면 `claudini`를 사용할 수 있고 macOS에서 GUI 기반 전환을 원한다면 `CCSwitcher`가 가장 편합니다.


인증 정보는 계정 접근 권한과 동일하게 취급해야 합니다. 백업 파일은 외부 저장소에 올리지 말고 필요한 사용자만 읽을 수 있도록 관리합니다.

