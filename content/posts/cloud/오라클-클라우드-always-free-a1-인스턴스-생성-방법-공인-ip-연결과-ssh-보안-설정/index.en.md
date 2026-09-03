---
id: "115"
translationKey: "115"
slug: "115-oracle-cloud-always-free-a1-instance-ssh-security"
title: "How to Create an Oracle Cloud Always Free A1 Instance - Public IP Connection and SSH Security Setup"
description: "A step-by-step guide to creating an Oracle Cloud Always Free A1 (ARM) instance. Covers everything from selecting the free spec to connecting a public IP, setting up an SSH key, and restricting SSH port 22 with a VCN Security List and NSG."
categories:
  - "cloud"
tags:
  - "linux"
  - "oracle"
date: 2026-07-10T03:44:00.000Z
lastmod: 2026-09-03T07:31:00.000Z
toc: true
draft: false
images:
  - "assets/1_39922a0f-7e83-80a9-bd69-fd5331deb6ba.png"
---


![A representative image showing the process of creating an Oracle Cloud Always Free A1 instance and setting up a public IP and SSH security](./assets/1_39922a0f-7e83-80a9-bd69-fd5331deb6ba.png)


## Overview


This post summarizes how to create an A1 (ARM) instance on the Oracle Cloud Infrastructure (OCI) Always Free tier.


As of the date this post was written (2026-07-10), the always-free spec is 2 OCPUs, 12GB memory, and 200GB disk.


Even if you split the OCPU quota to run two instances, you can still stay within the free tier.


This post covers everything from creating a Compute instance to selecting the OS and spec, network, SSH key, and boot volume settings, and connecting a public IP.


It then covers cleaning up the default Any inbound rule for port 22 in the VCN Security List, and how to restrict access using a Network Security Group or a VPN.


Finally, it includes verifying the SSH connection.


## Creating the Oracle Server


![The Compute instance screen in the Oracle Cloud console](./assets/2_39922a0f-7e83-8092-ac0b-ccd0d183d2c0.png)


Creating an instance


Compute → Instacnes → [Create instance]


![Screen for pressing the Create instance button in the Compute → Instances list](./assets/3_39922a0f-7e83-80d7-bdee-dd7bd3c068ad.png)


Basic instance information


![Screen for entering basic information such as instance name and placement](./assets/4_39922a0f-7e83-8085-974b-eec35383e592.png)


Selecting the OS


You're free to choose the OS, but since A1 is an ARM processor, you must choose an aarch64 image.


![OS selection screen for choosing an aarch64 image for A1 (ARM)](./assets/5_39922a0f-7e83-8027-8a3e-f1c19be54abe.png)


Selecting the spec

- The always-free spec as of the date this post was written (2026-07-10): 2 OCPU + Memory 12GB + Disk 200GB
- Since this is a maximum usage limit, you can also use just 1 OCPU and create 2 instances for free

![Screen for specifying the spec at the always-free range of 2 OCPU / 12GB memory](./assets/6_39922a0f-7e83-80b6-90f5-f2dfaadd2f0b.png)


Next step


![Screen for moving to the next step after finishing the basic settings](./assets/7_39922a0f-7e83-803b-b753-d669fe860de4.png)


Security settings will be handled separately


![Screen for skipping the security settings during creation and configuring them separately later](./assets/8_39922a0f-7e83-80a7-b5eb-d5d66f805a56.png)


Creating the network


![Network setup screen for creating the VCN and subnet to attach to the instance](./assets/9_39922a0f-7e83-8022-a00e-c41cfd3f8511.png)


Creating and downloading the SSH key

- Download the SSH private key for connecting to the server, along with the public key

![Screen for generating and downloading the SSH key pair used to connect to the server](./assets/10_39922a0f-7e83-80d4-8e2e-c03f64f47e4f.png)


Creating the volume (disk)

- Free up to 200GB
- Created as a boot volume since there's no need to manage the disk separately
- Boot volume + block volume combined are free up to 200GB
- Boot volume: the main disk
- Block volume: an expansion disk

![Screen for specifying the boot volume capacity within the 200GB free limit](./assets/11_39922a0f-7e83-80f8-b602-ed06022271ce.png)


Create after reviewing


![Review screen for checking the configuration right before creation](./assets/12_39922a0f-7e83-8026-8a1d-fc6fd073bc0e.png)


Creating


![Screen showing the instance being provisioned](./assets/13_39922a0f-7e83-8096-82b8-d4d26d3c693e.png)


Creation complete


![Screen for confirming that creation has completed](./assets/14_39922a0f-7e83-809e-a220-c3e4da1c9bc5.png)


