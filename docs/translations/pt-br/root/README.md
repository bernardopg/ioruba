<div align="center">

<a href="https://github.com/bernardopg/ioruba/actions/workflows/release.yml">
  <img alt="Release workflow" src="https://github.com/bernardopg/ioruba/actions/workflows/release.yml/badge.svg" />
</a>
<a href="https://github.com/bernardopg/ioruba/actions/workflows/ci.yml">
  <img alt="CI workflow" src="https://github.com/bernardopg/ioruba/actions/workflows/ci.yml/badge.svg" />
</a>
<a href="../../../../package.json">
  <img alt="Version" src="https://img.shields.io/github/package-json/v/bernardopg/ioruba?filename=package.json&label=version" />
</a>
<a href="./TODO.md">
  <img alt="Project status" src="https://img.shields.io/badge/status-active%20development-2ea043" />
</a>
<a href="https://github.com/bernardopg/ioruba/commits/main">
  <img alt="Last commit" src="https://img.shields.io/github/last-commit/bernardopg/ioruba?label=last%20commit" />
</a>
<a href="../../../../LICENSE">
  <img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-0A66C2" />
</a>

<br />

<a href="https://github.com/sponsors/bernardopg">
  <img alt="GitHub Sponsors" src="https://img.shields.io/badge/GitHub%20Sponsors-30363D?logo=GitHub-Sponsors&logoColor=EA4AAA" />
</a>
<a href="https://www.buymeacoffee.com/WctwoM9eMU">
  <img alt="Buy Me a Coffee" src="https://img.shields.io/badge/Buy%20Me%20a%20Coffee-FFDD00?logo=buy-me-a-coffee&logoColor=black" />
</a>

<br />

<a href="https://tauri.app/">
  <img alt="Tauri 2" src="https://img.shields.io/badge/Tauri-2-24C8DB?logo=tauri&logoColor=fff" />
</a>
<a href="https://www.rust-lang.org/">
  <img alt="Rust" src="https://img.shields.io/badge/Rust-%23000000.svg?logo=rust&logoColor=white" />
</a>
<a href="https://www.typescriptlang.org/">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=fff" />
</a>
<a href="https://isocpp.org/">
  <img alt="C++" src="https://img.shields.io/badge/C++-%2300599C.svg?logo=c%2B%2B&logoColor=white" />
</a>
<a href="https://www.arduino.cc/">
  <img alt="Arduino Nano" src="https://img.shields.io/badge/Arduino%20Nano-00979D?logo=arduino&logoColor=white" />
</a>
<a href="https://nodejs.org/en">
  <img alt="Node.js 22" src="https://img.shields.io/badge/Node.js-22-5FA04E?logo=node.js&logoColor=white" />
</a>

</div>

# Ioruba

Ioruba transforma um Arduino Nano + 3 knobs em um control deck tatil para desktop. O caminho ativo do produto e um app Tauri 2 + React + TypeScript com backend Rust para operacoes de audio do sistema e firmware Arduino C++ para o controlador fisico.

> **Status atual de plataforma**
> O controle real de audio esta implementado para Linux via pactl. Builds para macOS e Windows ainda sao uteis para revisao de UI, checks de packaging e modo demo, mas nao entregam backend de audio pronto para producao.

