# Setup do Arduino Nano

Este guia foca na placa controladora usada pela stack atual do Ioruba.

## Design de circuito

<p align="center">
  <img src="../../../assets/circuit_schema_arduino_nano_type_c.svg" alt="Circuit Schema"/>
</p>

## Hardware alvo

- Arduino Nano ATmega328P
- 3x potenciometros lineares B10K / 10k
- A0, A1 e A2 como entradas analogicas
- saida serial em 9600 baud

Se voce ainda precisa da referencia fisica de ligacao, leia primeiro [docs/guides/hardware-setup.md](../../guides/hardware-setup.md).

## Resumo de ligacao

| Knob | Pino esquerdo | Pino central | Pino direito |
| ---- | ------------- | ------------ | ------------ |
| 1    | GND           | A0           | 5V           |
| 2    | GND           | A1           | 5V           |
| 3    | GND           | A2           | 5V           |

> Se um knob estiver invertido, troque os dois pinos externos.

## Firmware recomendado

Use o sketch ativo:

- [firmware/arduino/ioruba-controller/ioruba-controller.ino](../../../../firmware/arduino/ioruba-controller/ioruba-controller.ino)

O que ele envia:

- handshake de inicializacao e sob demanda como HELLO board=Ioruba Nano; fw=0.5.0; protocol=2; knobs=3; threshold=4; deadzone=7; smooth=75; mins=0,0,0; maxs=1023,1023,1023
- leituras analogicas suavizadas
- frames aproximadamente a cada 40 ms quando os valores mudam
- linhas separadas por pipe como 512|768|1023

O runtime desktop ainda aceita o formato legado P1:512 para compatibilidade, mas o firmware atual tambem reporta ajuste do controlador e calibracao no handshake.

## Detectar a placa

Use primeiro o arduino-cli:

```bash
arduino-cli board list
```

Voce tambem pode inspecionar os devices Linux diretamente:

```bash
ls -l /dev/ttyUSB* /dev/ttyACM* 2>/dev/null
```

Labels de chip USB comuns em clones Nano incluem CH340 e FT232R USB UART.

## Permissoes no Linux

Dependendo da distro, adicione seu usuario em dialout ou uucp:

```bash
sudo usermod -a -G dialout $USER
sudo usermod -a -G uucp $USER
```

Depois saia da sessao e entre novamente antes de testar a conexao serial.

## Compilar firmware

```bash
arduino-cli compile --fqbn arduino:avr:nano firmware/arduino/ioruba-controller
```

## Upload para o Nano

Perfil padrao do Nano:

```bash
arduino-cli upload -p /dev/ttyUSB0 --fqbn arduino:avr:nano firmware/arduino/ioruba-controller
```

Perfil old bootloader para clones comuns:

```bash
arduino-cli upload -p /dev/ttyUSB0 --fqbn arduino:avr:nano:cpu=atmega328old firmware/arduino/ioruba-controller
```

## Validar saida serial

Depois do flash, a placa deve emitir linhas como:

```text
HELLO board=Ioruba Nano; fw=0.5.0; protocol=2; knobs=3; threshold=4; deadzone=7; smooth=75; mins=0,0,0; maxs=1023,1023,1023
512|768|1023
```

O app desktop tambem solicita o mesmo handshake com HELLO? sempre que conecta ou reconecta.

Smoke test pratico:

1. inicie o shell desktop com npm run desktop:watch
2. escolha a porta serial detectada, se necessario
3. abra a aba Watch
4. gire os knobs e confirme que a telemetria atualiza
5. no Linux, verifique se os alvos de audio mapeados reagem

## Se upload falhar

Sintomas comuns:

- not in sync
- unable to read signature data
- a placa aparece como Unknown no arduino-cli board list

Correcao pratica:

- tente ambos os perfis de processador Nano
- pressione RESET pouco antes do upload iniciar
- garanta que nenhum outro app esta segurando /dev/ttyUSB0
- troque o cabo USB por um cabo de dados conhecido
- confirme que a placa e realmente um Nano-compativel ATmega328P
- se necessario, regrave bootloader com programador ISP

## Checks uteis de debug

Verifique se algo ja esta segurando a porta:

```bash
fuser -v /dev/ttyUSB0
```

Liste apps de audio Linux ativos:

```bash
pactl list short sink-inputs
```

## Guias relacionados

- [QUICKSTART.md](./QUICKSTART.md)
- [TESTING.md](./TESTING.md)
- [docs/guides/hardware-setup.md](../../guides/hardware-setup.md)
