# Contributing to Ioruba

Thank you for your interest in contributing to Ioruba! This document provides guidelines and instructions for contributing.

## Code of Conduct

Be respectful, inclusive, and constructive in all interactions. We're building this project together.

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/bernardopg/ioruba/issues)
2. If not, create a new issue with:
   - Clear, descriptive title
   - Steps to reproduce
   - Expected vs actual behavior
   - System information (OS, Haskell version, audio system)
   - Relevant logs from `~/.config/ioruba/logs/`

### Suggesting Features

1. Check [Discussions](https://github.com/bernardopg/ioruba/discussions) for similar ideas
2. Create a new discussion explaining:
   - The problem you're trying to solve
   - Your proposed solution
   - Alternative approaches considered
   - Any implementation ideas

### Contributing Code

#### Prerequisites

- Haskell Stack installed
- System dependencies (see README.md)
- Familiarity with Haskell and functional programming
- Understanding of audio systems (PulseAudio/PipeWire) is helpful

#### Development Workflow

1. **Fork and Clone**
   ```bash
   git clone https://github.com/bernardopg/ioruba.git
   cd ioruba
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
   # Run all tests
   stack test

   # Run linter
   stack exec -- hlint src/

   # Format code
   find src -name "*.hs" -exec ormolu -i {} \;

   # Build and test locally
   stack build
   stack run
   ```

5. **Commit Your Changes**
   ```bash
   git add .
   git commit -m "feat: add slider inversion support"
   ```

   Commit message format:
   - `feat:` - New feature
   - `fix:` - Bug fix
   - `docs:` - Documentation changes
   - `refactor:` - Code refactoring
   - `test:` - Test additions/changes
   - `chore:` - Build/tooling changes

6. **Push and Create Pull Request**
   ```bash
   git push origin feature/your-feature-name
   ```
   Then create a PR on GitHub with:
   - Clear description of changes
   - Reference to related issues
   - Screenshots for UI changes
   - Test results

## Code Style

### Haskell Style

- **Formatting:** Use Ormolu (runs automatically in CI)
- **Linting:** Fix all HLint suggestions
- **Naming:**
  - Functions: `camelCase`
  - Types: `PascalCase`
  - Modules: Match file structure

### Module Structure

```haskell
{-# LANGUAGE OverloadedStrings #-}

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

### Documentation

- Add Haddock comments for all exported functions
- Include examples for non-obvious functions
- Document error cases and edge cases

```haskell
-- | Calculate volume from slider value.
--
-- >>> calculateVolume (SliderValue 512)
-- Volume 0.5
--
-- Slider values range from 0-1023, mapping linearly to 0.0-1.0.
calculateVolume :: SliderValue -> Volume
```

### Testing

- Write property-based tests for pure functions
- Write integration tests for I/O operations
- Aim for >80% code coverage

```haskell
spec :: Spec
spec = describe "Audio.Mixer" $ do
  it "converts slider values to volumes" $ property $
    \(val :: Int) -> let sv = SliderValue (abs val `mod` 1024)
                         Volume vol = calculateVolume sv
                     in vol >= 0.0 && vol <= 1.0
```

## Project Structure

Key directories:
- `src/Audio/` - PulseAudio/PipeWire integration
- `src/GUI/` - GTK interface
- `src/Config/` - Configuration management
- `src/Hardware/` - Serial communication
- `test/` - Test suites
- `docs/` - Documentation

See [CLAUDE.md](CLAUDE.md) for detailed architecture.

## Adding New Features

### New Audio Target Type

1. Add constructor to `AudioTarget` in `src/Config/Types.hs`
2. Implement application logic in `src/Audio/`
3. Add parser in `src/Config/Parser.hs`
4. Add tests in `test/Audio/`
5. Update `config/example.yaml` with example
6. Document in `docs/guides/configuration.md`

### New GUI Component

1. Create module in `src/GUI/`
2. Define widget structure
3. Wire up signals to STM state
4. Integrate in `src/GUI/MainWindow.hs`
5. Add styling in `assets/themes/`
6. Test with different themes

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
   - Architecture fit

3. **Approval:**
   - At least one maintainer approval required
   - Address all review comments
   - Squash commits if requested

## Release Process

(For maintainers)

1. Update version in `package.yaml`
2. Update `CHANGELOG.md`
3. Create git tag: `git tag -a v0.2.0 -m "Version 0.2.0"`
4. Push tag: `git push origin v0.2.0`
5. GitHub Actions automatically builds and creates release

## Getting Help

- **Questions:** [GitHub Discussions](https://github.com/bernardopg/ioruba/discussions)
- **Chat:** Join our Discord (coming soon)
- **Email:** maintainer@ioruba.dev (coming soon)

## Recognition

Contributors are recognized in:
- `README.md` contributors section
- Release notes
- Project website (coming soon)

Thank you for contributing to Ioruba!
