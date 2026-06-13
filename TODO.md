# TODO

Atualizado para o projeto ativo em `2026-06-13`, com checks revisados a partir do estado real do código, da documentação, dos testes e dos assets do repositório.

Formato:

- `[x]` concluído
- `[ ]` pendente
- descrição `(tag/tag/tag)` - `fácil|médio|difícil`

Prioridade atual: concluir primeiro tudo que é Linux/firmware/desktop. O backlog multiplataforma do Scrum 04 fica para o final.

## Estado de sincronia com o remoto (snapshot 2026-06-13)

- `main` local está em paridade exata com `origin/main` (0 commits ahead / 0 behind). Último corte: `13193cc release: cut v1.0.0`.
- Há working tree **não commitado** de endurecimento de CI/CD (não publicado no remoto):
  - `release.yml`, `ci.yml`, `codeql.yml`, `pages.yml` — SHA-pinning de actions, `permissions: read` por padrão com escopo elevado por job, `timeout-minutes`, `concurrency.cancel-in-progress: false` em release/pages, matriz CodeQL (js-ts + rust + actions), matriz de release com macOS aarch64/x86_64 + AppImage, attestations (`id-token`/`attestations: write`), gate de `cargo fmt --check` e `cargo clippy -D warnings`, coverage v8 no shared/desktop.
  - `apps/desktop/package.json` e `packages/shared/package.json` — adição de `@vitest/coverage-v8`.
- **8 PRs do Dependabot/cargo estão obsoletos** e devem ser fechados: o `Cargo.toml`/`Cargo.lock` já fixam `tauri 2.11.2`, `serde_json 1.0.150`, `tauri-plugin-serialplugin 2.22.0`, `tauri-plugin-global-shortcut 2.3.2` (branches `tauri-2.11.0`, `tauri-build-2.6.0`, etc. ficaram para trás do estado atual).
- Branches `copilot/*` no remoto (`fix-ci-error-go-actions`, `deploy-new-content-to-pages`) precisam de triagem: mesclar ou descartar.

## Review técnico — Rust/Tauri/C (rodada 2026-06-13)

Itens resolvidos nesta rodada estão marcados `[x]`. Verificação completa ao final: `cargo clippy -D warnings`, `cargo fmt --check`, `cargo test` (15), `shared:test` (20), `desktop:test` (41), typecheck shared+desktop, `firmware:compile` (19% flash), `desktop:build`, `cargo audit` (0 vuln) — todos verdes.

### 🔴 Bloqueante — gate de CI (RESOLVIDO)

- [x] Corrigir 3 erros `clippy::needless_borrow` em `src/lib.rs` (`&app.handle()` → `app.handle()`). O diff de CI adiciona `cargo clippy -D warnings`; os erros quebravam o job. Corrigido e revalidado com clippy limpo `(backend/ci/clippy)` - `fácil`
- [x] Rodar `cargo clippy -D warnings` + `cargo fmt --check` + testes localmente antes de commitar o working tree de CI. Gate passa de ponta a ponta `(backend/ci/verify)` - `fácil`

### 🟠 Integração firmware ↔ desktop

- [x] ~~Enviar comando `CONFIG ...` do desktop para o firmware~~ — **correção do review anterior: já estava implementado**. `use-serial-runtime.ts:441` já faz `port.write("CONFIG ...\n")` quando `firmwareConfigMatchesProfile` detecta divergência, com dedup via `lastFirmwareConfigRef` e tratamento de erro. O shared já tem `encodeFirmwareConfigCommand`/`firmwareConfigMatchesProfile`. Fluxo completo: handshake → compara → envia CONFIG → re-handshake `(firmware/frontend/protocol)` - `difícil`
- [x] Versionar a expectativa de protocolo no desktop. Adicionado `SUPPORTED_PROTOCOL_VERSION = 2` em `protocol.ts`, campo `protocolSupported` em `FirmwareInfo`, aviso no watch log + sufixo `(incompatível)` no label quando diverge. Cobertura de teste no shared `(firmware/frontend/protocol)` - `médio`
- [x] Documentado que firmware (`FIRMWARE_VERSION`) e app têm cadência de versão independente — comentário no `.ino` + nota em `NANO_SETUP.md`. O desktop valida só `PROTOCOL_VERSION` `(firmware/docs/version)` - `fácil`

### 🟡 Backend Rust/Tauri — robustez e correção

