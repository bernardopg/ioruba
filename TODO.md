# TODO

Roadmap de desenvolvimento do Ioruba, reescrito em `2026-06-17` a partir do estado real do código após o release **v1.2.0**.

**Todos os Scrums anteriores estão cumpridos.** O histórico detalhado vive no git e no `CHANGELOG.md`; este documento olha para frente.

Formato:

- `[x]` concluído · `[ ]` pendente
- descrição `(tag/tag/tag)` - `fácil|médio|difícil`

## Estado atual (baseline v1.2.0)

- **Firmware** (`firmware/arduino/ioruba-controller`): Arduino Nano, `NUM_KNOBS` parametrizável por define (`IORUBA_NUM_KNOBS`), mas `ANALOG_PINS = {A0,A1,A2}` ainda fixo em 3. Handshake `HELLO board=...; fw=...; protocol=...; knobs=N`, frame `v0|v1|...`, calibração + EEPROM (magic/schema). `PROTOCOL_VERSION=2`, AVR 10-bit.
- **Shared** (`packages/shared`): protocolo e perfil já genéricos em contagem de knobs. **Assume ADC 10-bit em todo lugar** (`SLIDER_MAX=1023`, `validation`/`protocol` rejeitam `>1023`).
- **Desktop** (`apps/desktop`): Tauri 2 + React 19, store Zustand, serial via `tauri-plugin-serialplugin`. Backends de áudio: `linux` (pactl: master/app/source/sink), `windows` (WASAPI: master), `macos` (CoreAudio: master), `unsupported`. Telemetria de sessão + watch log.
- **Distribuição**: release multiplataforma (deb/rpm/AppImage/nsis/msi/app) + PKGBUILD AUR + provenance; instalador one-line (`scripts/install.sh`/`install.ps1`).

Prioridade declarada: **integração hardware↔SO, mais placas, eficiência, organização, ampliação, distribuição e UX completa.**

---

## Scrum 11 — Hardware: mais placas e mais knobs

Foco principal pedido. Hoje só Nano AVR com 3 pinos fixos.

- [x] Parametrizar `ANALOG_PINS` por placa em vez de `{A0,A1,A2}` fixo — tabela de pinos por MCU/board selecionada em compile-time, dimensionada por `NUM_KNOBS` `(firmware/hardware)` - `médio`
  - Tabela `ANALOG_PINS` por placa (ARDUINO_AVR_*/ESP32/RP2040), `static_assert(NUM_KNOBS <= ANALOG_PIN_COUNT)`. Usa os primeiros NUM_KNOBS canais.
- [x] Matriz de compilação de firmware no CI por FQBN (Nano, Uno, Mega2560, Leonardo, Micro) via `arduino-cli`, espelhando o gate atual `(firmware/ci/hardware)` - `médio`
  - Job `firmware` matrizado por FQBN + job `firmware-host` (parser default + wide 8k/12-bit). Scripts `firmware:compile:matrix`/`firmware:test:wide`.
- [x] Suporte a Arduino Mega (A0..A15) habilitando **>6 knobs** no mesmo board — validar limites de ADC e frame `(firmware/hardware/expansão)` - `médio`
  - Mega compila com 12 knobs (verificado local + host wide 8 knobs). Frame/EEPROM/struct já dimensionados por NUM_KNOBS.
- [x] Suporte a placas de 12-bit (ESP32, RP2040/Pico): reportar `adcBits` no handshake e **normalizar a resolução no shared** (hoje `SLIDER_MAX=1023` fixo quebra 4095) `(firmware/shared/protocol)` - `difícil`
  - Firmware deriva `ADC_MAX` de `IORUBA_ADC_BITS` (auto 12 em ESP32/RP2040, 10 em AVR). Shared remove o lock 1023: funções de mixer/runtime recebem `adcMax` opcional e o parser de frame aceita até 16-bit; normalização usa `firmwareInfo.adcBits`. Ainda pendente: toolchain real ESP32/RP2040 e teste em hardware.
- [x] Toolchain para ESP32/RP2040 (core `arduino-cli` adicional ou avaliação de PlatformIO) `(firmware/build/hardware)` - `difícil`
  - Optou-se por cores `arduino-cli` (não PlatformIO): job CI `firmware-arch` matriza `esp32:esp32` + `rp2040:rp2040` (earlephilhower) com caches próprios. Ambos compilam (verificado local). Corrigida colisão `BOARD_NAME` com macro do core arduino-pico.
- [x] Handshake estendido: reportar `board`, `mcu` e `adcBits`; bump `PROTOCOL_VERSION` se incompatível, com fallback para v2 `(firmware/protocol)` - `médio`
  - `mcu`/`adcBits` adicionados como campos aditivos do handshake; protocolo mantido em v2 (campos opcionais, hosts antigos ignoram, novos assumem 10-bit quando ausentes) — sem quebra de compatibilidade.
