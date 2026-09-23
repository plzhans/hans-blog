---
id: "134"
translationKey: "134"
slug: "134-garage-docker-install-s3-object-storage"
title: "Installing and Configuring Garage - S3-Compatible Object Storage with Docker"
description: "From missing field s3_region to a signature region mismatch. Bring Garage up with Docker Compose and put an object in a bucket."
categories:
  - "infra"
tags:
  - "docker"
  - "garage"
  - "infra"
  - "s3"
date: 2026-09-23T10:56:00.000Z
lastmod: 2026-09-23T10:56:00.000Z
toc: true
draft: false
images:
  - "assets/1_3e422a0f-7e83-816a-8dd3-fc8f62a53a59.jpg"
---


![The same S3 API request from the aws CLI, pointed at Garage instead of AWS by changing only the endpoint](./assets/1_3e422a0f-7e83-816a-8dd3-fc8f62a53a59.jpg)


## Overview


Use AWS S3 long enough and the thought arrives. A handful of files cost money every month, and the data sits inside someone else's account. There is a NAS at home doing nothing. Could it host something to replace S3?


Garage fills that spot. It is an S3-compatible object store written in Rust, and it ships as a single binary in a 25MB Docker image. It was built for tying together nodes scattered across regions, but it runs perfectly well on a single node.


Approach it with S3 habits, though, and a few things block you. It will not even start without a config file, there is one more thing to do before you can create a bucket, and enabling public reads works in a completely different way. This post walks through those spots one at a time, from starting the container to putting an object in and taking it back out.


### What is Garage


It is an S3-compatible object store built by Deuxfleurs, a French non-profit hosting collective. The project describes itself as "an S3 object store so reliable you can run it outside datacenters," and its design intent sits in that one line. It was built for tying together servers in homes and offices, machines with no dedicated backbone and slow links.


Three traits stand out. It runs as a single binary with no external database. Each node is assigned a zone so replicas are spread geographically. And it implements the S3 API, so existing SDKs and tools attach to it unchanged.


It is written in Rust and licensed under AGPL-3.0.

