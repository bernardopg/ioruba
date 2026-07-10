# Plano de implementação — Shell UI refresh (pill de status, sidebar enxuto, header actions)

> Plano escrito para ser executado por outra sessão/IA no repositório Ioruba.
> Data: 2026-07-09 · Versão atual do app: 1.5.3 · Escopo de PR: **desktop-shell**
> (`packages/shared`, `apps/desktop`, `apps/desktop/src-tauri`).

## Objetivo

Quatro melhorias de UX no shell do app desktop:

1. **Pill de status flutuante** com a versão do Ioruba em execução + status do dispositivo.
2. **Sidebar enxuto**: só navegação; remover textos repetidos e mover telemetria de sessão para o pill.
3. **Botão de changelog** no canto superior direito abrindo popup central com o CHANGELOG.
4. **Botão de notificações** (3.1) com bolinha de não-lidas e **botão de settings do app** (3.2), ambos ao lado do changelog.

## Contexto do código (estado atual verificado)

| Fato | Onde |
|---|---|
| Versão `1.5.3` sincronizada em 3 arquivos | `package.json`, `apps/desktop/package.json`, `apps/desktop/src-tauri/tauri.conf.json` |
| Frontend **não exibe versão** em lugar nenhum | — |
| Sidebar vive inline em `App.tsx` (`<aside>` ~linhas 392–485) | `apps/desktop/src/App.tsx` |
| Sidebar hoje contém: badges (`snapshot.status`, "Tauri 2 + React + TS"), título/h1/descrição, `ConnectionHealthIndicator`, nav em grupos (`navigationGroups`, cada item com `label` **e** `description`), e 3 `MiniStatus` (Porta ativa, Audio backend, Última serial) | `App.tsx` |
| O "dashboard-ribbon" (topo do conteúdo) repete Sessão/Perfil/Última serial via `Metric` | `App.tsx` ~linhas 494–513 |
| Navegação usa padrão WAI-ARIA tablist com roving tabindex (`handleTablistKeyDown`) — **não quebrar** | `App.tsx:279` |
| Detecção de update existente = binário trocado em disco (upgrade de pacote), evento `ioruba:update-pending` → `UpdateToast` fixo no rodapé central | `src-tauri/src/lib.rs` (`binary_replaced_on_disk`, `notify_update_pending_once`), `hooks/use-update-watch.ts`, `components/dashboard/update-toast.tsx` |
| **Não há** checagem online de release nova | — |
| i18n: pt-BR é idioma-fonte (as chaves são o texto literal); `TEXT_MAP_EN` e `TEXT_MAP_ES` em `lib/i18n.ts`, registrados em `LANGUAGE_TEXT_MAPS`. `UiLanguage = "pt-BR" \| "en" \| "es"` | `apps/desktop/src/lib/i18n.ts`, `packages/shared/src/types.ts:1` |
| Idioma e tema são **por perfil** (`profile.ui.language`, `profile.ui.theme`); store expõe `setThemeMode`, `updateActiveProfileConfig` | `packages/shared/src/types.ts:73`, `store/ioruba-store.ts` |
| `PersistedState` (`packages/shared/src/types.ts:96`) tem campos opcionais aditivos (ex.: `onboardingDismissed?`). **Atenção**: `packages/shared/src/validation.ts` reconstrói o objeto campo a campo — campo novo que não for adicionado lá é **descartado** no load | `validation.ts:~40-70` |
| CSP restringe `connect-src 'self' ipc: http://ipc.localhost` — fetch a `api.github.com` está **bloqueado** hoje | `src-tauri/tauri.conf.json:25` |
| Capabilities: `core:default` (inclui `core:app:default` → `getVersion()` já permitido), `serialplugin`, `global-shortcut`, `dialog:allow-save/open`. **Não há** plugin opener | `src-tauri/capabilities/default.json` |
| `CHANGELOG.md` na raiz do repo, formato Keep a Changelog (`## [X.Y.Z](link) (data)` + `### Added/Fixed/...`), ~37 KB | `CHANGELOG.md` |
| Não existe componente de modal em `components/ui/` (só badge, button, card, switch, tabs) | `apps/desktop/src/components/ui/` |
| Estética do projeto: instrument-panel/studio-lab, sem neon/gamer SaaS | `.impeccable.md` |

## Decisões de design (já tomadas — não re-discutir)

