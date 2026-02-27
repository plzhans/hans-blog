---
id: "17"
translationKey: "17"
slug: "17-windows-tortoisegit-icon-overlay-fix"
title: "Windows에서 TortoiseGit 아이콘 오버레이 안 보일 때 해결 방법"
description: "Windows 탐색기에서 TortoiseGit 상태 아이콘이 안 보이면 ShellIconOverlayIdentifiers 오버레이 제한과 우선순위를 점검해야 합니다. 레지스트리 정리와 Explorer 재시작으로 아이콘을 바로 복구합니다."
categories:
  - "git"
tags:
  - "git"
  - "TortoiseGit"
date: 2021-02-27T02:00:00.000Z
lastmod: 2026-02-27T14:33:00.000Z
toc: true
draft: false
images:
  - "assets/1_31422a0f-7e83-801f-a182-fce89d37a3c2.png"
---


![](./assets/1_31422a0f-7e83-801f-a182-fce89d37a3c2.png)


> 💡 Windows 탐색기 상태 아이콘이 안 보이면  
> 오버레이 핸들러 등록 개수 제한과 우선순위 충돌을 의심한다  
>   
>   
> 레지스트리에서 TortoiseGit 항목을 상단으로 올리면 해결된다


## 문제 요약

- Windows 탐색기에서 TortoiseGit 상태 아이콘이 표시되지 않는다
- 아이콘 오버레이를 사용하는 프로그램이 많을 때 자주 발생한다

## 증상


파일과 폴더에 정상적으로 떠야 하는 Git 상태 아이콘이 보이지 않는다


![](./assets/2_2fd22a0f-7e83-8139-99e5-f498ff24f63f.png)


## 원인

- Windows 탐색기는 아이콘 오버레이 핸들러를 무한정 표시하지 않는다
- `ShellIconOverlayIdentifiers`에 등록된 항목 중 일부만 사용된다
- 탐색기 오버레이 참조 개수가 약 15개로 제한된다고 알려져 있다
- 다른 프로그램이 오버레이를 많이 등록하면 TortoiseGit 항목이 선택 목록에서 밀릴 수 있다

## 해결 방법


1) 레지스트리 편집기 실행

- 시작 → 실행 → `regedit`

![](./assets/3_2fd22a0f-7e83-81aa-a4e9-dcc8b9fff247.png)


2) 대상 경로로 이동


아래 경로로 이동한다


> HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\ShellIconOverlayIdentifiers


3) 변경 전 백업

- 만일에 대비해서 수정 전에 백업한다
- `ShellIconOverlayIdentifiers` 우클릭 → 내보내기

> ⚠️ 키 삭제는 되돌리기 어렵다. 백업 파일로 복구할 수 있게 먼저 내보내기를 해둔다


![](./assets/4_2fd22a0f-7e83-81b2-a6c1-e8329429fbc3.png)


4) 우선순위 조정


목표는 TortoiseGit 항목이 목록 상단 쪽에 오도록 만드는 것이다

- TortoiseGit 관련 키 이름 앞에 공백 또는 숫자를 붙인다
- 표시할 필요가 없는 오버레이 항목은 삭제를 검토한다
- 제한 개수 안에 들어오도록 정리한다

수정 전


![](./assets/5_2fd22a0f-7e83-81e0-b5b5-e2890b7f55bf.png)


수정 후


![](./assets/6_2fd22a0f-7e83-81f2-af8d-e782336c5850.png)


## 적용 방법


Explorer 재시작


재부팅 없이도 Explorer를 재시작하면 적용된다

- 작업 관리자에서 `Windows Explorer` 작업을 끝낸다

    ![](./assets/7_2fd22a0f-7e83-81f0-b48a-c9aa3b417a97.png)

- `C:\Windows\explorer.exe`를 실행해서 다시 띄운다

    ![](./assets/8_2fd22a0f-7e83-817d-a1b1-f5e99bab2c4f.png)


    ![](./assets/9_2fd22a0f-7e83-8120-b5ac-facca1d24ad1.png)


### 확인

- 탐색기에서 새로 고침 `F5`
- Git 상태 아이콘이 정상 표시되는지 확인한다

    ![](./assets/10_2fd22a0f-7e83-81cc-9f4c-c4d185928c75.png)

