# Translation Guide (PT-BR and EN)

Use this guide when you need to add or review interface translations in the desktop app.

## Scope

The current desktop translation flow is text-based and centralized in:

- `apps/desktop/src/lib/i18n.ts`

Today the UI supports:

- `pt-BR` as source text (default)
- `en` through `TEXT_MAP` lookup

## How translation works

- `translateText(language, text)`
  - if `language` is `pt-BR`, returns original text
  - if `language` is `en`, tries `TEXT_MAP[text]`
  - if key is missing, returns original text (fallback)
- `translateTemplate(language, text, replacements)`
  - translates a base string first
  - then replaces placeholders like `{name}`

## Add a new UI string

1. Replace hardcoded text in component with translator call:
   - usually `const lt = (text: string) => translateText(language, text)`
   - then `lt("Texto")`
2. Add the same PT-BR key to `TEXT_MAP` with EN value.
3. Keep key text exactly equal to the original PT-BR string used in UI.
4. Prefer reuse of existing keys before adding a new one.

## Recommended patterns

- Visible labels, titles, badges, buttons, and hints should use translation.
- ARIA labels and live-region text should also use translation.
- Dynamic technical details (stack traces, raw backend payloads, IDs) can stay unmodified.

## Quick audit commands

Run in repository root:

- `rg 'translateText|translateTemplate|\blt\(' apps/desktop/src`
- `rg '(label|title|description|placeholder)="[A-Za-zÀ-ÿ][^"]*"' apps/desktop/src/**/*.tsx`

These help find translated paths and remaining hardcoded literals.

## Validation checklist

After i18n edits:

1. `npm run desktop:typecheck`
2. run relevant tests (especially accessibility coverage)
3. open the app in `en` profile and confirm key screens:
   - session header
   - tabs
   - watch panel
   - profile editor
   - diagnostics cards

## Common pitfalls

- Key mismatch due to punctuation or accents changes.
- Adding EN text directly in component instead of using `TEXT_MAP`.
- Forgetting to pass `language` prop to child components that render text.
- Translating fallback values in one place but not in related status/hint messages.

## Related docs

- [../../README.md](../../README.md)
- [../../TESTING.md](../../TESTING.md)
- [./profile-examples.md](./profile-examples.md)
