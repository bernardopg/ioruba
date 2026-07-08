# Contrato do backend de audio (Rust ↔ TypeScript)

Este guia documenta o contrato entre o frontend desktop e os backends de audio
em Rust: os comandos Tauri, os formatos serializados dos dois lados e como
funciona o dispatch por plataforma em `apps/desktop/src-tauri/src/audio/mod.rs`.

## Comandos

Tres comandos Tauri formam toda a superficie de audio. Os wrappers tipados de
TypeScript vivem em `apps/desktop/src/lib/backend.ts`; nunca chame `invoke`
diretamente de componentes.

| Comando | Wrapper TS | Request | Response |
| --- | --- | --- | --- |
| `list_audio_inventory` | `listAudioInventory()` | — | `AudioInventory` |
| `apply_slider_targets_batch` | `applySliderTargetsBatch(profile, updates)` | `ApplySliderTargetsRequest` | `ApplySliderTargetsResponse` (`outcomes` por id de slider) |
| `dispatch_control_action` | `dispatchControlAction(action)` | `ControlAction` | `ControlActionOutcome` |

`applySliderTargetsBatch` converte valores brutos do knob para `0.0..=1.0`
normalizado (`sliderToAppliedNormalized`, ciente da resolucao do ADC) antes de
cruzar a fronteira — o lado Rust nunca ve valores brutos de ADC.

## Convencoes de serializacao

Todos os tipos sao definidos uma vez em Rust (`audio/mod.rs`) e espelhados
manualmente em `apps/desktop/src/lib/backend.ts` / pacote shared. Duas regras
de serde mantem o alinhamento:

- **Campos de struct**: `#[serde(rename_all = "camelCase")]` — `slider_id` em
  Rust vira `sliderId` em TS.
- **Enums**: `#[serde(rename_all = "lowercase")]` — unions de string em TS
  (`"updated" | "idle" | ...`). `AudioTarget` usa adicionalmente
  `#[serde(tag = "kind")]`, entao cruza a fronteira como
  `{ "kind": "application", "name": "spotify" }` e `{ "kind": "master" }`.

Ao mudar um tipo em `audio/mod.rs`, atualize o espelho TS no mesmo PR;
`npm run desktop:typecheck` so pega divergencia onde o lado TS consome o campo
alterado.

## Dispatch por plataforma (`audio/mod.rs`)

`mod.rs` e dono de todos os tipos compartilhados e de uma funcao publica por
comando, cada uma duplicada atras de gates `#[cfg(target_os = ...)]` que
encaminham para o modulo da plataforma:

- `linux.rs` — `pactl` (PulseAudio/PipeWire-pulse). Cobertura completa:
  targets master, application, sink e source, alem das acoes de controle
  mute/next/prev.
- `windows.rs` — WASAPI via crate `windows`. Apenas volume e mute da saida
  padrao/master; outros targets retornam `unavailable`.
- `macos.rs` — FFI CoreAudio feito a mao. Apenas volume da saida padrao/master.
- `unsupported.rs` — compilado em qualquer outro SO; reporta tudo como
  `unavailable` para a UI renderizar o modo demo com banners explicitos.
- `common.rs` — helpers sem cfg compartilhados por todos os backends
  (`describe_target`, `volume_percent`) e `MasterOnlyBackend`, o loop generico
  de batch master-only usado por Windows e macOS. Por nao ter cfg, seus testes
  unitarios rodam em toda plataforma do CI.

Apenas um modulo de plataforma e compilado em cada binario. No Linux isso
significa que `windows.rs`/`macos.rs` **nao** sao compilados pelo
`npm run verify` — os jobs de CI `native-audio-smoke` (windows-latest,
macos-15) sao o gate que prova que eles ainda compilam.

## Modelo de outcome

Cada slider aplicado produz um `SliderOutcome`:

- `severity`: `info` (nada a fazer) · `success` (todos os targets atualizados) ·
  `warning` (parcial: targets unavailable/idle) · `error` (ao menos uma falha)
- `targets[]`: um `RuntimeTargetOutcome` por target configurado com `status`
  (`updated`/`idle`/`unavailable`/`skipped`/`error`), um `detail` legivel e os
  nomes de endpoint em `matched`.

O store guarda o ultimo outcome por slider e o exibe no painel de diagnostico
dos knobs; o runtime serial registra applies lentos (>80 ms) no watch log.
