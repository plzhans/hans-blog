---
id: "103"
translationKey: "103"
slug: "103-terraform-practical-guide-aws-sso-assumerole-state-backend"
title: "Terraform Practical Guide: Installation, plan/apply, AWS SSO·AssumeRole, state backend"
description: "A walkthrough of Terraform installation, the basic init·plan·apply flow, and project structure. Covers the difference between SSO and AssumeRole in AWS credentials, the backend concept for sharing state with an AWS(S3) example, and minimal IAM permissions plus operational tips all in one place."
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


## Overview


Terraform is an IaC tool that declares infrastructure in HCL and applies changes with `plan` and `apply`. In team-scale operations, a common pattern is to configure <strong>remote state</strong> and <strong>AssumeRole-based credentials</strong> together.


### What is Terraform?

- Declares infrastructure such as servers, networks, and permissions as code (HCL) and reproduces it the same way
- Reviews changes in advance with `plan` and creates/modifies actual resources with `apply`
- Tracks the "current infrastructure state" with a state file to manage the difference between code and actual resources

> ✅ The recommended flow is init → fmt → validate → plan → apply.


---


## Installation


### macOS

- Check Homebrew: `brew --version`
- Install Terraform
    - `brew tap hashicorp/tap`
    - `brew install hashicorp/tap/terraform`
- Verify installation: `terraform version`
- Autocomplete (optional): `terraform -install-autocomplete`

### Linux


Choose either distribution package installation or binary installation.

{{< details summary="Ubuntu / Debian package installation" >}}
- `sudo apt-get update`
- `sudo apt-get install -y gnupg software-properties-common`
- `wget -O- https://apt.releases.hashicorp.com/gpg | gpg --dearmor | sudo tee /usr/share/keyrings/hashicorp-archive-keyring.gpg >/dev/null`
- `echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list`
- `sudo apt-get update && sudo apt-get install -y terraform`
- Verify installation: `terraform version`
{{< /details >}}

