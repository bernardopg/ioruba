# Relatório: falha do release v1.8.3 e do updater in-app

**Data da investigação:** 2026-08-25
**Sintoma relatado:** o app mostra `1.8.2`, oferece toast de update para `1.8.3`,
e ao clicar em "Atualizar e reiniciar" nada acontece.

---

## Resumo executivo

O release `v1.8.3` foi publicado **sem nunca ter havido um commit de bump de versão**.
A tag `v1.8.3` aponta para exatamente o mesmo commit que já continha `version: 1.8.2`
em `package.json`, `tauri.conf.json` e `Cargo.toml`.

Consequência em cadeia:

1. Todos os binários do release `v1.8.3` são, internamente e no nome do arquivo, **1.8.2**.
2. O `latest.json` anuncia `"version": "1.8.3"` porque é derivado **só da tag**, sem
   conferir o que os bundles realmente são.
3. O app instalado se identifica como `1.8.2` → o updater compara `1.8.2 < 1.8.3` →
   toast aparece **para sempre**, mesmo depois de "atualizar".
4. O clique falha com `Permission denied (os error 13)` porque o pacote instalado é
   um pacote **pacman**, e o updater do Tauri tenta sobrescrever `/usr/bin/ioruba-desktop`
   (root) com um AppImage.

Ou seja: são **dois bugs independentes** que se somam.

---

## Evidências

### 1. A tag v1.8.3 não tem bump de versão

```
$ git log -1 --format='%H %s' v1.8.2
bc2a2896103ade8bb6545ea21f5d49b937224ac9 chore(deps): bump remaining npm deps for v1.8.2

$ git log -1 --format='%H %s' v1.8.3
def478247ce8dfc9dc5ae00c82e662cceec07a87 chore(release): allow unsigned Windows bundles until cert is available

$ git show v1.8.3:apps/desktop/src-tauri/tauri.conf.json | grep version
  "version": "1.8.2",

$ git show v1.8.3:apps/desktop/src-tauri/Cargo.toml | grep version
version = "1.8.2"

$ git show v1.8.3:package.json | grep version
  "version": "1.8.2",
```

Comparando com releases anteriores, existe `e2c8a9d chore(release): prepare v1.8.2` e
`5be56b7 chore(release): prepare v1.8.1`. **Não existe `prepare v1.8.3`.**
A tag foi criada em cima de um hotfix de CI (`def4782`) sem passar pelo ritual de release.

O `CHANGELOG.md` também **não tem seção `## [1.8.3]`** — o topo ainda é `## [1.8.2]`.

### 2. Os assets do release v1.8.3 têm nome 1.8.2

```
$ gh release view v1.8.3 --json assets
Ioruba_1.8.2_amd64.AppImage       84589048
Ioruba_1.8.2_amd64.deb             7262744
Ioruba-1.8.2-1.x86_64.rpm          7262445
Ioruba_1.8.2_x64-setup.exe         3931355
Ioruba_1.8.2_x64_en-US.msi         5545984
Ioruba_1.8.2_x64.app.tar.gz        5926651
Ioruba_1.8.2_aarch64.app.tar.gz    5827108
ioruba-1.8.3.tar.gz                2939269   <-- único com 1.8.3 (tarball do git, gerado do tag)
```

O tarball de código-fonte é `1.8.3`, mas o código dentro dele declara `1.8.2`.

### 3. latest.json é internamente inconsistente

`latest.json` do release v1.8.3:

```json
{
  "version": "1.8.3",
  "platforms": {
    "linux-x86_64": {
      "url": ".../download/v1.8.3/Ioruba_1.8.2_amd64.AppImage"
    }
  }
}
```

Anuncia 1.8.3, entrega um binário 1.8.2. A assinatura *é válida* (conferi que o blob
em `latest.json` bate byte a byte com `Ioruba_1.8.2_amd64.AppImage.sig` do release v1.8.3),
então a verificação minisign **passa** — o updater não tem como detectar o problema.