- [x] `apply_slider_targets_batch` agora é `async` e move o trabalho `pactl` bloqueante para `tauri::async_runtime::spawn_blocking`, liberando a thread de comando do Tauri `(backend/audio/performance)` - `médio`
- [x] Hardening de `atomic_write`: sufixo único do `.tmp` (pid + contador atômico + timestamp ns), `sync_all` do arquivo antes do `rename` e fsync best-effort do diretório-pai após o rename `(backend/persistence/durability)` - `médio`
- [x] Serializar acesso ao `ioruba-state.json` com `STATE_LOCK` dedicado em `save_persisted_state`/`load_persisted_state`, evitando race entre boot e escrita concorrente `(backend/persistence/concurrency)` - `médio`
- [x] `append_entry` reescrito para append real (`OpenOptions::append` + `writeln!`), com trim amortizado disparado só quando o arquivo ultrapassa `WATCH_LOG_MAX_BYTES`. Eliminado o O(n²) por evento. Novo teste cobre append incremental + trim `(backend/observability/performance)` - `médio`
- [x] `list_audio_inventory` agora coleta falhas parciais de `pactl` (por comando) e as anexa ao campo `diagnostics` em vez de virar inventário vazio silencioso. Eliminada chamada dupla de `application_inventory_names` `(backend/audio/observability)` - `fácil`
- [x] Removida a entrada morta `--ignore RUSTSEC-2024-0429` do `rust:audit`. O advisory (glib `GHSA-wrw7-89jp-8q8g`) é corrigido na fonte pelo vendor `glib-0.18.5`, então não há o que ignorar. `CLAUDE.md` atualizado. `cargo audit` sem `--ignore` retorna exit 0 `(backend/ci/maintenance)` - `fácil`
- [x] Cache de inventário `pactl` implementado: `PactlSnapshot` lido uma vez e reusado por 250ms (TTL) entre `list_audio_inventory` e `apply_slider_targets_batch`, invalidado após escrita de volume. Colapsa o fork/exec por movimento de knob. +teste `(backend/audio/performance)` - `médio`
- [x] Gate de CI que lê a versão resolvida de `glib` no `Cargo.lock` e falha se sair da linha `0.18.x` — sinal para remover o vendor patch quando o Tauri Linux stack migrar para `glib >= 0.20` `(backend/security/maintenance)` - `médio`
- [x] Removido `#[allow(dead_code)]` de `WatchScope`/`WatchLevel` em `watch.rs` — variants são lidos por `scope_label`/`level_label` e exercitados por testes; clippy `-D warnings` segue limpo `(backend/cleanup)` - `fácil`

### 🟡 Firmware C/C++ — robustez

- [x] `isspace(*value)` → `isspace(static_cast<unsigned char>(*value))` em `trimLeadingWhitespace`/`trimTrailingWhitespace` — corrige UB de passar `char` possivelmente negativo a `isspace` `(firmware/correctness/portability)` - `fácil`
- [x] Overflow de comando serial agora é observável: flag `overflowed` consome a cauda até `\n` e emite `ERR command-too-long` em vez de resetar silenciosamente (que podia reinterpretar metade de um `CONFIG` como comando novo). Também adicionado `ERR config-rejected` quando `applyConfigCommand` falha. Firmware compila em 19% flash / 30% RAM `(firmware/protocol/error)` - `fácil`
- [x] EEPROM: `applyConfigCommand` agora só persiste quando `iorubaControllerConfigEquals` detecta mudança real — hosts que reenviam o mesmo CONFIG (boot/reconexão) não disparam escrita. Documentado que `EEPROM.put` já é byte-wise `(firmware/hardware/eeprom)` - `fácil`
- [x] Parser `CONFIG` extraído para `config_parser.h` (lógica pura, sem deps Arduino) e coberto por teste de host g++ (`tests/config_parser_test.cpp`, 11 casos: `mins/maxs` inválidos/invertidos/fora de faixa, `smooth>100`, contagem de knobs errada, campos desconhecidos, separador ausente, valor não-numérico, payload vazio). Roda como `npm run firmware:test` no CI antes do compile `(firmware/test/coverage)` - `médio`

### 🟢 Tauri shell / empacotamento

