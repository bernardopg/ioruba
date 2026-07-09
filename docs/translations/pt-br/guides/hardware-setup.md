# Guia de Setup de Hardware

Use este guia quando quiser montar o controlador fisico do Ioruba.

## Alvo de montagem

O repositorio ativo foi desenhado para um setup pratico de Arduino Nano + 3 potenciometros, conectado ao app desktop Tauri.

## Lista de materiais

- 1x Arduino Nano ATmega328P
- 3x potenciometros lineares de 10k
- opcional: botoes momentaneos ou encoders rotativos para `mute` / `next` / `prev`
- 1x cabo USB de dados
- fios jumper
- protoboard, placa perfurada ou case

## Mapa de ligacao

| Controle | Pino esquerdo | Pino central | Pino direito |
| -------- | ------------- | ------------ | ------------ |
| Knob 1   | GND           | A0           | 5V           |
| Knob 2   | GND           | A1           | 5V           |
| Knob 3   | GND           | A2           | 5V           |

> Se o sentido horario/anti-horario parecer invertido, troque os dois pinos externos daquele potenciometro.

## Layout ASCII rapido

```text
Arduino Nano
┌──────────────────────┐
│ A0 ───── knob 1      │
│ A1 ───── knob 2      │
│ A2 ───── knob 3      │
│ 5V ───── pinos ext.  │
│ GND ──── pinos ext.  │
│ USB ──── computador  │
└──────────────────────┘
```

## Checklist de montagem

- mantenha os tres potenciometros com GND compartilhado
- mantenha os tres potenciometros com 5V compartilhado
- conecte apenas o pino central de cada knob a uma entrada analogica
- use cabo USB de dados, nao cabo apenas de carga
- deixe folga suficiente nos fios se for montar em um case

## O que o firmware espera

O firmware atual le as tres entradas analogicas, persiste ajuste e calibracao em EEPROM e emite linhas como:

```text
HELLO board=Ioruba Nano; fw=0.5.1; protocol=2; knobs=3; mcu=ATmega328P; adcBits=10; threshold=4; deadzone=7; smooth=75; mins=0,0,0; maxs=1023,1023,1023
512|768|1023
```

Isso mapeia diretamente para o runtime desktop ativo. O runtime tambem aceita o formato legado antigo, mas o alvo atual de build e o formato full-frame acima junto dos metadados de handshake usados para sincronizar o ajuste do controlador.

Os campos `mcu` e `adcBits` sao metadados aditivos do protocolo v2: firmwares antigos que os omitem continuam funcionando (o desktop assume 10-bit). O `adcBits` permite ao desktop normalizar as leituras para placas com resolucao de ADC diferente — placas AVR reportam `10` (`0..1023`), enquanto ESP32 e RP2040/Pico reportam `12` (`0..4095`). O firmware detecta a profundidade de bits automaticamente a partir da arquitetura alvo; sobrescreva em compile-time com `-DIORUBA_ADC_BITS=<n>` se preciso.

## Botoes e encoders opcionais

Controles digitais ficam desabilitados por padrao. Habilite em compile-time:

```bash
arduino-cli compile --fqbn arduino:avr:nano \
  --build-property "compiler.cpp.extra_flags=-DIORUBA_NUM_BUTTONS=1 -DIORUBA_NUM_ENCODERS=1" \
  firmware/arduino/ioruba-controller
```

Ordem padrao dos pinos digitais:

| Input | Pinos | Ligacao |
| ----- | ----- | ------- |
| Botoes | `D2 D3 D4 D5 D6 D7 D8 D9` | um lado no pino, outro no `GND`; o firmware usa `INPUT_PULLUP` |
| Encoders | `D6/D7`, `D8/D9`, `D10/D11`, `D12/D13` | canais A/B no par, comum no `GND`; o firmware usa `INPUT_PULLUP` |

Evite sobrepor pinos quando habilitar botoes e encoders juntos. Por exemplo, `-DIORUBA_NUM_BUTTONS=2 -DIORUBA_NUM_ENCODERS=1` usa botoes em `D2/D3` e o encoder 0 em `D6/D7`.

O desktop faz opt-in enviando `EVENTS ON` depois da conexao. Ate esse comando chegar, o firmware so emite frames de knob, mantendo compatibilidade com builds desktop antigos. Depois de habilitado, os eventos aparecem assim:

```text
EV type=button; id=0; event=press
EV type=encoder; id=0; delta=1
```

Adicione bindings ao perfil pelo array `controls`:

```json
"controls": [
  { "input": "button", "id": 0, "name": "Mute", "event": "press", "action": "mute" },
  { "input": "encoder", "id": 0, "name": "Proxima faixa", "direction": "clockwise", "action": "next" },
  { "input": "encoder", "id": 0, "name": "Faixa anterior", "direction": "counterclockwise", "action": "prev" }
]
```

