# Guia de Testes

Este documento e a matriz pratica de validacao da stack ativa do Ioruba.

> **Importante**
> A cobertura completa de targets atualmente esta implementada apenas no Linux. Windows suporta volume real de `master`/saida padrao via Core Audio; macOS permanece apenas em modo UI/demo.

## 1. Caminho rapido de validacao

Se voce quer o gate principal local de release pela raiz, rode:

```bash
npm run verify
npm run firmware:compile
```

Isso cobre:

- typecheck shared
- typecheck desktop
- testes shared
- testes desktop
- testes Rust
- build de producao desktop
- compilacao de firmware

## 2. Loop completo de validacao

Use isso quando quiser cada etapa explicitamente:

```bash
npm run shared:typecheck
npm run desktop:typecheck
npm run shared:test
npm run desktop:test
cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml
npm run desktop:build
npm run firmware:compile
```

## 3. Validacao de runtime desktop

Suba o shell desktop completo a partir da raiz:

```bash
npm run desktop:watch
```

O que verificar:

- o app carrega o perfil JSON persistido
- autodetecta portas seriais ou respeita a porta preferida
- a area de status percorre estados realistas de conexao
- modo demo gera telemetria sem tocar audio do sistema
- plataformas sem backend de audio mostram o banner de fallback explicito em vez dos passos de instalacao do pactl no Linux
- aba Watch registra eventos estruturados relevantes
- pacotes reais atualizam o grafico e os cards de knob
- mudar o JSON de perfil persiste entre reinicios

## 4. Validacao de protocolo serial

### Teste com Nano real

1. Grave firmware/arduino/ioruba-controller/ioruba-controller.ino
2. Confirme que a placa aparece como /dev/ttyUSB0, /dev/ttyUSB1 ou /dev/ttyACM0
3. Inicie o app desktop com npm run desktop:watch
4. Conecte pela porta preferida se autodeteccao nao pegar a correta

Formato atual esperado:

O firmware atual le as tres entradas analogicas, persiste ajuste e calibracao em EEPROM e emite linhas como:

```text
HELLO board=Ioruba Nano; fw=0.5.0; protocol=2; knobs=3; threshold=4; deadzone=7; smooth=75; mins=0,0,0; maxs=1023,1023,1023
512|768|1023
```

O runtime tambem aceita formato legado:

```text
P1:512
P2:768
P3:1023
```

Confirme:

- movimento de knobs aparece no grafico de telemetria
- ultima linha serial atualiza nos diagnosticos
- nao ocorre loop de desconexao repetido quando controlador fica ocioso

## 5. Checks de backend de audio Linux

Antes de culpar a UI, inspecione a stack de audio do host:

```bash
pactl info
pactl list short sink-inputs
pactl list short sinks
pactl list short sources
```

Interpretacao:

- pactl info precisa funcionar
- pactl list short sink-inputs precisa mostrar streams ativos se controle por app for esperado
- sink e source padrao devem existir se master ou default_microphone estiverem mapeados
- Atualizar audio no app desktop deve refletir inventario atual sem crash

## 6. Checks de backend de audio Windows

No Windows, o backend e intencionalmente mais estreito que no Linux:

- targets `master` devem atualizar o volume da saida padrao via Core Audio
- targets `application`, `source` e `sink` devem retornar outcome explicito de nao suportado
- Atualizar audio deve reportar backend `windows` e listar a saida padrao
- modo demo, leitura serial, telemetria, persistencia e packaging devem seguir funcionando normalmente

## 7. Validacao de firmware

Compile firmware:

```bash
arduino-cli compile --fqbn arduino:avr:nano firmware/arduino/ioruba-controller
```

Upload para clone Nano classico se necessario:

```bash
arduino-cli upload -p /dev/ttyUSB0 --fqbn arduino:avr:nano:cpu=atmega328old firmware/arduino/ioruba-controller
```

## 8. Validacao de persistencia

Durante smoke test manual, verifique tambem:

- ioruba-state.json e escrito no diretorio de configuracao do app
- ioruba-watch.log e escrito no mesmo diretorio
- watch log permanece limitado e nao cresce para sempre

Diretorios tipicos:

- Linux: ~/.config/io.ioruba.desktop/
- macOS: ~/Library/Application Support/io.ioruba.desktop/
- Windows: %APPDATA%\\io.ioruba.desktop\\

## 9. Troubleshooting

### Permissao negada em /dev/ttyUSB0

```bash
sudo usermod -a -G dialout $USER
sudo usermod -a -G uucp $USER
```

Depois saia da sessao e entre novamente.

### Build Tauri falha no Linux

Instale os pacotes de desenvolvimento WebKit/GTK:

```bash
sudo pacman -S --needed \
  webkit2gtk-4.1 \
  gtk3 \
  librsvg \
  appmenu-gtk-module \
  libappindicator-gtk3 \
  xdotool
```

### Sem dados da placa

- confirme 9600 baud
- confirme que o firmware foi gravado
- confira ligacao dos knobs em A0, A1 e A2
- inspecione primeiro no Arduino Serial Monitor
- confirme que nenhum outro processo esta segurando o device file

### Sem mudancas de volume de app no Linux

- garanta que o app alvo esta reproduzindo audio
- confirme os nomes de aplicativo no JSON de perfil
- rode pactl list short sink-inputs
- atualize inventario no app desktop antes de retestar

### Rodando em macOS

Trate como passagem parcial por design:

- launch e layout desktop devem funcionar
- modo demo deve funcionar
- persistencia deve funcionar
- inventario de audio deve reportar backend nao suportado em vez de fingir funcionar

### Rodando em Windows

Trate como suporte parcial de audio:

- launch e layout desktop devem funcionar
- modo demo deve funcionar
- persistencia deve funcionar
- `master` deve alterar o volume da saida padrao
- targets app/source/sink devem reportar outcomes nao suportados em vez de fingir funcionar

## 10. Gate recomendado de release

Antes de cortar release publica, verifique:

1. npm run verify passa
2. npm run firmware:compile passa
3. app desktop funciona com Nano real no Linux
4. backend Linux aplica alvos master, application, source e sink como esperado
5. backend Windows aplica `master` na saida padrao e marca outros tipos de target como nao suportados
6. fechar janela principal esconde para tray e Sair no tray encerra limpo no binario de release
7. o job Linux de release valida o AppImage gerado com scripts/validate-appimage.sh --require-launch
8. um AppImage baixado do release passa em scripts/validate-appimage.sh <arquivo> antes da publicacao do packaging Arch
9. packaging local no Arch e checado contra a limitacao conhecida linuxdeploy + .relr.dyn antes de release
10. GitHub Actions CI passa
11. tagged releases continuam produzindo bundles desktop e artefatos de firmware
12. tagged releases enviam metadados Arch (PKGBUILD, .SRCINFO, PKGBUILD-bin, .SRCINFO-bin) e source tarball usado por PKGBUILD

Se voce precisa de checklist de suporte para triagem manual, leia [docs/debug/support.md](../../debug/support.md).
