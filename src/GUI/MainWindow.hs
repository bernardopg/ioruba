module GUI.MainWindow
  ( renderGuiStateJson
  , renderMainWindow
  , renderMainWindowShell
  ) where

import App.I18n
  ( Message(..)
  , UiLanguage(..)
  , translate
  , translateString
  , uiLanguageCode
  )
import App.Runtime.State
  ( RuntimeDiagnostics(..)
  , RuntimeKnobSnapshot(..)
  , RuntimeSnapshot(..)
  , runtimeStatusTone
  )
import App.Settings (UiSettings(..))
import Config.Types (Theme(..))
import Data.Aeson (Value, (.=), encode, object)
import qualified Data.ByteString.Lazy as LBS
import qualified Data.ByteString.Lazy.Char8 as LBS8
import Data.List (intercalate, isPrefixOf)
import GUI.State (GuiLayout(..), GuiState(..), GuiToast(..))

renderGuiStateJson :: GuiState -> LBS.ByteString
renderGuiStateJson = encode . guiStateValue

renderMainWindow :: GuiState -> String
renderMainWindow state =
  renderDocument (Just (inlineJson (renderGuiStateJson state)))

renderMainWindowShell :: GuiState -> String
renderMainWindowShell state =
  renderDocument (Just (inlineJson (renderGuiStateJson state)))

renderDocument :: Maybe String -> String
renderDocument maybeInitialState =
  unlines
    [ "<!doctype html>"
    , "<html lang=\"en\">"
    , "<head>"
    , "  <meta charset=\"utf-8\">"
    , "  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">"
    , "  <title>Ioruba GUI</title>"
    , "  <style>"
    , cssDocument
    , "  </style>"
    , "</head>"
    , "<body>"
    , "  <div id=\"app\"></div>"
    , "  <script>"
    , "    const initialState = " ++ maybe "null" id maybeInitialState ++ ";"
    , javascriptDocument
    , "    if (initialState) {"
    , "      window.iorubaUpdate(initialState);"
    , "    }"
    , "  </script>"
    , "</body>"
    , "</html>"
    ]

guiStateValue :: GuiState -> Value
guiStateValue state =
  object
    [ "language_code" .= uiLanguageCode language
    , "theme" .= themeCode (guiStateTheme state)
    , "layout" .= layoutCode (guiStateLayout state)
    , "labels" .= labelsObject language
    , "status" .= statusObject snapshot
    , "connection" .= connectionObject language snapshot
    , "diagnostics" .= diagnosticsObject snapshot
    , "settings" .= settingsObject language (guiStateSettings state) snapshot
    , "knobs" .= map knobObject (runtimeSnapshotKnobs snapshot)
    , "toasts" .= map toastObject (guiStateToasts state)
    ]
  where
    language = guiStateLanguage state
    snapshot = guiStateSnapshot state

labelsObject :: UiLanguage -> Value
labelsObject language =
  object
    [ "app_title" .= translate language MsgAppTitle
    , "app_subtitle" .= translate language MsgAppSubtitle
    , "status" .= translate language MsgLabelStatus
    , "language" .= translate language MsgLabelLanguage
    , "theme" .= translate language MsgLabelTheme
    , "connection" .= translate language MsgSectionConnection
    , "current_port" .= translate language MsgLabelCurrentPort
    , "available" .= translate language MsgLabelAvailable
    , "diagnostics" .= translate language MsgLabelDiagnostics
    , "audio" .= translate language MsgLabelAudio
    , "hint" .= translate language MsgLabelHint
    , "last_serial" .= translate language MsgLabelLastSerial
    , "settings" .= translate language MsgSectionSettings
    , "preferred_port" .= translate language MsgLabelPreferredPort
    , "auto_connect" .= translate language MsgLabelAutoConnect
    , "demo_mode" .= translate language MsgLabelDemoMode
    , "about" .= translate language MsgSectionAbout
    , "targets" .= translate language MsgLabelTargets
    , "outcome" .= translate language MsgLabelOutcome
    , "raw" .= translate language MsgLabelRaw
    , "footer_hint" .= translate language MsgFooterHint
    , "none" .= localizedNone language
    , "not_available" .= localizedNotAvailable language
    , "enabled" .= localizedEnabled language
    , "disabled" .= localizedDisabled language
    , "live_runtime" .= localizedLiveRuntime language
    , "knob_summary" .= localizedKnobSummary language
    , "status_online" .= translate language MsgStatusOnline
    , "status_syncing" .= translate language MsgStatusSyncing
    , "status_attention" .= translate language MsgStatusAttention
    ]