- **Versão**: usar `getVersion()` de `@tauri-apps/api/app` quando `isTauri()`; fallback para constante Vite `__APP_VERSION__` (definida em `vite.config.ts` a partir de `package.json`) para o modo `desktop:dev` no browser. `getVersion()` é a verdade do binário rodando.
- **Modal**: usar `<dialog>` nativo com `showModal()` (focus trap + Esc de graça no webkit2gtk). Um componente reutilizável `components/ui/dialog.tsx`, usado por changelog, notificações e settings. Não adicionar lib de modal.
- **Changelog**: importar `CHANGELOG.md` com `?raw` no Vite (build-time, sem fetch). Parser mínimo próprio do formato Keep a Changelog (split por `## [`), sem lib de markdown.
- **Checagem de release nova**: fetch no frontend a `https://api.github.com/repos/bernardopg/ioruba/releases/latest` (a API do GitHub envia `Access-Control-Allow-Origin: *`, então só é preciso liberar o CSP). **Não** adicionar reqwest no Rust.
- **Abrir URL externa** (repositório): adicionar `tauri-plugin-opener` (crate + `@tauri-apps/plugin-opener`) com permissão restrita a `https://github.com/bernardopg/ioruba*`.
- **Settings do app**: modal edita o perfil ativo (idioma/tema, já persistidos por perfil) + novos campos app-level em `PersistedState` (aditivos e opcionais, sem bump de `schemaVersion`).
- **Sidebar**: pill flutuante absorve Porta ativa / Audio backend / Última serial; sidebar fica só com marca compacta + navegação (ícone + label, sem description visível).

---

## Fase 1 — Pill de status flutuante com versão

**Arquivos novos**
- `apps/desktop/src/components/dashboard/status-pill.tsx`
- `apps/desktop/src/components/dashboard/status-pill.test.tsx`
- `apps/desktop/src/hooks/use-app-version.ts`

**Arquivos alterados**
- `apps/desktop/vite.config.ts` — `define: { __APP_VERSION__: JSON.stringify(pkg.version) }` (+ declaração em `src/vite-env.d.ts`: `declare const __APP_VERSION__: string;`).
- `apps/desktop/src/App.tsx` — renderizar `<StatusPill />` no nível do `<main>` (irmão do `UpdateToast`).
- `apps/desktop/src/lib/i18n.ts` — chaves novas em EN e ES.

**Comportamento**
- `useAppVersion()`: `isTauri() ? await getVersion() : __APP_VERSION__`; retorna string (ex.: `1.5.3`).
- Pill fixo (sugestão: `fixed bottom-6 right-6 z-40`). **Não colidir com o `UpdateToast`** (`fixed bottom-6 left-1/2 -translate-x-1/2 z-50`) — em telas estreitas o toast tem `w-[min(28rem,calc(100vw-2rem))]`; se sobrepor, subir o pill (`bottom-20`) quando `updatePending` for true, lendo `useIorubaStore(s => s.updatePending)`.
- Estado colapsado: `v1.5.3` + dot colorido do status (reusar lógica de `toneForStatus` de `App.tsx:79` — extrair para util compartilhado ou duplicar tom no componente).
- Expandido (clique; `aria-expanded`): status + statusText, Porta ativa (`snapshot.connectionPort ?? "nenhuma"`), Audio backend (`snapshot.diagnostics.backend`), Última serial (`snapshot.diagnostics.lastSerialLine ?? "aguardando"`).
- Dados todos já existem no store (`useIorubaStore`); nenhum comando Rust novo.
- Visual: seguir tokens existentes (`--color-panel`, `--color-border`, `--shadow-panel`, `backdrop-blur-sm`) — mesmo vocabulário do `UpdateToast`.

**Testes**
- Render com store mockado: mostra versão, expande/colapsa, mostra porta/backend/serial. Espelhar setup de `update-toast`/`connection-health` tests.

## Fase 2 — Sidebar enxuto

**Arquivos alterados**: `apps/desktop/src/App.tsx`, `apps/desktop/src/styles/*` (classes `sidebar-*`), `lib/i18n.ts` (remover chaves órfãs é opccional — chave não usada não quebra nada).

**Remover do `<aside>`**
1. Badge "Tauri 2 + React + TS" (manter o badge de status ou deixá-lo só no pill — recomendação: remover ambos do sidebar; o pill cobre).
2. Bloco título/h1/parágrafo ("Mixer de áudio para Linux", "Painel instrumental..."). Manter apenas o eyebrow `Ioruba Control Deck` como marca compacta no topo.
3. Os 3 `MiniStatus` do rodapé (Porta ativa / Audio backend / Última serial) — migraram para o pill (Fase 1). Se `MiniStatus` (`App.tsx:1003`) ficar sem uso, **deletar** a função.
4. `description` visível de cada item de navegação: renderizar só ícone + `label`. Preservar a informação como `title={item.description}` no botão (tooltip nativo). **Não** remover o campo do tipo `NavItem` — a `description` continua usada no ribbon (`currentSection.description`).

**Manter intacto**
- Estrutura tablist/roving tabindex (`role`, `aria-selected`, `aria-controls`, `handleTablistKeyDown`, ids `tab-${id}`), grupos com `sidebar-nav-group-label`, skip-link, `ConnectionHealthIndicator` (é o único feedback de saúde de conexão no sidebar — manter, é compacto).

