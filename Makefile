.PHONY: help setup install clean build typecheck dev start

ENTRY_TS := src/index.ts
ENTRY_JS := dist/index.js
DIST_DIR := dist

help:
	@echo 'Targets:'
	@echo '  make setup       Install deps and build'
	@echo '  make install     Install npm dependencies'
	@echo '  make dev         Run the game in dev mode (TypeScript)'
	@echo '  make build       Build to ./dist'
	@echo '  make start       Run the built game (JavaScript)'
	@echo '  make typecheck   Type-check without emitting'
	@echo '  make clean       Remove build output'

setup: install build

install:
	npm install

clean:
	rm -rf $(DIST_DIR)

build: clean
	npm exec -- tsc -p tsconfig.json

typecheck:
	npm exec -- tsc -p tsconfig.json --noEmit

dev:
	npm exec -- tsx $(ENTRY_TS)

start:
	node $(ENTRY_JS)