- [x] CSP restritiva definida em `tauri.conf.json` (`script-src 'self'`, `style-src 'self' 'unsafe-inline'` para recharts/radix, `connect-src 'self' ipc: http://ipc.localhost`, `object-src 'none'`, `frame-ancestors 'none'`). `csp: null` removido. `desktop:build` valida que o bundle não usa assets externos `(tauri/security/hardening)` - `médio`
- [x] Capability `default.json` auditada e restringida: `dialog:default` → `dialog:allow-save` (app só usa `blocking_save_file`). `serialplugin:default` e `global-shortcut:default` mantidos (ambos exercitados). Validado com `tauri build` (ACL compila) `(tauri/security/capabilities)` - `fácil`
- [ ] Validar o bundle AppImage agora incluído na matriz de release (`--bundles deb,rpm,appimage`) contra o problema histórico de `linuxdeploy` + `.relr.dyn` no Arch, garantindo que o runner Ubuntu 22.04 gera AppImage funcional `(release/linux/appimage)` - `médio`

### Ações de manutenção de repo (fora de código)

- [x] Commitado e enviado o endurecimento de CI/CD + as correções desta rodada em commits coerentes (gate verde local) `(repo/ci)` - `fácil`
- [x] PRs do Dependabot/cargo: todos já estavam fechados/merged no remoto; as branches `dependabot/cargo/*` não existiam mais. Refs locais stale podadas com `git remote prune origin` `(repo/dependabot)` - `fácil`
- [x] Triagem das branches `copilot/*`: já não existiam no remoto (PRs fechados/merged, branches deletadas). Refs locais stale podadas. Remoto agora só tem `main`; local em paridade exata `(repo/maintenance)` - `fácil`

## Atualizações recentes (main pós-v0.6.0)

- [x] Fechar o corte de release 0.6.0 em versões, changelog e documentação de distribuição `(release/version/docs)` - `médio`
- [x] Adicionar workflow de CodeQL para análise contínua de segurança e qualidade `(ci/security/codeql)` - `fácil`
- [x] Ajustar linguagem/regra do CodeQL e reduzir ruído dos alertas para focar em findings acionáveis `(ci/security/codeql)` - `médio`
- [x] Estabilizar updates de GitHub Actions no Dependabot para evitar conflitos recorrentes `(ci/dependabot/maintenance)` - `fácil`
- [x] Revisar badges e organização visual do README com status e matriz de suporte `(docs/release/product)` - `fácil`
- [x] Melhorar `.gitignore` para cobrir artefatos gerados no ciclo atual de desenvolvimento `(repo/hygiene/tooling)` - `fácil`
- [x] Interceptar fechamento da janela no backend Rust (`WindowEvent::CloseRequested`) e esconder para o tray, evitando exit acidental em compositores Wayland como Hyprland `(backend/runtime/linux)` - `médio`
- [x] Registrar atalho global `Ctrl+Alt+I` para alternar a visibilidade da janela como fallback quando o compositor nao fornece `StatusNotifierWatcher` `(backend/runtime/ux)` - `médio`
- [x] Refazer responsividade do shell: sidebar compacta em `lg+`, grid de knobs sem truncagem e layout empilhado no `KnobPanel` `(frontend/design/responsiveness)` - `médio`

## Scrum 01

- [x] Trocar o `window.alert` do editor JSON por validação inline com destaque de erro e estado de salvamento `(frontend/ux/error)` - `médio`
- [x] Melhorar estados de conexão serial com loading, retry manual e mensagens mais claras por fase `(frontend/backend/debug)` - `médio`
- [x] Respeitar `autoConnect` no boot e consolidar a heurística entre porta preferida, última porta e autodetecção `(backend/serial/runtime)` - `médio`
- [x] Adicionar testes cobrindo transições de status `booting/ready/searching/connecting/connected/error` na store `(test/coverage/debug)` - `médio`
- [x] Documentar o fluxo atual do app desktop e o papel de `apps/desktop`, `packages/shared` e `firmware/` `(docs/refs/architecture)` - `fácil`

## Scrum 02

- [x] Criar UI para listar, selecionar, duplicar, renomear e remover perfis sem editar JSON bruto `(frontend/design/state)` - `médio`
- [x] Adicionar editor estruturado para sliders, targets e preferências do perfil em paralelo ao JSON avançado `(frontend/ux/forms)` - `difícil`
- [x] Permitir reorder dos knobs e edição do nome/target direto na interface `(frontend/design/usability)` - `médio`
- [x] Cobrir migração e normalização de perfis persistidos ao adicionar novos campos `(test/migration/coverage)` - `médio`
- [x] Publicar exemplos reais de perfis JSON para master/app/source/sink `(docs/config/refs)` - `fácil`

## Scrum 03