No Linux, `mute` usa `pactl set-sink-mute @DEFAULT_SINK@ toggle`; `next` e `prev` usam `playerctl` quando instalado. No Windows, o suporte atual cobre `mute` na saida padrao. Acoes sem suporte sao reportadas no watch log sem derrubar o runtime serial.

## Placas suportadas

O build de referencia e o Nano com 3 knobs, mas o firmware e parametrico. A quantidade de knobs vem de `-DIORUBA_NUM_KNOBS=<n>` em compile-time, e os pinos analogicos saem de uma tabela por placa (os primeiros `n` canais). Um `static_assert` quebra o build se `n` exceder os canais analogicos da placa.

| Placa            | MCU          | Bits ADC | Canais analogicos | Max knobs | Ordem dos pinos (primeiros knobs usam nesta ordem) |
| ---------------- | ------------ | -------- | ----------------- | --------- | --------------------------------------------------- |
| Arduino Nano     | ATmega328P   | 10       | 8                 | 8         | `A0 A1 A2 A3 A4 A5 A6 A7`                            |
| Arduino Uno      | ATmega328P   | 10       | 6                 | 6         | `A0 A1 A2 A3 A4 A5`                                  |
| Arduino Mega2560 | ATmega2560   | 10       | 16                | 16        | `A0 A1 … A15`                                        |
| Leonardo / Micro | ATmega32U4   | 10       | 12                | 12        | `A0 A1 … A11`                                        |
| ESP32            | ESP32        | 12       | 6 (so ADC1)       | 6         | `A0 A3 A4 A5 A6 A7` (ADC2 e reservado ao Wi-Fi)     |
| RP2040 / Pico    | RP2040       | 12       | 3                 | 3         | `A0 A1 A2`                                           |
| ESP8266 (NodeMCU)| ESP8266      | 10       | 1 (so A0)         | 1         | `A0` (unico pino analogico exposto pelo core Arduino) |

Compile para uma placa especifica com `arduino-cli`, ex. um Mega com 8 knobs:

```bash
arduino-cli compile --fqbn arduino:avr:mega \
  --build-property "compiler.cpp.extra_flags=-DIORUBA_NUM_KNOBS=8" \
  firmware/arduino/ioruba-controller
```

`npm run firmware:compile:matrix` compila o firmware para todas as placas AVR acima de uma vez (a mesma matriz que o CI roda).

ESP32, RP2040 e ESP8266 precisam dos seus proprios cores do `arduino-cli`. O CI compila os tres num job dedicado `firmware-arch`; instale localmente com:

```bash
# ESP32
arduino-cli core install esp32:esp32 \
  --additional-urls https://espressif.github.io/arduino-esp32/package_esp32_index.json
arduino-cli compile --fqbn esp32:esp32:esp32 firmware/arduino/ioruba-controller

# RP2040 / Pico (core earlephilhower)
arduino-cli core install rp2040:rp2040 \
  --additional-urls https://github.com/earlephilhower/arduino-pico/releases/download/global/package_rp2040_index.json
arduino-cli compile --fqbn rp2040:rp2040:rpipico firmware/arduino/ioruba-controller

# ESP8266 (NodeMCU) — expoe so 1 pino analogico, entao IORUBA_NUM_KNOBS precisa
# ser sobrescrito para 1 (senao o static_assert(IORUBA_NUM_KNOBS <= ANALOG_PIN_COUNT) trava).
arduino-cli core install esp8266:esp8266 \
  --additional-urls http://arduino.esp8266.com/stable/package_esp8266com_index.json
arduino-cli compile --fqbn esp8266:esp8266:nodemcuv2 \
  --build-property "build.extra_flags=-DIORUBA_NUM_KNOBS=1" \
  firmware/arduino/ioruba-controller
```

## Depois de ligar o hardware

Proximos passos:

1. grave a placa seguindo [NANO_SETUP.md](../../NANO_SETUP.md)
2. inicie o app com npm run desktop:watch
3. verifique se a aba Watch recebe frames seriais
4. no Linux, confirme se os alvos padrao reagem como esperado

Comportamento do perfil padrao:

- knob 1 controla master
- knob 2 mira apps como Spotify, Google Chrome e Firefox
- knob 3 mira default_microphone

## Solucao de problemas

### Sem saida serial

- verifique o cabo USB primeiro
- confirme que o firmware foi gravado
- confirme 9600 baud
- teste no monitor serial da Arduino IDE antes de culpar o app desktop

### Upload falha

- tente o perfil de Nano com old bootloader
- pressione RESET pouco antes do upload iniciar
- verifique se outro app ja esta segurando /dev/ttyUSB0

### Permissao negada no Linux

```bash
sudo usermod -a -G dialout $USER
sudo usermod -a -G uucp $USER
```

Encerre a sessao e entre novamente antes de testar.

## Guias relacionados

- [../../QUICKSTART.md](../../QUICKSTART.md)
- [../../NANO_SETUP.md](../../NANO_SETUP.md)
- [../../TESTING.md](../../TESTING.md)
