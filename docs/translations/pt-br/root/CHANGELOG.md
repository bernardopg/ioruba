# Changelog

Todas as mudancas relevantes deste projeto sao documentadas neste arquivo.

O formato segue [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
e este projeto segue [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Nao publicado]

### Corrigido

- Os cartoes de metrica do painel Home agora se ajustam de forma responsiva e nao comprimem mais os icones quando o texto do valor e longo. O estilo das metricas saiu de utilitarios Tailwind inline para classes CSS dedicadas (`.metric-card` / `.metric-body` / `.metric-icon` / `.metric-copy`), a grade de metricas usa colunas `auto-fit` e os cantos do painel de hardware foram alinhados em `rounded-2xl`.

## [1.3.0](https://github.com/bernardopg/ioruba/compare/v1.2.3...v1.3.0) (2026-06-22)

### Corrigido

- Os logs de frame serial no watch log agora sao limitados a no maximo um por segundo. O firmware emite frames continuamente e o buffer serial acumulado e drenado em rajada ao conectar, o que antes inundava o watch log com centenas de entradas identicas `Frame serial recebido` / `Slideres elegiveis para aplicacao` em poucos milissegundos. A aplicacao de audio nao e afetada — so o logging e amostrado.
- O handshake do firmware agora e re-solicitado (ate 5 vezes, a cada 2 s) enquanto nenhum handshake for recebido. O `HELLO?` inicial podia se perder no auto-reset por DTR / ruido de boot do bootloader, deixando o app preso em "Aguardando handshake" mesmo com frames chegando normalmente.

### Alterado

- O workflow de release agora exige o workflow de CI completo (reusado via `workflow_call`) como pre-requisito de todo job de build e publicacao, incluindo o `native-audio-smoke` Windows/macOS. Isso impede que uma tag vire release com um build de plataforma quebrado — a causa do hotfix v1.2.2 -> v1.2.3, onde o erro de compilacao Windows so foi detectado pelo CI depois da tag
- O corpo do GitHub Release agora e a secao correspondente do `CHANGELOG.md`, extraida de forma deterministica e publicada literalmente (com rodape de verificacao de download)
- Removido o teste host duplicado do parser de firmware do pipeline de release; o job `firmware-host` do CI ja o roda via `ci-gate`, entao o job de release so constroi e publica o artefato

### Removido

- Removida a geracao automatica de changelog por IA do pipeline de release (job `prepare-release-notes`: GitHub Copilot CLI com fallback Codex que commitava e dava push de um `CHANGELOG.md` gerado de volta na `main` no meio do release). As notas de release agora sao escritas e revisadas a mao no `CHANGELOG.md` — sem conteudo gerado por maquina, sem escrita na `main` durante o release e sem `COPILOT_PAT` / `OPENAI_API_KEY` no caminho de release
- Removido o prototipo Python/GTK arquivado em `legacy/` e o material de planejamento em `docs/migration/`, junto de toda referencia ao diretorio legacy nos docs da raiz, no espelho PT-BR e no docs-site. A compatibilidade com o formato de pacote legacy `P1:512` (uma feature viva do protocolo) nao e afetada.

### Adicionado

- A latencia de aplicacao knob->audio agora e instrumentada: cada lote aplicado e cronometrado e um `warning` vai ao watch log quando passa do orcamento (80 ms), com o tempo decorrido e a contagem de alvos — expondo chamadas lentas de `pactl`/backend sem inundar o log (Scrum 13)
- Exportacao das estatisticas de telemetria da sessao para arquivo em JSON ou CSV (Scrum 16): botoes no painel de estatisticas salvam um resumo por knob (amostras, min/media/max/ultima %) via dialog, reusando o fluxo de export existente. Formatters puros `sessionStatsToJson`/`sessionStatsToCsv` no `@ioruba/shared` e comando Tauri `export_session_stats`
- Indicador de saude da conexao sempre visivel no sidebar (Scrum 18): dot colorido + label e leitura de frescura do sinal (tempo desde o ultimo frame, atualizada a cada segundo) como proxy de latencia, alinhado ao `.impeccable.md`
- Configuracoes divididas em tres entradas de sidebar — Perfis, Editor e Avancado — cada uma em tela cheia
- Navegacao redesenhada: sidebar organizado em grupos rotulados (Operacao / Monitoramento / Ajustes) com secoes mais granulares; Canais (knobs ao vivo) separado do painel de controle e nova secao Hardware
- Novo `HardwarePanel` mostra o handshake do firmware ponta a ponta (placa, MCU, resolucao do ADC, protocolo, knobs e calibracao por knob)
- Os toolchains de ESP32 e RP2040/Pico agora sao compilados no CI (Scrum 11): um job dedicado `firmware-arch` instala cada core de 12-bit e compila o firmware, validando o caminho `adcBits=12` ponta a ponta em toolchains reais
- Tabelas de pinos analogicos por placa (Scrum 11): o firmware nao fixa mais `{A0, A1, A2}`. Os pinos sao escolhidos em compile-time por placa (Nano A0..A7, Uno A0..A5, Mega2560 A0..A15, Leonardo/Micro A0..A11, ESP32 ADC1, RP2040/Pico A0..A2) e os primeiros `IORUBA_NUM_KNOBS` sao usados. Habilita **>6 knobs no Mega** (ate 16); um `static_assert` rejeita uma contagem de knobs acima dos canais analogicos da placa
- O CI compila o firmware numa matriz de FQBN (Nano, Uno, Mega2560, Leonardo, Micro); um job de host dedicado roda os testes do parser CONFIG nas configuracoes padrao (3 knobs / 10-bit) e ampla (8 knobs / 12-bit). `npm run firmware:compile:matrix` e `npm run firmware:test:wide` reproduzem isso localmente
- Matriz de placas suportadas (MCU, bits do ADC, canais, max knobs, ordem de pinos) documentada em `docs/guides/hardware-setup.md`
- Resolucao de ADC generica entre placas (pilar do Scrum 11). O handshake do firmware reporta `mcu=` e `adcBits=` (campos aditivos do protocolo v2; hosts antigos ignoram) e o `@ioruba/shared` normaliza as leituras brutas pelo `adcBits` ativo em vez do `1023` fixo de 10-bit. Placas de 12-bit (ESP32, RP2040/Pico -> `0..4095`) agora mapeiam para a porcentagem correta
- O firmware deriva `ADC_MAX` de `IORUBA_ADC_BITS` (auto 12 em ESP32/RP2040, 10 em AVR; sobrescrevivel por define) e reporta o nome do MCU detectado
- O painel de visao geral do desktop mostra um bloco de Hardware com placa, MCU, profundidade de bits do ADC e versao do protocolo

### Corrigido

- A constante `BOARD_NAME` do firmware foi renomeada para `IORUBA_BOARD_NAME` para evitar colisao com a macro `BOARD_NAME` definida pelo core arduino-pico (RP2040), que quebrava os builds de RP2040

### Alterado

- Funcoes de mixer/runtime do `@ioruba/shared` recebem um argumento `adcMax` opcional (10-bit por padrao, compativel com o anterior); o parser de frame serial aceita valores brutos ate 16-bit, deixando a normalizacao por placa para o runtime via `adcBits`

## [0.6.1](https://github.com/bernardopg/ioruba/compare/v0.6.0...v0.6.1) (2026-04-20)

### Alterado

- separacao do fluxo de release do desktop para que o upload do AppImage rode em um job proprio, isolado dos demais instaladores
- adicao de uma protecao de timeout aos jobs de bundle do desktop para evitar travamentos indefinidos na publicacao do release

### Correcao de bugs

- impedir que o passo de publicacao do AppImage bloqueie os assets de release de deb/rpm/Windows/macOS

## [0.6.0](https://github.com/bernardopg/ioruba/compare/v0.5.0...v0.6.0) (2026-04-20)

### Alterado

- modernizacao do site de docs, da navegacao e do fluxo de geracao de paginas para o GitHub Pages
- atualizacao do conjunto de documentacao em portugues para alinhar com a migracao para GitHub e as mudancas do README
- cobertura do Dependabot estendida para a superficie de docs e workflows
- atualizacao das dependencias de TypeScript, Vitest e GitHub Actions apos a resolucao do Dependabot

### Recursos

- adicao de tradutores PT-BR em toda a documentacao raiz, guias, notas de migracao e materiais de suporte
- adicao de um script de compatibilidade do AppImage e atualizacao do launcher desktop e do fluxo de release

### Correcao de bugs

- liberacao do workflow de smoke do repositorio para incluir o diretorio scripts
- estabilizacao do uso de GitHub Actions nos workflows de CI, CodeQL e Pages

## [0.4.0](https://github.com/bernardopg/ioruba/compare/v0.3.0...v0.4.0) (2026-04-19)

### Alterado

- atualizacao da documentacao do repositorio para refletir a stack desktop Tauri ativa, suporte Linux-first de audio e fluxo atual de hardware
- adicao do diagrama de circuito Arduino Nano Type-C e atualizacao dos docs de Nano, hardware, testes e release para o novo handshake de firmware e fluxo de smoke test Arch

### Recursos

- persistencia de calibracao de knobs e tuning de firmware em EEPROM
- adicao de comportamento de tray/background e suporte de iniciar com o login no Linux
- exposicao de thresholds, deadzone, smoothing e calibracao por knob no profile workbench desktop
- expansao do handshake serial para reportar configuracao do controlador com protocolo v2

### Correcao de bugs

- fixacao dos workflows de release e CI nas versoes atuais de GitHub Actions
- preservacao de pacotes legados P1:512 enquanto adiciona suporte de configuracao do controlador no parser serial
- alinhamento dos metadados de packaging desktop Linux com requisitos de tray e indicator

### Seguranca

- atualizacao do vite de 7.3.1 para 7.3.2 na toolchain desktop
- resolucao dos advisories GHSA-p9ff-h696-f583, GHSA-v2wj-q39q-566r e GHSA-4w7w-66w2-5vf9 no GitHub/Dependabot
- confirmacao de 0 vulnerabilidades abertas no npm audit apos o upgrade
- documentacao de que os findings restantes no Rust audit sao avisos upstream/transitivos da stack Linux atual Tauri + GTK3, sem nova vulnerabilidade introduzida no projeto

## [0.3.0](https://github.com/bernardopg/ioruba/compare/v0.2.3...v0.3.0) (2026-03-20)

### Recursos

- atualizacao da UI desktop de control deck e do fluxo live watch
- persistencia de logs de watch e melhoria dos diagnosticos de runtime serial

### Correcao de bugs

- estabilizacao das sessoes seriais Arduino durante periodos ociosos e descoberta de porta
- backport do fix Linux glib para GHSA-wrw7-89jp-8q8g

## [0.2.3](https://github.com/bernardopg/ioruba/compare/v0.2.2...v0.2.3) (2026-03-19)

### Correcao de bugs

- preservacao de permissoes dos artefatos de release em docker ([2815390](https://github.com/bernardopg/ioruba/commit/28153905da65343efa4a78954a008b0e30ca1679))

## [0.2.2](https://github.com/bernardopg/ioruba/compare/v0.2.1...v0.2.2) (2026-03-19)

### Correcao de bugs

- envio de artefatos de release instalaveis ([d474351](https://github.com/bernardopg/ioruba/commit/d4743513bd184fd63e14e3679cc09bf569d4357c))

## [0.2.1](https://github.com/bernardopg/ioruba/compare/v0.2.0...v0.2.1) (2026-03-19)

### Correcao de bugs

- passagem de nome da tag ao enviar assets de release manual ([08b7291](https://github.com/bernardopg/ioruba/commit/08b72914c1dd1d66d9fdbaf7c26c841f203e009a))
- suporte a execucoes encadeadas e manuais de artefatos de release ([42e42f8](https://github.com/bernardopg/ioruba/commit/42e42f8249eb56c182589337db2c82d8b97fb82f))

## [0.2.0](https://github.com/bernardopg/ioruba/compare/v0.1.0...v0.2.0) (2026-03-19)

### Recursos

- adicao de suporte a Arduino Nano com 3 potenciometros ([d04715b](https://github.com/bernardopg/ioruba/commit/d04715ba07441f23e29146bf434465604627f250))
- implementacao de comunicacao serial com Arduino ([2739438](https://github.com/bernardopg/ioruba/commit/2739438ee62e16fb263fe6bf02de5894dccbfc6c))
- melhoria dos docs de runtime e superficie de release ([66138ba](https://github.com/bernardopg/ioruba/commit/66138baaeaee40310fa33b79d33b335ba5abeb72))
- atualizacao do app controlador Nano e docs ([89d854d](https://github.com/bernardopg/ioruba/commit/89d854d7f556698f9e5c9de32ac663d78741e901))
- entrega de runtime Haskell e modernizacao da superficie do repositorio ([dd34cae](https://github.com/bernardopg/ioruba/commit/dd34cae5d2ef47202fbf29b376d70828b5b6b15b))

### Correcao de bugs

- foco da CI em checks acionaveis ([cdab0aa](https://github.com/bernardopg/ioruba/commit/cdab0aa493e5bf75412a822502978b9a6b15d161))
- manutencao de versionamento do release-please em package yaml ([ae44855](https://github.com/bernardopg/ioruba/commit/ae44855ec6776dbc62baf29065452fc2227ca3f9))
- CI mais rapida e com HLint passando ([bcae458](https://github.com/bernardopg/ioruba/commit/bcae458dc478c6773568ab3f8843d133ad1cbcf4))
- metadata sync ignorando corretamente quando token nao existe ([d59f445](https://github.com/bernardopg/ioruba/commit/d59f445c37c2c9212e8685f402699671b7b5687f))
- release-please atualizando arquivos de versao genericos ([d7c871d](https://github.com/bernardopg/ioruba/commit/d7c871d8cb5d361c2ff5b759e785aebdc0a90728))
- estabilizacao de automacao e conformidade com hlint ([0c7c114](https://github.com/bernardopg/ioruba/commit/0c7c11461a621bea55e568c7514f5ae5e374ba6a))

## [0.1.0] - 2025-12-22

### Adicionado

- baseline inicial com tag antes da fase atual de productizacao Haskell-first

[Nao publicado]: https://github.com/bernardopg/ioruba/compare/v0.6.1...HEAD
[0.6.1]: https://github.com/bernardopg/ioruba/releases/tag/v0.6.1
[0.6.0]: https://github.com/bernardopg/ioruba/releases/tag/v0.6.0
[0.5.0]: https://github.com/bernardopg/ioruba/releases/tag/v0.5.0
[0.4.0]: https://github.com/bernardopg/ioruba/releases/tag/v0.4.0
[0.3.0]: https://github.com/bernardopg/ioruba/releases/tag/v0.3.0
[0.1.0]: https://github.com/bernardopg/ioruba/releases/tag/v0.1.0