{{< details summary="Binary installation" >}}
- Download Linux amd64 or arm64 from [https://developer.hashicorp.com/terraform/downloads](https://developer.hashicorp.com/terraform/downloads)
- After extracting, place it in PATH: `sudo install terraform /usr/local/bin/terraform`
- Verify installation: `terraform version`
{{< /details >}}


### Windows

{{< details summary="winget" >}}
- Run PowerShell as administrator
- `winget install Hashicorp.Terraform`
{{< /details >}}

{{< details summary="Chocolatey" >}}
- `choco install terraform`
{{< /details >}}

{{< details summary="Manual installation" >}}
- Download the Windows amd64 zip from [https://developer.hashicorp.com/terraform/downloads](https://developer.hashicorp.com/terraform/downloads)
- Place terraform.exe in the desired folder and add the folder to PATH
- Verify installation: `terraform version`
{{< /details >}}


---


## Basic Usage Flow (by command)


### 1) Initialize the project

- `terraform init`

Initializes the provider plugins and backend configuration.


### 2) Format/Validate

- `terraform fmt -recursive`
- `terraform validate`

### 3) Review changes

- `terraform plan -out tfplan`

Saving the plan to a file applies only the same changes at apply time.


### 4) Apply

- `terraform apply tfplan`

### 5) Destroy (caution)

- `terraform destroy`

Since the scope of destruction in a production environment is large, operating it separated by module/stack is safer.


### 6) State inspection/debugging

- `terraform state list`
- `terraform state show <address>`
- `terraform console` (check expressions/locals)

> 🧩 To bring an already-created resource under Terraform management, use `terraform import`.


---


## Recommended Project Structure

- `main.tf` resource definitions
- `variables.tf` input variables
- `outputs.tf` outputs
- `versions.tf` pin provider/terraform versions
- `backend.tf` remote state backend (for team operations)
- `env/` or `workspaces/` environment separation (keep consistency with one preferred approach)
    - e.g.) `env/dev`, `env/prod`

---


## Variables and Value Injection

- Variable declaration: `variable "region" { type = string }`
- The value injection priority varies by situation and is prone to confusion, so teams usually find the following combination convenient for operations.
    - Manage per-environment values with `.tfvars` files
    - Inject sensitive information via SSM/Secrets Manager or CI Secrets (no hardcoding in code)

Example

- `terraform plan -var-file="env/prod/terraform.tfvars"`

---


## AWS Credential Setup (AWS Provider)


The Terraform AWS provider reads credentials in the AWS SDK way. To reduce operational risk, consider the **profile + AssumeRole** combination first.


> 🔎 **AWS SSO and AssumeRole are not alternatives to each other; they serve different roles.**  
> SSO is "a way for a person to log in and receive temporary credentials," while AssumeRole is "a way to switch to another Role's permissions based on some credentials."  
> In practice, the **SSO login → (if needed) switch to a deployment Role via AssumeRole** combination is commonly used.


### Option A. Using an AWS CLI profile

- Create a profile: `aws configure --profile tf`
- Use it in Terraform
    - Environment variable: `export AWS_PROFILE=tf`
    - Specify it in the provider
        - `provider "aws" { profile = "tf" region = "ap-northeast-2" }`

### Option B. Setting environment variables directly

- `export AWS_ACCESS_KEY_ID=...`
- `export AWS_SECRET_ACCESS_KEY=...`
- `export AWS_DEFAULT_REGION=ap-northeast-2`

> ⚠️ Storing long-lived Access Keys permanently on a development PC carries significant operational risk. Use SSO or AssumeRole first whenever possible.


### Option C. AWS SSO

- `aws configure sso --profile tf-sso`
- `aws sso login --profile tf-sso`
- `export AWS_PROFILE=tf-sso`

**When to use**

- When a person (developer/operator) logs in to the console/CLI
- When you want to work with temporary credentials without long-lived Access Keys

**Characteristics**

- After SSO login, temporary credentials are stored/cached in the profile
- Advantageous when managing the organization's account/permission system via SSO instead of IAM Users

### Option D. Recommended AssumeRole pattern


Instead of creating highly privileged account keys, create a deployment-only Role and use AssumeRole via STS.

- `export AWS_PROFILE=source`
- `export AWS_ROLE_ARN=arn:aws:iam::<account-id>:role/terraform-deploy`
- `export AWS_REGION=ap-northeast-2`

**When to use**

- When you want to "elevate" or "separate" permissions with a deployment-only Role (especially prod)
- When you need to switch to a Role in another account in an account-separated (Dev/Prod, Shared Services) environment

**Characteristics**

- Assume a Role via STS to obtain <strong>short-lived temporary credentials</strong>
- Makes it easier to track who deployed with which Role and easier to narrow permissions

> ✅ Practical recommendation: <strong>Log in with SSO (profile), then run Terraform only with the deployment Role (AssumeRole)</strong> to keep permission management and auditing clean.


---


## Backend for Sharing State (Remote Store)


In team work, it is safer to share state by placing a remote backend instead of local state. The backend choice depends on the infrastructure/platform you use.


### AWS example: S3 + DynamoDB

- S3: stores the state file
- DynamoDB: state lock (prevents concurrent execution)

> 📝 DynamoDB is not mandatory. If you run Terraform alone and there is no chance of concurrent `apply`, you can operate with S3 only.  
> However, when multiple execution actors are mixed, such as a team/CI, concurrent `apply` can corrupt the state, so adding a DynamoDB lock is the safest approach in practice.


Backend example


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


> 💡 For team-sharing purposes, do not keep state locally; make a remote backend the default. On AWS, the S3 + DynamoDB combination is the most common choice in practice.


---


## Commonly Used State Sharing Methods in Practice (Alternatives)


### 1) Terraform Cloud/Enterprise (recommended: when you have a SaaS/organization standard)

- Set the backend to Terraform Cloud and manage state/lock
- Pros: easy collaboration, state version control, policies (OPA/Sentinel), Run history, variable/secret management
- Cons: cost and vendor dependence may arise

### 2) GitOps + automatic execution (Atlantis, etc.)

- Automatically run `plan` on a PR basis and perform `apply` after approval
- Keep state in a remote backend like S3, and let CI/bots handle execution
- Pros: change history and approval flow are clear
- Note: it is safer to prevent ad-hoc applies from development PCs and unify the execution actor in one place

### 3) Other remote backends

- GCP: GCS
- Azure: Azure Blob Storage
- On-premises: HTTP backend, S3-compatible object storage (MinIO, etc.)

> ✅ Summary: For team collaboration, it is convenient to first lock down "remote state + lock," then decide "where to run apply (personal PC vs CI/bot)."


---


## IAM Permissions Required to Run Terraform (Least-Privilege Approach)


The required permissions vary by the type of resources you create. The following are criteria frequently used when designing least-privilege based on AWS.


### Common

- When using AssumeRole: `sts:AssumeRole`
- Read-only permissions: the Describe/List/Get family of each service
- When using tags
    - `tag:GetResources`
    - `tag:TagResources`
    - `tag:UntagResources`

### Remote state S3 permission example


Restrict access to a single state bucket only.

- `s3:GetObject`
- `s3:PutObject`
- `s3:DeleteObject`
- `s3:ListBucket`

Restrict the target resources to the following.

- `arn:aws:s3:::my-tf-state-bucket`
- `arn:aws:s3:::my-tf-state-bucket/*`

### Lock DynamoDB permission example

- `dynamodb:GetItem`
- `dynamodb:PutItem`
- `dynamodb:DeleteItem`
- `dynamodb:UpdateItem`
- `dynamodb:DescribeTable`

Restrict to the target table ARN.


### Per-resource permission example


If you create a VPC and security groups

- `ec2:CreateVpc` `ec2:DeleteVpc` `ec2:DescribeVpcs`
- `ec2:CreateSubnet` `ec2:DeleteSubnet` `ec2:DescribeSubnets`
- `ec2:CreateSecurityGroup` `ec2:AuthorizeSecurityGroupIngress` `ec2:DeleteSecurityGroup`

If you handle IAM Roles and policies

- `iam:CreateRole` `iam:DeleteRole`
- `iam:AttachRolePolicy` `iam:DetachRolePolicy`
- `iam:PassRole`

> 🔒 `iam:PassRole` is particularly dangerous. You must apply a Resource restriction to the required Role ARN.


### Least-Privilege Design Criteria

- Operate the deployment account on an AssumeRole basis
- Restrict the S3 and DynamoDB for state at the resource level
- Narrow the target Role for `iam:PassRole` as much as possible
- Separate the execution Role from the human account

---


## Operational Tips (Frequently Missed Points)

- Make `terraform plan -out tfplan` a habit
- Pin the provider/terraform versions with `versions.tf`
- Pin modules with version tags (referencing the repo directly amplifies the impact of changes)
- Do not put secrets in code
- In CI, consider OIDC-based AssumeRole first
- If you use workspaces, make their purpose clear (environment separation, or temporary experiments)

---


## Quick Start


### [main.tf](http://main.tf/) skeleton


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


### Run

- `terraform init`
- `terraform plan`
- `terraform apply`
