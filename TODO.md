# TODO

Atualizado para o projeto ativo em `2026-04-19`, com checks revisados a partir do estado real do código, da documentação, dos testes e dos assets do repositório.

Formato:

- `[x]` concluído
- `[ ]` pendente
- descrição `(tag/tag/tag)` - `fácil|médio|difícil`

Prioridade atual: concluir primeiro tudo que é Linux/firmware/desktop. O backlog multiplataforma do Scrum 04 fica para o final.

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
