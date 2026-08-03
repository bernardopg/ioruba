# Roadmap de produto

Documento vivo de metas de produto além da paridade com o protótipo legado
(Python/GTK, aposentado). Atualizado em 2026-08-03.

## Onde estamos

O backend Linux, o firmware e o app desktop estão completos e endurecidos:
controle de áudio via `pactl` (master/aplicação/source/sink), firmware
parametrizado por placa com handshake/calibração/EEPROM, persistência atômica de
estado, observabilidade via watch log, perfis com presets e import/export,
telemetria de sessão exportável, wizard de calibração e i18n en/pt-BR/es.
Releases multiplataforma são empacotadas (deb/rpm/AppImage/nsis/msi/app) com
provenance SLSA, mas o controle de áudio real é Linux-only.

## Resolvido: mais de 3 knobs e outras placas

Este documento carregava um estudo sobre como sair da restrição de 3 knobs. O
Scrum 11 fechou o assunto — o registro do estudo vive no git.

O firmware não presume mais 3 canais nem 10 bits: `NUM_KNOBS` vem de
`IORUBA_NUM_KNOBS`, os pinos analógicos saem de uma tabela por placa com
`static_assert` contra o limite de canais, e `ADC_MAX` vem de `IORUBA_ADC_BITS`.
O handshake reporta `board`, `mcu` e `adcBits`, e o shared normaliza contra a
resolução informada em vez do antigo `SLIDER_MAX = 1023`. A matriz de placas
suportadas e a pinagem estão em `docs/guides/hardware-setup.md`; hoje vai de 1
canal (ESP8266) a 16 (Mega2560).

O que **continua aberto** desse tema:

- **Múltiplos controladores simultâneos:** exige modelar mais de uma conexão
  serial ao mesmo tempo no runtime (hoje há uma porta ativa por vez), com
  identidade de controlador no handshake e roteamento de frames por porta. É
  mudança de arquitetura do `use-serial-runtime` e da store. **Esforço: difícil.**
- **Mais canais do que a placa expõe, ou matrizes:** requer multiplexador
  analógico (ex.: CD74HC4067), o que muda o protocolo de leitura no firmware.
  Fora de escopo até haver demanda concreta. **Esforço: difícil.**

## Backlog pós-migração (metas de produto)

Itens além da paridade com o legado, sem ordem rígida. O recorte executável e o
estado item a item ficam no `TODO.md`; aqui só a intenção de produto.

- **Telemetria persistente e exportável:** hoje a telemetria é uma janela em
  memória. Avaliar histórico opcional em disco para análise de sessão.
- **Regras condicionais de mixagem:** "quando o app X tocar, reduzir Y" — automação
  acima do mapeamento direto knob→target.
- **Presets compartilháveis pela comunidade:** o import/export por arquivo já
  existe; um repositório/galeria de presets seria o próximo passo.
- **Suporte multiplataforma real:** Windows (WASAPI) e macOS (framework CoreAudio)
  já têm backend para `master`/saída padrão. O próximo passo é cobertura de
  targets por app/source/sink fora do Linux (per-app volume via APIs de sessão de
  áudio) — ainda não mapeado.
- **Controle por atalho global:** as ações de mixagem (`mute`/`next`/`prev`) hoje
  só chegam pelos botões e encoders do controlador. Expor as mesmas ações em
  hotkeys do sistema dá controle sem o hardware e sem foco na janela.
- **Múltiplos controladores:** ver a seção acima.
- **Atualizações automáticas:** integrar `tauri-plugin-updater` + assinatura de
  artefatos para entregar updates in-app (hoje desabilitado; falta a chave de
  assinatura e os artefatos `latest.json`).

## Não-objetivos

- Suporte completo a áudio em plataformas sem backend real implementado — nessas, o
  app roda em modo UI/demo ou suporte parcial com banners explícitos.