- [x] Melhorar a resolução de aplicações com nomes duplicados e múltiplos `sink-inputs` no backend Linux `(backend/audio/error)` - `difícil`
- [x] Evitar reaplicação redundante de volume com deduplicação/debounce de updates por knob `(backend/performance/runtime)` - `médio`
- [x] Exibir no frontend por que um target falhou ou ficou indisponível sem depender só de texto genérico `(frontend/backend/debug)` - `médio`
- [x] Adicionar testes de parsing e falha para inventário `pactl` com payloads incompletos ou quebrados `(test/backend/coverage)` - `médio`
- [x] Documentar regras de matching para `application`, `source`, `sink` e defaults do Linux `(docs/backend/refs)` - `fácil`

## Scrum 05

- [x] Implementar handshake de firmware com nome da placa, versão e protocolo na conexão serial `(firmware/protocol/backend)` - `médio`
- [x] Adicionar calibração por knob com persistência em EEPROM `(firmware/hardware/calibration)` - `difícil`
- [x] Permitir dead zones, smoothing e thresholds configuráveis sem editar o sketch manualmente `(firmware/config/performance)` - `difícil`
- [x] Melhorar o filtro de portas para reduzir ruído de `/dev/tty*` irrelevantes na UI `(frontend/backend/serial)` - `médio`
- [x] Criar testes de integração com simulador serial para reconexão, heartbeat e frames inválidos `(test/firmware/debug)` - `difícil`
- [x] Validar em hardware real a gravação na EEPROM, a reaplicação após power cycle e a calibração extrema dos 3 knobs `(test/firmware/hardware)` - `médio`

## Scrum 06

- [x] Revisar navegação por teclado, foco visível e ordem de tab em toda a UI `(frontend/accessibility/design)` - `médio`
- [x] Adicionar labels acessíveis, descrições e regiões ao vivo para mudanças de status e outcomes `(frontend/accessibility/ux)` - `médio`
- [x] Completar internacionalização PT-BR/EN em toda a interface, inclusive diagnósticos e mensagens de erro `(frontend/i18n/docs)` - `médio`
- [x] Revisar contraste, estados visuais e variações de tema com foco em legibilidade `(frontend/design/accessibility)` - `médio`
- [x] Incluir testes e checklist de acessibilidade no pipeline de revisão `(test/accessibility/coverage)` - `médio`

## Scrum 07

- [x] Gerar ícones finais de produção para todos os formatos de bundle do Tauri `(design/release/branding)` - `médio`
- [x] Manter o app em segundo plano ao fechar a janela e restaurar pelo tray no Linux `(release/linux/runtime)` - `médio`
- [x] Adicionar inicialização automática no login com toggle explícito e boot silencioso no tray `(release/linux/runtime)` - `médio`
- [x] Configurar assinatura e notarização para Windows e macOS no pipeline `(release/security/ops)` - `difícil` (Windows: import PFX via PowerShell + TAURI_WINDOWS_CERTIFICATE_THUMBPRINT; macOS: keychain setup + APPLE_SIGNING_IDENTITY + notarize via APPLE_ID/APPLE_PASSWORD/APPLE_TEAM_ID; Entitlements.plist adicionado; signing ativo somente quando os secrets existem)
- [x] Revisar metadados de empacotamento Linux e qualidade do bundle desktop `(release/linux/distribution)` - `médio`
- [x] Resolver ou contornar a falha do AppImage local no Arch causada por `linuxdeploy` + `.relr.dyn` `(release/linux/appimage)` - `médio`
- [x] Validar comportamento de tray/status notifier em GNOME, KDE e Hyprland com dependências e limitações documentadas `(release/linux/desktop-environment)` - `médio` (Hyprland: handler nativo + Ctrl+Alt+I; KDE: suporte nativo; GNOME: requer extensão AppIndicator — documentado em QUICKSTART e support.md)
- [x] Adicionar checksums, provenance e validações finais de release no workflow `(release/security/ci)` - `médio` (SHA256SUMS.txt gerado e publicado; SLSA provenance via actions/attest-build-provenance@v4 para todos os binários)
- [x] Documentar instalação, update e recuperação em caso de bundle quebrado `(docs/release/support)` - `fácil` (QUICKSTART seções 12–14; docs/debug/support.md seção de update/recovery)

## Scrum 08

