# Plano de Migração do Repositório GitHub

## Estratégia de Branches e Proteção

- Manter `main` como branch padrão.
- Exigir o workflow `CI` antes do merge.
- Proteger `main` contra force-push.
- Exigir pull requests para mudanças diretas em workflows de release e configuração de instaladores.

## Workflows

### `ci.yml`

- Executa em pushes e pull requests contra `main`.
- Instala Node 22, Rust stable e dependências Linux de build desktop.
- Executa:
  - `npm ci`
  - typecheck shared
  - typecheck desktop
  - testes shared
  - testes desktop
  - testes Rust
  - build de produção desktop
  - compilação de firmware

### `release.yml`

- Dispara em tags semânticas de versão, como `v0.6.1`.
- Usa `tauri-apps/tauri-action` para gerar instaladores de:
  - Windows
  - Linux (`deb`, `rpm`, `AppImage`)
  - macOS
- Compila o firmware Arduino separadamente e publica os artefatos na mesma release.
- Gera metadados de empacotamento Arch e publica na mesma release:
  - `PKGBUILD` + `.SRCINFO` para build de source (`ioruba-desktop`)
  - `PKGBUILD-bin` + `.SRCINFO-bin` para instalação baseada em AppImage (`ioruba-desktop-bin`)
  - tarball de source com checksum versionado (`ioruba-<version>.tar.gz`)
- Gera `SHA256SUMS.txt` e atestacoes de artefatos do GitHub para assets de release.

### `pages.yml`

- Gera o site de documentacao a partir de `docs/`, manuais selecionados da raiz e `docs-site/`.
- Executa `npm run docs:prepare-site` antes do build Jekyll.
- Publica o conteudo gerado em `.site-src` no GitHub Pages.

### `docs-autoupdate.yml`

- Roda apos pushes bem-sucedidos de `CI` em `main`.
- Permite atualizacoes apenas de documentacao em `README.md`, `CONTRIBUTING.md`, `docs/` e `docs-site/`.
- Rejeita mudancas fora dessa superficie de documentacao antes do commit.

## Secrets e Assinatura

Para releases de teste sem assinatura, o workflow atual funciona apenas com `GITHUB_TOKEN`.

Para instaladores assinados em nível de produção, configure:

- `APPLE_CERTIFICATE`
- `APPLE_CERTIFICATE_PASSWORD`
- `APPLE_SIGNING_IDENTITY`
- `APPLE_ID`
- `APPLE_PASSWORD`
- `APPLE_TEAM_ID`
- secrets de assinatura Windows se Authenticode for obrigatório

## Procedimento de release

1. Faça merge das mudanças validadas em `main`.
2. Crie e publique uma tag como `v0.6.1`.
3. Deixe `release.yml` gerar os instaladores e assets de firmware.
4. Verifique os bundles enviados na página do GitHub Release:
  - instaladores desktop (`deb`, `rpm`, `AppImage`, Windows, macOS)
  - artefatos de firmware
  - arquivos de metadados Arch (`PKGBUILD`, `.SRCINFO`, `PKGBUILD-bin`, `.SRCINFO-bin`, source tarball)
5. Se for publicar no AUR, copie esses arquivos gerados para os repositórios AUR respectivos e faça push.

## Automações Antigas Removidas

Esses workflows foram removidos porque estavam presos ao caminho de distribuição Haskell:

- automação Release Please
- workflow de sync de metadados de repositório
