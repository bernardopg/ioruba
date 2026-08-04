# Exemplos de Perfil e Correspondencia de Alvos no Linux

Use este guia quando quiser exemplos praticos de JSON para o editor de perfil atual do Ioruba.

## 🎚️ Exemplo: apenas volume master

```json
{
  "id": "master-only",
  "name": "Master Only",
  "serial": {
    "preferredPort": null,
    "baudRate": 9600,
    "autoConnect": true,
    "heartbeatTimeoutMs": 3000
  },
  "sliders": [
    {
      "id": 0,
      "name": "Master Volume",
      "targets": [{ "kind": "master" }]
    }
  ],
  "audio": {
    "noiseReduction": "default",
    "smoothTransitions": true,
    "transitionDurationMs": 50
  },
  "ui": {
    "language": "pt-BR",
    "theme": "system",
    "showVisualizers": true,
    "telemetryWindow": 120
  }
}
```

## 🧩 Exemplo: aplicativos + microfone + sink de saida

```json
{
  "id": "streaming-desk",
  "name": "Streaming Desk",
  "serial": {
    "preferredPort": "/dev/ttyUSB0",
    "baudRate": 9600,
    "autoConnect": true,
    "heartbeatTimeoutMs": 3000
  },
  "sliders": [
    {
      "id": 0,
      "name": "Apps",
      "targets": [
        { "kind": "application", "name": "Spotify" },
        { "kind": "application", "name": "Firefox" },
        { "kind": "application", "name": "Discord" }
      ]
    },
    {
      "id": 1,
      "name": "Mic",
      "targets": [{ "kind": "source", "name": "default_microphone" }]
    },
    {
      "id": 2,
      "name": "Speakers",
      "targets": [{ "kind": "sink", "name": "default_output" }]
    }
  ],
  "audio": {
    "noiseReduction": "default",
    "smoothTransitions": true,
    "transitionDurationMs": 50
  },
  "ui": {
    "language": "pt-BR",
    "theme": "system",
    "showVisualizers": true,
    "telemetryWindow": 120
  }
}
```

## 🔇 Exemplo: controles de mute direcionado

Controles (botoes e encoders) aceitam um `target` opcional que direciona uma acao de `mute` a um sink, source ou aplicacao especifica. Sem `target`, o mute alterna a saida padrao.

```json
{
  "controls": [
    {
      "input": "button",
      "id": 0,
      "name": "Mutar Spotify",
      "event": "press",
      "action": "mute",
      "target": { "kind": "application", "name": "Spotify" }
    },
    {
      "input": "button",
      "id": 1,
      "name": "Mutar fones",
      "event": "press",
      "action": "mute",
      "target": { "kind": "sink", "name": "bluez" }
    },
    {
      "input": "button",
      "id": 2,
      "name": "Mutar microfone",
      "event": "press",
      "action": "mute",
      "target": { "kind": "source", "name": "default_microphone" }
    },
    {
      "input": "button",
      "id": 3,
      "name": "Mutar master",
      "event": "press",
      "action": "mute"
    }
  ]
}
```

O objeto `target` segue o mesmo formato e as mesmas regras de correspondencia dos targets de slider (ver abaixo). Um controle com `target` malformado (`name` ausente, `kind` desconhecido) e descartado na validacao em vez de cair silenciosamente para master; no editor de perfis do app o mesmo `target` malformado vira erro de validacao em vez de ser salvo.

**Suporte por plataforma**: no Linux todos os tipos de target funcionam; no Windows apenas `master` (ou sem target) e aceito — um target especifico retorna `supported: false`.

## 🔎 Regras de correspondencia no Linux

O backend Linux atual aplica os alvos com a logica abaixo:

### master

- mapeia para pactl set-sink-volume @DEFAULT_SINK@ ...

### application

- compara tanto o nome de aplicacao no Pulse/PipeWire quanto o nome de exibicao
- comparacao case-insensitive
- correspondencia parcial e aceita
- se nenhum sink input ativo corresponder, o resultado e reportado como app idle: ...

### source

- default_microphone tenta primeiro a source padrao atual
- se nao houver source padrao, cai para a primeira source que nao seja monitor
- nomes customizados sao comparados sem diferenciar maiusculas/minusculas com nome e descricao da source

### sink

- default_output usa o sink padrao atual
- nomes customizados sao comparados sem diferenciar maiusculas/minusculas com nome e descricao do sink

## 💡 Dicas praticas

- prefira nomes estaveis de app como Spotify, Firefox ou Discord
- atualize o inventario no app desktop antes de depurar problema de correspondencia
- mantenha ao menos um stream de audio ativo se quiser que alvos do tipo application sejam descobertos
- use default_microphone e default_output para o perfil resistir melhor a mudancas de dispositivo

## Documentos relacionados

- [../../README.md](../../README.md)
- [../../QUICKSTART.md](../../QUICKSTART.md)
- [../../TESTING.md](../../TESTING.md)
