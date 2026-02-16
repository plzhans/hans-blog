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

.PHONY: env
env:
ifeq ($(firstword $(RUN_ARGS)),enc)
	gpg --yes -e -o .env.enc .env
else ifeq ($(firstword $(RUN_ARGS)),dec)
	gpg --yes -d -o .env .env.enc
else
	@echo "Usage: make env [enc|dec]"
endif
