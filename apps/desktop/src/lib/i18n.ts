import type { UiLanguage } from "@ioruba/shared";

const TEXT_MAP: Record<string, string> = {
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
};

export function translateText(language: UiLanguage, text: string): string {
  if (language === "pt-BR") {
    return text;
  }

  return TEXT_MAP[text] ?? text;
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
