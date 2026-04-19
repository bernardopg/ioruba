# TODO

Atualizado para o projeto ativo em `2026-04-19`, com checks revisados a partir do estado real do código, da documentação, dos testes e dos assets do repositório.

Formato:

- `[x]` concluído
- `[ ]` pendente
- descrição `(tag/tag/tag)` - `fácil|médio|difícil`

Prioridade atual: concluir primeiro tudo que é Linux/firmware/desktop. O backlog multiplataforma do Scrum 04 fica para o final.

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

- [ ] Revisar navegação por teclado, foco visível e ordem de tab em toda a UI `(frontend/accessibility/design)` - `médio`
- [ ] Adicionar labels acessíveis, descrições e regiões ao vivo para mudanças de status e outcomes `(frontend/accessibility/ux)` - `médio`
- [ ] Completar internacionalização PT-BR/EN em toda a interface, inclusive diagnósticos e mensagens de erro `(frontend/i18n/docs)` - `médio`
- [ ] Revisar contraste, estados visuais e variações de tema com foco em legibilidade `(frontend/design/accessibility)` - `médio`
- [ ] Incluir testes e checklist de acessibilidade no pipeline de revisão `(test/accessibility/coverage)` - `médio`

## Scrum 07

- [x] Gerar ícones finais de produção para todos os formatos de bundle do Tauri `(design/release/branding)` - `médio`
- [x] Manter o app em segundo plano ao fechar a janela e restaurar pelo tray no Linux `(release/linux/runtime)` - `médio`
- [x] Adicionar inicialização automática no login com toggle explícito e boot silencioso no tray `(release/linux/runtime)` - `médio`
- [ ] Configurar assinatura e notarização para Windows e macOS no pipeline `(release/security/ops)` - `difícil`
- [ ] Revisar metadados de empacotamento Linux e qualidade do bundle desktop `(release/linux/distribution)` - `médio`
- [ ] Resolver ou contornar a falha do AppImage local no Arch causada por `linuxdeploy` + `.relr.dyn` `(release/linux/appimage)` - `médio`
- [ ] Validar comportamento de tray/status notifier em GNOME, KDE e Hyprland com dependências e limitações documentadas `(release/linux/desktop-environment)` - `médio`
- [ ] Adicionar checksums, provenance e validações finais de release no workflow `(release/security/ci)` - `médio`
- [ ] Documentar instalação, update e recuperação em caso de bundle quebrado `(docs/release/support)` - `fácil`

## Scrum 08

- [ ] Implementar logging estruturado no frontend e no Rust backend para sessões reais `(backend/frontend/observability)` - `médio`
- [ ] Adicionar painel ou export de diagnóstico com snapshot do estado, inventário e erros recentes `(frontend/backend/support)` - `médio`
- [ ] Criar backup/migração segura do estado persistido antes de mudanças de schema `(backend/security/migration)` - `médio`
- [ ] Melhorar mensagens de erro para serial ocupada, `pactl` ausente e perfil inválido `(frontend/backend/error)` - `fácil`
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
