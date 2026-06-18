---
id: "105"
translationKey: "105"
slug: "105-mac-office-activation"
title: "How to Activate Mac Office | Installing LTSC with Volume License VL Serializer"
description: "This guide walks through installing Microsoft Office on a Mac with a volume license and activating it. It covers everything from choosing the LTSC installer to applying the VL Serializer and verifying activation."
categories:
  - "etc"
tags:
  - "mac"
  - "office"
  - "office365"
date: 2026-06-18T02:18:00.000Z
lastmod: 2026-06-18T02:21:00.000Z
toc: true
draft: false
images:
  - "assets/1_38222a0f-7e83-8081-a85a-e61f35929c9c.png"
---


## Overview


Activating a license is required when installing Microsoft Office on a Mac.  


You can activate it with a Microsoft 365 account, or enter a serial after installing a specific version. 


If your organization has a volume license, we recommend the installation method that activates with the VL Serializer.  


Source: [https://github.com/alsyundawy/Microsoft-Office-For-MacOS](https://github.com/alsyundawy/Microsoft-Office-For-MacOS)


---


## Installation Steps

1. Choose the Office version to install
    - Example: [**Office LTSC 2021/2024 Suite Installer**](https://go.microsoft.com/fwlink/?linkid=525133)
2. Proceed with the installation
    - You can choose to install only the apps you need
3. Download the Office VL Serializer
    - Example: [Office 2024 LTSC VL Serializer](https://github.com/alsyundawy/Microsoft-Office-For-MacOS/blob/master/DATA/Microsoft_Office_LTSC_2024_VL_Serializer.pkg)
4. Run the Serializer to apply the volume license
5. Launch an Office app to verify the activation status

---


## Installation Screenshots


Installation


![](./assets/1_38222a0f-7e83-8081-a85a-e61f35929c9c.png)


![](./assets/2_38222a0f-7e83-80b8-b486-dfd635b44edc.png)


Customize


![](./assets/3_38222a0f-7e83-80ec-9e5b-c15b8927d557.png)


Install only what you need


![](./assets/4_38222a0f-7e83-809a-bf31-eb6d73602517.png)


Download the Serializer


![](./assets/5_38222a0f-7e83-80c6-89c5-fab1c527a4d6.png)


Run and verify activation


![](./assets/6_38222a0f-7e83-80d9-9d7b-e4c4dab73d7d.png)


---


## Optional


### Disable Telemetry


```bash
defaults write com.microsoft.Word SendAllTelemetryEnabled -bool FALSE
defaults write com.microsoft.Excel SendAllTelemetryEnabled -bool FALSE
defaults write com.microsoft.Powerpoint SendAllTelemetryEnabled -bool FALSE
defaults write com.microsoft.Outlook SendAllTelemetryEnabled -bool FALSE
defaults write com.microsoft.onenote.mac SendAllTelemetryEnabled -bool FALSE
defaults write com.microsoft.autoupdate2 SendAllTelemetryEnabled -bool FALSE
defaults write com.microsoft.Office365ServiceV2 SendAllTelemetryEnabled -bool FALSE
```


### Disable Cloud Sign-in


```bash
defaults write com.microsoft.Word UseOnlineContent -integer 0
defaults write com.microsoft.Excel UseOnlineContent -integer 0
defaults write com.microsoft.Powerpoint UseOnlineContent -integer 0
```
