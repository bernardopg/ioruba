# TODO

Roadmap de desenvolvimento do Ioruba. Baseline reescrita em `2026-08-03` e ressincronizada em `2026-08-10` a partir do estado real do código no release **v1.7.0**.

**Todos os Scrums até o 11 estão cumpridos**, e os Scrums 14 e 18 estão fechados. O Scrum 16 entregou o export de `sessionStats` mas segue aberto (persistência e comparação entre sessões). O histórico detalhado vive no git e no `CHANGELOG.md`; este documento olha para frente.

Formato:

- `[x]` concluído · `[ ]` pendente
- descrição `(tag/tag/tag)` - `fácil|médio|difícil`

## Estado atual (baseline v1.7.0)

- **Firmware** (`firmware/arduino/ioruba-controller`): `NUM_KNOBS` parametrizável por `IORUBA_NUM_KNOBS`, com tabela de pinos analógicos por placa (Nano, Uno, Mega2560, Leonardo/Micro, ESP32, RP2040, ESP8266) e `static_assert` contra o limite de canais da placa. `ADC_MAX` derivado de `IORUBA_ADC_BITS` (10-bit AVR, 12-bit ESP32/RP2040). Handshake `HELLO board=...; fw=...; protocol=...; knobs=...; mcu=...; adcBits=...`, frame `v0|v1|...`, calibração + EEPROM (magic/schema). Botões e encoders opcionais (`IORUBA_NUM_BUTTONS`/`IORUBA_NUM_ENCODERS`) emitem `EV` após opt-in `EVENTS ON`. `PROTOCOL_VERSION=2`.
- **Shared** (`packages/shared`): protocolo, perfil e runtime genéricos em contagem de knobs **e em resolução de ADC** — o lock `SLIDER_MAX=1023` saiu, a normalização usa `firmwareInfo.adcBits` e o parser de frame aceita até 16-bit. Perfil tem `controls` com bindings `mute`/`next`/`prev`, e `mute` aceita um `target` (`AudioTarget`) opcional — `next`/`prev` rejeitam `target` na validação.
- **Desktop** (`apps/desktop`): Tauri 2 + React 19, store Zustand, serial via `tauri-plugin-serialplugin` v3 (stream e auto-reconnect nativos via `watch()`). Backends de áudio: `linux` (pactl: master/app/source/sink), `windows` (WASAPI: master), `macos` (CoreAudio: master), `unsupported`. Shell com sidebar compacto, status pill de runtime, dialog central de configurações, changelog embutido e notificação opt-in de release nova. Telemetria de sessão exportável (JSON/CSV), watch log, wizard de calibração, painel de hardware, editor visual de botões e encoders (com escolha do alvo do mute a partir do inventário de áudio), i18n en/pt-BR/es.
- **Distribuição**: release multiplataforma (deb/rpm/AppImage/nsis/msi/app) + PKGBUILD AUR + provenance; instalador one-line (`scripts/install.sh`/`install.ps1`). Sem auto-update in-app.

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
- [x] Ação de mute/toggle **direcionada** — `dispatch_control_action(action, target)` aceita `AudioTarget` opcional e resolve sink/source/application no Linux (`set-sink-mute`/`set-source-mute`/`set-sink-input-mute`); Windows aceita `master` ou sem alvo, rejeita o resto `(backend/shared/frontend)` - `médio`
  - `ControlConfig` ganhou `target?`. Os matchers de sink/source foram extraídos de `apply_targets` para `resolve_sink_matches`/`resolve_source_matches`, compartilhados entre knob e mute. `target` só é aceito com `action: "mute"` (`next`/`prev` falam com o player MPRIS). O editor visual (Configurações › Editor de perfil › Botões e encoders) cria os bindings sem passar pelo JSON.
