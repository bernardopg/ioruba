# Roadmap de produto

Documento vivo de metas de produto além da paridade com o protótipo legado
(Python/GTK em `legacy/`). Atualizado em 2026-06-13.

## Onde estamos

O backend Linux, o firmware e o app desktop estão completos e endurecidos:
controle de áudio via `pactl` (master/aplicação/source/sink), firmware com
handshake/calibração/EEPROM, persistência atômica de estado, observabilidade via
watch log, perfis com presets e import/export, e onboarding inicial. Releases
multiplataforma são empacotadas (deb/rpm/AppImage/nsis/msi/app) com provenance
SLSA, mas o controle de áudio real é Linux-only.

## Estudo: suporte a múltiplos controladores ou mais de 3 knobs

Hoje o domínio assume exatamente 3 knobs, fixado em três pontos:

1. **Firmware** (`firmware/arduino/ioruba-controller`): `NUM_KNOBS = 3`, três
   pinos analógicos (`A0..A2`), frame `v0|v1|v2` e struct de EEPROM com arrays de
   tamanho fixo. O handshake já reporta `knobs=N`, então o desktop sabe a
   contagem real do controlador.
2. **Protocolo** (`packages/shared/protocol.ts`): o parser de frame aceita um
   número variável de valores separados por `|` e o handshake expõe `knobCount`.
   Esta camada **já é genérica** — não presume 3.
3. **Perfil/UI**: `MixerProfile.sliders` é uma lista de tamanho arbitrário; a UI
   renderiza um `KnobPanel` por slider. Também **já é genérica**.

### Conclusão do estudo

A restrição a 3 knobs é essencialmente do **firmware e do hardware**, não do
domínio de software. Caminhos viáveis, do mais barato ao mais caro:

- **Mais de 3 knobs no mesmo board (curto prazo):** parametrizar `NUM_KNOBS` no
  sketch e expandir os arrays de EEPROM (bump de `EEPROM_SCHEMA_VERSION`). O Nano
  expõe 6 entradas analógicas usáveis (`A0..A5`) — até 6 knobs sem hardware
  adicional. O desktop já lida com `knobCount` variável; o trabalho é firmware +
  validar a UI com 4–6 canais. **Esforço: médio.**
- **Múltiplos controladores (médio/longo prazo):** exige modelar mais de uma
  conexão serial simultânea no runtime (hoje há uma porta ativa por vez), com
  identidade de controlador no handshake e roteamento de frames por porta. É uma
  mudança de arquitetura do `use-serial-runtime` e da store. **Esforço: difícil.**
- **Mais de 6 canais ou matrizes:** requer um board com mais ADCs ou um
  multiplexador analógico (ex.: CD74HC4067), o que muda o protocolo de leitura no
  firmware. Fora de escopo até haver demanda concreta. **Esforço: difícil.**

Recomendação: se houver demanda, priorizar "mais knobs no mesmo board" primeiro
(menor custo, reusa todo o software) antes de múltiplos controladores.

## Backlog pós-migração (metas de produto)

Itens além da paridade com o legado, sem ordem rígida. Os Scrums 09 e 10 de UX já
estão majoritariamente fechados (ver `TODO.md`).

- **Telemetria persistente e exportável:** hoje a telemetria é uma janela em
  memória. Avaliar histórico opcional em disco para análise de sessão.
- **Regras condicionais de mixagem:** "quando o app X tocar, reduzir Y" — automação
  acima do mapeamento direto knob→target.
- **Presets compartilháveis pela comunidade:** o import/export por arquivo já
  existe; um repositório/galeria de presets seria o próximo passo.
- **Suporte multiplataforma real:** Windows já tem backend Core Audio para
  `master`/saída padrão; ainda faltam targets por app/source/sink e backend macOS
  (Core Audio equivalente) — ver Scrum 04 no `TODO.md`.
- **Mais knobs / múltiplos controladores:** ver o estudo acima.
- **Atualizações automáticas:** integrar `tauri-plugin-updater` + assinatura de
  artefatos para entregar updates in-app (hoje desabilitado; falta a chave de
  assinatura e os artefatos `latest.json`).

## Não-objetivos

- Reescrever ou estender o protótipo `legacy/` (apenas referência histórica).
- Suporte completo a áudio em plataformas sem backend real implementado — nessas, o
  app roda em modo UI/demo ou suporte parcial com banners explícitos.
