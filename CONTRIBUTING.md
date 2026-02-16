# Contributing to Iaruba

Thank you for your interest in contributing to Iaruba! This document provides guidelines and instructions for contributing.

## Code of Conduct

Be respectful, inclusive, and constructive in all interactions. We're building this project together.

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/bernardopg/iaruba/issues)
2. If not, create a new issue using the **Bug Report** template with:
   - Clear, descriptive title
   - Steps to reproduce
   - Expected vs actual behavior
   - System information (OS, audio system, Arduino hardware)
   - Relevant logs

### Suggesting Features

1. Check [Discussions](https://github.com/bernardopg/iaruba/discussions) for similar ideas
2. Create a new issue using the **Feature Request** template explaining:
   - The problem you're trying to solve
   - Your proposed solution
   - Alternative approaches considered

### Contributing Code

#### Prerequisites

- [Haskell Stack](https://docs.haskellstack.org/) installed
- System dependencies (see [README.md](README.md#prerequisites))
- Familiarity with Haskell and functional programming

#### Development Workflow

1. **Fork and Clone**
   ```bash
   git clone https://github.com/YOUR-USERNAME/iaruba.git
   cd iaruba
   ```

2. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/bug-description
   ```

3. **Make Your Changes**
   - Follow the code style (see below)
   - Write tests for new functionality
   - Update documentation as needed
   - Keep commits focused and atomic

4. **Test Your Changes**
   ```bash
   # Build and run tests
   make build test

   # Run linter
   make lint

   # Format code
   make format
   ```

5. **Commit Your Changes**

   Commit message format (Conventional Commits):
   - `feat:` - New feature
   - `fix:` - Bug fix
   - `docs:` - Documentation changes
   - `refactor:` - Code refactoring
   - `test:` - Test additions/changes
   - `chore:` - Build/tooling changes

   ```bash
   git commit -m "feat: add slider inversion support"
   ```

6. **Push and Create Pull Request**
   ```bash
   git push origin feature/your-feature-name
   ```
   Then create a PR on GitHub with:
   - Clear description of changes
   - Reference to related issues
   - Test results

## Code Style

### Haskell Style

- **Formatting:** Use [Ormolu](https://github.com/tweag/ormolu) (runs automatically in CI)
- **Linting:** Fix all [HLint](https://github.com/ndmitchell/hlint) suggestions
- **Naming:**
  - Functions: `camelCase`
  - Types: `PascalCase`
  - Modules: Match file structure

### Module Structure

```haskell
module Audio.Mixer
  ( -- * Types
    SliderValue(..)
  , Volume(..)
    -- * Functions
  , calculateVolume
  , applyNoiseReduction
  ) where

import Audio.Sink (Sink)
import Config.Types (Config)
```

### Testing

- Write property-based tests (QuickCheck) for pure functions
- Write unit tests (HSpec) for deterministic behavior
- Aim for meaningful test coverage on core logic

```haskell
spec :: Spec
spec = describe "Audio.Mixer" $ do
  it "converts slider values to volumes" $ property $
    \(val :: Int) -> let sv = SliderValue (abs val `mod` 1024)
                         Volume vol = calculateVolume sv
                     in vol >= 0.0 && vol <= 1.0
```

## Adding New Features

### New Audio Target Type

1. Add constructor to `AudioTarget` in `src/Config/Types.hs`
2. Implement application logic in `src/Audio/`
3. Add parser in `src/Config/Parser.hs`
4. Add tests in `test/Audio/`
5. Update `config/example.yaml` with example

### New GUI Component

1. Create module in `src/GUI/`
2. Define widget structure
3. Wire up signals to STM state
4. Integrate in `src/GUI/MainWindow.hs`

## Review Process

1. **Automated Checks:**
   - CI build must pass
   - All tests must pass
   - Code must be formatted (Ormolu)
   - No HLint warnings

2. **Manual Review:**
   - Code quality and style
   - Test coverage
   - Documentation completeness

3. **Approval:**
   - At least one maintainer approval required
   - Address all review comments

## Release Process

(For maintainers)

1. Update version in `package.yaml`
2. Update `CHANGELOG.md`
3. Create git tag: `git tag -a v0.2.0 -m "Version 0.2.0"`
4. Push tag: `git push origin v0.2.0`
5. GitHub Actions automatically builds and creates release

Thank you for contributing to Iaruba!
