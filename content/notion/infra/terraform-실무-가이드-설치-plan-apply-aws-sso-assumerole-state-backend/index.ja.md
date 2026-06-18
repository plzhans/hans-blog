---
id: "103"
translationKey: "103"
slug: "103-terraform-practical-guide-aws-sso-assumerole-state-backend"
title: "Terraform 実務ガイド: インストール、plan/apply、AWS SSO·AssumeRole、state backend"
description: "Terraform のインストールから init·plan·apply の基本フローとプロジェクト構成を整理します。AWS の認証情報における SSO と AssumeRole の違い、state 共有のための backend の概念と AWS(S3) の例、最小 IAM 権限と運用のヒントまで一度に確認できます。"
categories:
  - "infra"
tags:
  - "aws"
  - "linux"
  - "mac"
  - "terraform"
date: 2026-06-18T05:50:00.000Z
lastmod: 2026-06-18T06:08:00.000Z
toc: true
draft: false
images:
  - "assets/1_38322a0f-7e83-804b-a963-f4d395ba7a9c.png"
---


![](./assets/1_38322a0f-7e83-804b-a963-f4d395ba7a9c.png)


## 概要


Terraform は HCL でインフラを宣言し、`plan` と `apply` で変更を適用する IaC ツールです。チーム単位の運用では、<strong>リモート状態(remote state)</strong>と<strong>AssumeRole ベースの認証情報</strong>を一緒に構成するパターンが一般的です。


### Terraform とは?

- サーバー、ネットワーク、権限といったインフラをコード(HCL)で宣言し、同じ方法で再現します
- `plan` で変更内容を事前に確認し、`apply` で実際のリソースを作成/修正します
- state ファイルで「現在のインフラ状態」を追跡し、コードと実際のリソースの差分を管理します

> ✅ 推奨されるフローは init → fmt → validate → plan → apply の順です。


---


## インストール


### macOS

- Homebrew の確認: `brew --version`
- Terraform のインストール
    - `brew tap hashicorp/tap`
    - `brew install hashicorp/tap/terraform`
- インストール確認: `terraform version`
- 自動補完(任意): `terraform -install-autocomplete`

### Linux


ディストリビューションのパッケージインストールまたはバイナリインストールのいずれかを選択します。

{{< details summary="Ubuntu / Debian パッケージインストール" >}}
- `sudo apt-get update`
- `sudo apt-get install -y gnupg software-properties-common`
- `wget -O- https://apt.releases.hashicorp.com/gpg | gpg --dearmor | sudo tee /usr/share/keyrings/hashicorp-archive-keyring.gpg >/dev/null`
- `echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list`
- `sudo apt-get update && sudo apt-get install -y terraform`
- インストール確認: `terraform version`
{{< /details >}}