**Causa raiz no código** — `scripts/packaging/updater-manifest.mjs:22`:

```js
const version = String(release.tag_name ?? "").replace(/^v/, "");
```

A versão do manifesto vem **exclusivamente da tag do Git**. Nunca é validada contra a
versão real dos bundles nem contra `tauri.conf.json`.

### 4. Loop infinito do toast

`apps/desktop/src/hooks/use-signed-updater.ts` chama `check()`, que compara a versão
compilada no binário (`1.8.2`) com `latest.json` (`1.8.3`). Como o download entrega
outro `1.8.2`, mesmo num cenário de sucesso total o app voltaria como `1.8.2` e o toast
reapareceria. É um loop de atualização que nunca converge.

### 5. O clique falha por permissão (o "nada acontece")

Log real do app, em `~/.config/io.ioruba.desktop/ioruba-watch.log`:

```json
{"seq":294,"scope":"app","level":"error","message":"Falha ao baixar atualização assinada","detail":"Permission denied (os error 13)"}
{"seq":295,"scope":"app","level":"error","message":"Falha ao baixar atualização assinada","detail":"Permission denied (os error 13)"}
```

Motivo: você instalou via AUR/pacman.

```
$ pacman -Qi ioruba-desktop
Versão : 1.8.3-1
$ pacman -Ql ioruba-desktop
/usr/bin/ioruba-desktop      (root:root, 15647632 bytes)
```

No `tauri-plugin-updater-2.10.1/src/updater.rs:968`:

```rust
fn install_inner(&self, bytes: &[u8]) -> Result<()> {
    match installer_for_bundle_type(bundle_type()) {
        Some(Installer::Deb) => self.install_deb(bytes),
        Some(Installer::Rpm) => self.install_rpm(bytes),
        _ => self.install_appimage(bytes),   // <-- cai aqui
    }
}
```

Para um build de source (pacman/AUR), `bundle_type()` retorna `None` (só DEB/RPM/APP/MSI/NSS
são reconhecidos — `tauri-utils-2.9.3/src/platform.rs:353`), então o updater assume AppImage
e tenta reescrever `current_exe()` = `/usr/bin/ioruba-desktop`, que pertence ao root. → EACCES.

Note ainda a contradição: o pacote pacman diz `1.8.3-1`, mas o binário dentro dele é 1.8.2,
porque o PKGBUILD compila a partir da tag `v1.8.3` (que contém código 1.8.2).
O `PKGBUILD-bin` deixa isso explícito:

```bash
pkgver=1.8.3
source=("Ioruba_1.8.2_amd64.AppImage::.../v${pkgver}/Ioruba_1.8.2_amd64.AppImage")
```

### 6. Contexto do CI

```
Release [32659604991]  tag v1.8.2  FAILURE  (job "Desktop Bundles (windows-x86_64)")
Release [32660830835]  tag v1.8.3  SUCCESS
```

O release v1.8.2 quebrou no Windows por falta de certificado Authenticode. O fix foi
`def4782` ("allow unsigned Windows bundles"), e aí a tag `v1.8.3` foi criada **em cima do
fix apenas para reexecutar o workflow**. v1.8.3 não é um release de produto — é um
*re-run* de v1.8.2 disfarçado de versão nova. Isso explica por que os artefatos ficaram
com nome 1.8.2: era literalmente a mesma árvore de código.

---

## Problemas encontrados (lista)

