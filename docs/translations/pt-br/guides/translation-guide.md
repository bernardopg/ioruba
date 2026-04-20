# Guia de Traducoes (PT-BR e EN)

Use este guia quando precisar adicionar ou revisar traducoes de interface no app desktop.

## Escopo

O fluxo atual de traducao do desktop e baseado em texto e centralizado em:

- apps/desktop/src/lib/i18n.ts

Hoje a UI suporta:

- pt-BR como texto fonte (padrao)
- en por meio de lookup em TEXT_MAP

## Como a traducao funciona

- translateText(language, text)
  - se language for pt-BR, retorna o texto original
  - se language for en, tenta TEXT_MAP[text]
  - se faltar chave, retorna texto original (fallback)
- translateTemplate(language, text, replacements)
  - traduz primeiro a string base
  - depois substitui placeholders como {name}

## Adicionar uma nova string de UI

1. Troque o texto hardcoded no componente por chamada de tradutor:
   - geralmente const lt = (text: string) => translateText(language, text)
   - depois lt("Texto")
2. Adicione a mesma chave PT-BR em TEXT_MAP com o valor EN.
3. Mantenha o texto da chave exatamente igual ao PT-BR original usado na UI.
4. Prefira reutilizar chaves existentes antes de criar uma nova.

## Padroes recomendados

- Labels visiveis, titulos, badges, botoes e hints devem usar traducao.
- Labels ARIA e texto de live region tambem devem usar traducao.
- Detalhes tecnicos dinamicos (stack traces, payloads brutos do backend, IDs) podem permanecer sem alteracao.

## Comandos rapidos de auditoria

Execute na raiz do repositorio:

- rg 'translateText|translateTemplate|\\blt\\(' apps/desktop/src
- rg '(label|title|description|placeholder)="[A-Za-zÀ-ÿ][^"]_"' apps/desktop/src/\*\*/_.tsx

Eles ajudam a encontrar caminhos traduzidos e literais hardcoded restantes.

## Checklist de validacao

Depois de editar i18n:

1. npm run desktop:typecheck
2. rode os testes relevantes (especialmente cobertura de acessibilidade)
3. abra o app no perfil en e confirme telas-chave:
   - cabecalho de sessao
   - abas
   - painel watch
   - editor de perfil
   - cards de diagnostico

## Erros comuns

- Divergencia de chave por mudanca de pontuacao ou acento.
- Inserir texto EN direto no componente em vez de usar TEXT_MAP.
- Esquecer de passar a prop language para componentes filhos que renderizam texto.
- Traduzir valores de fallback em um ponto e esquecer mensagens de status/hint relacionadas.

## Documentos relacionados

- [../../README.md](../../README.md)
- [../../TESTING.md](../../TESTING.md)
- [./profile-examples.md](./profile-examples.md)
