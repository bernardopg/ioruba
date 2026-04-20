# Inicio Rapido

Este e o caminho mais rapido de um clone limpo para uma sessao Ioruba funcionando na stack Linux ativa.

> **Atencao**
> O controle real de audio do sistema atualmente depende do backend Linux com pactl. No macOS e Windows, o shell desktop ainda e util para revisao de UI e modo demo, mas o controle de audio ainda nao foi implementado.

## 1. O que voce precisa

### Software

- Node.js 22 recomendado (mesma major usada na CI)
- npm
- Rust stable + Cargo
- arduino-cli
- pactl disponivel no PATH

### Hardware

- Arduino Nano ATmega328P
- 3 potenciometros lineares de 10k
- cabo USB de dados
- fios jumper e protoboard ou case

Check rapido de versao:

```bash
node --version
npm --version
rustc --version
cargo --version
arduino-cli version
pactl info
```

## 2. Instalar dependencias do repositorio

```bash
npm install
```

## 3. Preparar permissoes seriais no Linux

Dependendo da distro, adicione seu usuario em dialout ou uucp:

```bash
sudo usermod -a -G dialout $USER
sudo usermod -a -G uucp $USER
```

Saia da sessao e entre novamente apos mudar grupos.

## 4. Ligar e gravar o controlador

Se voce ainda precisa montar o hardware, comece por:

- [docs/guides/hardware-setup.md](../../guides/hardware-setup.md)
- [NANO_SETUP.md](./NANO_SETUP.md)

Detecte a placa:

```bash
arduino-cli board list
```

Compile o firmware atual:

```bash
arduino-cli compile --fqbn arduino:avr:nano firmware/arduino/ioruba-controller
```

Upload para Nano padrao:

```bash
arduino-cli upload -p /dev/ttyUSB0 --fqbn arduino:avr:nano firmware/arduino/ioruba-controller
```

Upload para clones comuns de Nano com old bootloader:

```bash
arduino-cli upload -p /dev/ttyUSB0 --fqbn arduino:avr:nano:cpu=atmega328old firmware/arduino/ioruba-controller
```

## 5. Validar o repositorio

Rode os checks automatizados principais antes de subir o shell desktop:

```bash
npm run verify
```

Se voce so quiser garantir que o firmware ainda compila pela raiz:

```bash
npm run firmware:compile
```

## 6. Iniciar o app desktop

Somente frontend:

```bash
npm run desktop:dev
```

Shell desktop Tauri completo:

```bash
npm run desktop:watch
```

Use o shell Tauri para sessoes seriais reais, persistencia e validacao de backend.

## 7. Confirmar que esta tudo funcionando

Quando o app abrir, o fluxo esperado e:

- o app descobre portas seriais ou respeita sua porta preferida
- o card de status passa pelos estados de conexao em vez de ficar parado
- o runtime recebe handshake de firmware antes ou junto dos frames de knob
- a aba Watch mostra frames como 512|768|1023
- o grafico de telemetria reage quando voce gira os knobs
- o perfil ativo e salvo como JSON e sobrevive a reinicios
- Atualizar audio atualiza o inventario de audio Linux
- girar os knobs atualiza alvos como master, apps ou entrada de microfone

Mapeamento do perfil padrao:

| Knob | Alvo padrao                     |
| ---- | ------------------------------- |
| 1    | Saida padrao / volume master    |
| 2    | Spotify, Google Chrome, Firefox |
| 3    | default_microphone              |

## 8. Onde o app salva dados

O app desktop persiste dois arquivos importantes:

- ioruba-state.json - perfil ativo e estado de runtime
- ioruba-watch.log - eventos estruturados da watch, com trim automatico para cerca de 1 MiB

Locais:

- Linux: ~/.config/io.ioruba.desktop/
- macOS: ~/Library/Application Support/io.ioruba.desktop/
- Windows: %APPDATA%\\io.ioruba.desktop\\

## 9. Build local do app desktop

Para build local Tauri sem instaladores finais:

```bash
npm run desktop:tauri:build
```

Se voce mudar o source do icone em apps/desktop/src-tauri/icons/app-icon.svg, regenere todos os assets derivados antes:

```bash
npm run desktop:icons
```

## 10. Solucao rapida de problemas

### Tauri falha para compilar no Linux

Instale os pacotes de desenvolvimento WebKit/GTK exigidos pelo Tauri:

```bash
sudo pacman -S --needed \
  webkit2gtk-4.1 \
  gtk3 \
  librsvg \
  appmenu-gtk-module \
  libappindicator-gtk3 \
  xdotool
```

No Arch, o caminho de tray depende de libappindicator-gtk3. Isso bate com os prerequisitos Linux atuais do Tauri 2.

## 11. Smoke test como usuario final no Arch

Tente gerar um artefato Linux instalavel pela raiz do repositorio:

```bash
npm --workspace @ioruba/desktop run tauri build -- --bundles appimage
```

O AppImage fica em:

```bash
apps/desktop/src-tauri/target/release/bundle/appimage/
```

Execute como um usuario final faria:

```bash
./apps/desktop/src-tauri/target/release/bundle/appimage/Ioruba_*.AppImage
```

O que verificar:

- o app abre normalmente fora do tauri dev
- fechar a janela principal nao mata o processo
- o app continua disponivel no tray
- clique esquerdo ou a acao Abrir Ioruba no tray restaura a janela
- Sair pelo tray realmente encerra o processo
- persistencia, conexao serial e Atualizar audio continuam iguais

Limitacao conhecida em hosts Arch atuais:

- o passo de bundling AppImage ainda pode falhar dentro do linuxdeploy porque o strip embutido nao entende libs novas do Arch com .relr.dyn
- quando isso acontecer, trate o binario de release em apps/desktop/src-tauri/target/release/ioruba-desktop como alvo local de smoke test para tray/background
- para artefatos AppImage publicos, prefira build em CI ou em imagem Linux mais antiga em vez de um Arch bleeding-edge

### O app abre mas nenhum pacote chega

- confirme que a placa esta com o sketch atual
- confirme que a placa responde com HELLO board=...; fw=...; protocol=...; knobs=...
- confirme que a placa esta enviando 512|768|1023
- confirme 9600 baud
- confira a ligacao dos knobs em A0, A1 e A2
- verifique a porta serial selecionada no app
- tente o perfil old bootloader se voce usa clone

### Alvos de audio nao se movem

- confirme que pactl info funciona
- garanta que apps alvo estao reproduzindo audio
- atualize o inventario pelo app desktop
- inspecione o perfil JSON na aba Config

### Voce esta em macOS ou Windows

Esse caminho hoje deve ser tratado como validacao parcial de UI/demo. O shell desktop pode compilar e abrir, mas o backend real de audio esta explicitamente sem suporte fora do Linux.

## Leituras seguintes

- [README.md](./README.md) para visao geral do repositorio
- [NANO_SETUP.md](./NANO_SETUP.md) para detalhes de firmware e serial
- [docs/guides/profile-examples.md](../../guides/profile-examples.md) para amostras de JSON de perfil
- [docs/debug/support.md](../../debug/support.md) para playbook de troubleshooting
- [TESTING.md](./TESTING.md) para matriz de validacao
- [docs/migration/logic-audit.md](../../migration/logic-audit.md) para cobertura de paridade da migracao