statusObject :: RuntimeSnapshot -> Value
statusObject snapshot =
  object
    [ "code" .= show (runtimeSnapshotStatus snapshot)
    , "text" .= runtimeSnapshotStatusText snapshot
    , "tone" .= runtimeStatusTone (runtimeSnapshotStatus snapshot)
    ]

connectionObject :: UiLanguage -> RuntimeSnapshot -> Value
connectionObject language snapshot =
  object
    [ "current_port" .= maybe (localizedNone language) id (runtimeSnapshotConnectionPort snapshot)
    , "available_ports" .= runtimeSnapshotAvailablePorts snapshot
    , "available_ports_text" .= renderPorts language (runtimeSnapshotAvailablePorts snapshot)
    , "demo_mode" .= runtimeSnapshotDemoMode snapshot
    ]

diagnosticsObject :: RuntimeSnapshot -> Value
diagnosticsObject snapshot =
  object
    [ "audio_summary" .= runtimeDiagnosticsAudioSummary diagnostics
    , "active_applications" .= runtimeDiagnosticsActiveApplications diagnostics
    , "last_serial" .= runtimeDiagnosticsLastSerialLine diagnostics
    , "hint" .= runtimeDiagnosticsHint diagnostics
    ]
  where
    diagnostics = runtimeSnapshotDiagnostics snapshot

settingsObject :: UiLanguage -> UiSettings -> RuntimeSnapshot -> Value
settingsObject language settings snapshot =
  object
    [ "language" .= uiLanguageCode (uiSettingsLanguage settings)
    , "preferred_port" .= maybe (localizedNone language) id (uiSettingsPreferredPort settings)
    , "auto_connect" .= uiSettingsAutoConnect settings
    , "demo_mode" .= runtimeSnapshotDemoMode snapshot
    ]

knobObject :: RuntimeKnobSnapshot -> Value
knobObject knob =
  object
    [ "id" .= runtimeKnobId knob
    , "name" .= runtimeKnobName knob
    , "percent" .= runtimeKnobPercent knob
    , "raw_value" .= runtimeKnobRawValue knob
    , "targets" .= runtimeKnobTargets knob
    , "outcome" .= runtimeKnobOutcome knob
    , "accent" .= runtimeKnobAccent knob
    ]

toastObject :: GuiToast -> Value
toastObject toast =
  object
    [ "title" .= guiToastTitle toast
    , "body" .= guiToastBody toast
    ]

renderPorts :: UiLanguage -> [FilePath] -> String
renderPorts language [] = translateString language MsgNoPortsDetected
renderPorts _ ports = intercalate "  " ports

themeCode :: Theme -> String
themeCode ThemeDark = "dark"
themeCode ThemeLight = "light"
themeCode ThemeAuto = "auto"

layoutCode :: GuiLayout -> String
layoutCode GuiLayoutNarrow = "narrow"
layoutCode GuiLayoutMedium = "medium"
layoutCode GuiLayoutWide = "wide"

localizedNone :: UiLanguage -> String
localizedNone UiLanguageEn = "none"
localizedNone UiLanguagePtBR = "nenhuma"

localizedNotAvailable :: UiLanguage -> String
localizedNotAvailable UiLanguageEn = "Not available"
localizedNotAvailable UiLanguagePtBR = "Indisponivel"

localizedEnabled :: UiLanguage -> String
localizedEnabled UiLanguageEn = "Enabled"
localizedEnabled UiLanguagePtBR = "Ativo"

