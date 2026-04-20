izei o badge para um esti# Plano de Migracao do Repositorio GitHub

## Estrategia de branches e protecao

- Manter main como branch padrao.
- Exigir workflow CI antes de merge.
- Proteger main contra force-push.
- Exigir pull request para mudancas diretas em workflows de release e configuracao de instaladores.

## Workflows

### ci.yml

- Executa em push e pull request contra main.
- Instala Node 22, Rust stable e dependencias Linux de build desktop.
- Roda:
  - npm ci
  - typecheck shared
  - typecheck desktop
  - testes shared
  - testes desktop
  - testes Rust
  - build de producao desktop
  - compilacao de firmware

### release.yml

- Dispara em tags semanticas de versao, como v0.5.0.
- Usa tauri-apps/tauri-action para gerar instaladores de:
  - Windows
  - Linux (deb, rpm, AppImage)
  - macOS
- Compila firmware Arduino separadamente e publica os artefatos na mesma release.
- Gera metadados de packaging Arch e publica na mesma release:
  - PKGBUILD + .SRCINFO para build de source (ioruba-desktop)
  - PKGBUILD-bin + .SRCINFO-bin para instalacao baseada em AppImage (ioruba-desktop-bin)
  - tarball de source com checksum versionado (ioruba-<version>.tar.gz)

## Secrets e assinatura

Para releases de teste sem assinatura, o workflow atual funciona apenas com GITHUB_TOKEN.

Para instaladores assinados em nivel de producao, configure:

- APPLE_CERTIFICATE
- APPLE_CERTIFICATE_PASSWORD
- APPLE_SIGNING_IDENTITY
- APPLE_ID
- APPLE_PASSWORD
- APPLE_TEAM_ID
- secrets de assinatura Windows se Authenticode for obrigatorio

## Procedimento de release

1. Faça merge das mudancas validadas em main.
2. Crie e publique uma tag como v0.5.0.
3. Deixe release.yml gerar instaladores e assets de firmware.
4. Verifique os bundles enviados na pagina de GitHub Release:

- instaladores desktop (deb, rpm, AppImage, Windows, macOS)
- artefatos de firmware
- arquivos de metadados Arch (PKGBUILD, .SRCINFO, PKGBUILD-bin, .SRCINFO-bin, source tarball)

5. Se for publicar no AUR, copie esses arquivos gerados para os repositorios AUR respectivos e faça push.

## Automacoes antigas removidas

Estes workflows foram removidos porque estavam presos ao caminho de distribuicao Haskell:

- publicacao no GitHub Pages
- automacao Release Please
- workflow de sync de metadados de repositorio

Se Pages ainda for desejado depois, reintroduza como workflow apenas de docs, sem acoplar ao pipeline de release do app.