Viewing the instance


![Screen for checking the detailed information of the created instance](./assets/15_39922a0f-7e83-8084-bc4a-e238dceadb28.png)


### Connecting to the Internet - Public Network Setup


Instance → Networking → VNIC


![Screen for navigating from instance details to the VNIC settings under Networking](./assets/16_39922a0f-7e83-8046-b637-df411681e5aa.png)


Editing the VNIC's IP


![Screen for editing the public IP attached to the VNIC](./assets/17_39922a0f-7e83-8085-98ab-ced4237b5b2a.png)


Create a reserved IP and attach it


![Screen for creating a reserved public IP and attaching it to the VNIC](./assets/18_39922a0f-7e83-8071-906a-cd2bbb3a9d22.png)


Creation complete


![Screen for confirming that creation has completed](./assets/19_39922a0f-7e83-80bf-9719-d95fd3530508.png)


Quick navigation


![Path for jumping directly from the instance screen to the VCN settings](./assets/20_39922a0f-7e83-80b1-8b6d-e6ddb88534eb.png)


Or navigate via the menu


![Path for navigating to the VCN settings through the console menu](./assets/21_39922a0f-7e83-8077-b36b-feca3cc6e23d.png)


## Security Settings


The security firewall of an Oracle Cloud server is controlled primarily through the VCN's Security List and Network Security Group.


By default, the VCN's Security List has port 22 for remote access open to Any, so follow-up action is required.


### Blocking the Default Any (0.0.0.0/0) Inbound Rule for Port 22 in the VCN


Navigate from the instance to the VCN settings


![Screen for navigating from the instance screen to the Security List of the corresponding VCN](./assets/22_39922a0f-7e83-80f8-8e86-c0a34468835e.png)


Delete the Any-open rule

- Delete ICMP only if necessary

![Screen for deleting the inbound rule open to Any (0.0.0.0/0) in the Security List](./assets/23_39922a0f-7e83-80cf-a851-e0104b75f69e.png)


### Allowing Access


Choose one of the following methods

1. Register your IP in the VCN Security List entry.
2. Register the IP with the instance's VNIC Network Security Group to allow access.
3. Allow temporary access using method 1 or 2, then access through a VPN (Tailscale, OpenVPN, etc.)

### Allowing Access via a VCN Network Security Group


Do this in the corresponding VCN


![Screen for creating a Network Security Group in the VCN screen](./assets/24_39922a0f-7e83-8023-8e15-ea2368a12db7.png)


![Screen for registering the IP and port 22 rule to allow access in the Network Security Group](./assets/25_39922a0f-7e83-8049-b8e1-c5f68ce25858.png)


Navigate to the corresponding instance's Primary VNIC settings


![Screen for navigating to the instance's Primary VNIC settings](./assets/26_39922a0f-7e83-8003-a815-d7739c3286c1.png)


Connect and save


![Screen for attaching the Network Security Group to the Primary VNIC and saving](./assets/27_39922a0f-7e83-80bc-b2f6-c9ec9d2d82d5.png)


## Verifying the Connection


```bash
Welcome to Ubuntu 24.04.4 LTS (GNU/Linux 6.17.0-1011-oracle aarch64)

 * Documentation:  https://help.ubuntu.com
 * Management:     https://landscape.canonical.com
 * Support:        https://ubuntu.com/pro

This system has been minimized by removing packages and content that are
not required on a system that users do not log into.

To restore this content, you can run the 'unminimize' command.

The programs included with the Ubuntu system are free software;
the exact distribution terms for each program are described in the
individual files in /usr/share/doc/*/copyright.

Ubuntu comes with ABSOLUTELY NO WARRANTY, to the extent permitted by
applicable law.

To run a command as administrator (user "root"), use "sudo <command>".
See "man sudo_root" for details.

ubuntu@xxxxx:~$
```


## Wrap-Up


An OCI Always Free A1 instance is a setup that lets you run an ARM server right away within the free limits.


You need to attach a public IP for external access, and the default Any inbound rule for port 22 in the Security List must be cleaned up.


In practice, it's recommended to register allowed IPs in an NSG or to access indirectly through a VPN such as Tailscale.


Keep your SSH key stored safely, and minimizing exposure of port 22 to the public is the basic rule.


Once you've completed these steps, you'll have gone from creating the A1 server to having a secure access path in place.

## References

- [Oracle Cloud Always Free resources (official docs)](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm)
- [Security Lists (official docs)](https://docs.oracle.com/en-us/iaas/Content/Network/Concepts/securitylists.htm)