| # | Severidade | Problema |
|---|-----------|----------|
| 1 | **Crítico** | Tag `v1.8.3` criada sem commit de bump; código na tag declara 1.8.2 |
| 2 | **Crítico** | `latest.json` anuncia 1.8.3 apontando para binários 1.8.2 → loop de update infinito |
| 3 | **Alto** | `updater-manifest.mjs:22` deriva a versão só da tag, sem validar contra os bundles |
| 4 | **Alto** | Workflow de release não valida `tag == tauri.conf.json.version` antes de buildar |
| 5 | **Alto** | Updater in-app quebra em instalações pacman/AUR (`Permission denied`); Linux só suporta AppImage/deb/rpm |
| 6 | **Médio** | AUR publica `pkgver=1.8.3` para um binário que é 1.8.2 |
| 7 | **Médio** | `CHANGELOG.md` não tem seção `[1.8.3]`; release notes ficaram genéricas |
| 8 | **Baixo** | UX: erro de update aparece só como frase genérica; sem detalhe acionável nem link para download manual |

---

## Correções recomendadas

### Imediato (destravar seu ambiente)

O update in-app nunca vai funcionar nesta instalação. Atualize pelo pacman quando sair
uma versão real. Para parar o toast agora, a única saída limpa é republicar o `latest.json`
correto (ver abaixo).

### Curto prazo — consertar o release

1. Fazer o bump de verdade: `1.8.3` em `package.json`, `apps/desktop/package.json`,
   `apps/desktop/src-tauri/tauri.conf.json`, `apps/desktop/src-tauri/Cargo.toml`
   (+ `Cargo.lock`), e adicionar a seção `## [1.8.3]` no `CHANGELOG.md`.
