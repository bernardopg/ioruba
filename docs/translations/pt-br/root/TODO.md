# TODO

Atualizado para o projeto ativo em 2026-04-19, com checks revisados a partir do estado real do codigo, da documentacao, dos testes e dos assets do repositorio.

Formato:

- [x] concluido
- [ ] pendente
- descricao (tag/tag/tag) - facil|medio|dificil

Prioridade atual: concluir primeiro tudo que e Linux/firmware/desktop. O backlog multiplataforma do Scrum 04 fica para o final.

## Atualizacoes recentes (main pos-v0.5.0)

- [x] Fechar o corte de release 0.5.0 em versoes, changelog e documentacao de distribuicao (release/version/docs) - medio
- [x] Adicionar workflow de CodeQL para analise continua de seguranca e qualidade (ci/security/codeql) - facil
- [x] Ajustar linguagem/regra do CodeQL e reduzir ruido dos alertas para focar em findings acionaveis (ci/security/codeql) - medio
- [x] Estabilizar updates de GitHub Actions no Dependabot para evitar conflitos recorrentes (ci/dependabot/maintenance) - facil
- [x] Revisar badges e organizacao visual do README com status e matriz de suporte (docs/release/product) - facil
- [x] Melhorar .gitignore para cobrir artefatos gerados no ciclo atual de desenvolvimento (repo/hygiene/tooling) - facil

## Scrum 01

- [x] Trocar o window.alert do editor JSON por validacao inline com destaque de erro e estado de salvamento (frontend/ux/error) - medio
- [x] Melhorar estados de conexao serial com loading, retry manual e mensagens mais claras por fase (frontend/backend/debug) - medio
- [x] Respeitar autoConnect no boot e consolidar a heuristica entre porta preferida, ultima porta e autodeteccao (backend/serial/runtime) - medio
- [x] Adicionar testes cobrindo transicoes de status booting/ready/searching/connecting/connected/error na store (test/coverage/debug) - medio
- [x] Documentar o fluxo atual do app desktop e o papel de apps/desktop, packages/shared e firmware/ (docs/refs/architecture) - facil

## Scrum 02

- [x] Criar UI para listar, selecionar, duplicar, renomear e remover perfis sem editar JSON bruto (frontend/design/state) - medio
- [x] Adicionar editor estruturado para sliders, targets e preferencias do perfil em paralelo ao JSON avancado (frontend/ux/forms) - dificil
- [x] Permitir reorder dos knobs e edicao do nome/target direto na interface (frontend/design/usability) - medio
- [x] Cobrir migracao e normalizacao de perfis persistidos ao adicionar novos campos (test/migration/coverage) - medio
- [x] Publicar exemplos reais de perfis JSON para master/app/source/sink (docs/config/refs) - facil

## Scrum 03

- [x] Melhorar a resolucao de aplicacoes com nomes duplicados e multiplos sink-inputs no backend Linux (backend/audio/error) - dificil
- [x] Evitar reaplicacao redundante de volume com deduplicacao/debounce de updates por knob (backend/performance/runtime) - medio
- [x] Exibir no frontend por que um target falhou ou ficou indisponivel sem depender so de texto generico (frontend/backend/debug) - medio
- [x] Adicionar testes de parsing e falha para inventario pactl com payloads incompletos ou quebrados (test/backend/coverage) - medio
- [x] Documentar regras de matching para application, source, sink e defaults do Linux (docs/backend/refs) - facil

## Scrum 05

- [x] Implementar handshake de firmware com nome da placa, versao e protocolo na conexao serial (firmware/protocol/backend) - medio
- [x] Adicionar calibracao por knob com persistencia em EEPROM (firmware/hardware/calibration) - dificil
- [x] Permitir dead zones, smoothing e thresholds configuraveis sem editar o sketch manualmente (firmware/config/performance) - dificil
- [x] Melhorar o filtro de portas para reduzir ruido de /dev/tty\* irrelevantes na UI (frontend/backend/serial) - medio
- [x] Criar testes de integracao com simulador serial para reconexao, heartbeat e frames invalidos (test/firmware/debug) - dificil
- [x] Validar em hardware real a gravacao na EEPROM, a reaplicacao apos power cycle e a calibracao extrema dos 3 knobs (test/firmware/hardware) - medio

## Scrum 06

