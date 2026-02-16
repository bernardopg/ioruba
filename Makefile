.PHONY: build test clean install format lint help run docs all check

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

all: build test lint ## Build, test, and lint

build: ## Build the project
	stack build

test: ## Run tests
	stack test

clean: ## Clean build artifacts
	stack clean

install: ## Install to ~/.local/bin
	stack install

format: ## Format code with Ormolu
	find src -name "*.hs" -exec ormolu -i {} \;
	find app -name "*.hs" -exec ormolu -i {} \;
	find test -name "*.hs" -exec ormolu -i {} \;

lint: ## Run HLint
	stack exec -- hlint src/

run: ## Run the application
	stack run

docs: ## Generate Haddock documentation
	stack haddock --open

check: format lint test ## Format, lint, and test (pre-commit check)