**Layout**
- Com menos conteúdo, estreitar colunas do grid em `App.tsx:391`: `lg:grid-cols-[15.5rem...]` → `[13rem...]`, `xl:grid-cols-[17rem...]` → `[14rem...]`. Ajustar padding/gaps das classes `sidebar-*` se sobrar espaço morto.
- Ribbon: remover o `Metric` "Última serial" (duplicado com o pill); manter Sessão e Perfil ativo.

**Testes**
- `accessibility-shell.test.tsx` cobre o shell — rodar e ajustar asserts que referenciem textos removidos.

## Fase 3 — Header actions (changelog + notificações + settings)

### 3.0 Infra comum

**Novos arquivos**
- `apps/desktop/src/components/ui/dialog.tsx` — wrapper de `<dialog>` nativo: abre com `showModal()`, fecha em Esc (evento `cancel`) e clique no backdrop, `aria-labelledby`, restaura foco ao fechar. Estilizar backdrop via `::backdrop`.
- `apps/desktop/src/components/shell/header-actions.tsx` — cluster de 3 icon-buttons no canto superior direito do conteúdo (dentro do ribbon ou `absolute top-5 right-*` no `<main>`; recomendação: canto direito do `dashboard-ribbon`, que já é o topo visual). Ícones lucide: `ScrollText` (changelog), `Bell` (notificações), `Settings`.

### 3.1 Changelog popup

**Novos arquivos**
- `apps/desktop/src/lib/changelog.ts` — `parseChangelog(raw: string): ChangelogRelease[]` com `{ version, date, url, sections: { title, items[] }[] }`. Ignorar `## [Unreleased]` vazio. Parser por regex/split de linhas — o formato é estável (Keep a Changelog).
- `apps/desktop/src/lib/changelog.test.ts` — parse de amostra real do CHANGELOG.
- `apps/desktop/src/components/shell/changelog-dialog.tsx`.

**Integração**
- `import changelogRaw from "../../../../CHANGELOG.md?raw"` (raiz do repo está fora do root do Vite: adicionar `server.fs.allow` incluindo a raiz do repo em `vite.config.ts` para o dev server; build estático já funciona). Declarar módulo `*.md?raw` em `vite-env.d.ts` se o TS reclamar.
- Renderizar releases em accordion ou lista rolável (`max-h-[70vh] overflow-y-auto`); destacar a release da versão em execução (`useAppVersion()`).
- Conteúdo do CHANGELOG é em inglês — exibir como está (não traduzir corpo); só o chrome do dialog (título "Changelog", botão fechar) entra no i18n.

### 3.2 Notificações

**Novos arquivos**
- `apps/desktop/src/hooks/use-release-check.ts`
- `apps/desktop/src/components/shell/notifications-dialog.tsx` (ou popover ancorado no sino; dialog central é aceitável e mais simples — decidir na implementação, dialog é o default).

**Store** (`store/ioruba-store.ts`)
```ts
interface AppNotification {
  id: string;               // estável, ex.: "release-1.6.0", "update-pending"
  kind: "release" | "update-pending" | "info";
  title: string;            // chave pt-BR (passa por lt())
  detail?: string;
  url?: string;             // abre via opener
  read: boolean;
  createdAt: number;
}
```
- Ações: `pushNotification` (dedup por `id`), `markNotificationsRead`, seletor `unreadCount`.
- Fontes:
  1. `use-update-watch.ts` — além de `setUpdatePending(true)`, fazer `pushNotification({ id: "update-pending", ... })`.
  2. `use-release-check.ts` — se `notificationsEnabled` (ver 3.3): fetch em `https://api.github.com/repos/bernardopg/ioruba/releases/latest` no boot + `setInterval` de 6 h; comparar `tag_name` (strip `v`) com `useAppVersion()` por comparação semver simples (split em `.`, comparação numérica — 5 linhas, sem lib); se maior **e** diferente de `persisted.lastNotifiedReleaseVersion`, `pushNotification({ id: `release-${tag}`, url: html_url })` e gravar `lastNotifiedReleaseVersion`. Falha de rede = silêncio (log no watch log com `appendWatchLog`, nível `info`, no máximo).
- Bolinha: dot absoluto no botão `Bell` quando `unreadCount > 0`; abrir o dialog marca tudo como lido.
- Item fixo no rodapé do painel: botão "Repositório do projeto" → abre `https://github.com/bernardopg/ioruba` via opener.

