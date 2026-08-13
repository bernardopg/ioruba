# Início rápido

Use este guia para sair de uma instalação ou clone limpo até uma sessão funcional do Ioruba. A montagem de referência usa Arduino Nano e três potenciômetros.

> Linux possui cobertura completa via `pactl`. Windows e macOS controlam apenas a saída padrão (`master`). Serial, perfis, modo demo, telemetria e diagnósticos são multiplataforma.

## 1. Instalar ou preparar o desenvolvimento

Linux/macOS:

```bash
curl -fsSL https://raw.githubusercontent.com/bernardopg/ioruba/main/scripts/install.sh | sh
```

Windows PowerShell:

```powershell
irm https://raw.githubusercontent.com/bernardopg/ioruba/main/scripts/install.ps1 | iex
```

Para desenvolver:

```bash
git clone https://github.com/bernardopg/ioruba.git
cd ioruba
npm install
npm run verify
npm run desktop:watch
```

Use `npm run desktop:dev` somente para frontend no navegador; integrações nativas exigem `desktop:watch`.

## 2. Montar o controlador

| Knob | Pino externo | Centro | Outro externo |
| --- | --- | --- | --- |
| 1 | `GND` | `A0` | `5V` |
| 2 | `GND` | `A1` | `5V` |
| 3 | `GND` | `A2` | `5V` |

Use cabo USB de dados. Consulte o [guia de hardware](../guides/hardware-setup.md) para outras placas, mais knobs, botões e encoders.

## 3. Compilar e gravar

```bash
arduino-cli board list
npm run firmware:compile
```

Nano padrão:

```bash
arduino-cli upload \
  -p /dev/ttyUSB0 \
  --fqbn arduino:avr:nano \
  firmware/arduino/ioruba-controller
```

Clone com bootloader antigo:

```bash
arduino-cli upload \
  -p /dev/ttyUSB0 \
  --fqbn arduino:avr:nano:cpu=atmega328old \
  firmware/arduino/ioruba-controller
```

Troque a porta conforme `arduino-cli board list`.

## 4. Permissão serial no Linux

```bash
sudo usermod -a -G dialout "$USER"
sudo usermod -a -G uucp "$USER"
```

Use o grupo da sua distribuição e entre novamente na sessão.

## 5. Conectar

Confirme:

1. porta detectada/selecionada;
2. status conectado;
3. handshake com placa, firmware, protocolo, knobs, MCU e ADC;
4. Watch recebendo `512|768|1023`;
5. knobs atualizando controles e telemetria;
6. protocolo 2 compatível no painel Hardware;
7. perfil persistindo após reinício.

Contrato atual:

```text
HELLO board=Ioruba Nano; fw=0.6.1; protocol=2; knobs=3; mcu=ATmega328P; adcBits=10; threshold=4; deadzone=7; smooth=75; mins=0,0,0; maxs=1023,1023,1023
512|768|1023
```

O padrão é **115200 baud**. Perfis com o antigo padrão 9600 são migrados.

## 6. Configurar áudio

Abra **Configurações → Editor de perfil**. O perfil padrão mapeia master, Spotify/Chrome/Firefox e microfone padrão.

No Linux:

```bash
pactl info
pactl list short sink-inputs
pactl list short sinks
pactl list short sources
```

Mantenha aplicações reproduzindo áudio e clique em **Atualizar áudio**. Use `default_output`/`default_microphone` para perfis resistentes a trocas de dispositivo.

## 7. Calibração e telemetria

- calibre cada knob na seção Hardware;
- exporte estatísticas de sessão em JSON/CSV;
- filtre/exporte o watch log;
- use o editor visual para bindings de botões/encoders;
- use modo demo para testar UI sem alterar áudio.

## 8. Janela, tray e dados

Fechar esconde a janela. Restaure pelo tray ou **Ctrl+Alt+I**; use **Sair** para encerrar.

Dados:

- Linux: `~/.config/io.ioruba.desktop/`;
- macOS: `~/Library/Application Support/io.ioruba.desktop/`;
- Windows: `%APPDATA%\io.ioruba.desktop\`.

`ioruba-state.json` guarda perfis/preferências; `ioruba-watch.log` é limitado a cerca de 1 MiB. Faça backup e remova apenas o state para restaurar defaults.

## Problemas comuns

### Sem frames

- confirme 115200 baud;
- feche outros monitores seriais;
- confira cabo e `A0/A1/A2`;
- rode `fuser -v /dev/ttyUSB0`;
- tente o perfil old bootloader ao gravar.

### Áudio Linux não muda

- confirme `pactl info`;
- mantenha a aplicação ativa;
- atualize o inventário;
- confira nomes em `pactl list short sink-inputs`;
- leia o outcome e o Watch.

### Windows/macOS não controlam aplicação

Limitação atual explícita: apenas `master`/saída padrão. Outros tipos retornam não suportado.

## Próximas leituras

- [README PT-BR](README.md)
- [Setup do Nano](NANO_SETUP.md)
- [Hardware](../guides/hardware-setup.md)
- [Perfis](../guides/profile-examples.md)
- [Suporte](../debug/support.md)
- [Testes](TESTING.md)
