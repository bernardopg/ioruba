# Plano Completo de Migracao

## Arquitetura Alvo

### Hardware e firmware

- Manter o caminho de hardware classe Nano.
- Substituir o firmware ativo por firmware/arduino/ioruba-controller/ioruba-controller.ino.
- Preservar o contrato serial existente:
  - full-frame 512|768|1023
  - legado P1:512
- Manter suavizacao e resistencia a ruido no firmware e novamente no runtime desktop.

### App desktop

- Mover o caminho principal do produto para apps/desktop.
- Usar Tauri 2 + React + TypeScript.
- Usar Tailwind para tema e layout.
- Usar componentes de UI locais modernos em src/components/ui.
- Usar Zustand para estado de runtime/sessao.
- Usar Recharts para telemetria e historico de tendencia dos knobs.
- Usar tauri-plugin-serialplugin para comunicacao serial.
- Usar persistencia JSON por comandos Rust e diretorio de configuracao do Tauri.

### Logica de backend

- Portar a matematica de runtime Haskell/Python para packages/shared.
- Portar controle de audio Linux para comandos Rust em apps/desktop/src-tauri/src/audio.
- Manter o transporte do app dividido:
  - serial no plugin Tauri
  - audio e persistencia em comandos invoke Rust

## Etapas de migracao

1. Inventariar o comportamento legado Python/Haskell e congelar a superficie de paridade exigida.
2. Criar a camada de dominio TypeScript compartilhada para protocolo, defaults, matematica de runtime e snapshots.
3. Criar o shell desktop Tauri e a UI React.
4. Portar aplicacao de alvos de audio Linux para Rust.
5. Substituir persistencia YAML/UI-state por um unico modelo JSON persistido.
6. Reconstruir CI e release em Node, Rust, Arduino e Tauri.
7. Atualizar a documentacao para refletir a nova estrutura do repositorio.
8. Arquivar runtime aposentado e automacoes obsoletas em legacy/.
9. Testar logica compartilhada, estado desktop, backend Rust e build de firmware.

## Entregue nesta atualizacao de repositorio

- novo scaffold do app desktop em apps/desktop
- novo pacote de dominio compartilhado em packages/shared
- novo firmware Arduino em firmware/arduino/ioruba-controller
- novas GitHub Actions para CI e release
- notas de auditoria e rollout da migracao em docs/migration
- prototipo Python/GTK arquivado em legacy/arduino-audio-controller

## Follow-up pratico restante

- assinar instaladores macOS e Windows no GitHub com os secrets corretos
- decidir se o texto do produto deve declarar explicitamente que o controle real de audio por alvo e Linux-first ate existirem backends nao Linux
- adicionar checksums de release, proveniencia e uma etapa de validacao pos-build
