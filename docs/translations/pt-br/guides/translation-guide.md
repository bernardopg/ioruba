# Guia de Traducoes (PT-BR, EN e ES)

Use este guia quando precisar adicionar ou revisar traducoes de interface no app desktop.

## Escopo

O fluxo atual de traducao do desktop e baseado em texto e centralizado em:

- apps/desktop/src/lib/i18n.ts

Hoje a UI suporta:

- pt-BR como texto fonte (padrao)
- en por meio de lookup em TEXT_MAP_EN
- es por meio de lookup em TEXT_MAP_ES

Os mapas de idioma sao registrados em LANGUAGE_TEXT_MAPS; a uniao UiLanguage
vive em packages/shared/src/types.ts e e validada em
packages/shared/src/validation.ts e apps/desktop/src/lib/profile-config.ts.

## Como a traducao funciona

- translateText(language, text)
  - se language for pt-BR, retorna o texto original
  - caso contrario, tenta o mapa registrado do idioma (TEXT_MAP_EN/TEXT_MAP_ES)
  - se faltar chave, retorna texto original (fallback)
- translateTemplate(language, text, replacements)
  - traduz primeiro a string base
  - depois substitui placeholders como {name}

## Adicionar uma nova string de UI

1. Troque o texto hardcoded no componente por chamada de tradutor:
   - geralmente const lt = (text: string) => translateText(language, text)
   - depois lt("Texto")
2. Adicione a mesma chave PT-BR em **todos** os mapas de idioma (TEXT_MAP_EN e TEXT_MAP_ES).
3. Mantenha o texto da chave exatamente igual ao PT-BR original usado na UI.
4. Prefira reutilizar chaves existentes antes de criar uma nova.

## Adicionar um novo idioma de UI

1. Estenda UiLanguage em packages/shared/src/types.ts.
2. Adicione o idioma em UI_LANGUAGES em packages/shared/src/validation.ts e na
   lista do readEnum em apps/desktop/src/lib/profile-config.ts.
3. Crie um TEXT_MAP_XX em i18n.ts cobrindo todas as chaves e registre-o em
   LANGUAGE_TEXT_MAPS.
4. Adicione um `<option>` no seletor de idioma em
   apps/desktop/src/components/config/profile-workbench.tsx.
5. Adicione cobertura de renderizacao em accessibility-shell.test.tsx.

## Padroes recomendados

- Labels visiveis, titulos, badges, botoes e hints devem usar traducao.
- Labels ARIA e texto de live region tambem devem usar traducao.
- Detalhes tecnicos dinamicos (stack traces, payloads brutos do backend, IDs) podem permanecer sem alteracao.

## Comandos rapidos de auditoria

Execute na raiz do repositorio:

- `rg 'translateText|translateTemplate|\blt\(' apps/desktop/src`
- `rg '(label|title|description|placeholder)="[A-Za-zÀ-ÿ][^"]*"' apps/desktop/src/**/*.tsx`

Eles ajudam a encontrar caminhos traduzidos e literais hardcoded restantes.

## Checklist de validacao

Depois de editar i18n:

1. npm run desktop:typecheck
2. rode os testes relevantes (especialmente cobertura de acessibilidade)
3. abra o app nos perfis en e es e confirme telas-chave:
   - cabecalho de sessao
   - abas
   - painel watch
   - editor de perfil
   - cards de diagnostico

## Erros comuns

- Divergencia de chave por mudanca de pontuacao ou acento.
- Inserir texto traduzido direto no componente em vez de usar os mapas.
- Adicionar chave em um mapa e esquecer os outros idiomas.
- Esquecer de passar a prop language para componentes filhos que renderizam texto.
- Traduzir valores de fallback em um ponto e esquecer mensagens de status/hint relacionadas.

## Documentos relacionados

- [../../README.md](../../README.md)
- [../../TESTING.md](../../TESTING.md)
- [./profile-examples.md](./profile-examples.md)