- [x] Detecção automática e exibição do board/MCU no desktop a partir do `board=` do handshake `(frontend/hardware/ux)` - `fácil`
  - Tile "Hardware" no `OverviewSignalPanel` mostra board · MCU + `adcBits`-bit · protocolo (com aviso de incompatibilidade).
- [x] Suporte a botões/encoders além de potenciômetros (mute/next/prev) — novo tipo de input no protocolo e perfil `(firmware/shared/expansão)` - `difícil`
  - Firmware aceita `IORUBA_NUM_BUTTONS`/`IORUBA_NUM_ENCODERS`, usa `INPUT_PULLUP`, debounce e quadratura, e só emite `EV type=...` após opt-in `EVENTS ON` para preservar desktops antigos. Shared parseia `EV` button/encoder; perfil ganhou `controls` com bindings `mute`/`next`/`prev`; desktop resolve eventos, executa ações via Tauri (`pactl`/`playerctl` no Linux, mute no Windows) e registra suporte/erros no watch log.
- [x] Documentar pinagem e matriz de placas suportadas em `docs/guides/hardware-setup.md` `(docs/hardware)` - `fácil`
  - Seção "Supported boards" (tabela MCU/bits/canais/max-knobs/ordem de pinos) + mirror PT-BR.

## Scrum 12 — Integração SO↔áudio mais profunda

Hoje Windows/macOS só controlam `master`. Linux tem cobertura completa.

- [ ] Per-app volume no Windows via `IAudioSessionManager2`/`ISimpleAudioVolume` — targets `application` fora do Linux `(backend/audio/windows)` - `difícil`
- [ ] Enumerar e controlar `sink`/`source` no Windows (devices de saída/entrada) `(backend/audio/windows)` - `difícil`
- [ ] Avaliar per-app volume no macOS (sem API pública trivial; investigar `AudioObject` por processo ou rejeitar formalmente) `(backend/audio/macos/research)` - `difícil`
- [ ] Ação de mute/toggle por knob ou botão, não só set de volume `(backend/shared/frontend)` - `médio`
- [ ] Mapear hotkeys globais (`tauri-plugin-global-shortcut` já presente) a ações de mixagem `(frontend/backend/ux)` - `médio`
- [ ] Avaliar backend PipeWire nativo no Linux (sem fork/exec de `pactl`) `(backend/audio/linux/research)` - `difícil`
- [ ] Estudo: transporte MIDI como alternativa à serial para controladores genéricos `(backend/protocol/research)` - `difícil`

## Scrum 13 — Eficiência e otimização

- [ ] Estender o cache de inventário (TTL ~250ms, já existe no Linux) aos backends Windows/macOS — hoje re-inicializam COM/CoreAudio a cada chamada `(backend/audio/performance)` - `médio`
- [ ] Reusar handle de device (COM apartment / `IMMDevice` / `AudioObjectID`) entre chamadas respeitando thread-affinity `(backend/audio/performance)` - `difícil`
- [ ] Coalescing/debounce de writes de volume sob movimento rápido de knob, por target `(backend/runtime/performance)` - `médio`
- [ ] Reduzir o bundle do chart (`charts` ~353KB gzip 104KB) — lib mais leve ou code-split por aba `(frontend/bundle/performance)` - `médio`
- [x] Instrumentar e logar latência knob→áudio no watch log (já há timings de boot/connect/refresh) `(observability/performance)` - `fácil`
  - `use-serial-runtime` cronometra `applySliderTargetsBatch` com `performance.now()`; emite `warning` no watch log quando passa de `AUDIO_APPLY_SLOW_MS` (80ms), com tempo + nº de alvos (sem flood).
- [ ] Perfilar consumo em sessão longa (telemetria + watch log) e validar ausência de leaks `(performance/observability)` - `médio`

## Scrum 14 — Organização e qualidade de código

- [x] Extrair lógica duplicada dos backends (`describe_target`, `summarize_slider_outcome` repetidos em `windows.rs`/`macos.rs`/`linux.rs`) para `audio/common.rs` `(backend/refactor/organização)` - `médio`
  - `audio/common.rs` (sem cfg, compila em toda plataforma): `describe_target`, `volume_percent` e `MasterOnlyBackend::apply_batch` — o loop de apply master-only dos backends Windows/macOS virou uma chamada genérica sobre a closure `set_master_volume`; strings de outcome parametrizadas por plataforma, comportamento preservado.
- [x] Testes host-independentes para `summarize_slider_outcome`/`describe_target` (hoje sem testes em `windows.rs`/`macos.rs`) `(test/backend/coverage)` - `fácil`
  - 7 testes em `common.rs` com setter fake: happy path, dedupe de master, erro do setter, targets não suportados, mix updated+unavailable, lista vazia, clamp/round de percent. Rodam no gate Linux e nos smokes nativos.