- [x] Revisar navegacao por teclado, foco visivel e ordem de tab em toda a UI (frontend/accessibility/design) - medio
- [x] Adicionar labels acessiveis, descricoes e regioes ao vivo para mudancas de status e outcomes (frontend/accessibility/ux) - medio
- [ ] Completar internacionalizacao PT-BR/EN em toda a interface, inclusive diagnosticos e mensagens de erro (frontend/i18n/docs) - medio (em andamento)
- [ ] Revisar contraste, estados visuais e variacoes de tema com foco em legibilidade (frontend/design/accessibility) - medio (em andamento)
- [ ] Incluir testes e checklist de acessibilidade no pipeline de revisao (test/accessibility/coverage) - medio

## Scrum 07

- [x] Gerar icones finais de producao para todos os formatos de bundle do Tauri (design/release/branding) - medio
- [x] Manter o app em segundo plano ao fechar a janela e restaurar pelo tray no Linux (release/linux/runtime) - medio
- [x] Adicionar inicializacao automatica no login com toggle explicito e boot silencioso no tray (release/linux/runtime) - medio
- [ ] Configurar assinatura e notarizacao para Windows e macOS no pipeline (release/security/ops) - dificil
- [ ] Revisar metadados de empacotamento Linux e qualidade do bundle desktop (release/linux/distribution) - medio
- [ ] Resolver ou contornar a falha do AppImage local no Arch causada por linuxdeploy + .relr.dyn (release/linux/appimage) - medio
- [ ] Validar comportamento de tray/status notifier em GNOME, KDE e Hyprland com dependencias e limitacoes documentadas (release/linux/desktop-environment) - medio
- [ ] Adicionar checksums, provenance e validacoes finais de release no workflow (release/security/ci) - medio
- [ ] Documentar instalacao, update e recuperacao em caso de bundle quebrado (docs/release/support) - facil

## Scrum 08

- [ ] Implementar logging estruturado no frontend e no Rust backend para sessoes reais (backend/frontend/observability) - medio
- [ ] Adicionar painel ou export de diagnostico com snapshot do estado, inventario e erros recentes (frontend/backend/support) - medio
- [ ] Criar backup/migracao segura do estado persistido antes de mudancas de schema (backend/security/migration) - medio
- [ ] Melhorar mensagens de erro para serial ocupada, pactl ausente e perfil invalido (frontend/backend/error) - facil
- [x] Publicar playbook de suporte para bugs de audio, firmware e serial (docs/debug/support) - facil

## Scrum 09

- [ ] Otimizar a telemetria para sessoes longas e janelas maiores sem inflar memoria (frontend/performance/charts) - medio
- [ ] Revisar bundle do frontend e separar ainda melhor codigo de graficos se necessario (frontend/performance/build) - medio
- [ ] Melhorar a suavizacao visual dos knobs respeitando transitionDurationMs e estado aplicado (frontend/audio/design) - medio
- [ ] Adicionar medicoes de tempo de boot, reconexao e refresh de inventario (debug/performance/observability) - medio
- [ ] Fazer um passe de polish em microcopy, empty states e feedback visual (frontend/design/polish) - facil

## Scrum 10

- [ ] Criar onboarding inicial com checklist de firmware, porta serial e inventario de audio (frontend/onboarding/docs) - medio
- [ ] Adicionar import/export de perfis para backup e compartilhamento (frontend/backend/data) - medio
- [ ] Permitir presets prontos para casos comuns como streaming, chamadas e musica (frontend/product/config) - facil
- [ ] Estudar suporte a multiplos controladores ou mais de 3 knobs no modelo de dominio (backend/firmware/architecture) - dificil
- [ ] Definir backlog pos-migracao com metas de produto alem da paridade com o legado (product/docs/roadmap) - facil

## Scrum 04 - Multiplataforma (deixar para o final)

- [ ] Definir experiencia de produto para plataformas sem backend real, incluindo banners, limitacoes e fallback explicito (frontend/product/ux) - medio
- [ ] Implementar backend de audio para Windows com API nativa ou estrategia equivalente (backend/audio/windows) - dificil
- [ ] Implementar backend de audio para macOS com API nativa ou estrategia equivalente (backend/audio/macos) - dificil
- [ ] Adicionar cobertura de CI e smoke checks por plataforma com expectativa clara de suporte (ci/test/release) - medio
- [x] Publicar matriz oficial de suporte por sistema operacional e recurso (docs/platform/release) - facil
