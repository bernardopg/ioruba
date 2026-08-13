# Playbook de suporte

Use este roteiro para isolar a falha na ordem: hardware → serial → perfil/runtime → backend de áudio → integração/update.

## Coletar primeiro

- versão do Ioruba e método de instalação;
- SO, versão, arquitetura e ambiente desktop;
- placa e handshake do firmware;
- porta serial e baud configurado;
- trecho relevante do perfil;
- export do Watch perto da falha;
- passos, resultado esperado e resultado real.

No Linux:

```bash
arduino-cli board list
pactl info
pactl list short sink-inputs
pactl list short sinks
pactl list short sources
```

Diretórios:

- Linux: `~/.config/io.ioruba.desktop/`;
- macOS: `~/Library/Application Support/io.ioruba.desktop/`;
- Windows: `%APPDATA%\io.ioruba.desktop\`.

Revise e remova dados pessoais antes de publicar logs.

## Serial

### Controlador não detectado

- use cabo USB de dados;
- confirme energia e firmware gravado;
- rode `arduino-cli board list`;
- selecione a porta manualmente;
- no Linux, confira `/dev/ttyUSB*` e `/dev/ttyACM*`.

### Permissão negada

```bash
sudo usermod -a -G dialout "$USER"
sudo usermod -a -G uucp "$USER"
```

Use o grupo da distribuição e entre novamente na sessão.

### Porta ocupada

```bash
fuser -v /dev/ttyUSB0
```

Feche monitores seriais e outros processos.

### Conectado sem frames

- confirme **115200 baud**;
- teste um monitor serial e feche-o antes do Ioruba;
- confirme protocolo 2 e quantidade de knobs;
- confira `A0/A1/A2` no Nano de referência;
- exporte o Watch em torno de connect/disconnect.

Saída esperada:

```text
HELLO board=Ioruba Nano; fw=0.6.1; protocol=2; knobs=3; mcu=ATmega328P; adcBits=10; threshold=4; deadzone=7; smooth=75; mins=0,0,0; maxs=1023,1023,1023
512|768|1023
```

Perfis com o antigo padrão 9600 são migrados automaticamente.

## Hardware

- faixa incompleta: execute o wizard de calibração;
- sentido invertido: troque os pinos externos ou marque `inverted`;
- jitter: confira GND, fios, calibração, ADC e só então smoothing.

## Áudio no Linux

### Backend indisponível

```bash
pactl info
```

É necessária uma interface `pactl` compatível com PulseAudio ou PipeWire Pulse.

### Aplicação não muda

```bash
pactl list short sink-inputs
```

Mantenha a aplicação tocando, atualize o inventário e use parte estável do nome. Aplicação inativa retorna `idle`.

### Sink/source não muda

```bash
pactl get-default-sink
pactl get-default-source
pactl list short sinks
pactl list short sources
```

Prefira `default_output` e `default_microphone`.

### Mute ou mídia falha

Mute usa `pactl`; `next`/`prev` precisam de `playerctl`. `target` só é válido para `mute`. Leia o outcome e o Watch.

## Windows e macOS

- Windows: volume/mute `master` da saída padrão via WASAPI;
- macOS: volume `master` da saída padrão via CoreAudio;
- application/source/sink continuam Linux-only.

Serial, perfis, demo, telemetria, persistência, tray e updater devem funcionar. Alvos sem suporte precisam retornar outcome explícito.

## Perfil e estado

Erros comuns no editor: JSON inválido, IDs duplicados, target sem nome, enum inválido, controle malformado ou `target` em `next`/`prev`. Compare com [Exemplos de perfil](../guides/profile-examples.md).

Para resetar:

```bash
cp -a ~/.config/io.ioruba.desktop ~/ioruba-config-backup
rm ~/.config/io.ioruba.desktop/ioruba-state.json
```

O app recria defaults. Backups `ioruba-state.backup.*.json` podem ser criados ao substituir estado corrompido/incompatível. `ioruba-watch.log` é limitado a ~1 MiB e pode ser apagado com o app fechado.

## Tray e janela

Fechar esconde a janela. Restaure pelo tray ou **Ctrl+Alt+I**; use **Sair** para encerrar.

No GNOME, instale AppIndicator/KStatusNotifierItem:

- Ubuntu: `sudo apt install gnome-shell-extension-appindicator`;
- Fedora: `sudo dnf install gnome-shell-extension-appindicator`;
- Arch: `paru -S gnome-shell-extension-appindicator`.

KDE suporta nativamente; ambientes sem host de tray usam o atalho.

## Instalação e update

Verifique downloads:

```bash
sha256sum --check SHA256SUMS.txt --ignore-missing
gh attestation verify <asset> --repo bernardopg/ioruba
```

Se update assinado falhar, exporte o Watch e confirme que o release contém `latest.json`, o artefato e `.sig`. Não ignore falha de assinatura; instale um asset verificado manualmente.

Bundles macOS atuais podem estar sem assinatura/notarização. AppImages públicos são gerados/testados no Ubuntu 22.04; build local em Arch recente pode esbarrar em `linuxdeploy`/`.relr.dyn`.

## Abrir issue

Se persistir, abra uma [issue](https://github.com/bernardopg/ioruba/issues) com o bundle mínimo de suporte.

## Documentos relacionados

- [README PT-BR](../root/README.md)
- [Início rápido](../root/QUICKSTART.md)
- [Perfis](../guides/profile-examples.md)
- [Testes](../root/TESTING.md)
