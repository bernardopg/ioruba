# Guia de Setup de Hardware

Use este guia quando quiser montar o controlador fisico do Ioruba.

## Alvo de montagem

O repositorio ativo foi desenhado para um setup pratico de Arduino Nano + 3 potenciometros, conectado ao app desktop Tauri.

## Lista de materiais

- 1x Arduino Nano ATmega328P
- 3x potenciometros lineares de 10k
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
HELLO board=Ioruba Nano; fw=0.5.0; protocol=2; knobs=3; threshold=4; deadzone=7; smooth=75; mins=0,0,0; maxs=1023,1023,1023
512|768|1023
```

Isso mapeia diretamente para o runtime desktop ativo. O runtime tambem aceita o formato legado antigo, mas o alvo atual de build e o formato full-frame acima junto dos metadados de handshake usados para sincronizar o ajuste do controlador.

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
