.PHONY: build test clean install format lint help

help:
	@echo "Ioruba - Makefile targets:"
	@echo "  build      - Build the project"
	@echo "  test       - Run tests"
	@echo "  clean      - Clean build artifacts"
	@echo "  install    - Install to ~/.local/bin"
	@echo "  format     - Format code with Ormolu"
	@echo "  lint       - Run HLint"
	@echo "  run        - Run the application"

build:
	stack build

test:
	stack test

clean:
	stack clean

install:
	stack install

format:
	find src -name "*.hs" -exec ormolu -i {} \;
	find app -name "*.hs" -exec ormolu -i {} \;
	find test -name "*.hs" -exec ormolu -i {} \;

lint:
	stack exec -- hlint src/

run:
	stack run

docs:
	stack haddock --open