- [x] Implementar logging estruturado no frontend e no Rust backend para sessões reais `(backend/frontend/observability)` - `médio` (watch.rs com WatchEvent/WatchLogEntry + emit via evento Tauri; WatchLogPanel com filtros, auto-scroll e persistência em ioruba-watch.log; appendWatchLog no store; cobertura nos hooks de boot, serial e audio)
- [x] Adicionar export do watch log como arquivo (JSON ou texto) direto da UI `(frontend/backend/support)` - `fácil` (botão Exportar no painel Watch; exporta JSON Lines e mostra resultado/cancelamento na UI)
- [x] Criar comando Tauri `export_watch_log` que grava o log em arquivo escolhido pelo usuário via dialog `(backend/support)` - `fácil` (tauri-plugin-dialog + filtro `.jsonl`/`.txt`; retorna caminho e total exportado)
- [x] Criar backup/migração segura do estado persistido antes de mudanças de schema `(backend/security/migration)` - `médio` (PersistedState agora tem schemaVersion; save_persisted_state valida JSON, cria backup quando a versão muda e grava por arquivo temporário + rename)
- [x] Melhorar mensagem de erro para porta serial ocupada (distinguir "access denied / busy" de erro genérico de abertura) `(frontend/backend/error)` - `fácil` (classifySerialOpenError em src/lib/serial.ts; classifica busy/permission/not_found/unknown a partir das strings do serialport crate; 6 novos testes; integrado no catch de port.open() em use-serial-runtime.ts)
- [x] Melhorar mensagem de erro para `pactl` ausente no frontend (inventory.backend === "unsupported" deve exibir banner com instrução de instalação) `(frontend/backend/error)` - `fácil` (AudioBackendBanner em src/components/dashboard/audio-backend-banner.tsx; integrado em home e diagnostics; role="alert" aria-live="assertive"; instruções de instalação para Arch, Debian/Ubuntu e Fedora; i18n PT-BR/EN)
- [x] Melhorar mensagem de erro para perfil inválido no import/JSON bruto com linha/coluna do parse error `(frontend/error)` - `fácil` (parseProfileDraft calcula linha/coluna a partir de position do JSON.parse e mostra no erro inline)
- [x] Emitir aviso no watch log quando `trim_watch_entries` descartar entradas malformadas em vez de ignorar silenciosamente `(backend/observability)` - `fácil` (load_watch_log_entries agora conta linhas malformadas e emite warning estruturado)
- [x] Publicar playbook de suporte para bugs de áudio, firmware e serial `(docs/debug/support)` - `fácil`

## Scrum 09

- [ ] Otimizar a telemetria para sessões longas e janelas maiores sem inflar memória `(frontend/performance/charts)` - `médio`
- [ ] Revisar bundle do frontend e separar ainda melhor código de gráficos se necessário `(frontend/performance/build)` - `médio`
- [ ] Melhorar a suavização visual dos knobs respeitando `transitionDurationMs` e estado aplicado `(frontend/audio/design)` - `médio`
- [ ] Adicionar medições de tempo de boot, reconexão e refresh de inventário `(debug/performance/observability)` - `médio`
- [ ] Fazer um passe de polish em microcopy, empty states e feedback visual `(frontend/design/polish)` - `fácil`

## Scrum 10

- [ ] Criar onboarding inicial com checklist de firmware, porta serial e inventário de áudio `(frontend/onboarding/docs)` - `médio`
- [ ] Adicionar import/export de perfis para backup e compartilhamento `(frontend/backend/data)` - `médio`
- [ ] Permitir presets prontos para casos comuns como streaming, chamadas e música `(frontend/product/config)` - `fácil`
- [ ] Estudar suporte a múltiplos controladores ou mais de 3 knobs no modelo do domínio `(backend/firmware/architecture)` - `difícil`
- [ ] Definir backlog pós-migração com metas de produto além da paridade com o legado `(product/docs/roadmap)` - `fácil`

## Scrum 04 — Multiplataforma (deixar para o final)

- [ ] Definir a experiência de produto para plataformas sem backend real, incluindo banners, limitações e fallback explícito `(frontend/product/ux)` - `médio`
- [ ] Implementar backend de áudio para Windows com API nativa ou estratégia equivalente `(backend/audio/windows)` - `difícil`
- [ ] Implementar backend de áudio para macOS com API nativa ou estratégia equivalente `(backend/audio/macos)` - `difícil`
- [ ] Adicionar cobertura de CI e smoke checks por plataforma com expectativa clara de suporte `(ci/test/release)` - `médio`
- [x] Publicar uma matriz oficial de suporte por sistema operacional e recurso `(docs/platform/release)` - `fácil`
