# Ioruba Project Summary

## Positioning

Ioruba has moved from an Arduino mixer experiment into a Linux-native audio product with a cleaner distribution story, stronger public-facing assets, and a Haskell-first runtime direction.

The project now sits at the intersection of:

- hardware control for Linux audio workflows
- product-minded engineering for makers, streamers, and power users
- polished open source presentation across code, releases, Pages, and funding

## Current product story

### What the project is

- A hardware-driven audio controller centered on an Arduino Nano and a 3-knob mixer workflow
- A Haskell codebase that now builds and runs a real runtime against a Nano-backed hardware path
- A repository with a product surface that includes GitHub Pages, funding support, and automated release tooling

### What the project is not

- A throwaway demo with only wiring notes
- A repo that relies on manual GitHub setup to feel complete
- A project whose public identity stops at a README

## Public surface and automation

The repository automation and marketing surface now includes:

- GitHub Actions CI focused on Haskell quality checks and site smoke tests
- Release Please for automated release PRs and tagging
- Release artifact builds for published releases
- GitHub Pages deployment generated from YAML-driven project metadata
- Native GitHub Sponsors plus Buy Me a Coffee support
- A dedicated funding page with QR-based support
- A metadata sync path so repo topics, homepage, and description stay consistent with the site copy

## Brand and owner context

- Project owner: Bernardo Gomes
- Company / brand: BeBitter & BeBetter
- Website: https://bebitterbebetter.com.br/
- GitHub: https://github.com/bernardopg
- LinkedIn: https://www.linkedin.com/in/bernardopg/
- X / Twitter: https://x.com/cooldeflecha

## Strategic direction

### Near term

- harden the Haskell runtime as the default path for real users
- make release artifacts reflect the actual shipped runtime
- keep product presentation and documentation aligned with what actually works

### Mid term

- ship release assets automatically on version tags
- use GitHub Pages as the product-facing landing surface
- make funding and sponsorship visible without cluttering the codebase

### Long term

- retire the legacy runtime once the Haskell implementation covers the real user workflow
- distribute Ioruba as a polished Linux-first tool rather than just a development repo

## Repository health notes

- `GITHUB_SETUP.md` was obsolete once the repo already existed and had active automation
- the old project summary had outdated paths, counts, and setup assumptions
- Pages, funding, and release metadata now form part of the product story rather than afterthoughts
- repository metadata, homepage, and Pages configuration now point to the new public-facing surface
- the runtime path is now strong enough to be the main narrative of the repository instead of a side scaffold

## Recommended message for the project

Ioruba is a Linux-native hardware audio controller project being rebuilt around a distributable Haskell runtime, modern release automation, and a stronger product-facing surface for makers and creators who care about tactile control and polished execution.
