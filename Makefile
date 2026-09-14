SHELL := /bin/bash

ifneq (,$(filter env notioncli notion-page-sync notion-database-sync notion-database-sync-draft,$(firstword $(MAKECMDGOALS))))
  RUN_ARGS := $(wordlist 2,$(words $(MAKECMDGOALS)),$(MAKECMDGOALS))
  $(eval $(RUN_ARGS):;@:)
endif

.PHONY: install
install:
	npm install

.PHONY: hugo
hugo:
	hugo -s ./hugo --logLevel debug

.PHONY: notion-database-sync
notion-database-sync:
	@source "$$NVM_DIR/nvm.sh" && nvm use --silent && node src/NotionCli.mjs database sync $(RUN_ARGS)

.PHONY: notion-database-sync-draft
notion-database-sync-draft:
	@source "$$NVM_DIR/nvm.sh" && nvm use --silent && node src/NotionCli.mjs database sync --draft $(RUN_ARGS)

.PHONY: notion-page-sync
notion-page-sync:
	@source "$$NVM_DIR/nvm.sh" && nvm use --silent && node src/NotionCli.mjs page sync $(RUN_ARGS)

.PHONY: translate
translate:
	claude -p "$$(cat prompts/translate-database-sync.md)" --permission-mode acceptEdits

.PHONY: landing
landing:
	hugo -s ./landing
	npx wrangler deploy -c landing/wrangler.jsonc

# develop 랜딩(develop.plzhans.com). 운영과 같은 소스를 다른 baseURL 로 굽는다.
#
# **빌드와 배포를 한 타깃으로 묶는다.** 둘을 따로 두면 "develop 을 굽고 운영을 배포" 하는
# 조합이 언젠가 나온다. -e develop 이 robots.txt Disallow 와 noindex 메타를 켜고 광고를 끄므로,
# 이 플래그를 빠뜨린 채 배포하면 운영과 같은 내용이 색인되고 광고까지 나간다.
.PHONY: landing-develop
landing-develop:
	hugo -s ./landing -e develop -b https://develop.plzhans.com --destination public-develop
	npx wrangler deploy -c landing/wrangler.develop.jsonc

.PHONY: cloudflare-rules
cloudflare-rules:
	./cloudflare/manage-rules.sh

.PHONY: cloudflare-dns
cloudflare-dns:
	./cloudflare/manage-dns.sh

.PHONY: cloudflare-purge
cloudflare-purge:
	./cloudflare/purge-cache.sh

.PHONY: env
env:
ifeq ($(firstword $(RUN_ARGS)),enc)
	gpg --yes -e -o .env.enc .env
else ifeq ($(firstword $(RUN_ARGS)),dec)
	gpg --yes -d -o .env .env.enc
else
	@echo "Usage: make env [enc|dec]"
endif