- [ ] Cobertura de testes do store Zustand (`ioruba-store.ts`), incl. reset de `sessionStats` via wrapper do `set` `(test/frontend/coverage)` - `médio`
- [ ] Documentar o contrato Rust↔TS dos backends e o dispatch por `cfg` em `audio/mod.rs` `(docs/backend/organização)` - `fácil`
- [x] Gate de `shellcheck` no CI para `scripts/install.sh` e demais scripts `sh` `(ci/quality)` - `fácil`
  - Job `scripts-lint` no CI roda `shellcheck` em install.sh/run-appimage-compat.sh/validate-appimage.sh (passam limpo). Script local `npm run lint:scripts`.
- [x] Lint de PowerShell (`PSScriptAnalyzer`) para `scripts/install.ps1` `(ci/quality)` - `fácil`
  - Mesmo job `scripts-lint`: PSScriptAnalyzer via pwsh, reporta Warning+Error, falha só em Error.

## Scrum 15 — Distribuição e updates

- [ ] Auto-updater in-app (`tauri-plugin-updater` + `latest.json` no release) — **bloqueado** em chave de assinatura/secret no CI; preparar infra e deixar a chave como TODO `(dist/release/security)` - `difícil`
- [ ] Assinatura + notarização macOS (hoje `.app` unsigned; installer faz strip de quarantine) `(dist/macos/security)` - `difícil`
- [ ] Gerar `.dmg` no macOS além do `.app.tar.gz` `(dist/macos)` - `médio`
- [ ] Manifest Homebrew cask para macOS `(dist/macos/packaging)` - `médio`
- [ ] Manifest Scoop e submissão winget para Windows `(dist/windows/packaging)` - `médio`
- [ ] Automatizar publicação do AUR (`ioruba-desktop` / `-bin`) no fluxo de release `(dist/linux/ci)` - `médio`
- [ ] Endurecer o instalador one-line: testar arm64 Linux/macOS e cobrir ausência de assets `(dist/installer/quality)` - `fácil`

## Scrum 16 — Telemetria e dados

- [x] Export dos `sessionStats` para arquivo (JSON/CSV) via dialog, reusando o padrão do export de perfil/watch log `(frontend/backend/telemetry)` - `fácil`
  - Formatters puros `sessionStatsToJson`/`sessionStatsToCsv` no shared (+testes), comando Tauri `export_session_stats` (filtros JSON/CSV), botões JSON/CSV no `SessionStatsPanel`.
- [ ] Histórico de telemetria persistente em disco (opt-in) para análise pós-sessão `(backend/telemetry/persistence)` - `médio`
- [ ] Visualização comparativa entre sessões (picos, médias, duração) `(frontend/telemetry)` - `médio`

## Scrum 17 — Ampliação: automação e comunidade

- [ ] Regras condicionais de mixagem ("quando o app X tocar, reduzir Y") — subsistema acima do mapeamento knob→target; exige design/spec `(shared/backend/frontend/expansão)` - `difícil`
- [ ] Galeria/repositório de presets compartilháveis pela comunidade (import/export por arquivo já existe) `(frontend/product/expansão)` - `difícil`
- [ ] Perfis por aplicação ativa (trocar mapeamento conforme o app em foco) `(backend/frontend/expansão)` - `difícil`

## Scrum 18 — Experiência completa

- [ ] Wizard de calibração de knobs na UI (ler/escrever `minRaw`/`maxRaw`/deadzone via comando `CONFIG`, que já existe no protocolo) `(frontend/firmware/ux)` - `médio`
- [ ] Auditoria de acessibilidade (a11y) do dashboard, foco/teclado/aria `(frontend/a11y/ux)` - `médio`
- [ ] Ampliar i18n além de en/pt-BR (estrutura de `i18n.ts` já suporta) `(frontend/i18n)` - `médio`
- [x] Exibir board/MCU/`adcBits`/protocolo detectados num painel de diagnóstico claro `(frontend/hardware/ux)` - `fácil`
  - `HardwarePanel` (seção Hardware): placa, MCU, resolução do ADC, protocolo (compat.), knobs e calibração por knob, com estado vazio. Integrado à navegação agrupada nova.
- [x] Indicador visual de latência e saúde da conexão sempre visível (alinhado ao `.impeccable.md`) `(frontend/ux/observability)` - `fácil`
  - `ConnectionHealthIndicator` no topo do sidebar (sempre visível): dot colorido por estado + label + frescura do sinal (tempo desde o último frame, tick 1s) como proxy de latência. Store ganhou `lastFrameAt`. +4 testes.

## Não-objetivos

- Reintroduzir tooling de build na raiz fora de `apps/`/`packages/`/`firmware/`.
- Cobertura completa de áudio em plataformas sem backend nativo — nesses casos, modo UI/demo ou suporte parcial com banners explícitos.