[Releases](https://github.com/bernardopg/ioruba/releases) · [Inicio Rapido](./QUICKSTART.md) · [Setup de Hardware](../../guides/hardware-setup.md) · [Setup do Nano](./NANO_SETUP.md) · [Exemplos de Perfil](../../guides/profile-examples.md) · [Guia de Traducoes](../../guides/translation-guide.md) · [Suporte](../../debug/support.md) · [Testes](./TESTING.md) · [Contribuicao](./CONTRIBUTING.md) · [Financiamento](./FUNDING.md) · [Roadmap](./TODO.md)

<p align="center">
  <img src="../../../../apps/desktop/src-tauri/icons/icon.png" alt="Ioruba app icon" width="112" />
</p>

## Referencia visual

![Ioruba visual reference](../../../assets/screenshot.png)

## Por que este repositorio existe

O projeto preserva a experiencia de hardware de um mixer pequeno enquanto moderniza a stack de software:

- runtime desktop ativo em apps/desktop
- firmware consolidado em firmware/arduino/ioruba-controller
- logica compartilhada de protocolo/runtime em packages/shared
- backend de audio Linux reescrito em Rust com pactl
- persistencia migrada de YAML/UI state para modelo local em JSON
- historico de migracao e notas de paridade em docs/migration
- um prototipo Python/GTK arquivado mantido em legacy/

## O que voce recebe hoje

- pacotes seriais como 512|768|1023
- metadados de handshake com nome da placa, firmware, protocolo e quantidade de knobs
- compatibilidade com formato legado P1:512
- telemetria ao vivo e watch log persistente dentro do app desktop
- perfis JSON editaveis no diretorio de configuracao do app
- modo demo para validar UI sem tocar no audio real
- tratamento de alvos Linux para master, application, source e sink
- CI para validacao desktop/shared e compilacao de firmware
- workflows de release com bundles desktop (deb, rpm, AppImage), artefatos de firmware e metadados Arch (PKGBUILD + .SRCINFO)

## Instalacao rapida

Use o caminho de pacote que combina com seu sistema. Todos os instaladores sao publicados em:

- https://github.com/bernardopg/ioruba/releases/latest

### Arch Linux (AUR)

Pacote compilado do source:

```bash
yay -S ioruba-desktop
```

Pacote binario baseado em AppImage:

```bash
yay -S ioruba-desktop-bin
```

### Debian / Ubuntu / Linux Mint / Pop!\_OS

```bash
curl -s https://api.github.com/repos/bernardopg/ioruba/releases/latest \
  | jq -r '.assets[] | select(.name | test("\\.deb$")) | .browser_download_url' \
  | xargs -n1 curl -LO

sudo apt install ./Ioruba_*_amd64.deb
```

### Fedora / RHEL / CentOS Stream / openSUSE (RPM)

```bash
curl -s https://api.github.com/repos/bernardopg/ioruba/releases/latest \
  | jq -r '.assets[] | select(.name | test("\\.rpm$")) | .browser_download_url' \
  | xargs -n1 curl -LO

sudo dnf install ./Ioruba-*.x86_64.rpm
```

Se sua distro nao usa dnf, instale o mesmo RPM com zypper, yum etc.

### Qualquer Linux (AppImage)

```bash
curl -s https://api.github.com/repos/bernardopg/ioruba/releases/latest \
  | jq -r '.assets[] | select(.name | test("\\.AppImage$")) | .browser_download_url' \
  | xargs -n1 curl -LO

chmod +x Ioruba_*.AppImage
./Ioruba_*.AppImage
```

### Windows

Baixe um destes assets na pagina do latest release:

- Ioruba\_...\_x64-setup.exe
- Ioruba\_...\_x64_en-US.msi

### macOS (Apple Silicon)

Baixe um destes assets na pagina do latest release:

- Ioruba\_...\_aarch64.dmg
- Ioruba_aarch64.app.tar.gz

## Inicio rapido de desenvolvimento

Instale dependencias e valide a stack ativa:

```bash
npm install
npm run verify
```

Compile firmware do sketch atual:

```bash
npm run firmware:compile
```

Rode o app desktop:

```bash
npm run desktop:dev
npm run desktop:watch
```

- npm run desktop:dev sobe so frontend
- npm run desktop:watch sobe shell desktop Tauri completo

## Comandos comuns

| Comando                     | O que faz                                                                             |
| --------------------------- | ------------------------------------------------------------------------------------- |
| npm run verify              | Roda typecheck shared + desktop, testes shared + desktop, testes Rust e build desktop |
| npm run desktop:dev         | Inicia frontend Vite para trabalho de UI                                              |
| npm run desktop:watch       | Inicia app desktop Tauri em desenvolvimento                                           |
| npm run desktop:icons       | Regenere assets de icones desktop a partir de app-icon.svg                            |
| npm run desktop:tauri:build | Build local do app Tauri sem bundle de instaladores                                   |
| npm run firmware:compile    | Compila firmware Arduino Nano                                                         |
| npm run rust:test           | Roda testes do backend Rust                                                           |
| npm run rust:audit          | Audita lockfile Rust considerando backport local de glib                              |

## Mapa do repositorio

| Caminho                            | Finalidade                                                               |
| ---------------------------------- | ------------------------------------------------------------------------ |
| apps/desktop                       | App desktop Tauri 2, UI React, estado Zustand e dashboards de telemetria |
| apps/desktop/src-tauri             | Comandos Rust para persistencia, watch log e controle de audio Linux     |
| packages/shared                    | Tipos de dominio, defaults, matematica de runtime e parsing de protocolo |
| firmware/arduino/ioruba-controller | Firmware Arduino para placas compativeis com Nano                        |
| docs/guides                        | Guias praticos de setup                                                  |
| docs/migration                     | Planejamento de migracao e material de auditoria de paridade             |
| legacy                             | Prototipo Python/GTK arquivado e sobras historicas                       |

## Persistencia e diagnostico

O app guarda arquivos de runtime no diretorio de config da plataforma:

- watch log: ioruba-watch.log
- estado de perfil ativo: ioruba-state.json

Locais tipicos:

- Linux: ~/.config/io.ioruba.desktop/
- macOS: ~/Library/Application Support/io.ioruba.desktop/
- Windows: %APPDATA%\\io.ioruba.desktop\\

## Nota de seguranca para builds Linux

A stack Linux atual do Tauri ainda resolve por GTK3 glib 0.18.x, entao o repositorio carrega um backport local de GHSA-wrw7-89jp-8q8g em apps/desktop/src-tauri/vendor/glib-0.18.5 ate o upstream migrar. Para auditar lockfile atual considerando esse contexto:

```bash
npm run rust:audit
```

## Licenca

MIT
