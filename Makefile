.PHONY: help install clean build typecheck dev start

help:
	@echo 'Targets:'
	@echo '  make install     Install npm dependencies'
	@echo '  make dev         Run the game in dev mode (TypeScript)'
	@echo '  make build       Build to ./dist'
	@echo '  make start       Run the built game (JavaScript)'
	@echo '  make typecheck   Type-check without emitting'
	@echo '  make clean       Remove build output'

install:
	npm install

clean:
	rm -rf dist

build:
	$(MAKE) clean
	npm exec -- tsc -p tsconfig.json

typecheck:
	npm exec -- tsc -p tsconfig.json --noEmit

dev:
	npm exec -- tsx src/index.ts

start:
	node dist/index.js
