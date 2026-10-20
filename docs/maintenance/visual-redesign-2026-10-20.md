# Revisão visual do Ioruba — 2026-10-20

Implementação do plano em `TODO.md`, sobre as atualizações e correções da auditoria Linux anterior. Nenhuma dependência visual adicional foi necessária.

## Resultado

- Mixer como entrada principal, com perfil, conexão e ações diretas.
- Navegação lateral compacta; abaixo de 1100 px, abas horizontais com rolagem local e teclado preservado. Janela mínima de 640 × 600.
- Canais como módulos de uma mesa de áudio: dial, percentual aplicado, destinos legíveis e edição direta do canal correto. Diagnósticos permanecem em detalhes recolhidos.
- Percentual usa o valor aplicado e a resolução ADC informada pelo firmware, com inversão do perfil. Antes do primeiro sinal, exibe travessão e “Aguardando leitura”; demonstração identifica níveis simulados.
- Home com resumo operacional e atalhos. Estados e destinos traduzidos em pt-BR, inglês e espanhol; nomes de dispositivos vêm do inventário quando disponíveis.
- Tipografia Space Grotesk/Instrument Sans, cobre e teal, superfícies consistentes e temas claro/escuro. Animação do medidor respeita movimento reduzido.
- Contraste corrigido no texto dos botões primários; títulos longos mantêm nome completo acessível e tooltip.

## Verificação

`npm run verify`: 153 testes desktop, 67 shared, 45 testes Rust do app e 4 testes Rust seriais passaram; typecheck e build web passaram. Cobertura desktop com arquivos não importados: 62,04% das linhas e 58,15% dos branches, com limites configurados aprovados. Build Tauri release concluído. `git diff --check` e sintaxe do script nativo passaram.

`IORUBA_TEST_SERIAL_PORT=/dev/ttyUSB0 xvfb-run -a npm run test:linux:app`: 12 resultados aprovados (11 casos e suíte pai), sem falhas. WebKit real, binário release reconstruído, IPC real e configuração temporária isolada. Inclui inventário Linux, volume/mute em sink/source/aplicação temporários, navegação, diálogo/foco, persistência, JSON inválido, demonstração e handshake/frames do Nano físico.

Nove telas verificadas em 640/800/1024/1280/1440/1920 px: 54 combinações sem transbordamento horizontal do documento. Inspeção visual de capturas nativas clara/escura e janela de 640 px. Ensaio adicional no preview com oito canais e títulos longos nas mesmas seis larguras sem overflow global.

Axe executado nas nove telas sem violações detectadas nas regras selecionadas. Como o contraste CSS Color 4 fica parcialmente indeterminado no axe, sete seletores centrais do mixer receberam medição explícita via canvas/sRGB: mínimo 4,80:1 no claro e 5,04:1 no escuro. Isso não certifica toda a aplicação em WCAG.

Evidências nativas locais: `/tmp/ioruba-native-test-nLEjt4/` — `responsive.json`, `contrast.json`, resultados axe, logs e capturas `mixer-*.png`. Arquivos temporários podem ser removidos pelo sistema.

## Limites

O pacote AUR instalado não foi substituído: os testes usaram o binário release deste checkout. Firmware não foi gravado; a confirmação física desta rodada cobre comunicação, não uma nova varredura manual dos extremos dos knobs. Exportações por seletor de arquivos, inicialização no login, bandeja e instalação assinada não foram revalidadas nesta rodada. Windows/macOS e hardware diferente do Nano conectado não foram executados.

Bandeja, login e seletores foram posteriormente cobertos na [revisão de integração com o desktop](linux-shell-review-2026-10-20.md), com correção da exportação de estatísticas do demo.