- [ ] Toggle de mute atribuível a um **knob** (hoje só botão/encoder disparam `ControlConfig`) — pendência herdada do item acima `(shared/frontend/ux)` - `médio`
- [ ] Mapear hotkeys globais (`tauri-plugin-global-shortcut` já presente) a ações de mixagem `(frontend/backend/ux)` - `médio`
- [ ] Avaliar backend PipeWire nativo no Linux (sem fork/exec de `pactl`) `(backend/audio/linux/research)` - `difícil`
- [ ] Estudo: transporte MIDI como alternativa à serial para controladores genéricos `(backend/protocol/research)` - `difícil`

## Scrum 13 — Eficiência e otimização

- [x] Estender o cache de inventário (TTL ~250ms, já existe no Linux) aos backends Windows/macOS — hoje re-inicializam COM/CoreAudio a cada chamada `(backend/audio/performance)` - `médio`
  - `TtlCache<T>` + `INVENTORY_TTL` em `audio/common.rs`, com 7 testes host-independentes. Os três backends passam a concordar sobre quão velho aceitam ficar; o TTL também é o mecanismo que faz troca de device padrão ser notada sem assinar `IMMNotificationClient`. Linux mantém `get`/`store` para não segurar o mutex durante o fork/exec do `pactl`.
- [x] Reusar handle de device (COM apartment / `IMMDevice` / `AudioObjectID`) entre chamadas respeitando thread-affinity `(backend/audio/performance)` - `difícil`
  - Windows: thread dedicada (`ioruba-wasapi`) entra no apartment uma vez e é dona do `IAudioEndpointVolume`; chamadas viram jobs enviados por canal. Afinidade deixa de ser algo a raciocinar — antes cada escrita de volume fazia `CoInitializeEx` + `CoCreateInstance` + `GetDefaultAudioEndpoint` + `Activate` inteiros. Um lote de sliders é um único hop. macOS: o `AudioObjectID` não tem afinidade, mas o probe `HasProperty`/`IsPropertySettable` (até 8 canais × 2 chamadas) rodava por escrita; virou uma estratégia `VolumeElements` resolvida uma vez e cacheada com o id. Escrita que falha invalida na hora.
- [x] Coalescing/debounce de writes de volume sob movimento rápido de knob, por target `(backend/runtime/performance)` - `médio`
  - `scheduleAudioFlush` virou throttle leading+trailing (`AUDIO_APPLY_MIN_INTERVAL_MS` 40ms; com `smoothTransitions` usa o `transitionDurationMs` do perfil): primeiro lote sai imediato, rajadas coalescem num flush trailing com o valor mais recente por slider. Corrige também o starvation do debounce puro anterior, que só aplicava áudio quando o knob parava. +2 testes com fake timers.
- [x] Reduzir o bundle do chart trocando `recharts` por uma lib mais leve — o chunk `charts` está em 368.91 kB (gzip 106.66 kB) `(frontend/bundle/performance)` - `médio`
  - Trocado por um componente SVG próprio (~8 kB) com a mesma spline monotone (Fritsch–Carlson, o que o recharts pegava do `curveMonotoneX` do d3-shape), grid, eixos, cursor e tooltip. **O `lazy` nunca funcionou**: o `manualChunks` mandava `react/index.js` e `react-dom/index.js` para o chunk `charts`, o que dava ao entry uma dependência estática dele e fazia o Vite emitir `modulepreload` no `index.html` — os 360 kB desciam em todo boot. Payload de boot medido: **878.45 kB → 535.15 kB raw, 252.14 kB → 154.49 kB gzip (-39%)**. O `lazy`/`Suspense` saiu junto: não se paga para 8 kB.
- [x] Instrumentar e logar latência knob→áudio no watch log (já há timings de boot/connect/refresh) `(observability/performance)` - `fácil`
  - `use-serial-runtime` cronometra `applySliderTargetsBatch` com `performance.now()`; emite `warning` no watch log quando passa de `AUDIO_APPLY_SLOW_MS` (80ms), com tempo + nº de alvos (sem flood).
