# Bandeja, login e exportações Linux — 2026-10-20

## Falha encontrada e correção

O demo atualizava o gráfico sem alimentar `sessionStats`. Os botões de exportação JSON/CSV permaneciam desabilitados mesmo com leituras simuladas. `runDemoStep` agora usa `updateSessionStats`, o mesmo acumulador do caminho serial. O teste existente verifica a contagem por canal e sua acumulação no segundo passo.

## Validação real

Binário Tauri release reconstruído, WebKitGTK e IPC reais. A suíte foi ampliada com `IORUBA_TEST_DESKTOP_SHELL=1`, usando Xvfb dedicado para não enviar teclado ao desktop do usuário. `HOME` e `XDG_CONFIG_HOME` temporários isolam configurações e a entrada de login. A biblioteca de autostart usa `~/.config/autostart` independentemente de `XDG_CONFIG_HOME`; a entrada criada na primeira tentativa antes desse ajuste foi removida.

- Fechar a janela pelo protocolo nativo `WM_DELETE_WINDOW` mantém o processo ativo e oculta a janela.
- Item do Ioruba registrado no StatusNotifierWatcher real da sessão. Menu lido pelo protocolo dbusmenu; “Abrir Ioruba” restaura e “Sair” encerra o processo. O probe confere o diretório de configuração do PID antes de agir.
- “Iniciar com a sessão” alternado pela UI, conferindo estado salvo e a entrada `Ioruba.desktop`, incluindo caminho do executável e `--autostart`; desativar remove a entrada.
- Nova instância com `--autostart` inicia oculta, abre pela bandeja e encerra pelo menu.
- Perfil JSON, estatísticas JSON/CSV e watch log JSONL salvos pelos diálogos GTK. Conteúdos lidos e validados; estatísticas têm amostras. Cancelamentos não alteram o perfil salvo nem os arquivos exportados e não deixam o log preso em “Exportando”.

Resultado: 153 testes desktop aprovados, incluindo regressão do acumulador demo; build web/typecheck e build Tauri release aprovados. Suíte nativa: 15 resultados aprovados (14 casos e suíte pai), sem falhas. Sintaxe Node/Python e `git diff --check` aprovados. Não houve alterações em dependências, permissões IPC ou firmware nesta etapa.

Comando reproduzível e pré-requisitos em [TESTING.md](../../TESTING.md#native-tray-login-and-file-selectors).

Evidências da execução aprovada: `/tmp/ioruba-native-test-NEUOXh/`, incluindo `tray.json`, `autostart.desktop`, `autostart-restored.png`, `exported-profile.json`, `exported-stats.json`, `exported-stats.csv`, `exported-watch.jsonl` e logs. Arquivos temporários podem ser removidos pelo sistema.

## Limites

Não foi feito logout/reboot: foram verificados a entrada de login e seu caminho de execução com o argumento de autostart, sem iniciar uma nova sessão do compositor. A ativação do menu usa dbusmenu, sem teste de clique por pixel no ícone do painel. O app foi executado no X11/Xvfb com a bandeja da sessão real via D-Bus; não certifica entrada gráfica Wayland nem outros desktops. O pacote AUR instalado não foi substituído, instalação assinada não foi testada e o Nano não foi revalidado nesta etapa.
