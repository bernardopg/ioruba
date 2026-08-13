# Contributing to Ioruba

Thanks for contributing code, firmware, documentation, translations, tests, or hardware support.

## Before you start

- Search existing [issues](https://github.com/bernardopg/ioruba/issues) and the [roadmap](docs/roadmap.md).
- Keep changes focused; discuss large architecture or product changes before implementing them.
- Do not commit secrets, generated coverage/build output, local tool state, or release credentials.
- Preserve the active stack; retired legacy build surfaces must not be reintroduced.

## Repository areas

| Area | Path | Notes |
| --- | --- | --- |
| Desktop UI | `apps/desktop/src` | React, Zustand, serial runtime, profiles, telemetry, and desktop UX. |
| Rust shell | `apps/desktop/src-tauri` | Tauri commands, persistence, watch logging, platform audio, tray, and updater. |
| Shared domain | `packages/shared` | Types, defaults, protocol, validation, presets, and runtime math. |
| Firmware | `firmware/arduino/ioruba-controller` | Parametric Arduino sketch and host parser tests. |
| Documentation | `README.md`, root manuals, `docs/` | Canonical Markdown and PT-BR mirrors. |
| Docs theme | `docs-site/` | GitHub Pages layouts/navigation/styles, not canonical guide content. |

Protocol and knob-to-value behavior belong in `packages/shared`; components should use typed wrappers from `apps/desktop/src/lib/backend.ts` rather than calling Tauri `invoke` directly.

## Local setup

Prerequisites are listed in the [README](README.md#development-setup). Install dependencies from the repository root:

```bash
npm install
```

Run the standard gate:

```bash
npm run verify
npm run firmware:compile
```

For the full native shell:

```bash
npm run desktop:watch
```

## Make and validate changes

Use the narrowest relevant checks while iterating, then run the complete required gate.

| Change | Minimum validation |
| --- | --- |
| Shared TypeScript | `npm run shared:typecheck && npm run shared:test` |
| Desktop frontend | `npm run desktop:typecheck && npm run desktop:test && npm run desktop:build` |
| Rust/Tauri | `cargo fmt --check --manifest-path apps/desktop/src-tauri/Cargo.toml`, clippy, `npm run rust:test`, and `npm run desktop:tauri:build` |
| Firmware | `npm run firmware:test && npm run firmware:test:wide && npm run firmware:compile:matrix` |
| Installer/scripts | `npm run lint:scripts && npm run test:installer` |
| Packaging/updater | `npm run test:packaging` |
| Documentation | link/fact review plus `npm run docs:prepare-site` |
| Release preparation | `npm run release:check` |

See [TESTING.md](TESTING.md) for exact commands and the CI matrix.

## Development conventions

- Add or update tests alongside behavior changes.
- Keep Rust ↔ TypeScript audio shapes synchronized; see the [audio backend contract](docs/guides/audio-backend-contract.md).
- Preserve explicit unsupported outcomes on platforms without a target implementation.
- Keep persisted-state additions backward compatible and update normalization in `packages/shared/src/validation.ts`.
- When changing protocol behavior, document compatibility and update firmware/shared tests together.
- Do not hand-edit generated package checksums or updater manifests.
- If changing the app icon source, regenerate assets with `npm run desktop:icons`.
- Follow the instrument-panel/studio-lab direction in `.impeccable.md`; keep connection and diagnostic state obvious.
- Maintain keyboard and screen-reader behavior and extend accessibility tests for new UI surfaces.

## Documentation and translations

When behavior, commands, paths, defaults, platform coverage, or release operations change:

1. update the canonical English document;
2. update the PT-BR mirror when one exists under `docs/translations/pt-br/`;
3. update `docs/index.md` or site navigation if a document is added/moved;
4. run `npm run docs:prepare-site`;
5. verify examples against current code—especially firmware version, 115200 baud, profile shape, and platform support.

`docs-site/` contains the site shell. Generated `.site-src/` content must not become the source of truth.

## Pull requests

A good pull request:

- explains the problem and why the chosen solution fits;
- links the issue/spec when applicable;
- lists user-visible and compatibility effects;
- includes tests or explains why none are needed;
- includes screenshots/video for meaningful UI changes;
- updates docs and translations;
- keeps unrelated formatting/refactors out of the diff.

Before requesting review, confirm:

- `npm run verify` passes;
- `npm run desktop:tauri:build` passes for native-shell changes;
- relevant firmware checks pass for firmware/protocol changes;
- relevant script/packaging checks pass;
- docs generation succeeds;
- no secrets or generated local artifacts are included.

## Reporting bugs

Use the [support playbook](docs/debug/support.md) to collect useful context. Include OS/version, Ioruba version, board, firmware handshake, serial port/baud, relevant profile excerpt, Watch export, reproduction steps, and expected/actual behavior. Redact personal paths or device information before posting logs.

By contributing, you agree that your contribution is licensed under the project's [MIT License](LICENSE).