- [x] Perfilar consumo em sessão longa (telemetria + watch log) e validar ausência de leaks `(performance/observability)` - `médio`
  - `ioruba-store.soak.test.ts`: 20k frames seriais e asserção de que toda coleção para de crescer, mais uma asserção genérica sobre o tamanho serializado da store inteira (para que um campo futuro sem teto falhe aqui sem ninguém lembrar de estender o teste). Achou um leak real: `pushNotification` deduplicava por id mas nunca aparava — era a cadência de release (6h) segurando a lista, não o código. Capado em 100.

## Scrum 14 — Organização e qualidade de código

- [x] Extrair lógica duplicada dos backends (`describe_target`, `summarize_slider_outcome` repetidos em `windows.rs`/`macos.rs`/`linux.rs`) para `audio/common.rs` `(backend/refactor/organização)` - `médio`
  - `audio/common.rs` (sem cfg, compila em toda plataforma): `describe_target`, `volume_percent` e `MasterOnlyBackend::apply_batch` — o loop de apply master-only dos backends Windows/macOS virou uma chamada genérica sobre a closure `set_master_volume`; strings de outcome parametrizadas por plataforma, comportamento preservado.
- [x] Testes host-independentes para `summarize_slider_outcome`/`describe_target` (hoje sem testes em `windows.rs`/`macos.rs`) `(test/backend/coverage)` - `fácil`
  - 7 testes em `common.rs` com setter fake: happy path, dedupe de master, erro do setter, targets não suportados, mix updated+unavailable, lista vazia, clamp/round de percent. Rodam no gate Linux e nos smokes nativos.
- [x] Cobertura de testes do store Zustand (`ioruba-store.ts`), incl. reset de `sessionStats` via wrapper do `set` `(test/frontend/coverage)` - `médio`
  - +3 testes: acumulação de `sessionStats` via `processSerialLine` (min/max/last percent por knob), reset explícito via `resetSessionStats`, e reset automático pelo wrapper do `set` quando uma action zera `telemetry` (via `setDemoMode(false)`).
- [x] Documentar o contrato Rust↔TS dos backends e o dispatch por `cfg` em `audio/mod.rs` `(docs/backend/organização)` - `fácil`
  - `docs/guides/audio-backend-contract.md` (+ mirror PT-BR): comandos Tauri, convenções serde (camelCase/lowercase/tag kind), matriz de capacidade por backend, dispatch cfg, modelo de outcome, papel do `common.rs` e dos smokes nativos.
- [x] Gate de `shellcheck` no CI para `scripts/install.sh` e demais scripts `sh` `(ci/quality)` - `fácil`
  - Job `scripts-lint` no CI roda `shellcheck` em install.sh/run-appimage-compat.sh/validate-appimage.sh (passam limpo). Script local `npm run lint:scripts`.
- [x] Lint de PowerShell (`PSScriptAnalyzer`) para `scripts/install.ps1` `(ci/quality)` - `fácil`
  - Mesmo job `scripts-lint`: PSScriptAnalyzer via pwsh, reporta Warning+Error, falha só em Error.

## Scrum 15 — Distribuição e updates

- [x] Auto-updater in-app (`tauri-plugin-updater` + `latest.json` no release) `(dist/release/security)` - `difícil`
  - Chave Tauri gerada e guardada como secrets `TAURI_SIGNING_PRIVATE_KEY`/password; pública embutida no `tauri.conf.json`; privada original guardada fora do git em `~/.config/ioruba/updater/` (mode 600; precisa de backup). Plugin Rust + permissões + prompt explícito no app verificam assinatura, baixam, instalam e relançam. Cada matriz sobe `.sig`; job serial cria **um** `latest.json` completo no fim, evitando a corrida de delete/upload que ocorreria se os 4 runners o escrevessem em paralelo. Sem key/assinatura o release falha fechado.
- [ ] Assinatura + notarização macOS (hoje `.app` unsigned; installer faz strip de quarantine) `(dist/macos/security)` - `difícil`
  - O workflow já sabe importar o certificado e passa Apple ID/app-password/team ID ao Tauri, mas os secrets de Developer ID/notarização não estão provisionados. O guia lista nomes, verificações `codesign`/`spctl` e gate de validação; sem eles, afirmar que o binário é assinado seria falso.