- Main repository: [git.deuxfleurs.fr/Deuxfleurs/garage](https://git.deuxfleurs.fr/Deuxfleurs/garage)
- GitHub mirror: [deuxfleurs-org/garage](https://github.com/deuxfleurs-org/garage)

### What this post covers

- Running Garage v2.4.1 with Docker Compose
- Which `garage.toml` entries are required and which can be omitted
- Moving secrets into `.env`
- Assigning a layout, the step that comes before buckets
- Creating buckets and access keys, and granting permissions
- Uploading and downloading objects with the `aws` CLI

Everything here happens in a terminal, CLI only. The web console, domains, HTTPS, and static website hosting each deserve their own post, so they are left for the ones that follow.


### Three ways Garage differs from S3


Knowing these before you type anything saves confusion later. Garage speaks the S3 API, but its internal model is different. Three points make that visible.


**There are no ACLs or bucket policies.** `PutBucketAcl`, `PutBucketPolicy`, and `PutObjectAcl` are all unimplemented. The official documentation puts it this way.

> Garage implements none of them, and has its own system instead, built around a per-access-key-per-bucket logic.

Permissions exist only per access key. So "make this one object public" or "make everything under `public/` public" is simply not available. Splitting public from private means splitting buckets.


**A node needs a role before the cluster comes alive.** With S3 you create a bucket and you are done. Garage makes you declare how much capacity a node holds and which zone it sits in. That declaration is called the layout, and until it exists you cannot even create a bucket.


**It does not provide TLS.** The config structs have no certificate fields at all. All three endpoints serve plain HTTP. HTTPS is handled by a reverse proxy in front, or by a tunnel.


## Installation


Docker and Docker Compose need to be installed already. That is covered in the post below.

- [Installing Docker and Docker Compose on Amazon Linux 2023 ARM64 EC2](../97-amazon-linux-2023-arm64-ec2-docker-docker-compose-install/)

### The docker-compose setup


The config files used here are in the repository as-is. [sample/docker/garage](https://github.com/plzhans/hans-blog/tree/master/sample/docker/garage)


```yaml
# docker-compose.yml
services:
  garage:
    image: dxflrs/garage:v2.4.1
    container_name: garage
    restart: unless-stopped
    ports:
      - "3900:3900"     # S3 API, signed requests only
    # - "3901:3901"     # RPC, only needed to join other nodes
    # - "3902:3902"     # static website hosting, public read
    # - "3903:3903"     # admin API
    env_file:
      - .env
    volumes:
      - ./garage.toml:/etc/garage.toml:ro
      - ./meta:/var/lib/garage/meta
      - ./data:/var/lib/garage/data
```


### The required config file


Garage will not start without its config file.


The image does not ship one, so you have to mount it yourself.


```toml
# garage.toml

# required, no defaults
metadata_dir = "/var/lib/garage/meta"
data_dir     = "/var/lib/garage/data"

# 1 for single node, 3 is the recommended cluster setting
replication_factor = 1

rpc_bind_addr = "[::]:3901"

# db_engine   = "lmdb"              # default since v0.9
# rpc_public_addr = "127.0.0.1:3901"  # advertised to other nodes, multi-node only
# rpc_secret is injected as GARAGE_RPC_SECRET

[s3_api]
api_bind_addr = "[::]:3900"
s3_region     = "garage"          # required, no default
# root_domain = ".s3.garage.localhost"   # enables vhost-style, path-style works without it

[admin]
api_bind_addr = "[::]:3903"
# admin_token is injected as GARAGE_ADMIN_TOKEN

# whole section optional, root_domain required once it exists
# [s3_web]
# bind_addr   = "[::]:3902"
# root_domain = ".web.garage.localhost"
# index       = "index.html"
```


Set `replication_factor` to `1` for a single node. There is no default, so leaving it out stops startup with `The option replication_factor is required.`


Set it to the recommended 3 and every write is refused until three nodes have joined.


Omitting `root_domain` under `[s3_api]` does not give you a default domain. It **turns vhost-style requests off entirely.**


With a domain configured, the bucket becomes a subdomain in front of that domain. Without one, the bucket goes into the path after the existing host.


ex) domain → `mybucket.s3.plzhans.com`


ex) no domain → `http://192.168.0.10:3900/mybucket`


The two secrets go into `.env` rather than into `garage.toml`. Both values are generated with openssl.


```plain text
# openssl rand -hex 32
GARAGE_RPC_SECRET=

# openssl rand -base64 32
GARAGE_ADMIN_TOKEN=
```


meta and data are needed at startup, so create them ahead of time.


```bash
mkdir data meta
```


### Starting it


```bash
docker compose up -d
docker compose logs -f
```


## Initial setup - layout, bucket, and access key


From here on we build the layout and create the bucket and key from the CLI. To do the same work in a browser, see the post below.

- [Installing garage-webui - Manage Garage Clusters and Buckets from a Browser](../135-garage-webui-install-docker-compose/)

### Checking status


```bash
docker compose exec garage /garage status
```


Zone is empty.


```plain text
2026-09-23T09:33:06.972398Z  INFO garage_net::netapp: Connected to 127.0.0.1:3901, negotiating handshake...
2026-09-23T09:33:07.014538Z  INFO garage_net::netapp: Connection established to 6409899f54d1d72f
==== HEALTHY NODES ====
ID                Hostname      Address          Tags  Zone  Capacity          DataAvail  Version
6409899f54d1d72f  ee6cfc6c37ff  172.26.0.2:3901              NO ROLE ASSIGNED             v2.4.1
```


### Assigning a layout - zone and capacity


```bash
# docker compose exec garage /garage layout assign -z {zone name} -c <disk size> <node_id>
docker compose exec garage /garage layout assign -z dc1 -c 1024G 6409899f54d1d72f
```


Staged, not yet applied.


```plain text
2026-09-23T09:33:57.157611Z  INFO garage_net::netapp: Connected to 127.0.0.1:3901, negotiating handshake...
2026-09-23T09:33:57.199700Z  INFO garage_net::netapp: Connection established to 6409899f54d1d72f
Role changes are staged but not yet committed.
Use `garage layout show` to view staged role changes,
and `garage layout apply` to enact staged changes.
```


Apply it.


```bash
docker compose exec garage /garage layout apply --version 1
```


```plain text
2026-09-23T09:36:41.403866Z  INFO garage_net::netapp: Connected to 127.0.0.1:3901, negotiating handshake...
2026-09-23T09:36:41.445720Z  INFO garage_net::netapp: Connection established to 6409899f54d1d72f
==== COMPUTATION OF A NEW PARTITION ASSIGNATION ====

Partitions are replicated 1 times on at least 1 distinct zones.

Optimal partition size:                     3.7 GiB
Usable capacity / total cluster capacity:   953.7 GiB / 953.7 GiB (100.0 %)
Effective capacity (replication factor 1):  953.7 GiB

dc1                 Tags  Partitions        Capacity   Usable capacity
  6409899f54d1d72f  []    256 (256 new)     953.7 GiB  953.7 GiB (100.0%)
  TOTAL                   256 (256 unique)  953.7 GiB  953.7 GiB (100.0%)


New cluster layout with updated role assignment has been applied in cluster.
Data will now be moved around between nodes accordingly.
```


Done. Check the state again.


```bash
docker compose exec garage /garage layout show
```


### Creating a bucket


```bash
docker compose exec garage /garage bucket create mybucket
```


Created.


```plain text
2026-09-23T09:38:56.805982Z  INFO garage_net::netapp: Connected to 127.0.0.1:3901, negotiating handshake...
2026-09-23T09:38:56.847685Z  INFO garage_net::netapp: Connection established to 6409899f54d1d72f
==== BUCKET INFORMATION ====
Bucket:          9db3bec13c42ac19396bac4cac65fa3e02d7d3f13aa900039194570362d766a1
Created:         2026-09-23 09:38:56.848 +00:00

Size:            0 B (0 B)
Objects:         0

Website access:  false

Global alias:    mybucket

==== KEYS FOR THIS BUCKET ====
Permissions  Access key    Local aliases
```


### Creating an access key


```bash
docker compose exec garage /garage key create my-app-key
```


Created.


```plain text
2026-09-23T09:40:14.566030Z  INFO garage_net::netapp: Connected to 127.0.0.1:3901, negotiating handshake...
2026-09-23T09:40:14.607746Z  INFO garage_net::netapp: Connection established to 6409899f54d1d72f
==== ACCESS KEY INFORMATION ====
Key ID:              GK05...
Key name:            my-app-key
Secret key:          5f98a...
Created:             2026-09-23 09:40:14.608 +00:00
Validity:            valid
Expiration:          never

Can create buckets:  false

==== BUCKETS FOR THIS KEY ====
Permissions  ID  Global aliases  Local aliases
```


Granting the key access to the bucket


```bash
docker compose exec garage /garage bucket allow --read --write mybucket --key my-app-key
```


Registered.


```plain text
2026-09-23T09:41:35.840001Z  INFO garage_net::netapp: Connected to 127.0.0.1:3901, negotiating handshake...
2026-09-23T09:41:35.882581Z  INFO garage_net::netapp: Connection established to 6409899f54d1d72f
==== BUCKET INFORMATION ====
Bucket:          9db3bec13c42ac19396bac4cac65fa3e02d7d3f13aa900039194570362d766a1
Created:         2026-09-23 09:38:56.848 +00:00

Size:            0 B (0 B)
Objects:         0

Website access:  false

Global alias:    mybucket

==== KEYS FOR THIS BUCKET ====
Permissions  Access key                              Local aliases
RW           GK05...                      my-app-key
```


## Testing the API


Now put a real object in with the `aws` CLI. Reaching Garage from another machine is the natural case, so the endpoint is given as an address. The `192.168.0.10` below is an example; replace it with the address of the machine running Garage.


```bash
export AWS_ACCESS_KEY_ID=GK...
export AWS_SECRET_ACCESS_KEY=...
export AWS_REGION=garage
export AWS_EC2_METADATA_DISABLED=true
```


Turning on `AWS_EC2_METADATA_DISABLED` is worth it. Without it the CLI sometimes stalls briefly looking for the EC2 metadata service.


### The region has to match or the signature fails


Leave `AWS_REGION` out, or set it to something else, and you get this.


```javascript
An error occurred (AuthorizationHeaderMalformed) when calling the ListBuckets operation:
Authorization header malformed, unexpected scope: '20260923/us-east-1/s3/aws4_request',
expected: '20260923/garage/s3/aws4_request'
```


The connection went through; the signature is what got rejected. Helpfully the error prints the scope it expected, so match it to `s3_region` in `garage.toml`.


### Putting objects in and taking them out


Once the region matches, the listing comes back.


```bash
aws --endpoint-url http://192.168.0.10:3900 s3 ls
```


```javascript
2026-09-23 18:38:56 mybucket
```


Upload a file.


```bash
echo "hello garage" > hello.txt
aws --endpoint-url http://192.168.0.10:3900 s3 cp hello.txt s3://mybucket/test/hello.txt
```


```javascript
upload: ./hello.txt to s3://mybucket/test/hello.txt
```


Check it.


```bash
aws --endpoint-url http://192.168.0.10:3900 s3api head-object \
  --bucket mybucket --key test/hello.txt
```


```json
{
    "AcceptRanges": "bytes",
    "LastModified": "2026-09-23T09:45:12+00:00",
    "ContentLength": 13,
    "ETag": "\"d719760daa49cdebc41dfdd40474cb37\"",
    "ContentType": "text/plain",
    "Metadata": {}
}
```


`ContentType` is a value the CLI inferred from the file extension and sent along. `ETag` is the MD5 of the content, which holds for a single-part upload; multipart uploads compute it differently.


Download it and compare against the original to confirm the round trip is intact.


```bash
aws --endpoint-url http://192.168.0.10:3900 s3 cp s3://mybucket/test/hello.txt roundtrip.txt
diff hello.txt roundtrip.txt
```


## Bucket addressing - path-style and vhost-style


### path-style is the default here


There is a reason the commands above worked without any extra configuration. Because `root_domain` was omitted, Garage ignores the Host header and finds the bucket in the path.


```javascript
http://192.168.0.10:3900/mybucket/test/hello.txt
                         ^^^^^^^^ bucket
```


### Switching to vhost-style


As AWS has pushed path-style toward legacy status, modern SDKs default to vhost-style, which puts the bucket in the hostname.


```bash
# garage.toml

# ...

[s3_api]
# ...
root_domain = ".s3.plzhans.com"
```


The config file is read only at startup, so a restart is enough.


```bash
docker compose restart garage
```


The resulting path. `mybucket.s3.plzhans.com` has to resolve to the Garage host, which means a wildcard DNS record.


```bash
http://mybucket.s3.plzhans.com:3900/test/hello.txt
       ^^^^^^^^ bucket
```


---


## Command reference


**Status**


```bash
docker compose exec garage /garage status
docker compose exec garage /garage stats
docker compose exec garage /garage health
```


**Layout**


```bash
docker compose exec garage /garage layout show
docker compose exec garage /garage layout assign -z dc1 -c 500G <node_id>
docker compose exec garage /garage layout apply --version 1
docker compose exec garage /garage layout revert
```


**Keys**


```bash
docker compose exec garage /garage key create my-app-key
docker compose exec garage /garage key list
docker compose exec garage /garage key info my-app-key
docker compose exec garage /garage key delete my-app-key
```


**Buckets**


```bash
docker compose exec garage /garage bucket create mybucket
docker compose exec garage /garage bucket list
docker compose exec garage /garage bucket info mybucket
docker compose exec garage /garage bucket allow --read --write mybucket --key my-app-key
docker compose exec garage /garage bucket deny --write mybucket --key my-app-key
docker compose exec garage /garage bucket website --allow mybucket
docker compose exec garage /garage bucket alias mybucket s3.plzhans.com
docker compose exec garage /garage bucket delete mybucket
```


---


## FAQ


### s3_region is not an AWS region


Reading `s3_region` invites the question "which region should I create this in?" That is not what it is.


In AWS a region plays three roles at once. Where the data physically sits, the endpoint address, and the SigV4 signing scope. Garage has no concept of a region. There is one cluster and that is all. But imitating the S3 protocol requires a region string inside the signature. `s3_region` is that declaration, a shell of the three roles with only the signing scope left. Whatever the value is, no data moves.


In Garage, physical placement is decided by the zone in the layout.


### Leaving s3_region out causes an error


```javascript
garage | Error: TOML decode error: TOML parse error at line 14, column 1
garage |    |
garage | 14 | [s3_api]
garage |    | ^^^^^^^^
garage | missing field `s3_region`
```


The error points at the `[s3_api]` line, which makes it easy to assume the section itself is wrong. In fact a single field inside it is missing. The configuration docs list `"garage"` as the default for `s3_region`, but that means it is the conventional value, not that omitting it fills anything in. In the source it is declared as `pub s3_region: String` with no default.


Trust a value labelled "default" in the docs and delete it and this is what happens. `metadata_dir`, `data_dir`, `rpc_bind_addr`, `replication_factor`, and `s3_region` all have to be filled in.


---


## Wrapping up


Garage speaks the S3 API, but it is not S3.


Know these three going in and the rest goes smoothly.

- A node needs a role before you can create a bucket
- Permissions exist only per access key.
- It will not even start without a config file.

One binary, one config file, five required entries. Fifteen lines of Docker Compose gets you S3-compatible storage and the `aws` CLI attaches to it as-is.


That is the floor. To actually use it you need a domain and HTTPS, and since Garage does no TLS itself, something has to sit in front.


Serving public files on the web is also handled by a separate endpoint rather than the S3 API.


### References

- [Garage documentation](https://garagehq.deuxfleurs.fr/documentation/quick-start/)
- [Garage configuration reference](https://garagehq.deuxfleurs.fr/documentation/reference-manual/configuration/)
- [Garage S3 compatibility list](https://garagehq.deuxfleurs.fr/documentation/reference-manual/s3-compatibility/)
- [dxflrs/garage on Docker Hub](https://hub.docker.com/r/dxflrs/garage)
- [Config files from this post - sample/docker/garage](https://github.com/plzhans/hans-blog/tree/master/sample/docker/garage)
