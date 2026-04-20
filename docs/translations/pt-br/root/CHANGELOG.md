# Changelog

Todas as mudancas relevantes deste projeto sao documentadas neste arquivo.

O formato segue [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
e este projeto segue [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Nao publicado]

## [0.5.0](https://github.com/bernardopg/ioruba/compare/v0.4.0...v0.5.0) (2026-04-20)

### Alterado

- sincronizacao de versao do workspace e metadados de release para o corte 0.5.0
- atualizacao do conjunto de documentacao para o fluxo atual de desktop, firmware, testes e migracao

### Recursos

- adicao de helpers de traducao PT-BR/EN, guia de traducao e cobertura de acessibilidade no shell desktop
- expansao do workflow de release para enviar AppImage e metadados de packaging Arch junto dos artefatos existentes de desktop e firmware

### Correcao de bugs

- estabilizacao da configuracao do workflow CodeQL e resolucao de updates do Dependabot
- melhoria do caminho de dependencias de packaging Linux para o fluxo de release atual

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

[Nao publicado]: https://github.com/bernardopg/ioruba/compare/v0.5.0...HEAD
[0.5.0]: https://github.com/bernardopg/ioruba/releases/tag/v0.5.0
[0.4.0]: https://github.com/bernardopg/ioruba/releases/tag/v0.4.0
[0.3.0]: https://github.com/bernardopg/ioruba/releases/tag/v0.3.0
[0.1.0]: https://github.com/bernardopg/ioruba/releases/tag/v0.1.0