localizedDisabled :: UiLanguage -> String
localizedDisabled UiLanguageEn = "Disabled"
localizedDisabled UiLanguagePtBR = "Inativo"

localizedLiveRuntime :: UiLanguage -> String
localizedLiveRuntime UiLanguageEn = "Live runtime overview"
localizedLiveRuntime UiLanguagePtBR = "Visao geral em tempo real"

localizedKnobSummary :: UiLanguage -> String
localizedKnobSummary UiLanguageEn = "Mapped controls"
localizedKnobSummary UiLanguagePtBR = "Controles mapeados"

inlineJson :: LBS.ByteString -> String
inlineJson =
  escapeInlineScript . LBS8.unpack

escapeInlineScript :: String -> String
escapeInlineScript = go
  where
    go [] = []
    go remaining
      | "</" `isPrefixOf` remaining = '<' : '\\' : '/' : go (drop 2 remaining)
      | otherwise = head remaining : go (tail remaining)

cssDocument :: String
cssDocument =
  unlines
    [ "    :root {"
    , "      color-scheme: dark;"
    , "      --bg: #0b1014;"
    , "      --panel: rgba(18, 27, 34, 0.88);"
    , "      --panel-strong: rgba(25, 37, 46, 0.96);"
    , "      --panel-muted: rgba(14, 20, 26, 0.7);"
    , "      --text: #f3f6f8;"
    , "      --muted: #9cb0bc;"
    , "      --line: rgba(158, 183, 196, 0.16);"
    , "      --shadow: 0 24px 80px rgba(0, 0, 0, 0.28);"
    , "      --good: #74d9a7;"
    , "      --warn: #f5c45d;"
    , "      --bad: #ff7d6d;"
    , "      --hero-a: #173242;"
    , "      --hero-b: #0f181f;"
    , "      --grid-gap: 18px;"
    , "      font-family: \"IBM Plex Sans\", \"Segoe UI\", sans-serif;"
    , "    }"
    , "    body[data-theme='light'] {"
    , "      color-scheme: light;"
    , "      --bg: #edf3f6;"
    , "      --panel: rgba(255, 255, 255, 0.94);"
    , "      --panel-strong: rgba(255, 255, 255, 0.98);"
    , "      --panel-muted: rgba(241, 246, 248, 0.92);"
    , "      --text: #12212a;"
    , "      --muted: #5d727d;"
    , "      --line: rgba(23, 47, 61, 0.12);"
    , "      --shadow: 0 24px 80px rgba(22, 52, 69, 0.12);"
    , "      --hero-a: #d6ecf4;"
    , "      --hero-b: #ffffff;"
    , "    }"
    , "    * { box-sizing: border-box; }"
    , "    html, body { min-height: 100%; margin: 0; background: radial-gradient(circle at top, rgba(69, 132, 164, 0.28), transparent 38%), var(--bg); color: var(--text); }"
    , "    body { overflow: hidden; }"
    , "    #app { min-height: 100vh; }"
    , "    .page { min-height: 100vh; padding: 28px; display: grid; gap: 20px; background: linear-gradient(180deg, rgba(255,255,255,0.02), transparent 28%); }"
    , "    .hero { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(320px, 1fr); gap: var(--grid-gap); }"
    , "    .hero-main, .hero-side, .panel { background: var(--panel); border: 1px solid var(--line); border-radius: 24px; box-shadow: var(--shadow); backdrop-filter: blur(18px); }"
    , "    .hero-main { padding: 26px 28px; background: linear-gradient(135deg, var(--hero-a), var(--hero-b)); }"
    , "    .hero-kicker { margin: 0 0 8px; color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: 0.18em; }"
    , "    .hero-title { margin: 0; font-size: clamp(38px, 5vw, 68px); line-height: 0.92; letter-spacing: -0.05em; }"
    , "    .hero-subtitle { margin: 14px 0 0; font-size: 18px; color: var(--muted); max-width: 36rem; }"
    , "    .status-row { margin-top: 24px; display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }"
    , "    .badge { display: inline-flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: 999px; border: 1px solid var(--line); background: rgba(255,255,255,0.08); font-size: 12px; text-transform: uppercase; letter-spacing: 0.12em; }"
    , "    .badge::before { content: ''; width: 10px; height: 10px; border-radius: 999px; background: var(--accent, var(--good)); box-shadow: 0 0 20px color-mix(in srgb, var(--accent, var(--good)) 70%, transparent); }"
    , "    .badge-good { --accent: var(--good); }"
    , "    .badge-warn { --accent: var(--warn); }"
    , "    .badge-bad { --accent: var(--bad); }"
    , "    .hero-side { padding: 22px; display: grid; gap: 14px; align-content: start; }"
    , "    .metric-label { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.16em; }"
    , "    .metric-value { margin-top: 6px; font-size: 28px; font-weight: 700; letter-spacing: -0.03em; }"
    , "    .metric-text { margin-top: 6px; color: var(--muted); font-size: 14px; line-height: 1.45; }"
    , "    .dashboard { display: grid; grid-template-columns: 1.05fr 0.95fr; gap: var(--grid-gap); min-height: 0; }"
    , "    .stack { display: grid; gap: var(--grid-gap); align-content: start; }"
    , "    .panel { padding: 20px; }"
    , "    .panel-title { margin: 0 0 16px; font-size: 15px; text-transform: uppercase; letter-spacing: 0.14em; color: var(--muted); }"
    , "    .kv { display: grid; gap: 12px; }"
    , "    .kv-row { display: flex; justify-content: space-between; gap: 18px; padding-bottom: 10px; border-bottom: 1px solid var(--line); }"
    , "    .kv-row:last-child { border-bottom: 0; padding-bottom: 0; }"
    , "    .kv-label { color: var(--muted); min-width: 120px; }"
    , "    .kv-value { text-align: right; word-break: break-word; }"
    , "    .chips { display: flex; flex-wrap: wrap; gap: 8px; }"
    , "    .chip { display: inline-flex; align-items: center; padding: 6px 10px; border-radius: 999px; background: var(--panel-muted); border: 1px solid var(--line); font-size: 12px; color: var(--muted); }"
    , "    .knobs { display: grid; gap: 14px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }"
    , "    .knob { background: var(--panel-strong); border: 1px solid var(--line); border-radius: 22px; padding: 18px; display: grid; gap: 14px; }"
    , "    .knob-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }"
    , "    .knob-title { margin: 0; font-size: 20px; letter-spacing: -0.03em; }"
    , "    .knob-id { color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: 0.12em; }"
    , "    .knob-percent { font-size: 28px; font-weight: 700; letter-spacing: -0.04em; }"
    , "    .bar { height: 12px; border-radius: 999px; background: var(--panel-muted); overflow: hidden; border: 1px solid var(--line); }"
    , "    .bar-fill { height: 100%; width: 0%; border-radius: inherit; transition: width 140ms linear; background: linear-gradient(90deg, var(--bar-a), var(--bar-b)); }"
    , "    .bar-cyan { --bar-a: #55d9e6; --bar-b: #72f0c0; }"
    , "    .bar-amber { --bar-a: #ffcc73; --bar-b: #ff8b53; }"
    , "    .bar-teal { --bar-a: #58d8c8; --bar-b: #1ab6a5; }"
    , "    .bar-rose { --bar-a: #ffa0aa; --bar-b: #ff6b81; }"
    , "    .bar-lime { --bar-a: #b2ed74; --bar-b: #67d85f; }"
    , "    .footer { display: flex; justify-content: space-between; gap: 18px; align-items: center; color: var(--muted); font-size: 13px; }"
    , "    .toasts { display: flex; flex-wrap: wrap; gap: 10px; }"
    , "    .toast { padding: 10px 14px; border-radius: 16px; background: var(--panel-muted); border: 1px solid var(--line); font-size: 13px; }"
    , "    .toast strong { display: block; margin-bottom: 2px; color: var(--text); }"
    , "    .empty { color: var(--muted); font-style: italic; }"
    , "    @media (max-width: 1100px) { .hero, .dashboard { grid-template-columns: 1fr; } body { overflow: auto; } }"
    , "    @media (max-width: 720px) { .page { padding: 18px; } .hero-main, .hero-side, .panel { border-radius: 20px; } .hero-title { font-size: 42px; } .footer { flex-direction: column; align-items: flex-start; } }"
    ]

