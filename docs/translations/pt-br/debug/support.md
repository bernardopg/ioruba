# Playbook de Suporte

Use este documento quando voce precisar de um checklist pratico de triagem para a stack atual do Ioruba.

## 🧾 O que coletar primeiro

Antes de abrir uma issue ou depurar uma sessao com problema, capture:

- sistema operacional e versao
- se voce esta usando um Nano real ou modo demo
- o JSON de perfil atual na aba Config
- as ultimas linhas de ioruba-watch.log
- saida de:

```bash
node --version
npm --version
pactl info
arduino-cli board list
```

Locais uteis de configuracao:

- Linux: ~/.config/io.ioruba.desktop/
- macOS: ~/Library/Application Support/io.ioruba.desktop/
- Windows: %APPDATA%\\io.ioruba.desktop\\

## 🔌 Problemas de serial

### Sintoma: controlador nao encontrado

Verifique:

- a placa esta alimentada por um cabo USB de dados real
- o sketch em firmware/arduino/ioruba-controller foi gravado
- a placa aparece em arduino-cli board list
- seu usuario Linux esta nos grupos dialout e/ou uucp

Comandos:

```bash
arduino-cli board list
ls -l /dev/ttyUSB* /dev/ttyACM* 2>/dev/null
```

### Sintoma: porta ocupada ou permissao negada

Verifique se outra ferramenta esta segurando a porta:

```bash
fuser -v /dev/ttyUSB0
```

Corrija permissoes no Linux se necessario:

```bash
sudo usermod -a -G dialout $USER
sudo usermod -a -G uucp $USER
```

Depois, encerre a sessao e entre novamente.

## 🎛️ Problemas de audio no Linux

### Sintoma: backend indisponivel

O caminho de audio de producao atual depende de pactl.

Verifique:

```bash
pactl info
```

Se falhar, instale uma interface compativel com PulseAudio, como PipeWire Pulse ou utilitarios do PulseAudio.

### Sintoma: aplicativos nao se movem

Verifique:

```bash
pactl list short sink-inputs
```

Dicas:

- mantenha o aplicativo alvo reproduzindo audio ativamente
- atualize o inventario no app desktop
- use nomes estaveis de aplicacao no JSON de perfil

### Sintoma: microfone ou saida nao se move

Verifique:

```bash
pactl list short sinks
pactl list short sources
pactl get-default-sink
pactl get-default-source
```

Prefira default_output e default_microphone quando quiser que os perfis sobrevivam a mudancas de dispositivo.

## 🧩 Problemas no JSON de perfil

### Sintoma: perfil nao salva

O editor ja faz validacao inline. Causas comuns:

- sintaxe JSON invalida
- slider id duplicado
- name vazio
- kind invalido
- valores de enum invalidos em audio ou ui

Exemplos de referencia:

- [../guides/profile-examples.md](../guides/profile-examples.md)

## 📈 Problemas de runtime e watch log

Se a UI abrir mas o comportamento ainda parecer incorreto:

- inspecione a aba Watch
- compare a ultima linha serial com o movimento no controlador
- verifique se o app esta preso em searching, connecting, connected ou demo
- confirme se ioruba-watch.log esta sendo escrito no diretorio de configuracao

## 🖥️ Plataformas nao Linux

No macOS e Windows, trate o app atual como:

- valido para revisao de layout
- valido para modo demo
- valido para validacao de persistencia
- ainda nao pronto para producao em controle real de audio do sistema

## Documentos relacionados

- [../../README.md](../../README.md)
- [../../QUICKSTART.md](../../QUICKSTART.md)
- [../guides/profile-examples.md](../guides/profile-examples.md)
- [../../TESTING.md](../../TESTING.md)