- [ ] Gerar `.dmg` no macOS além do `.app.tar.gz` `(dist/macos)` - `médio`
  - **Não habilitado cegamente**: o script DMG do Tauri chama Finder via AppleScript, que já falhou por autorização intermitente em runner GitHub-hosted; adicioná-lo à matriz hoje faz uma release inteira falhar. O `.app.tar.gz` é o artefato reproduzível. Habilitar só após o draft assinado no `macos-15` passar `codesign` e `spctl` (procedimento no guia).
- [x] Manifest Homebrew cask para macOS `(dist/macos/packaging)` - `médio`
  - Job `package-manifests` gera o cask depois de `SHA256SUMS.txt` e o publica em `bernardopg/homebrew-ioruba` via deploy key isolada (host key GitHub pinada). Usuário: `brew tap bernardopg/ioruba && brew install --cask ioruba`.
- [x] Manifest Scoop e submissão winget para Windows `(dist/windows/packaging)` - `médio`
  - Mesmo job publica `ioruba.json` em `bernardopg/scoop-ioruba` por outra deploy key isolada; usuário: `scoop bucket add ioruba https://github.com/bernardopg/scoop-ioruba && scoop install ioruba`. Três YAMLs winget são anexados à release; a submissão inicial é [microsoft/winget-pkgs#415149](https://github.com/microsoft/winget-pkgs/pull/415149). PR automático futuro exigiria GitHub App/token fine-grained próprio, não um PAT pessoal amplo.
- [x] Automatizar publicação do AUR (`ioruba-desktop` / `-bin`) no fluxo de release `(dist/linux/ci)` - `médio`
  - Já existia: job `aur-publish` no `release.yml` gera PKGBUILD/.SRCINFO, clona os dois pacotes por SSH (host key pinada, sem `ssh-keyscan`) e faz push. O item estava marcado como pendente por engano. Endurecido na v1.7.1 com retry e backoff — o release da v1.7.1 bateu num outage do AUR (`The AUR is down due to maintenance`) e o job morreu na primeira tentativa.
- [x] Endurecer o instalador one-line: testar arm64 Linux/macOS e cobrir ausência de assets `(dist/installer/quality)` - `fácil`
  - Corrigido fallback perigoso: padrões como `_arm64.deb$|.deb$` escolhiam o primeiro `.deb` (amd64) quando não havia build arm64 e o instalavam silenciosamente. `require_asset_url` agora exige arquitetura exata e, na ausência, mostra os assets da release. 13 testes por fixture cobrem tokens x86_64/arm64/aarch64, ausência, ambiguidade e release vazia; ShellCheck + teste entram no CI.

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

- [x] Wizard de calibração de knobs na UI (ler/escrever `minRaw`/`maxRaw`/deadzone via comando `CONFIG`, que já existe no protocolo) `(frontend/firmware/ux)` - `médio`
  - `CalibrationWizard` na seção Hardware: fluxo mín→máx→revisão por knob com leitura ao vivo e rastreio do extremo observado; valida faixa mínima (16 contagens) e grava `calibration` no slider do perfil ativo via `updateActiveProfileConfig` — o runtime serial já sincroniza o firmware via `CONFIG` quando o perfil diverge. +3 testes de componente.
- [x] Auditoria de acessibilidade (a11y) do dashboard, foco/teclado/aria `(frontend/a11y/ux)` - `médio`
  - Navegação por setas/Home/End no tablist do sidebar (padrão WAI-ARIA, tabindex itinerante já existia mas os tabs inativos eram inalcançáveis por teclado); foco gerenciado no wizard de calibração (entra na sessão, volta ao botão de origem) + `aria-live` no passo e `role="alert"` na faixa curta; `aria-pressed` nos filtros do watch log; `scope="col"` nas tabelas de hardware/estatísticas; `role="img"` nomeado no gráfico de telemetria; `aria-label` no textarea de JSON avançado. Cobertura axe estendida a todos os painéis (HardwarePanel, CalibrationWizard, SessionStatsPanel, WatchLogPanel, OverviewSignalPanel, ProfileWorkbench nas 3 views).
- [x] Ampliar i18n além de en/pt-BR (estrutura de `i18n.ts` já suporta) `(frontend/i18n)` - `médio`
  - Espanhol (`es`) completo: `TEXT_MAP_ES` cobre 100% das chaves, registro por idioma em `LANGUAGE_TEXT_MAPS`, união `UiLanguage` no shared + validação (`normalizePersistedState` e editor JSON caem para pt-BR em idioma desconhecido), opção no seletor de perfil. Guia de tradução atualizado (EN + espelho PT).
- [x] Exibir board/MCU/`adcBits`/protocolo detectados num painel de diagnóstico claro `(frontend/hardware/ux)` - `fácil`
  - `HardwarePanel` (seção Hardware): placa, MCU, resolução do ADC, protocolo (compat.), knobs e calibração por knob, com estado vazio. Integrado à navegação agrupada nova.
- [x] Indicador visual de latência e saúde da conexão sempre visível (alinhado ao `.impeccable.md`) `(frontend/ux/observability)` - `fácil`
  - `ConnectionHealthIndicator` no topo do sidebar (sempre visível): dot colorido por estado + label + frescura do sinal (tempo desde o último frame, tick 1s) como proxy de latência. Store ganhou `lastFrameAt`. +4 testes.

## Entregue fora de Scrum (v1.5.2 → v1.7.0)

Trabalho que nasceu de bug report ou de decisão de produto no meio do caminho, sem ter passado por um item planejado. Registrado aqui para a baseline não mentir.

- [x] Auto-heal de perfis salvos antes do bump de baud do firmware (9600 → 115200), que ficavam presos em loop de handshake `(desktop/persistence)` - `fácil`
- [x] Firmware 0.6.1: desligar o rádio WiFi no `setup()` em ESP8266/ESP32 — o rádio ligado por padrão injetava ruído mensurável no ADC `(firmware/hardware)` - `fácil`
- [x] Restart limpo quando o binário é trocado em disco durante a execução (upgrade de pacote), no lugar do segfault do WebKitWebProcess ao esconder para a bandeja `(desktop/runtime)` - `médio`
- [x] Migração para `tauri-plugin-serialplugin` v3: `watch()` nativo substitui o trio `listen()`/`startListening()`/`cancelListen()`, e o auto-reconnect sai do `use-serial-runtime` para o plugin `(desktop/serial)` - `médio`
- [x] Refresh do shell: sidebar compacto (marca + saúde de conexão + navegação ícone-e-rótulo), status pill flutuante de runtime e ribbon reduzido a sessão e perfil ativo `(frontend/ux)` - `médio`
- [x] Dialog central de configurações (idioma, tema, notificações, launch-on-login, versão em execução, changelog) sobre um wrapper reusável de `<dialog>` nativo com foco preso, Escape/backdrop e restauração de foco `(frontend/ux/a11y)` - `médio`
- [x] Notificação opt-in de release nova: checagem a cada seis horas, comparação semver, estado de não-lido, deduplicação e preferências persistidas `(frontend/product)` - `médio`
- [x] Links externos por `tauri-plugin-opener` com escopo de capability restrito a `https://github.com/bernardopg/ioruba*`; CSP libera só `https://api.github.com` `(security/desktop)` - `fácil`
- [x] Dialog de changelog no app deixou de listar a seção `Unreleased` — ela descreve trabalho que não está no binário em execução `(frontend/product)` - `fácil`

## Não-objetivos

- Reintroduzir tooling de build na raiz fora de `apps/`/`packages/`/`firmware/`.
- Cobertura completa de áudio em plataformas sem backend nativo — nesses casos, modo UI/demo ou suporte parcial com banners explícitos.
