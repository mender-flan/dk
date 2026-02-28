.PHONY: help setup install clean build typecheck dev start

help:
	@echo 'Targets:'
	@echo '  make setup       Install deps and build'
	@echo '  make install     Install npm dependencies'
	@echo '  make dev         Run the game in dev mode (TypeScript)'
	@echo '  make build       Build to ./dist'
	@echo '  make start       Run the built game (JavaScript)'
	@echo '  make typecheck   Type-check without emitting'
	@echo '  make clean       Remove build output'

setup:
	npm run setup

install:
	npm install

clean:
	npm run clean

build:
	npm run build

typecheck:
	npm run typecheck

dev:
	npm run dev

start:
	npm run start
