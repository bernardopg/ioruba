# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Security policy (SECURITY.md)
- Dependabot configuration for GitHub Actions
- GitHub issue templates (bug report, feature request)
- Pull request template
- CODEOWNERS file
- Comprehensive test suite (Audio.Mixer, Hardware.Protocol, Config.Validation)
- Improved CI pipeline with dedicated lint and formatting jobs
- Concurrency control for CI workflows

### Changed
- Updated GitHub Actions to use dedicated HLint and Ormolu actions
- Updated release workflow to use softprops/action-gh-release@v2
- Improved cache keys to include package.yaml hash
- Fixed all placeholder values in package metadata

### Fixed
- Fixed placeholder GitHub URLs throughout documentation
- Fixed package.yaml author, maintainer, and github fields
- Fixed incomplete exposed-modules list in package.yaml
- Fixed release workflow changelog generation for first release

## [0.1.0] - 2025-12-22

### Added
- Initial release
- Core audio mixer functionality with pure functional architecture
- Hardware slider support via Arduino (USB serial communication)
- Arduino firmware for 5-slider mixer and 3-knob Nano variant
- Linux audio support (PulseAudio/PipeWire via libpulse)
- YAML-based configuration system with validation
- Audio profile management
- GTK+ 3 GUI framework with dark/light themes
- Serial port diagnostic tool (test-serial)
- Arduino simulator script for testing without hardware
- GitHub Actions CI/CD pipeline
- Comprehensive documentation (README, CONTRIBUTING, hardware guides)

[Unreleased]: https://github.com/bernardopg/iaruba/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/bernardopg/iaruba/releases/tag/v0.1.0
