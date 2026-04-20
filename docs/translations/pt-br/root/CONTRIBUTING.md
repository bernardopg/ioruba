# Contribuindo com o Ioruba

## Stack ativa

O caminho atual do produto vive em:

- apps/desktop para o app desktop Tauri + React
- apps/desktop/src-tauri para o backend Rust
- packages/shared para logica de protocolo e runtime compartilhada pela UI
- firmware/arduino/ioruba-controller para o firmware Arduino

Tudo que esta em legacy/ e material de referencia arquivado e so deve ser alterado quando voce estiver documentando ou comparando comportamento antigo.

## Setup local

Instale as dependencias:

```bash
npm install
```

Passe de validacao recomendado:

```bash
npm run verify
```

Se voce estiver alterando o shell desktop em si, tambem gere o binario Tauri:

```bash
npm run desktop:tauri:build
```

Se voce editar o source do icone em apps/desktop/src-tauri/icons/app-icon.svg, regenere todos os assets derivados para desktop, Android, iOS, icns e ico com:

```bash
npm run desktop:icons
```

Se voce estiver alterando firmware:

```bash
arduino-cli compile --fqbn arduino:avr:nano firmware/arduino/ioruba-controller
```

## Workflow

1. Mantenha as mudancas focadas na stack ativa, a menos que a tarefa mire explicitamente legacy/.
2. Atualize docs quando caminhos, comandos ou comportamento de runtime mudarem.
3. Prefira adicionar testes junto de packages/shared, apps/desktop ou apps/desktop/src-tauri quando houver mudanca de comportamento.
4. Regenere assets gerados, incluindo icones desktop, sempre que os arquivos-fonte mudarem.
5. Nao reintroduza arquivos Haskell na raiz nem tooling antigo de release fora de legacy/.

## Pull requests

Antes de abrir um PR, garanta que:

- npm run verify passa
- npm run desktop:tauri:build passa para mudancas no shell desktop
- firmware continua compilando quando arquivos de firmware mudarem
- docs refletem o layout atual do repositorio