javascriptDocument :: String
javascriptDocument =
  unlines
    [ "    const root = document.body;"
    , "    const app = document.getElementById('app');"
    , "    let pendingState = null;"
    , "    let renderScheduled = false;"
    , ""
    , "    function escapeHtml(value) {"
    , "      return String(value ?? '')"
    , "        .replace(/&/g, '&amp;')"
    , "        .replace(/</g, '&lt;')"
    , "        .replace(/>/g, '&gt;')"
    , "        .replace(/\"/g, '&quot;')"
    , "        .replace(/'/g, '&#39;');"
    , "    }"
    , ""
    , "    function badgeClass(tone) {"
    , "      if (tone === 'positive') return 'badge badge-good';"
    , "      if (tone === 'critical') return 'badge badge-bad';"
    , "      return 'badge badge-warn';"
    , "    }"
    , ""
    , "    function statusLabel(labels, tone) {"
    , "      if (tone === 'positive') return labels.status_online;"
    , "      if (tone === 'critical') return labels.status_attention;"
    , "      return labels.status_syncing;"
    , "    }"
    , ""
    , "    function boolLabel(labels, value) {"
    , "      return value ? labels.enabled : labels.disabled;"
    , "    }"
    , ""
    , "    function renderChips(items, fallback) {"
    , "      if (!items || items.length === 0) return `<span class=\"empty\">${escapeHtml(fallback)}</span>`;"
    , "      return `<div class=\"chips\">${items.map((item) => `<span class=\"chip\">${escapeHtml(item)}</span>`).join('')}</div>`;"
    , "    }"
    , ""
    , "    function renderKnob(knob, labels) {"
    , "      const accent = `bar-${escapeHtml(knob.accent || 'cyan')}`;"
    , "      return `"
    , "        <article class=\"knob\">"
    , "          <div class=\"knob-head\">"
    , "            <div>"
    , "              <div class=\"knob-id\">Knob ${escapeHtml(knob.id)}</div>"
    , "              <h3 class=\"knob-title\">${escapeHtml(knob.name)}</h3>"
    , "            </div>"
    , "            <div class=\"knob-percent\">${escapeHtml(knob.percent)}%</div>"
    , "          </div>"
    , "          <div class=\"bar\">"
    , "            <div class=\"bar-fill ${accent}\" style=\"width:${Math.max(0, Math.min(100, knob.percent || 0))}%\"></div>"
    , "          </div>"
    , "          <div class=\"kv\">"
    , "            <div class=\"kv-row\"><span class=\"kv-label\">${escapeHtml(labels.targets)}</span><span class=\"kv-value\">${renderChips(knob.targets, labels.not_available)}</span></div>"
    , "            <div class=\"kv-row\"><span class=\"kv-label\">${escapeHtml(labels.outcome)}</span><span class=\"kv-value\">${escapeHtml(knob.outcome)}</span></div>"
    , "            <div class=\"kv-row\"><span class=\"kv-label\">${escapeHtml(labels.raw)}</span><span class=\"kv-value\">${escapeHtml(knob.raw_value)}</span></div>"
    , "          </div>"
    , "        </article>`;"
    , "    }"
    , ""
    , "    function renderToast(toast) {"
    , "      return `<div class=\"toast\"><strong>${escapeHtml(toast.title)}</strong>${escapeHtml(toast.body)}</div>`;"
    , "    }"
    , ""
    , "    function applyTheme(theme) {"
    , "      if (theme === 'auto') {"
    , "        const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;"
    , "        root.dataset.theme = prefersLight ? 'light' : 'dark';"
    , "        return;"
    , "      }"
    , "      root.dataset.theme = theme || 'dark';"
    , "    }"
    , ""
    , "    function renderState(state) {"
    , "      const labels = state.labels;"
    , "      const diagnostics = state.diagnostics || {};"
    , "      const connection = state.connection || {};"
    , "      const settings = state.settings || {};"
    , "      const knobs = state.knobs || [];"
    , "      const toasts = state.toasts || [];"
    , "      applyTheme(state.theme);"
    , "      app.innerHTML = `"
    , "        <div class=\"page\">"
    , "          <section class=\"hero\">"
    , "            <div class=\"hero-main\">"
    , "              <p class=\"hero-kicker\">${escapeHtml(labels.live_runtime)}</p>"
    , "              <h1 class=\"hero-title\">${escapeHtml(labels.app_title)}</h1>"
    , "              <p class=\"hero-subtitle\">${escapeHtml(labels.app_subtitle)}</p>"
    , "              <div class=\"status-row\">"
    , "                <span class=\"${badgeClass(state.status.tone)}\">${escapeHtml(statusLabel(labels, state.status.tone))}</span>"
    , "                <span class=\"badge badge-warn\">${escapeHtml(labels.status)}: ${escapeHtml(state.status.code)}</span>"
    , "                <span class=\"badge badge-warn\">${escapeHtml(labels.language)}: ${escapeHtml(state.language_code)}</span>"
    , "                <span class=\"badge badge-warn\">${escapeHtml(labels.theme)}: ${escapeHtml(state.theme)}</span>"
    , "              </div>"
    , "              <p class=\"hero-subtitle\">${escapeHtml(state.status.text)}</p>"
    , "            </div>"
    , "            <aside class=\"hero-side\">"
    , "              <div>"
    , "                <div class=\"metric-label\">${escapeHtml(labels.connection)}</div>"
    , "                <div class=\"metric-value\">${escapeHtml(connection.current_port)}</div>"
    , "                <div class=\"metric-text\">${escapeHtml(connection.available_ports_text)}</div>"
    , "              </div>"
    , "              <div>"
    , "                <div class=\"metric-label\">${escapeHtml(labels.knob_summary)}</div>"
    , "                <div class=\"metric-value\">${escapeHtml(knobs.length)}</div>"
    , "                <div class=\"metric-text\">${escapeHtml(diagnostics.audio_summary || labels.not_available)}</div>"
    , "              </div>"
    , "              <div>"
    , "                <div class=\"metric-label\">${escapeHtml(labels.demo_mode)}</div>"
    , "                <div class=\"metric-value\">${escapeHtml(boolLabel(labels, connection.demo_mode))}</div>"
    , "                <div class=\"metric-text\">${escapeHtml(diagnostics.hint || '')}</div>"
    , "              </div>"
    , "            </aside>"
    , "          </section>"
    , "          <section class=\"dashboard\">"
    , "            <div class=\"stack\">"
    , "              <section class=\"panel\">"
    , "                <h2 class=\"panel-title\">${escapeHtml(labels.connection)}</h2>"
    , "                <div class=\"kv\">"
    , "                  <div class=\"kv-row\"><span class=\"kv-label\">${escapeHtml(labels.current_port)}</span><span class=\"kv-value\">${escapeHtml(connection.current_port)}</span></div>"
    , "                  <div class=\"kv-row\"><span class=\"kv-label\">${escapeHtml(labels.available)}</span><span class=\"kv-value\">${escapeHtml(connection.available_ports_text)}</span></div>"
    , "                  <div class=\"kv-row\"><span class=\"kv-label\">${escapeHtml(labels.demo_mode)}</span><span class=\"kv-value\">${escapeHtml(boolLabel(labels, connection.demo_mode))}</span></div>"
    , "                </div>"
    , "              </section>"
    , "              <section class=\"panel\">"
    , "                <h2 class=\"panel-title\">${escapeHtml(labels.diagnostics)}</h2>"
    , "                <div class=\"kv\">"
    , "                  <div class=\"kv-row\"><span class=\"kv-label\">${escapeHtml(labels.audio)}</span><span class=\"kv-value\">${escapeHtml(diagnostics.audio_summary || labels.not_available)}</span></div>"
    , "                  <div class=\"kv-row\"><span class=\"kv-label\">${escapeHtml(labels.hint)}</span><span class=\"kv-value\">${escapeHtml(diagnostics.hint || labels.not_available)}</span></div>"
    , "                  <div class=\"kv-row\"><span class=\"kv-label\">${escapeHtml(labels.last_serial)}</span><span class=\"kv-value\">${escapeHtml(diagnostics.last_serial || labels.none)}</span></div>"
    , "                </div>"
    , "              </section>"
    , "            </div>"
    , "            <div class=\"stack\">"
    , "              <section class=\"panel\">"
    , "                <h2 class=\"panel-title\">${escapeHtml(labels.settings)}</h2>"
    , "                <div class=\"kv\">"
    , "                  <div class=\"kv-row\"><span class=\"kv-label\">${escapeHtml(labels.language)}</span><span class=\"kv-value\">${escapeHtml(settings.language || labels.not_available)}</span></div>"
    , "                  <div class=\"kv-row\"><span class=\"kv-label\">${escapeHtml(labels.preferred_port)}</span><span class=\"kv-value\">${escapeHtml(settings.preferred_port || labels.none)}</span></div>"
    , "                  <div class=\"kv-row\"><span class=\"kv-label\">${escapeHtml(labels.auto_connect)}</span><span class=\"kv-value\">${escapeHtml(boolLabel(labels, settings.auto_connect))}</span></div>"
    , "                  <div class=\"kv-row\"><span class=\"kv-label\">${escapeHtml(labels.demo_mode)}</span><span class=\"kv-value\">${escapeHtml(boolLabel(labels, settings.demo_mode))}</span></div>"
    , "                </div>"
    , "              </section>"
    , "              <section class=\"panel\">"
    , "                <h2 class=\"panel-title\">${escapeHtml(labels.about)}</h2>"
    , "                <div class=\"kv\">"
    , "                  <div class=\"kv-row\"><span class=\"kv-label\">${escapeHtml(labels.app_title)}</span><span class=\"kv-value\">${escapeHtml(labels.app_subtitle)}</span></div>"
    , "                  <div class=\"kv-row\"><span class=\"kv-label\">${escapeHtml(labels.status)}</span><span class=\"kv-value\">${escapeHtml(state.status.text)}</span></div>"
    , "                  <div class=\"kv-row\"><span class=\"kv-label\">${escapeHtml(labels.available)}</span><span class=\"kv-value\">${renderChips(connection.available_ports || [], labels.not_available)}</span></div>"
    , "                </div>"
    , "              </section>"
    , "            </div>"
    , "          </section>"
    , "          <section class=\"panel\">"
    , "            <h2 class=\"panel-title\">${escapeHtml(labels.knob_summary)}</h2>"
    , "            <div class=\"knobs\">${knobs.map((knob) => renderKnob(knob, labels)).join('')}</div>"
    , "          </section>"
    , "          <footer class=\"footer\">"
    , "            <div>${escapeHtml(labels.footer_hint)}</div>"
    , "            <div class=\"toasts\">${toasts.map(renderToast).join('')}</div>"
    , "          </footer>"
    , "        </div>`;"
    , "    }"
    , ""
    , "    function flushRender() {"
    , "      renderScheduled = false;"
    , "      if (pendingState) {"
    , "        renderState(pendingState);"
    , "        pendingState = null;"
    , "      }"
    , "    }"
    , ""
    , "    window.iorubaUpdate = function iorubaUpdate(state) {"
    , "      pendingState = state;"
    , "      if (!renderScheduled) {"
    , "        renderScheduled = true;"
    , "        window.requestAnimationFrame(flushRender);"
    , "      }"
    , "    };"
    ]