{{< details summary="バイナリインストール" >}}
- [https://developer.hashicorp.com/terraform/downloads](https://developer.hashicorp.com/terraform/downloads) から Linux amd64 または arm64 をダウンロード
- 解凍後、PATH に配置: `sudo install terraform /usr/local/bin/terraform`
- インストール確認: `terraform version`
{{< /details >}}


### Windows

{{< details summary="winget" >}}
- PowerShell を管理者権限で実行
- `winget install Hashicorp.Terraform`
{{< /details >}}

{{< details summary="Chocolatey" >}}
- `choco install terraform`
{{< /details >}}

{{< details summary="手動インストール" >}}
- [https://developer.hashicorp.com/terraform/downloads](https://developer.hashicorp.com/terraform/downloads) から Windows amd64 zip をダウンロード
- terraform.exe を任意のフォルダに配置し、PATH にフォルダを追加
- インストール確認: `terraform version`
{{< /details >}}


---


## 基本的な使用フロー(コマンド基準)


### 1) プロジェクトの初期化

- `terraform init`

provider プラグインと backend 構成を初期化します。


### 2) フォーマット/検証

- `terraform fmt -recursive`
- `terraform validate`

### 3) 変更内容の確認

- `terraform plan -out tfplan`

plan をファイルに保存すると、apply 時に同じ変更のみを適用します。


### 4) 適用

- `terraform apply tfplan`

### 5) 削除(注意)

- `terraform destroy`

本番環境は破壊の範囲が大きいため、モジュール/スタック単位で分離して運用する方が安全です。


### 6) 状態の照会/デバッグ

- `terraform state list`
- `terraform state show <address>`
- `terraform console` (式/locals の確認)

> 🧩 すでに作成済みのリソースを Terraform の管理下に組み入れるには `terraform import` を使用します。


---


## プロジェクト構成の推奨案

- `main.tf` リソース定義
- `variables.tf` 入力変数
- `outputs.tf` 出力
- `versions.tf` provider/terraform バージョンの固定
- `backend.tf` リモート状態 backend(チーム運用時)
- `env/` または `workspaces/` 環境分離(好みの一つの方法で一貫性を保つ)
    - 例) `env/dev`, `env/prod`

---


## 変数と値の注入

- 変数の宣言: `variable "region" { type = string }`
- 値の注入の優先順位は状況ごとに異なり混乱が生じやすいため、チームでは通常、以下の組み合わせが運用しやすいです。
    - `.tfvars` ファイルで環境別の値を管理
    - 機密情報は SSM/Secrets Manager または CI の Secret で注入(コードへのハードコーディング禁止)

例

- `terraform plan -var-file="env/prod/terraform.tfvars"`

---


## AWS 認証情報の設定(AWS Provider)


Terraform AWS provider は AWS SDK 方式で認証情報を読み込みます。運用リスクを減らすには、**profile + AssumeRole** の組み合わせを優先的に検討します。


> 🔎 **AWS SSO と AssumeRole は代替関係ではなく、役割が異なります。**  
> SSO は「人がログインして一時的な認証情報を受け取る方式」であり、AssumeRole は「ある認証情報を基に別の Role 権限へ切り替える方式」です。  
> 実務では通常、**SSO でログイン → (必要に応じて)AssumeRole でデプロイ Role へ切り替え** という組み合わせがよく使われます。


### 方法 A. AWS CLI profile の使用

- profile の作成: `aws configure --profile tf`
- Terraform での使用
    - 環境変数: `export AWS_PROFILE=tf`
    - provider に明示
        - `provider "aws" { profile = "tf" region = "ap-northeast-2" }`

### 方法 B. 環境変数を直接設定

- `export AWS_ACCESS_KEY_ID=...`
- `export AWS_SECRET_ACCESS_KEY=...`
- `export AWS_DEFAULT_REGION=ap-northeast-2`

> ⚠️ 長期 Access Key を開発 PC に固定的に保存する方式は運用リスクが大きいです。可能であれば SSO または AssumeRole を優先的に使用します。


### 方法 C. AWS SSO

- `aws configure sso --profile tf-sso`
- `aws sso login --profile tf-sso`
- `export AWS_PROFILE=tf-sso`

**いつ使うか**

- 人(開発者/運用者)がコンソール/CLI にログインするとき
- 長期 Access Key なしで一時的な認証情報で作業したいとき

**特徴**

- SSO ログイン後、profile に一時的な認証情報が保存/キャッシュされます
- 組織のアカウント/権限体系を IAM User の代わりに SSO で管理する場合に有利です

### 方法 D. AssumeRole 推奨パターン


権限の強いアカウントキーを作らず、デプロイ専用 Role を作成して STS で AssumeRole を使用します。

- `export AWS_PROFILE=source`
- `export AWS_ROLE_ARN=arn:aws:iam::<account-id>:role/terraform-deploy`
- `export AWS_REGION=ap-northeast-2`

**いつ使うか**

- デプロイ専用 Role で権限を「昇格」または「分離」して適用したいとき(特に prod)
- アカウント分離(Dev/Prod、Shared Services)環境で別アカウントの Role へ切り替える必要があるとき

**特徴**

- STS で Role を Assume して<strong>短命の一時的な認証情報</strong>を取得します
- 誰がどの Role でデプロイしたかの追跡が容易になり、権限を狭めやすくなります

> ✅ 実務での推奨: <strong>SSO(profile)でログインした後、Terraform の実行はデプロイ Role(AssumeRole)でのみ行う</strong>と、権限管理と監査がすっきりします。


---


## State 共有のための Backend(リモートストア)


チーム作業では、ローカル state の代わりにリモート backend を置いて state を共有する方式が安全です。backend の選択は使用するインフラ/プラットフォームによって異なります。


### AWS の例: S3 + DynamoDB

- S3: state ファイルの保存
- DynamoDB: state lock(同時実行の防止)

> 📝 DynamoDB は必須ではありません。一人だけで Terraform を実行し、同時に `apply` が走ることがないのであれば、S3 だけでも運用できます。  
> ただし、チーム/CI のように複数の実行主体が混在すると、同時 `apply` で state が壊れる可能性があるため、DynamoDB lock を併用する方式が実務で最も安全です。


backend の例


```hcl
terraform {
  backend "s3" {
    bucket         = "my-tf-state-bucket"
    key            = "prod/app/terraform.tfstate"
    region         = "ap-northeast-2"
    dynamodb_table = "my-tf-lock"
    encrypt        = true
  }
}
```


> 💡 チーム共有が目的であれば、state をローカルに置かず、リモート backend を基本とします。AWS では S3 + DynamoDB の組み合わせが実務で最も一般的な選択です。


---


## 実務でよく使う state 共有方式(代替案)


### 1) Terraform Cloud/Enterprise(推奨: SaaS/組織の標準がある場合)

- backend を Terraform Cloud に置いて state/lock を管理します
- 利点: コラボレーション、state のバージョン管理、ポリシー(OPA/Sentinel)、Run 履歴、変数/シークレット管理が容易です
- 欠点: コストとベンダー依存が生じる可能性があります

### 2) GitOps + 自動実行(Atlantis など)

- PR ベースで `plan` を自動実行し、承認後に `apply` を行います
- state は S3 のようなリモート backend に置き、実行は CI/ボットが担当します
- 利点: 変更履歴と承認フローが明確です
- 注意: 開発 PC からの任意の apply を防ぎ、実行主体を一箇所に統一する方が安全です

### 3) その他の remote backend

- GCP: GCS
- Azure: Azure Blob Storage
- オンプレミス: HTTP backend、S3 互換オブジェクトストレージ(MinIO など)

> ✅ まとめ: チームのコラボレーションでは、まず「リモート state + lock」を固定し、その次に「apply をどこで実行するか(個人 PC vs CI/ボット)」を決める方式が運用しやすいです。


---


## Terraform の実行に必要な IAM 権限(最小権限アプローチ)


必要な権限は作成するリソースの種類によって異なります。以下は AWS を基準に最小権限を設計する際によく使う基準です。


### 共通

- AssumeRole 使用時: `sts:AssumeRole`
- 照会専用権限: 各サービスの Describe/List/Get 系
- タグ使用時
    - `tag:GetResources`
    - `tag:TagResources`
    - `tag:UntagResources`

### リモート状態 S3 権限の例


state バケット一つだけにアクセスを制限します。

- `s3:GetObject`
- `s3:PutObject`
- `s3:DeleteObject`
- `s3:ListBucket`

対象リソースは以下に制限します。

- `arn:aws:s3:::my-tf-state-bucket`
- `arn:aws:s3:::my-tf-state-bucket/*`

### Lock DynamoDB 権限の例

- `dynamodb:GetItem`
- `dynamodb:PutItem`
- `dynamodb:DeleteItem`
- `dynamodb:UpdateItem`
- `dynamodb:DescribeTable`

対象テーブルの ARN に制限します。


### リソース別権限の例


VPC とセキュリティグループを作成する場合

- `ec2:CreateVpc` `ec2:DeleteVpc` `ec2:DescribeVpcs`
- `ec2:CreateSubnet` `ec2:DeleteSubnet` `ec2:DescribeSubnets`
- `ec2:CreateSecurityGroup` `ec2:AuthorizeSecurityGroupIngress` `ec2:DeleteSecurityGroup`

IAM Role とポリシーを扱う場合

- `iam:CreateRole` `iam:DeleteRole`
- `iam:AttachRolePolicy` `iam:DetachRolePolicy`
- `iam:PassRole`

> 🔒 `iam:PassRole` は特に危険です。必要な Role ARN で Resource 制限をかける必要があります。


### 最小権限の設計基準

- デプロイアカウントは AssumeRole ベースで運用します
- state 用の S3 と DynamoDB はリソース単位で制限します
- `iam:PassRole` は対象 Role を可能な限り狭めます
- 実行 Role と人のアカウントを分離します

---


## 運用のヒント(よく見落とすポイント)

- `terraform plan -out tfplan` を習慣化します
- provider/terraform のバージョンを `versions.tf` で固定します
- モジュールはバージョンタグで固定します(レポジトリを直接参照すると変更の影響が大きくなります)
- secrets はコードに入れません
- CI では OIDC ベースの AssumeRole を優先的に検討します
- workspace を使う場合は用途を明確にします(環境分離なのか、一時的な実験なのか)

---


## クイックスタート


### [main.tf](http://main.tf/) の骨組み


```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "ap-northeast-2"
}
```


### 実行

- `terraform init`
- `terraform plan`
- `terraform apply`