2. Deletar a tag/release `v1.8.3` e recriar a partir do commit de bump — ou, preferível,
   pular para `v1.8.4` e marcar `v1.8.3` como *pre-release*/*draft* para tirar do
   `releases/latest` (é dali que o endpoint do updater lê).

   > Enquanto `v1.8.3` for o "latest", todo usuário 1.8.2 continua no loop.

### Guard-rails no CI (para não repetir)

3. Adicionar um job de pré-flight no `release.yml`, antes de qualquer build:

   ```bash
   VERSION="${RELEASE_TAG#v}"
   for f in package.json apps/desktop/package.json apps/desktop/src-tauri/tauri.conf.json; do
     FOUND="$(jq -r .version "$f")"
     [ "$FOUND" = "$VERSION" ] || { echo "::error::$f=$FOUND != tag $VERSION"; exit 1; }
   done
   grep -q "^version = \"${VERSION}\"" apps/desktop/src-tauri/Cargo.toml \
     || { echo "::error::Cargo.toml != tag $VERSION"; exit 1; }
   grep -q "^## \[${VERSION}\]" CHANGELOG.md \
     || { echo "::error::CHANGELOG sem seção ${VERSION}"; exit 1; }
   ```

4. Em `scripts/packaging/updater-manifest.mjs`, validar que cada asset escolhido contém
   a versão no nome antes de escrever o manifesto:

   ```js
   if (!assetName.includes(version)) {
     throw new Error(`Asset ${assetName} não corresponde à versão ${version}`);
   }
   ```

### Updater para pacotes de distro

5. Detectar instalação gerenciada por gerenciador de pacotes e **não** oferecer
   auto-update. Heurística: se `current_exe()` estiver sob `/usr` e não houver
   `$APPIMAGE`, trocar o botão "Atualizar e reiniciar" por "Ver release no GitHub"
   (o `opener:allow-open-url` para `github.com/bernardopg/ioruba*` já está liberado nas
   capabilities).
6. Alternativamente, expor a flag em build time (ex.: `IORUBA_MANAGED_INSTALL=1` no
   PKGBUILD) e ler no `lib.rs` para desabilitar o `useSignedUpdater`.
7. Melhorar a mensagem de erro em `update-toast.tsx` para exibir `signedUpdate.error`
   (hoje o detalhe real, `Permission denied (os error 13)`, só vai para o watch log —
   por isso pareceu que "nada acontece").

---

## Arquivos relevantes

- `/home/bitter/development/ioruba/.github/workflows/release.yml` (job `updater-json`, linhas 255-303)
- `/home/bitter/development/ioruba/scripts/packaging/updater-manifest.mjs` (linha 22)
- `/home/bitter/development/ioruba/apps/desktop/src/hooks/use-signed-updater.ts`
- `/home/bitter/development/ioruba/apps/desktop/src/components/dashboard/update-toast.tsx`
- `/home/bitter/development/ioruba/apps/desktop/src-tauri/tauri.conf.json` (bloco `plugins.updater`)
- `/home/bitter/development/ioruba/CHANGELOG.md`
- Log de runtime: `~/.config/io.ioruba.desktop/ioruba-watch.log`

---

# Parte 2 — Correções aplicadas (2026-08-25)

Todas verificadas com `npm run verify` (127 testes de frontend, 45 Rust,
21 de packaging) e `npm run lint:scripts`.

| # | Correção | Arquivos |
|---|----------|----------|
| 1 | Bump 1.8.2 → **1.8.4** (pulando a 1.8.3 queimada) | `package.json`, `apps/desktop/package.json`, `tauri.conf.json`, `Cargo.toml`, `Cargo.lock` |
| 2 | Seção `## [1.8.4]` + nota explicando a v1.8.3 | `CHANGELOG.md` |
| 3 | Gate de consistência de versão antes de qualquer build | `.github/workflows/release.yml` |
| 4 | Manifesto recusa asset cuja versão não bate com a tag | `scripts/packaging/updater-manifest.mjs` |
| 5 | Detecção de instalação gerenciada por distro | `apps/desktop/src-tauri/src/lib.rs`, `src/lib/backend.ts`, `src/hooks/use-signed-updater.ts` |
| 6 | Toast mostra erro real + botão "Ver release no GitHub" | `src/components/dashboard/update-toast.tsx`, `src/lib/i18n.ts` |
| 7 | Warning do appindicator silenciado | `apps/desktop/src-tauri/src/lib.rs`, `Cargo.toml` |
| 8 | Teste do CHANGELOG deixou de depender da versão do topo | `src/lib/changelog.test.ts` |

O gate de versão foi validado nos dois sentidos: aprova a tag `v1.8.4` e reprova
`v1.8.3` apontando exatamente os cinco arquivos divergentes.

## Sobre o warning do applet

**A premissa de que "agora há uma correção" não se confirma.** Não existe correção
upstream disponível:

- `tauri-apps/tray-icon#260` está aberto e marcado **`wontfix`**.
- A `libayatana-appindicator-glib` sugerida pela própria mensagem **ainda não tem
  release utilizável** (`AyatanaIndicators/libayatana-appindicator-glib#98`).
  FabianLars, mantenedor: *"That deprecation warning is a bit mind boggling to me
  considering that the glib version isn't actually available yet."*
- `tauri-apps/libappindicator-rs#50` foi fechado com a decisão de **não** migrar
  para a glib; o plano é ir para `ksni` (`tray-icon#201`), PR aberto desde
  2024-11 e bloqueado pela migração do `muda` para GTK4.
- `tray-icon` 0.24.2 (vs. 0.24.1 em uso) **não** altera isso — continua com
  `dep:libappindicator` 0.9.

Ou seja: não há upgrade de dependência que resolva, e o aviso não indica nenhum
problema real na aplicação — é ruído sem ação possível do nosso lado.

O que foi feito: instalar um handler de log GLib restrito ao domínio
`libayatana-appindicator` e ao nível `WARNING`, que descarta **apenas** mensagens
contendo `"is deprecated"`. Qualquer outra mensagem — inclusive erros dessa mesma
biblioteca — continua sendo impressa.

Verificação empírica:

```
# binario novo
$ ./target/debug/ioruba-desktop 2>&1 | grep -c "appindicator is deprecated"
0

# binario 1.8.2 atualmente instalado
$ /usr/bin/ioruba-desktop 2>&1 | grep -c "appindicator is deprecated"
1
```

---

# Parte 3 — TODOs recomendados antes do próximo release

## TODO 1 — Despromover a v1.8.3 e limpar os feeds já publicados (bloqueante)

Enquanto `v1.8.3` continuar sendo o `releases/latest`, **todo usuário 1.8.2 segue
no loop de update agora mesmo** — as correções de código só valem para quem
instalar a 1.8.4. É uma ação operacional, não de código:

1. `gh release edit v1.8.3 --prerelease` (tira de `releases/latest`, que é o
   endpoint lido pelo updater).
2. Remover ou corrigir o `latest.json` da v1.8.3.
3. Reverter o AUR: `ioruba-desktop` e `ioruba-desktop-bin` estão publicados como
   `1.8.3-1` contendo binários 1.8.2.
4. Corrigir o tap do Homebrew (ver TODO 2).

## TODO 2 — Validar os manifestos de package manager contra os assets reais

A suíte `test:packaging` valida a **forma** dos manifestos, mas nunca confere se
as URLs existem. Resultado concreto na v1.8.3 — a fórmula do Homebrew está
**completamente quebrada**:

```ruby
version "1.8.3"
url ".../v#{version}/Ioruba_#{version}_#{arch}.app.tar.gz"
```

Interpola para `Ioruba_1.8.3_x64.app.tar.gz`, que não existe no release:

```
Ioruba_1.8.3_x64.app.tar.gz    -> HTTP 404
Ioruba_1.8.3_arm64.app.tar.gz  -> HTTP 404
Ioruba_1.8.2_x64.app.tar.gz    -> HTTP 200   (o que existe de fato)
```

Scoop e WinGet escaparam por acaso, porque gravaram o nome literal do arquivo
(`Ioruba_1.8.2_x64-setup.exe`) — mas então instalam 1.8.2 rotulado como 1.8.3.
Note que o Scoop também tem um bloco `autoupdate` usando `$version`, que vai
reproduzir o mesmo 404 do Homebrew no próximo release.

**Ação:** job pós-publicação que faça `HEAD` em toda URL de todo manifesto
(homebrew, scoop, winget, PKGBUILD) e confira o SHA-256 contra `SHA256SUMS.txt`.
Falha o release em vez de publicar um feed que retorna 404.

## TODO 3 — Reconectar a assinatura de código (Windows e macOS)

O hotfix `def4782` removeu mais do que a mensagem de commit sugere. Além do gate
de certificado Windows, ele apagou também o **import do certificado Apple**,
deixando duas variáveis consumidas mas nunca definidas:

```
$ rg -n "WINDOWS_CERTIFICATE_THUMBPRINT" .github/workflows/release.yml
229:   TAURI_WINDOWS_CERTIFICATE_THUMBPRINT: ${{ env.WINDOWS_CERTIFICATE_THUMBPRINT }}
#      ^ consumida aqui, definida em lugar nenhum

$ rg -n "APPLE_SIGNING_IDENTITY" .github/workflows/release.yml
232:   APPLE_SIGNING_IDENTITY: ${{ env.APPLE_SIGNING_IDENTITY }}
#      ^ idem
```

Pior: `HAS_APPLE_CERT` ainda controla os condicionais das linhas 225 e 279. Com o
secret `APPLE_CERTIFICATE` configurado, o macOS entra no ramo *"Build and upload
installers (with signing)"* — que já não consegue assinar, porque o passo que
importava o certificado e definia a identidade foi removido. O ramo explícito de
fallback ("unsigned macOS", linha 279) fica inalcançável nesse cenário.

O CHANGELOG da 1.8.2 registra os dois lados dessa gangorra em seções adjacentes:
em *Security*, "Public Windows release builds now require the Authenticode
certificate"; em *Changed*, logo abaixo, "unsigned Windows bundles are published
until the Authenticode certificate is configured". O endurecimento foi revertido
na mesma versão em que foi anunciado.

**Ação:** ou reconectar os passos de import (Windows + Apple), ou remover as
referências mortas e assumir explicitamente o estado não assinado — documentando
no README que o SmartScreen vai alertar. O que não serve é o estado atual, em que
o workflow *parece* assinar e não assina.
