# Contribuindo com o Ioruba

Obrigado por contribuir com código, firmware, documentação, tradução, testes ou suporte de hardware.

## Áreas do repositório

| Área | Caminho |
| --- | --- |
| UI desktop | `apps/desktop/src` |
| Shell/backend Rust | `apps/desktop/src-tauri` |
| Domínio compartilhado | `packages/shared` |
| Firmware | `firmware/arduino/ioruba-controller` |
| Documentação | raiz e `docs/` |
| Tema do site | `docs-site/` |

Protocolo e matemática de runtime pertencem ao shared. Componentes devem usar os wrappers tipados de `apps/desktop/src/lib/backend.ts`.

## Setup

```bash
npm install
npm run verify
npm run firmware:compile
```

Shell completo:

```bash
npm run desktop:watch
```

## Validação por mudança

- shared: `npm run shared:typecheck && npm run shared:test`;
- frontend: `npm run desktop:typecheck && npm run desktop:test && npm run desktop:build`;
- Rust/Tauri: fmt, clippy, `npm run rust:test` e `npm run desktop:tauri:build`;
- firmware: `npm run firmware:test && npm run firmware:test:wide && npm run firmware:compile:matrix`;
- scripts: `npm run lint:scripts && npm run test:installer`;
- packaging/updater: `npm run test:packaging`;
- docs: `npm run docs:prepare-site`;
- release: `npm run release:check`.

Veja o [Guia de testes](TESTING.md).

## Convenções

- adicione testes junto da mudança;
- mantenha tipos Rust ↔ TS sincronizados;
- preserve outcomes explícitos em plataformas sem suporte;
- atualize normalização de estado persistido ao adicionar campos;
- documente compatibilidade de protocolo;
- não edite checksum/manifest gerado à mão;
- regenere ícones com `npm run desktop:icons`;
- preserve acessibilidade e a direção visual de `.impeccable.md`;
- não reintroduza a stack legado.

## Documentação

Ao mudar comportamento, comandos, paths, defaults ou suporte:

1. atualize o documento canônico em inglês;
2. atualize o espelho PT-BR quando existir;
3. ajuste índices/navegação;
4. rode `npm run docs:prepare-site`;
5. valide exemplos contra firmware 0.6.1, 115200 baud e suporte atual.

## Pull request

Explique problema, solução, efeitos de compatibilidade e testes. Inclua screenshot/vídeo para UI, mantenha o diff focado e não inclua segredos/artefatos locais.

Antes da revisão, confirme `npm run verify`, o build Tauri quando aplicável, checks de firmware/scripts/packaging relevantes e geração das docs.

Detalhes completos: [CONTRIBUTING.md canônico](../../../../CONTRIBUTING.md).
