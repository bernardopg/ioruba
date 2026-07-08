import type { UiLanguage } from "@ioruba/shared";

// pt-BR é o idioma-fonte: as chaves são o texto exatamente como escrito nos
// componentes. Para adicionar um idioma: estender `UiLanguage` no shared,
// criar um mapa com as mesmas chaves e registrá-lo em LANGUAGE_TEXT_MAPS.
const TEXT_MAP_EN: Record<string, string> = {
  "Pular para o conteúdo principal": "Skip to main content",
  "Alteracoes pendentes": "Pending changes",
  "Perfil salvo": "Profile saved",
  "JSON invalido": "Invalid JSON",
  "Salve para persistir o perfil ativo.": "Save to persist the active profile.",
  "O editor esta sincronizado com o perfil salvo.":
    "The editor is synchronized with the saved profile.",
  "Ioruba Control Deck": "Ioruba Control Deck",
  "Melhor e mais barato mixer de audio do mundo": "Best and cheapest audio mixer in the world",
  "A interface nova foi pensada como um painel instrumental: conexão serial, telemetria viva, perfis persistidos em JSON local e aplicação de volume desacoplada do frontend.":
    "The new interface was designed like an instrument panel: serial connection, live telemetry, profiles persisted as local JSON, and volume application decoupled from the frontend.",
  "Porta ativa": "Active port",
  "Audio backend": "Audio backend",
  "Última serial": "Latest serial",
  nenhuma: "none",
  aguardando: "waiting",
  "Conexão e sessão": "Connection and session",
  "Controle de portas, demo mode e persistência do perfil ativo.":
    "Port control, demo mode, and active profile persistence.",
  Home: "Home",
  "Visão geral da bancada e status operacional.":
    "Workbench overview and operational status.",
  "Painel de controle": "Control panel",
  "Ações rápidas de sessão, conexão e canais ativos.":
    "Quick actions for session, connection, and active channels.",
  Telemetria: "Telemetry",
  "Leituras ao vivo, resposta dos knobs e timeline.":
    "Live readings, knob response, and timeline.",
  "Diagnósticos": "Diagnostics",
  "Logs, inventário de áudio e checklist técnico.":
    "Logs, audio inventory, and technical checklist.",
  "Configurações": "Settings",
  "Perfis, preferências e edição avançada do runtime.":
    "Profiles, preferences, and advanced runtime editing.",
  "Distribuímos o runtime em áreas menores para manter foco operacional sem perder contexto da sessão.":
    "We split the runtime into smaller areas to keep operational focus without losing session context.",
  "Painel segmentado": "Segmented panel",
  "Operação central com leitura clara de hardware, backend e perfil":
    "Central operation with clear hardware, backend, and profile reading",
  "Agora cada área do Ioruba vive em uma rota visual própria: a home resume o estado atual da bancada e aponta rapidamente para os próximos passos.":
    "Now each Ioruba area lives in its own visual route: home summarizes the current bench state and quickly points to the next steps.",
  "Targets ativos": "Active targets",
  "Resumo da sessão viva, pronto para orientar a operação antes de abrir uma área específica.":
    "Summary of the live session, ready to guide operation before opening a specific area.",
  "Hint operacional": "Operational hint",
  "Acione conexão, demo mode e preferências de sessão.":
    "Trigger connection, demo mode, and session preferences.",
  "Abrir painel de controle": "Open control panel",
  "Monitore a timeline dos canais e o comportamento dos knobs.":
    "Monitor channel timelines and knob behavior.",
  "Abrir telemetria": "Open telemetry",
  "Revise logs, inventário do backend e saúde da integração.":
    "Review logs, backend inventory, and integration health.",
  "Abrir diagnósticos": "Open diagnostics",
  "Editar perfis, portas, targets e preferências persistidas.":
    "Edit profiles, ports, targets, and persisted preferences.",
  "Abrir configurações": "Open settings",
  Conectar: "Connect",
  Desconectar: "Disconnect",
  "Atualizar áudio": "Refresh audio",
  "Porta preferida": "Preferred port",
  "Detectar automaticamente": "Detect automatically",
  "Tema da interface": "Interface theme",
  "Seguir sistema": "Follow system",
  "Claro de bancada": "Workbench light",
  "Escuro de estúdio": "Studio dark",
  "Modo demo": "Demo mode",
  "Simula leituras sem tocar no áudio do sistema.":
    "Simulates readings without touching system audio.",
  "Iniciar com a sessão": "Launch on login",
  "Abre o Ioruba no login e mantém o app disponível no tray.":
    "Opens Ioruba on login and keeps the app available in the tray.",
  "Status atual": "Current status",
  Overview: "Overview",
  Watch: "Watch",
  Config: "Config",
  Diagnostics: "Diagnostics",
  "Pronto para conectar": "Ready to connect",
  "Modo demo preparado": "Demo mode ready",
  "Inicializando Ioruba Desktop": "Initializing Ioruba Desktop",
  "Inicializando serviços": "Initializing services",
  "Procurando uma porta serial do Arduino":
    "Looking for an Arduino serial port",
  "Procurando um Arduino serial": "Looking for a serial Arduino",
  "Abrindo porta serial e aguardando firmware":
    "Opening serial port and waiting for firmware",
  "Aguardando handshake do firmware": "Waiting for firmware handshake",
  "Porta aberta, aguardando nova leitura do firmware":
    "Port open, waiting for the next firmware reading",
  "Nenhuma porta serial detectada": "No serial port detected",
  "Falha ao processar frame serial": "Failed to process serial frame",
  "Inventário de áudio": "Audio inventory",
  "Descoberta dinâmica do backend atual com aplicações, sinks e sources.":
    "Dynamic discovery of the current backend with applications, sinks, and sources.",
  Aplicações: "Applications",
  Saídas: "Outputs",
  Entradas: "Inputs",
  "Checklist da migração": "Migration checklist",
  "Itens essenciais já cobertos pelo novo stack.":
    "Essential items already covered by the new stack.",
  "nenhum item detectado": "no items detected",
  "Watch ao vivo": "Live watch",
  "evento(s)": "event(s)",
  "Espelha os eventos emitidos pela serial, pelo frontend e pelo backend Rust. Quando você girar um knob, o fluxo aparece aqui e no terminal do `tauri dev`.":
    "Mirrors events emitted by serial, frontend, and the Rust backend. When you turn a knob, the flow appears here and in the `tauri dev` terminal.",
  Todos: "All",
  Limpar: "Clear",
  Exportar: "Export",
  Exportando: "Exporting",
  "Exportando watch log...": "Exporting watch log...",
  "Exportacao cancelada": "Export canceled",
  "Exportacao do watch log solicitada": "Watch log export requested",
  "Exportacao do watch log cancelada": "Watch log export canceled",
  "Watch log exportado": "Watch log exported",
  "Watch log exportado: {count} evento(s) em {path}":
    "Watch log exported: {count} event(s) to {path}",
  "Falha ao exportar watch log": "Failed to export watch log",
  "Backup do estado persistido criado": "Persisted state backup created",
  "Entradas malformadas ignoradas no watch log":
    "Malformed watch log entries ignored",
  "Seguir fim": "Follow end",
  "Nenhum evento no filtro atual.": "No events for the current filter.",
  "Última linha": "Latest line",
  "Contexto ao vivo": "Live context",
  "Resumo da sessão atual e do estado observado pelo watch.":
    "Summary of the current session and the state observed by the watch.",
  Status: "Status",
  "Backend áudio": "Audio backend",
  "Perfil ativo": "Active profile",
  "O terminal do Tauri mostra os `println!` do backend. Este painel espelha os eventos estruturados emitidos pela app, pela serial e pelo Rust.":
    "The Tauri terminal shows backend `println!` output. This panel mirrors structured events emitted by the app, serial, and Rust.",
  "Sessao viva": "Live session",
  "Estado atual do link serial, perfil carregado e resposta dos knobs.":
    "Current state of the serial link, loaded profile, and knob response.",
  "Aguardando porta": "Waiting for port",
  Perfil: "Profile",
  "destino(s) mapeado(s)": "mapped target(s)",
  "Ultimo frame": "Latest frame",
  "Aguardando leitura": "Waiting for reading",
  inicial: "initial",
  Buffer: "Buffer",
  "amostra(s)": "sample(s)",
  Hardware: "Hardware",
  "Aguardando handshake": "Awaiting handshake",
  "Ligue o controlador": "Power on the controller",
  protocolo: "protocol",
  "incompatível": "incompatible",
  "Operação": "Operation",
  Monitoramento: "Monitoring",
  Ajustes: "Adjustments",
  Iniciando: "Booting",
  Pronto: "Ready",
  Procurando: "Searching",
  Conectando: "Connecting",
  Conectado: "Connected",
  Demo: "Demo",
  Desconectado: "Disconnected",
  Erro: "Error",
  "Saúde da conexão": "Connection health",
  Sinal: "Signal",
  "Exportar estatísticas em JSON": "Export statistics as JSON",
  "Exportar estatísticas em CSV": "Export statistics as CSV",
  "sem sinal": "no signal",
  "ao vivo": "live",
  "atrás": "ago",
  Perfis: "Profiles",
  Editor: "Editor",
  "Avançado": "Advanced",
  "Crie, importe, exporte e selecione perfis salvos.":
    "Create, import, export and select saved profiles.",
  "Conexão, áudio, firmware, knobs e destinos.":
    "Connection, audio, firmware, knobs and targets.",
  "JSON do perfil e inventário para targets.":
    "Profile JSON and inventory for targets.",
  "Conexão, sessão e preferências de runtime.":
    "Connection, session and runtime preferences.",
  "Knobs ao vivo e seus destinos de áudio.":
    "Live knobs and their audio targets.",
  "Controlador, MCU, ADC e backend de áudio.":
    "Controller, MCU, ADC and audio backend.",
  "Logs e checklist técnico da integração.":
    "Logs and technical integration checklist.",
  "Abrir canais": "Open channels",
  "Abrir hardware": "Open hardware",
  "Ajuste os knobs ao vivo e seus destinos de áudio.":
    "Tune the live knobs and their audio targets.",
  "Veja placa, MCU, resolução do ADC e o backend de áudio.":
    "See board, MCU, ADC resolution and the audio backend.",
  Controlador: "Controller",
  "Identidade do hardware reportada pelo handshake do firmware.":
    "Hardware identity reported by the firmware handshake.",
  "sem handshake": "no handshake",
  "Nenhum controlador conectado": "No controller connected",
  "Ligue o controlador e aguarde o handshake para ver placa, MCU e resolução do ADC.":
    "Power on the controller and wait for the handshake to see board, MCU and ADC resolution.",
  "protocolo compatível": "compatible protocol",
  "protocolo incompatível": "incompatible protocol",
  Placa: "Board",
  firmware: "firmware",
  "não reportado": "not reported",
  microcontrolador: "microcontroller",
  "Resolução do ADC": "ADC resolution",
  Protocolo: "Protocol",
  "compatível com o desktop": "compatible with the desktop",
  "verifique a versão do firmware": "check the firmware version",
  Knobs: "Knobs",
  desconhecido: "unknown",
  "canais ativos": "active channels",
  "Ajuste do controlador": "Controller tuning",
  Threshold: "Threshold",
  Deadzone: "Deadzone",
  "Suavização": "Smoothing",
  "Mín. bruto": "Min. raw",
  "Máx. bruto": "Max. raw",
  "Leitura atual": "Current reading",
  "Todos os canais espelhados como instrumentos vivos.":
    "All channels mirrored as living instruments.",
  aplicada: "applied",
  "Telemetria dos knobs": "Knob telemetry",
  "Linha do tempo com persistencia visual do ultimo valor conhecido em cada canal.":
    "Timeline with visual persistence of the last known value for each channel.",
  Janela: "Window",
  Tick: "Tick",
  Canais: "Channels",
  "Protocolo serial legado e frame completo":
    "Legacy serial protocol and full frame",
  "Redução de ruído e aplicação incremental":
    "Noise reduction and incremental application",
  "Persistência local em JSON": "Local JSON persistence",
  "Telemetria com Recharts": "Telemetry with Recharts",
  "Backend de áudio em Rust para Linux": "Rust audio backend for Linux",
  "Perfis salvos": "Saved profiles",
  "Selecione rapidamente um preset, duplique uma base existente e mantenha múltiplos layouts sem tocar no JSON bruto.":
    "Quickly select a preset, duplicate an existing base, and keep multiple layouts without touching raw JSON.",
  "Novo perfil": "New profile",
  "Duplicar ativo": "Duplicate active",
  "Remover ativo": "Remove active",
  "Rascunho pendente": "Pending draft",
  Ativo: "Active",
  "knob(s)": "knob(s)",
  manual: "manual",
  "Editor estruturado bloqueado": "Structured editor locked",
  "Corrija o JSON avançado antes de trocar, criar, duplicar ou remover perfis.":
    "Fix the advanced JSON before switching, creating, duplicating, or removing profiles.",
  "Corrija o JSON avançado antes de alterar a coleção de perfis":
    "Fix the advanced JSON before changing the profile collection",
  "Nao foi possivel salvar o rascunho antes da troca de perfil":
    "Could not save the draft before switching profiles",
  "Corrija o JSON avançado antes de continuar":
    "Fix the advanced JSON before continuing",
  "Editor estruturado": "Structured editor",
  "Ajuste nome, serial, áudio e preferências visuais do perfil com formulários seguros. As mudanças alimentam o mesmo rascunho do JSON avançado.":
    "Adjust profile name, serial, audio, and visual preferences with safe forms. Changes feed the same advanced JSON draft.",
  "Nome do perfil": "Profile name",
  "ID técnico": "Technical ID",
  Tema: "Theme",
  Idioma: "Language",
  "Português (Brasil)": "Portuguese (Brazil)",
  "Redução de ruído": "Noise reduction",
  "Baud rate": "Baud rate",
  "Heartbeat (ms)": "Heartbeat (ms)",
  "Janela da telemetria": "Telemetry window",
  "Transição (ms)": "Transition (ms)",
  "Threshold do firmware": "Firmware threshold",
  "Deadzone do firmware": "Firmware deadzone",
  "Smoothing do firmware (%)": "Firmware smoothing (%)",
  Baixa: "Low",
  Padrão: "Default",
  Alta: "High",
  "Conecta a serial automaticamente no boot quando possível.":
    "Automatically connects serial on boot when possible.",
  "Auto-connect": "Auto-connect",
  "auto-connect": "auto-connect",
  "Transições suaves": "Smooth transitions",
  "Mantém o backend com aplicação mais suave entre amostras.":
    "Keeps backend application smoother between samples.",
  "Mostra gráficos e telemetria ao vivo na visão principal.":
    "Shows charts and live telemetry in the main view.",
  Visualizadores: "Visualizers",
  "Knobs e destinos": "Knobs and targets",
  "Reordene canais, renomeie knobs e monte múltiplos targets sem abrir o editor JSON.":
    "Reorder channels, rename knobs, and assemble multiple targets without opening the JSON editor.",
  "Adicionar knob": "Add knob",
  "Corrija o JSON avançado para liberar o editor visual dos knobs.":
    "Fix the advanced JSON to unlock the visual knob editor.",
  Knob: "Knob",
  id: "id",
  invertido: "inverted",
  Subir: "Move up",
  Descer: "Move down",
  Remover: "Remove",
  "Nome do knob": "Knob name",
  "Direção invertida": "Inverted direction",
  "Inverte o sentido lógico do knob sem mudar a fiação física.":
    "Inverts the logical knob direction without changing physical wiring.",
  "Calibração mínima": "Minimum calibration",
  "Calibração máxima": "Maximum calibration",
  "Destinos do knob": "Knob targets",
  "Misture master, app, source e sink no mesmo canal.":
    "Mix master, app, source, and sink in the same channel.",
  "Adicionar target": "Add target",
  Tipo: "Type",
  master: "master",
  application: "application",
  source: "source",
  sink: "sink",
  "Controla a saída principal atual do sistema.":
    "Controls the current system main output.",
  "Nome do target": "Target name",
  "Dica: as sugestões acima vêm do inventário de áudio carregado na sessão.":
    "Tip: the suggestions above come from the audio inventory loaded in this session.",
  "JSON avançado": "Advanced JSON",
  "Escape hatch para ajustes finos, revisão de schema e colagem direta de perfis completos.":
    "Escape hatch for fine tuning, schema review, and direct pasting of complete profiles.",
  "Salvar perfil": "Save profile",
  "Restaurar padrão": "Restore default",
  "Inventário para targets": "Target inventory",
  "Use estes nomes reais do runtime atual para preencher applications, sinks e sources com menos tentativa e erro.":
    "Use these real names from the current runtime to fill applications, sinks, and sources with less trial and error.",
  Applications: "Applications",
  Sources: "Sources",
  Sinks: "Sinks",
  Sessão: "Session",
  "Navegação principal do Ioruba": "Ioruba primary navigation",
  "Tauri 2 + React + TS": "Tauri 2 + React + TS",
  "Arduino C++": "Arduino C++",
  Serial: "Serial",
  Backend: "Backend",
  App: "App",
  Warning: "Warning",
  Error: "Error",
  Info: "Info",
  "Conexão serial encerrada": "Serial connection closed",
  "Inventario de audio solicitado": "Audio inventory requested",
  "Falha ao atualizar inicializacao com a sessao":
    "Failed to update launch on login setting",
  "Janela ocultada; runtime continua ativo no tray":
    "Window hidden; runtime keeps running in tray",
  "Falha ao ocultar janela no fechamento": "Failed to hide window on close",
  "Watch bridge ativo": "Watch bridge active",
  "Watch bridge indisponivel": "Watch bridge unavailable",
  "Falha ao aplicar lote de áudio": "Failed to apply audio batch",
  "Handshake do firmware solicitado": "Firmware handshake requested",
  "Falha ao solicitar handshake do firmware":
    "Failed to request firmware handshake",
  "Falha ao cancelar leitura serial": "Failed to cancel serial read",
  "Falha ao fechar porta serial": "Failed to close serial port",
  "Porta serial encerrada": "Serial port closed",
  "Iniciando conexao serial": "Starting serial connection",
  "Porta serial aberta": "Serial port opened",
  "Escuta serial ativa": "Serial listener active",
  "Conexao serial estabelecida": "Serial connection established",
  "Falha ao abrir porta serial": "Failed to open serial port",
  "Sem leituras seriais recentes": "No recent serial readings",
  "Configuracao do firmware enviada": "Firmware configuration sent",
  "Falha ao enviar configuracao do firmware":
    "Failed to send firmware configuration",
  "Boot do runtime iniciado": "Runtime boot started",
  "Runtime hidratado": "Runtime hydrated",
  "Persistencia restaurou modo demo": "Persistence restored demo mode",
  "Auto-connect habilitado pelo perfil ativo":
    "Auto-connect enabled by active profile",
  "Falha ao persistir watch log": "Failed to persist watch log",
  "Falha no boot do runtime": "Runtime boot failed",
  "Falha ao consultar portas seriais": "Failed to query serial ports",
  "Portas seriais atualizadas": "Serial ports updated",
  "Conexao serial solicitada": "Serial connection requested",
  "Monitor serial desligado": "Serial monitor turned off",
  "Modo demo ativado": "Demo mode enabled",
  "Modo demo desativado": "Demo mode disabled",
  "Modo demo ativo": "Demo mode active",
  "Inicializacao com a sessao ativada": "Launch on login enabled",
  "Inicializacao com a sessao desativada": "Launch on login disabled",
  "Perfil ativo selecionado": "Active profile selected",
  "Novo perfil criado": "New profile created",
  "Perfil duplicado": "Profile duplicated",
  "Remocao ignorada": "Removal ignored",
  "Perfil removido": "Profile removed",
  "Porta preferida atualizada": "Preferred port updated",
  "Tema da interface atualizado": "Interface theme updated",
  "Falha ao salvar perfil": "Failed to save profile",
  "Perfil atualizado": "Profile updated",
  "Perfil ativo atualizado": "Active profile updated",
  "Perfil padrão restaurado": "Default profile restored",
  "Perfil restaurado para o padrao": "Profile restored to default",
  "Handshake do firmware recebido": "Firmware handshake received",
  "Quantidade de knobs do firmware difere do perfil ativo":
    "Firmware knob count differs from active profile",
  "Payload bruto do handshake": "Raw handshake payload",
  "Frame serial recebido": "Serial frame received",
  "Slideres elegiveis para aplicacao": "Eligible sliders for application",
  "Resultados aplicados no estado local": "Results applied to local state",
  "Passo de demo gerado": "Demo step generated",
  "Fluxo sintético em execução": "Synthetic flow running",
  Ligado: "On",
  Desligado: "Off",
  English: "English",
  "Español": "Spanish",
  Spotify: "Spotify",
  default_microphone: "default_microphone",
  default_output: "default_output",
  "Leitura bruta": "Raw reading",
  atualizado: "updated",
  ocioso: "idle",
  indisponível: "unavailable",
  ignorado: "skipped",
  erro: "error",
  "alvo(s)": "target(s)",
  nível: "level",
  Entrada: "Input",
  Saida: "Output",
  "Resposta do canal": "Channel response",
  "Valor aplicado pronto para audio backend e telemetria.":
    "Applied value ready for the audio backend and telemetry.",
  "Destinos ativos": "Active targets",
  "Ultimo resultado": "Latest result",
  "Mixer de áudio para Linux": "Audio mixer for Linux",
  "Painel instrumental com telemetria viva e perfis locais.":
    "Instrument panel with live telemetry and local profiles.",
  "Backend de áudio indisponível": "Audio backend unavailable",
  "O Ioruba não encontrou o pactl no PATH. O controle de volume está desativado até que o backend seja instalado.":
    "Ioruba could not find pactl on PATH. Volume control is disabled until the backend is installed.",
  "Como instalar": "How to install",
  "Esta plataforma ainda não tem backend de áudio nativo. O Ioruba mantém perfis, conexão serial, telemetria e modo demo, mas não altera volumes reais.":
    "This platform does not have a native audio backend yet. Ioruba keeps profiles, serial connection, telemetry, and demo mode available, but it does not change real volumes.",
  "Fallback disponível": "Available fallback",
  "Use o modo demo para validar perfis e telemetria.":
    "Use demo mode to validate profiles and telemetry.",
  "Conecte o Arduino para testar a leitura serial sem aplicar áudio.":
    "Connect the Arduino to test serial readings without applying audio.",
  "Use Linux com pactl para controle de volume real.":
    "Use Linux with pactl for real volume control.",
  "em uso por outro processo. Feche o monitor serial ou outro app que esteja com a porta aberta.":
    "is in use by another process. Close the serial monitor or any other app holding the port open.",
  "Sem permissão para abrir": "No permission to open",
  "Adicione seu usuário ao grupo dialout: sudo usermod -aG dialout $USER":
    "Add your user to the dialout group: sudo usermod -aG dialout $USER",
  "não encontrada. O dispositivo pode ter sido desconectado.":
    "not found. The device may have been disconnected.",
  "Carregando telemetria...": "Loading telemetry...",
  "Começar por um preset": "Start from a preset",
  "Cria um novo perfil com sliders prontos para o caso de uso. Você ainda pode ajustar tudo depois.":
    "Creates a new profile with sliders ready for the use case. You can still tweak everything afterward.",
  Streaming: "Streaming",
  "Balanceie áudio do sistema, o app de captura e o microfone durante uma transmissão ao vivo.":
    "Balance system audio, the capture app and the microphone during a live broadcast.",
  Chamadas: "Calls",
  "Controle volume geral, a sala de videoconferência no navegador e o microfone em reuniões.":
    "Control overall volume, the browser video-call room and the microphone during meetings.",
  Música: "Music",
  "Ajuste o volume geral, o player de música e a saída padrão para audição ou produção.":
    "Adjust overall volume, the music player and the default output for listening or production.",
  "Exportar perfil": "Export profile",
  "Importar perfil": "Import profile",
  "Primeiros passos": "Getting started",
  concluídos: "completed",
  "Dispensar primeiros passos": "Dismiss getting started",
  "Conecte o controlador": "Connect the controller",
  "Handshake do firmware recebido.": "Firmware handshake received.",
  "Ligue o Arduino e aguarde o handshake do firmware.":
    "Power on the Arduino and wait for the firmware handshake.",
  "Encontre a porta serial": "Find the serial port",
  "Porta serial detectada.": "Serial port detected.",
  "Nenhuma porta serial disponível ainda. Verifique o cabo USB.":
    "No serial port available yet. Check the USB cable.",
  "Verifique o áudio do sistema": "Check system audio",
  "Backend de áudio disponível.": "Audio backend available.",
  "Controle de áudio do sistema indisponível. No Linux, instale pipewire-pulse ou pulseaudio-utils.":
    "System audio control unavailable. On Linux, install pipewire-pulse or pulseaudio-utils.",
  "Estatísticas da sessão": "Session statistics",
  "Resetar estatísticas da sessão": "Reset session statistics",
  "amostras": "samples",
  "ticks": "ticks",
  "Resetar": "Reset",
  "Nenhuma amostra ainda. Conecte o controlador ou inicie o modo demo.":
    "No samples yet. Connect the controller or start demo mode.",
  "Amostras": "Samples",
  "Mín": "Min",
  "Méd": "Avg",
  "Máx": "Max",
  "Atual": "Current",
  "Sem dados de telemetria ainda": "No telemetry data yet",
  "Mova um knob com o controlador conectado para começar a registrar a linha do tempo.":
    "Move a knob with the controller connected to start recording the timeline.",
  "Calibração de knobs": "Knob calibration",
  "Capture os limites físicos de cada knob ao vivo e grave no perfil ativo. O firmware é sincronizado automaticamente.":
    "Capture each knob's physical limits live and store them in the active profile. The firmware is synced automatically.",
  "sinal ao vivo": "live signal",
  "calibrado: {min} – {max}": "calibrated: {min} – {max}",
  "padrão: 0 – {max}": "default: 0 – {max}",
  Calibrar: "Calibrate",
  "Conecte o controlador para calibrar com leituras reais do hardware.":
    "Connect the controller to calibrate with real hardware readings.",
  "passo 1 de 2 — mínimo": "step 1 of 2 — minimum",
  "passo 2 de 2 — máximo": "step 2 of 2 — maximum",
  revisão: "review",
  "Gire o knob até o limite mínimo físico e clique em Capturar.":
    "Turn the knob to its physical minimum and click Capture.",
  "Agora gire o knob até o limite máximo físico e clique em Capturar.":
    "Now turn the knob to its physical maximum and click Capture.",
  "leitura ao vivo": "live reading",
  "mínimo observado": "observed minimum",
  "máximo observado": "observed maximum",
  "Faixa capturada muito curta (mínimo {span} contagens). Refaça movendo o knob de ponta a ponta.":
    "Captured range too short (minimum {span} counts). Redo it moving the knob end to end.",
  Capturar: "Capture",
  "Aplicar ao perfil": "Apply to profile",
  Cancelar: "Cancel",
};