**Mudanças de plataforma (Tauri) — necessárias para 3.2**
1. `tauri.conf.json` CSP: `connect-src 'self' ipc: http://ipc.localhost https://api.github.com`.
2. `tauri-plugin-opener`: adicionar crate em `src-tauri/Cargo.toml`, registrar `.plugin(tauri_plugin_opener::init())` em `lib.rs`, `npm i @tauri-apps/plugin-opener -w @ioruba/desktop`, e em `capabilities/default.json` permissão com escopo restrito:
```json
{
  "identifier": "opener:allow-open-url",
  "allow": [{ "url": "https://github.com/bernardopg/ioruba*" }]
}
```
- Fallback web/demo (sem Tauri): `window.open(url)`.

**Persistência** (`packages/shared`)
- `PersistedState` += `lastNotifiedReleaseVersion?: string` e `notificationsEnabled?: boolean` (default `true`).
- **Obrigatório**: adicionar os dois campos ao objeto retornado em `validation.ts` (parser campo-a-campo descarta desconhecidos) e cobrir no `validation`/`defaults` test existente do shared.
- Sem bump de `schemaVersion` (campos aditivos opcionais, mesmo padrão de `onboardingDismissed`).

### 3.3 Settings do app

**Novo arquivo**: `apps/desktop/src/components/shell/settings-dialog.tsx`.

**Conteúdo do modal** (todas as ações já existem ou foram criadas acima):
| Setting | Mecanismo |
|---|---|
| Idioma (pt-BR / en / es) | `updateActiveProfileConfig` mutando `ui.language` (avaliar criar ação dedicada `setLanguage` no store espelhando `setThemeMode` — preferível) |
| Tema (claro/escuro/sistema) | `setThemeMode` (já existe; o select do Painel de controle pode permanecer ou ser removido em favor do modal — recomendação: mover para o modal e remover do Painel de controle para não duplicar) |
| Notificações de release (on/off) | novo `setNotificationsEnabled` → `persisted.notificationsEnabled`; gates do `use-release-check` |
| Iniciar com o sistema | `setLaunchOnLogin` (já existe no Painel de controle — **mover** para o modal ou manter nos dois; recomendação: mover) |
| Linha informativa: versão + link "Ver changelog" | `useAppVersion()` + abre changelog dialog |

**Nota**: idioma/tema são por perfil hoje. Não migrar para app-level neste PR — o modal edita o perfil ativo e isso é aceitável. Registrar como follow-up se incomodar.

### i18n (todas as fases)

Toda string nova em pt-BR nos componentes + entrada em `TEXT_MAP_EN` e `TEXT_MAP_ES`. Grep final de sanidade: nenhum texto novo hardcoded em inglês nos componentes.

---

## Ordem de execução e gates

| # | Entrega | Gate |
|---|---|---|
| 1 | Fase 1 (pill + versão) | `npm run desktop:test` + `npm run verify` |
| 2 | Fase 2 (sidebar) | `npm run desktop:test` (ajustar `accessibility-shell.test.tsx`) + `npm run verify` |
| 3 | Fase 3.0 + changelog | `npm run desktop:test` (novo `changelog.test.ts`) |
| 4 | Fase 3.2 (shared + CSP + opener + notificações) | `npm run shared:test` + `npm run verify` |
| 5 | Fase 3.3 (settings) | `npm run verify` |
| 6 | Final | `npm run desktop:tauri:build` (**obrigatório** para mudanças de desktop-shell, ver CLAUDE.md) + smoke manual: `npm run desktop:watch`, checar pill, navegação por teclado no sidebar, os 3 dialogs, abrir link do repo, trocar idioma nos 3 valores |

Commits podem seguir as fases (conventional commits, sem trailer de coautoria do Claude — regra do repositório/usuário).

## Riscos e armadilhas conhecidas

1. **`validation.ts` descarta campos não mapeados** — campo persistido novo sem entrada no parser volta `undefined` a cada boot. Já mapeado na Fase 3.2; é o erro mais provável.
2. **CSP**: esquecer o `connect-src` novo faz o fetch falhar só no binário empacotado (no dev server pode passar). Testar release check no build Tauri.
3. **Import de `CHANGELOG.md` fora do root do Vite**: dev server precisa de `server.fs.allow`; sem isso, 403 só no `desktop:dev`.
4. **A11y do tablist**: qualquer refactor do sidebar deve manter ids `tab-${id}`, roving tabindex e o handler de setas; `accessibility-shell.test.tsx` é o guarda.
5. **Sobreposição pill × UpdateToast** no rodapé — tratada na Fase 1.
6. **`<dialog>` + testes jsdom**: jsdom tem suporte limitado a `showModal()`; nos testes, mockar ou usar render com `open` prop. Verificar versão do jsdom do projeto antes de assumir.
7. **Estética**: seguir `.impeccable.md` (instrument-panel/studio-lab), tokens CSS existentes; nada de neon/gamer.
8. **`getVersion()` fora do Tauri** rejeita — sempre guardar com `isTauri()`.