const TEXT_MAP_ES: Record<string, string> = {
  "Pular para o conteúdo principal": "Saltar al contenido principal",
  "Alteracoes pendentes": "Cambios pendientes",
  "Perfil salvo": "Perfil guardado",
  "JSON invalido": "JSON inválido",
  "Salve para persistir o perfil ativo.": "Guarda para persistir el perfil activo.",
  "O editor esta sincronizado com o perfil salvo.":
    "El editor está sincronizado con el perfil guardado.",
  "Ioruba Control Deck": "Ioruba Control Deck",
  "Melhor e mais barato mixer de audio do mundo": "El mejor y más barato mezclador de audio del mundo",
  "A interface nova foi pensada como um painel instrumental: conexão serial, telemetria viva, perfis persistidos em JSON local e aplicação de volume desacoplada do frontend.":
    "La nueva interfaz fue pensada como un panel instrumental: conexión serial, telemetría en vivo, perfiles persistidos en JSON local y aplicación de volumen desacoplada del frontend.",
  "Porta ativa": "Puerto activo",
  "Audio backend": "Backend de audio",
  "Última serial": "Última serial",
  nenhuma: "ninguno",
  aguardando: "esperando",
  "Conexão e sessão": "Conexión y sesión",
  "Controle de portas, demo mode e persistência do perfil ativo.":
    "Control de puertos, modo demo y persistencia del perfil activo.",
  Home: "Inicio",
  "Visão geral da bancada e status operacional.":
    "Vista general del banco de trabajo y estado operativo.",
  "Painel de controle": "Panel de control",
  "Ações rápidas de sessão, conexão e canais ativos.":
    "Acciones rápidas de sesión, conexión y canales activos.",
  Telemetria: "Telemetría",
  "Leituras ao vivo, resposta dos knobs e timeline.":
    "Lecturas en vivo, respuesta de los knobs y línea de tiempo.",
  "Diagnósticos": "Diagnósticos",
  "Logs, inventário de áudio e checklist técnico.":
    "Logs, inventario de audio y checklist técnico.",
  "Configurações": "Configuración",
  "Perfis, preferências e edição avançada do runtime.":
    "Perfiles, preferencias y edición avanzada del runtime.",
  "Distribuímos o runtime em áreas menores para manter foco operacional sem perder contexto da sessão.":
    "Distribuimos el runtime en áreas menores para mantener el foco operativo sin perder el contexto de la sesión.",
  "Painel segmentado": "Panel segmentado",
  "Operação central com leitura clara de hardware, backend e perfil":
    "Operación central con lectura clara de hardware, backend y perfil",
  "Agora cada área do Ioruba vive em uma rota visual própria: a home resume o estado atual da bancada e aponta rapidamente para os próximos passos.":
    "Ahora cada área de Ioruba vive en una ruta visual propia: el inicio resume el estado actual del banco y apunta rápidamente a los próximos pasos.",
  "Targets ativos": "Targets activos",
  "Resumo da sessão viva, pronto para orientar a operação antes de abrir uma área específica.":
    "Resumen de la sesión en vivo, listo para orientar la operación antes de abrir un área específica.",
  "Hint operacional": "Pista operativa",
  "Acione conexão, demo mode e preferências de sessão.":
    "Activa la conexión, el modo demo y las preferencias de sesión.",
  "Abrir painel de controle": "Abrir panel de control",
  "Monitore a timeline dos canais e o comportamento dos knobs.":
    "Monitorea la línea de tiempo de los canales y el comportamiento de los knobs.",
  "Abrir telemetria": "Abrir telemetría",
  "Revise logs, inventário do backend e saúde da integração.":
    "Revisa logs, inventario del backend y salud de la integración.",
  "Abrir diagnósticos": "Abrir diagnósticos",
  "Editar perfis, portas, targets e preferências persistidas.":
    "Edita perfiles, puertos, targets y preferencias persistidas.",
  "Abrir configurações": "Abrir configuración",
  Conectar: "Conectar",
  Desconectar: "Desconectar",
  "Atualizar áudio": "Actualizar audio",
  "Porta preferida": "Puerto preferido",
  "Detectar automaticamente": "Detectar automáticamente",
  "Tema da interface": "Tema de la interfaz",
  "Seguir sistema": "Seguir al sistema",
  "Claro de bancada": "Claro de banco",
  "Escuro de estúdio": "Oscuro de estudio",
  "Modo demo": "Modo demo",
  "Simula leituras sem tocar no áudio do sistema.":
    "Simula lecturas sin tocar el audio del sistema.",
  "Iniciar com a sessão": "Iniciar con la sesión",
  "Abre o Ioruba no login e mantém o app disponível no tray.":
    "Abre Ioruba al iniciar sesión y mantiene la app disponible en la bandeja.",
  "Status atual": "Estado actual",
  Overview: "Resumen",
  Watch: "Watch",
  Config: "Config",
  Diagnostics: "Diagnósticos",
  "Pronto para conectar": "Listo para conectar",
  "Modo demo preparado": "Modo demo preparado",
  "Inicializando Ioruba Desktop": "Inicializando Ioruba Desktop",
  "Inicializando serviços": "Inicializando servicios",
  "Procurando uma porta serial do Arduino":
    "Buscando un puerto serial del Arduino",
  "Procurando um Arduino serial": "Buscando un Arduino serial",
  "Abrindo porta serial e aguardando firmware":
    "Abriendo puerto serial y esperando el firmware",
  "Aguardando handshake do firmware": "Esperando el handshake del firmware",
  "Porta aberta, aguardando nova leitura do firmware":
    "Puerto abierto, esperando una nueva lectura del firmware",
  "Nenhuma porta serial detectada": "Ningún puerto serial detectado",
  "Falha ao processar frame serial": "Fallo al procesar el frame serial",
  "Inventário de áudio": "Inventario de audio",
  "Descoberta dinâmica do backend atual com aplicações, sinks e sources.":
    "Descubrimiento dinámico del backend actual con aplicaciones, sinks y sources.",
  Aplicações: "Aplicaciones",
  Saídas: "Salidas",
  Entradas: "Entradas",
  "Checklist da migração": "Checklist de la migración",
  "Itens essenciais já cobertos pelo novo stack.":
    "Elementos esenciales ya cubiertos por el nuevo stack.",
  "nenhum item detectado": "ningún elemento detectado",
  "Watch ao vivo": "Watch en vivo",
  "evento(s)": "evento(s)",
  "Espelha os eventos emitidos pela serial, pelo frontend e pelo backend Rust. Quando você girar um knob, o fluxo aparece aqui e no terminal do `tauri dev`.":
    "Refleja los eventos emitidos por la serial, el frontend y el backend Rust. Cuando gires un knob, el flujo aparece aquí y en la terminal de `tauri dev`.",
  Todos: "Todos",
  Limpar: "Limpiar",
  Exportar: "Exportar",
  Exportando: "Exportando",
  "Exportando watch log...": "Exportando watch log...",
  "Exportacao cancelada": "Exportación cancelada",
  "Exportacao do watch log solicitada": "Exportación del watch log solicitada",
  "Exportacao do watch log cancelada": "Exportación del watch log cancelada",
  "Watch log exportado": "Watch log exportado",
  "Watch log exportado: {count} evento(s) em {path}":
    "Watch log exportado: {count} evento(s) en {path}",
  "Falha ao exportar watch log": "Fallo al exportar el watch log",
  "Backup do estado persistido criado": "Backup del estado persistido creado",
  "Entradas malformadas ignoradas no watch log":
    "Entradas malformadas ignoradas en el watch log",
  "Seguir fim": "Seguir el final",
  "Nenhum evento no filtro atual.": "Ningún evento en el filtro actual.",
  "Última linha": "Última línea",
  "Contexto ao vivo": "Contexto en vivo",
  "Resumo da sessão atual e do estado observado pelo watch.":
    "Resumen de la sesión actual y del estado observado por el watch.",
  Status: "Estado",
  "Backend áudio": "Backend de audio",
  "Perfil ativo": "Perfil activo",
  "O terminal do Tauri mostra os `println!` do backend. Este painel espelha os eventos estruturados emitidos pela app, pela serial e pelo Rust.":
    "La terminal de Tauri muestra los `println!` del backend. Este panel refleja los eventos estructurados emitidos por la app, la serial y Rust.",
  "Sessao viva": "Sesión en vivo",
  "Estado atual do link serial, perfil carregado e resposta dos knobs.":
    "Estado actual del enlace serial, perfil cargado y respuesta de los knobs.",
  "Aguardando porta": "Esperando puerto",
  Perfil: "Perfil",
  "destino(s) mapeado(s)": "destino(s) mapeado(s)",
  "Ultimo frame": "Último frame",
  "Aguardando leitura": "Esperando lectura",
  inicial: "inicial",
  Buffer: "Búfer",
  "amostra(s)": "muestra(s)",
  Hardware: "Hardware",
  "Aguardando handshake": "Esperando handshake",
  "Ligue o controlador": "Enciende el controlador",
  protocolo: "protocolo",
  "incompatível": "incompatible",
  "Operação": "Operación",
  Monitoramento: "Monitoreo",
  Ajustes: "Ajustes",
  Iniciando: "Iniciando",
  Pronto: "Listo",
  Procurando: "Buscando",
  Conectando: "Conectando",
  Conectado: "Conectado",
  Demo: "Demo",
  Desconectado: "Desconectado",
  Erro: "Error",
  "Saúde da conexão": "Salud de la conexión",
  Sinal: "Señal",
  "Exportar estatísticas em JSON": "Exportar estadísticas en JSON",
  "Exportar estatísticas em CSV": "Exportar estadísticas en CSV",
  "sem sinal": "sin señal",
  "ao vivo": "en vivo",
  "atrás": "atrás",
  Perfis: "Perfiles",
  Editor: "Editor",
  "Avançado": "Avanzado",
  "Crie, importe, exporte e selecione perfis salvos.":
    "Crea, importa, exporta y selecciona perfiles guardados.",
  "Conexão, áudio, firmware, knobs e destinos.":
    "Conexión, audio, firmware, knobs y destinos.",
  "JSON do perfil e inventário para targets.":
    "JSON del perfil e inventario para targets.",
  "Conexão, sessão e preferências de runtime.":
    "Conexión, sesión y preferencias del runtime.",
  "Knobs ao vivo e seus destinos de áudio.":
    "Knobs en vivo y sus destinos de audio.",
  "Controlador, MCU, ADC e backend de áudio.":
    "Controlador, MCU, ADC y backend de audio.",
  "Logs e checklist técnico da integração.":
    "Logs y checklist técnico de la integración.",
  "Abrir canais": "Abrir canales",
  "Abrir hardware": "Abrir hardware",
  "Ajuste os knobs ao vivo e seus destinos de áudio.":
    "Ajusta los knobs en vivo y sus destinos de audio.",
  "Veja placa, MCU, resolução do ADC e o backend de áudio.":
    "Mira la placa, el MCU, la resolución del ADC y el backend de audio.",
  Controlador: "Controlador",
  "Identidade do hardware reportada pelo handshake do firmware.":
    "Identidad del hardware reportada por el handshake del firmware.",
  "sem handshake": "sin handshake",
  "Nenhum controlador conectado": "Ningún controlador conectado",
  "Ligue o controlador e aguarde o handshake para ver placa, MCU e resolução do ADC.":
    "Enciende el controlador y espera el handshake para ver placa, MCU y resolución del ADC.",
  "protocolo compatível": "protocolo compatible",
  "protocolo incompatível": "protocolo incompatible",
  Placa: "Placa",
  firmware: "firmware",
  "não reportado": "no reportado",
  microcontrolador: "microcontrolador",
  "Resolução do ADC": "Resolución del ADC",
  Protocolo: "Protocolo",
  "compatível com o desktop": "compatible con el escritorio",
  "verifique a versão do firmware": "verifica la versión del firmware",
  Knobs: "Knobs",
  desconhecido: "desconocido",
  "canais ativos": "canales activos",
  "Ajuste do controlador": "Ajuste del controlador",
  Threshold: "Umbral",
  Deadzone: "Zona muerta",
  "Suavização": "Suavizado",
  "Mín. bruto": "Mín. bruto",
  "Máx. bruto": "Máx. bruto",
  "Leitura atual": "Lectura actual",
  "Todos os canais espelhados como instrumentos vivos.":
    "Todos los canales reflejados como instrumentos vivos.",
  aplicada: "aplicado",
  "Telemetria dos knobs": "Telemetría de los knobs",
  "Linha do tempo com persistencia visual do ultimo valor conhecido em cada canal.":
    "Línea de tiempo con persistencia visual del último valor conocido en cada canal.",
  Janela: "Ventana",
  Tick: "Tick",
  Canais: "Canales",
  "Protocolo serial legado e frame completo":
    "Protocolo serial legado y frame completo",
  "Redução de ruído e aplicação incremental":
    "Reducción de ruido y aplicación incremental",
  "Persistência local em JSON": "Persistencia local en JSON",
  "Telemetria com Recharts": "Telemetría con Recharts",
  "Backend de áudio em Rust para Linux": "Backend de audio en Rust para Linux",
  "Perfis salvos": "Perfiles guardados",
  "Selecione rapidamente um preset, duplique uma base existente e mantenha múltiplos layouts sem tocar no JSON bruto.":
    "Selecciona rápidamente un preset, duplica una base existente y mantén múltiples layouts sin tocar el JSON crudo.",
  "Novo perfil": "Nuevo perfil",
  "Duplicar ativo": "Duplicar activo",
  "Remover ativo": "Eliminar activo",
  "Rascunho pendente": "Borrador pendiente",
  Ativo: "Activo",
  "knob(s)": "knob(s)",
  manual: "manual",
  "Editor estruturado bloqueado": "Editor estructurado bloqueado",
  "Corrija o JSON avançado antes de trocar, criar, duplicar ou remover perfis.":
    "Corrige el JSON avanzado antes de cambiar, crear, duplicar o eliminar perfiles.",
  "Corrija o JSON avançado antes de alterar a coleção de perfis":
    "Corrige el JSON avanzado antes de alterar la colección de perfiles",
  "Nao foi possivel salvar o rascunho antes da troca de perfil":
    "No fue posible guardar el borrador antes del cambio de perfil",
  "Corrija o JSON avançado antes de continuar":
    "Corrige el JSON avanzado antes de continuar",
  "Editor estruturado": "Editor estructurado",
  "Ajuste nome, serial, áudio e preferências visuais do perfil com formulários seguros. As mudanças alimentam o mesmo rascunho do JSON avançado.":
    "Ajusta nombre, serial, audio y preferencias visuales del perfil con formularios seguros. Los cambios alimentan el mismo borrador del JSON avanzado.",
  "Nome do perfil": "Nombre del perfil",
  "ID técnico": "ID técnico",
  Tema: "Tema",
  Idioma: "Idioma",
  "Português (Brasil)": "Portugués (Brasil)",
  "Redução de ruído": "Reducción de ruido",
  "Baud rate": "Baud rate",
  "Heartbeat (ms)": "Heartbeat (ms)",
  "Janela da telemetria": "Ventana de la telemetría",
  "Transição (ms)": "Transición (ms)",
  "Threshold do firmware": "Umbral del firmware",
  "Deadzone do firmware": "Zona muerta del firmware",
  "Smoothing do firmware (%)": "Suavizado del firmware (%)",
  Baixa: "Baja",
  Padrão: "Predeterminado",
  Alta: "Alta",
  "Conecta a serial automaticamente no boot quando possível.":
    "Conecta la serial automáticamente al arrancar cuando es posible.",
  "Auto-connect": "Auto-conexión",
  "auto-connect": "auto-conexión",
  "Transições suaves": "Transiciones suaves",
  "Mantém o backend com aplicação mais suave entre amostras.":
    "Mantiene el backend con una aplicación más suave entre muestras.",
  "Mostra gráficos e telemetria ao vivo na visão principal.":
    "Muestra gráficos y telemetría en vivo en la vista principal.",
  Visualizadores: "Visualizadores",
  "Knobs e destinos": "Knobs y destinos",
  "Reordene canais, renomeie knobs e monte múltiplos targets sem abrir o editor JSON.":
    "Reordena canales, renombra knobs y arma múltiples targets sin abrir el editor JSON.",
  "Adicionar knob": "Agregar knob",
  "Corrija o JSON avançado para liberar o editor visual dos knobs.":
    "Corrige el JSON avanzado para desbloquear el editor visual de los knobs.",
  Knob: "Knob",
  id: "id",
  invertido: "invertido",
  Subir: "Subir",
  Descer: "Bajar",
  Remover: "Eliminar",
  "Nome do knob": "Nombre del knob",
  "Direção invertida": "Dirección invertida",
  "Inverte o sentido lógico do knob sem mudar a fiação física.":
    "Invierte el sentido lógico del knob sin cambiar el cableado físico.",
  "Calibração mínima": "Calibración mínima",
  "Calibração máxima": "Calibración máxima",
  "Destinos do knob": "Destinos del knob",
  "Misture master, app, source e sink no mesmo canal.":
    "Mezcla master, app, source y sink en el mismo canal.",
  "Adicionar target": "Agregar target",
  Tipo: "Tipo",
  master: "master",
  application: "application",
  source: "source",
  sink: "sink",
  "Controla a saída principal atual do sistema.":
    "Controla la salida principal actual del sistema.",
  "Nome do target": "Nombre del target",
  "Dica: as sugestões acima vêm do inventário de áudio carregado na sessão.":
    "Consejo: las sugerencias de arriba vienen del inventario de audio cargado en la sesión.",
  "JSON avançado": "JSON avanzado",
  "Escape hatch para ajustes finos, revisão de schema e colagem direta de perfis completos.":
    "Vía de escape para ajustes finos, revisión de schema y pegado directo de perfiles completos.",
  "Salvar perfil": "Guardar perfil",
  "Restaurar padrão": "Restaurar predeterminado",
  "Inventário para targets": "Inventario para targets",
  "Use estes nomes reais do runtime atual para preencher applications, sinks e sources com menos tentativa e erro.":
    "Usa estos nombres reales del runtime actual para rellenar applications, sinks y sources con menos prueba y error.",
  Applications: "Applications",
  Sources: "Sources",
  Sinks: "Sinks",
  Sessão: "Sesión",
  "Navegação principal do Ioruba": "Navegación principal de Ioruba",
  "Tauri 2 + React + TS": "Tauri 2 + React + TS",
  "Arduino C++": "Arduino C++",
  Serial: "Serial",
  Backend: "Backend",
  App: "App",
  Warning: "Advertencia",
  Error: "Error",
  Info: "Info",
  "Conexão serial encerrada": "Conexión serial cerrada",
  "Inventario de audio solicitado": "Inventario de audio solicitado",
  "Falha ao atualizar inicializacao com a sessao":
    "Fallo al actualizar el inicio con la sesión",
  "Janela ocultada; runtime continua ativo no tray":
    "Ventana oculta; el runtime sigue activo en la bandeja",
  "Falha ao ocultar janela no fechamento": "Fallo al ocultar la ventana al cerrar",
  "Watch bridge ativo": "Watch bridge activo",
  "Watch bridge indisponivel": "Watch bridge no disponible",
  "Falha ao aplicar lote de áudio": "Fallo al aplicar el lote de audio",
  "Handshake do firmware solicitado": "Handshake del firmware solicitado",
  "Falha ao solicitar handshake do firmware":
    "Fallo al solicitar el handshake del firmware",
  "Falha ao cancelar leitura serial": "Fallo al cancelar la lectura serial",
  "Falha ao fechar porta serial": "Fallo al cerrar el puerto serial",
  "Porta serial encerrada": "Puerto serial cerrado",
  "Iniciando conexao serial": "Iniciando conexión serial",
  "Porta serial aberta": "Puerto serial abierto",
  "Escuta serial ativa": "Escucha serial activa",
  "Conexao serial estabelecida": "Conexión serial establecida",
  "Falha ao abrir porta serial": "Fallo al abrir el puerto serial",
  "Sem leituras seriais recentes": "Sin lecturas seriales recientes",
  "Configuracao do firmware enviada": "Configuración del firmware enviada",
  "Falha ao enviar configuracao do firmware":
    "Fallo al enviar la configuración del firmware",
  "Boot do runtime iniciado": "Arranque del runtime iniciado",
  "Runtime hidratado": "Runtime hidratado",
  "Persistencia restaurou modo demo": "La persistencia restauró el modo demo",
  "Auto-connect habilitado pelo perfil ativo":
    "Auto-conexión habilitada por el perfil activo",
  "Falha ao persistir watch log": "Fallo al persistir el watch log",
  "Falha no boot do runtime": "Fallo en el arranque del runtime",
  "Falha ao consultar portas seriais": "Fallo al consultar los puertos seriales",
  "Portas seriais atualizadas": "Puertos seriales actualizados",
  "Conexao serial solicitada": "Conexión serial solicitada",
  "Monitor serial desligado": "Monitor serial apagado",
  "Modo demo ativado": "Modo demo activado",
  "Modo demo desativado": "Modo demo desactivado",
  "Modo demo ativo": "Modo demo activo",
  "Inicializacao com a sessao ativada": "Inicio con la sesión activado",
  "Inicializacao com a sessao desativada": "Inicio con la sesión desactivado",
  "Perfil ativo selecionado": "Perfil activo seleccionado",
  "Novo perfil criado": "Nuevo perfil creado",
  "Perfil duplicado": "Perfil duplicado",
  "Remocao ignorada": "Eliminación ignorada",
  "Perfil removido": "Perfil eliminado",
  "Porta preferida atualizada": "Puerto preferido actualizado",
  "Tema da interface atualizado": "Tema de la interfaz actualizado",
  "Falha ao salvar perfil": "Fallo al guardar el perfil",
  "Perfil atualizado": "Perfil actualizado",
  "Perfil ativo atualizado": "Perfil activo actualizado",
  "Perfil padrão restaurado": "Perfil predeterminado restaurado",
  "Perfil restaurado para o padrao": "Perfil restaurado al predeterminado",
  "Handshake do firmware recebido": "Handshake del firmware recibido",
  "Quantidade de knobs do firmware difere do perfil ativo":
    "La cantidad de knobs del firmware difiere del perfil activo",
  "Payload bruto do handshake": "Payload crudo del handshake",
  "Frame serial recebido": "Frame serial recibido",
  "Slideres elegiveis para aplicacao": "Sliders elegibles para aplicación",
  "Resultados aplicados no estado local": "Resultados aplicados en el estado local",
  "Passo de demo gerado": "Paso de demo generado",
  "Fluxo sintético em execução": "Flujo sintético en ejecución",
  Ligado: "Encendido",
  Desligado: "Apagado",
  English: "Inglés",
  "Español": "Español",
  Spotify: "Spotify",
  default_microphone: "default_microphone",
  default_output: "default_output",
  "Leitura bruta": "Lectura cruda",
  atualizado: "actualizado",
  ocioso: "inactivo",
  indisponível: "no disponible",
  ignorado: "omitido",
  erro: "error",
  "alvo(s)": "objetivo(s)",
  nível: "nivel",
  Entrada: "Entrada",
  Saida: "Salida",
  "Resposta do canal": "Respuesta del canal",
  "Valor aplicado pronto para audio backend e telemetria.":
    "Valor aplicado listo para el backend de audio y la telemetría.",
  "Destinos ativos": "Destinos activos",
  "Ultimo resultado": "Último resultado",
  "Mixer de áudio para Linux": "Mezclador de audio para Linux",
  "Painel instrumental com telemetria viva e perfis locais.":
    "Panel instrumental con telemetría en vivo y perfiles locales.",
  "Backend de áudio indisponível": "Backend de audio no disponible",
  "O Ioruba não encontrou o pactl no PATH. O controle de volume está desativado até que o backend seja instalado.":
    "Ioruba no encontró pactl en el PATH. El control de volumen está desactivado hasta que el backend sea instalado.",
  "Como instalar": "Cómo instalar",
  "Esta plataforma ainda não tem backend de áudio nativo. O Ioruba mantém perfis, conexão serial, telemetria e modo demo, mas não altera volumes reais.":
    "Esta plataforma aún no tiene backend de audio nativo. Ioruba mantiene perfiles, conexión serial, telemetría y modo demo, pero no altera volúmenes reales.",
  "Fallback disponível": "Alternativa disponible",
  "Use o modo demo para validar perfis e telemetria.":
    "Usa el modo demo para validar perfiles y telemetría.",
  "Conecte o Arduino para testar a leitura serial sem aplicar áudio.":
    "Conecta el Arduino para probar la lectura serial sin aplicar audio.",
  "Use Linux com pactl para controle de volume real.":
    "Usa Linux con pactl para control de volumen real.",
  "em uso por outro processo. Feche o monitor serial ou outro app que esteja com a porta aberta.":
    "en uso por otro proceso. Cierra el monitor serial u otra app que tenga el puerto abierto.",
  "Sem permissão para abrir": "Sin permiso para abrir",
  "Adicione seu usuário ao grupo dialout: sudo usermod -aG dialout $USER":
    "Agrega tu usuario al grupo dialout: sudo usermod -aG dialout $USER",
  "não encontrada. O dispositivo pode ter sido desconectado.":
    "no encontrado. El dispositivo puede haber sido desconectado.",
  "Carregando telemetria...": "Cargando telemetría...",
  "Começar por um preset": "Comenzar con un preset",
  "Cria um novo perfil com sliders prontos para o caso de uso. Você ainda pode ajustar tudo depois.":
    "Crea un nuevo perfil con sliders listos para el caso de uso. Aún puedes ajustar todo después.",
  Streaming: "Streaming",
  "Balanceie áudio do sistema, o app de captura e o microfone durante uma transmissão ao vivo.":
    "Balancea el audio del sistema, la app de captura y el micrófono durante una transmisión en vivo.",
  Chamadas: "Llamadas",
  "Controle volume geral, a sala de videoconferência no navegador e o microfone em reuniões.":
    "Controla el volumen general, la sala de videoconferencia en el navegador y el micrófono en reuniones.",
  Música: "Música",
  "Ajuste o volume geral, o player de música e a saída padrão para audição ou produção.":
    "Ajusta el volumen general, el reproductor de música y la salida predeterminada para escucha o producción.",
  "Exportar perfil": "Exportar perfil",
  "Importar perfil": "Importar perfil",
  "Primeiros passos": "Primeros pasos",
  concluídos: "completados",
  "Dispensar primeiros passos": "Descartar primeros pasos",
  "Conecte o controlador": "Conecta el controlador",
  "Handshake do firmware recebido.": "Handshake del firmware recibido.",
  "Ligue o Arduino e aguarde o handshake do firmware.":
    "Enciende el Arduino y espera el handshake del firmware.",
  "Encontre a porta serial": "Encuentra el puerto serial",
  "Porta serial detectada.": "Puerto serial detectado.",
  "Nenhuma porta serial disponível ainda. Verifique o cabo USB.":
    "Ningún puerto serial disponible aún. Verifica el cable USB.",
  "Verifique o áudio do sistema": "Verifica el audio del sistema",
  "Backend de áudio disponível.": "Backend de audio disponible.",
  "Controle de áudio do sistema indisponível. No Linux, instale pipewire-pulse ou pulseaudio-utils.":
    "Control de audio del sistema no disponible. En Linux, instala pipewire-pulse o pulseaudio-utils.",
  "Estatísticas da sessão": "Estadísticas de la sesión",
  "Resetar estatísticas da sessão": "Restablecer estadísticas de la sesión",
  "amostras": "muestras",
  "ticks": "ticks",
  "Resetar": "Restablecer",
  "Nenhuma amostra ainda. Conecte o controlador ou inicie o modo demo.":
    "Ninguna muestra aún. Conecta el controlador o inicia el modo demo.",
  "Amostras": "Muestras",
  "Mín": "Mín",
  "Méd": "Prom",
  "Máx": "Máx",
  "Atual": "Actual",
  "Sem dados de telemetria ainda": "Sin datos de telemetría aún",
  "Mova um knob com o controlador conectado para começar a registrar a linha do tempo.":
    "Mueve un knob con el controlador conectado para comenzar a registrar la línea de tiempo.",
  "Calibração de knobs": "Calibración de knobs",
  "Capture os limites físicos de cada knob ao vivo e grave no perfil ativo. O firmware é sincronizado automaticamente.":
    "Captura los límites físicos de cada knob en vivo y guárdalos en el perfil activo. El firmware se sincroniza automáticamente.",
  "sinal ao vivo": "señal en vivo",
  "calibrado: {min} – {max}": "calibrado: {min} – {max}",
  "padrão: 0 – {max}": "predeterminado: 0 – {max}",
  Calibrar: "Calibrar",
  "Conecte o controlador para calibrar com leituras reais do hardware.":
    "Conecta el controlador para calibrar con lecturas reales del hardware.",
  "passo 1 de 2 — mínimo": "paso 1 de 2 — mínimo",
  "passo 2 de 2 — máximo": "paso 2 de 2 — máximo",
  revisão: "revisión",
  "Gire o knob até o limite mínimo físico e clique em Capturar.":
    "Gira el knob hasta el límite mínimo físico y haz clic en Capturar.",
  "Agora gire o knob até o limite máximo físico e clique em Capturar.":
    "Ahora gira el knob hasta el límite máximo físico y haz clic en Capturar.",
  "leitura ao vivo": "lectura en vivo",
  "mínimo observado": "mínimo observado",
  "máximo observado": "máximo observado",
  "Faixa capturada muito curta (mínimo {span} contagens). Refaça movendo o knob de ponta a ponta.":
    "Rango capturado demasiado corto (mínimo {span} cuentas). Rehazlo moviendo el knob de extremo a extremo.",
  Capturar: "Capturar",
  "Aplicar ao perfil": "Aplicar al perfil",
  Cancelar: "Cancelar",
};

const LANGUAGE_TEXT_MAPS: Record<
  Exclude<UiLanguage, "pt-BR">,
  Record<string, string>
> = {
  en: TEXT_MAP_EN,
  es: TEXT_MAP_ES
};

export function translateText(language: UiLanguage, text: string): string {
  if (language === "pt-BR") {
    return text;
  }

  return LANGUAGE_TEXT_MAPS[language][text] ?? text;
}

export function translateTemplate(
  language: UiLanguage,
  text: string,
  replacements: Record<string, string>,
): string {
  const translated = translateText(language, text);

  return Object.entries(replacements).reduce(
    (result, [key, value]) => result.split(`{${key}}`).join(value),
    translated,
  );
}
