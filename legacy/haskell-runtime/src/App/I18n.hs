module App.I18n
  ( UiLanguage(..)
  , Message(..)
  , defaultLanguage
  , parseUiLanguageCode
  , uiLanguageCode
  , translate
  , translateString
  ) where

import Data.Aeson
  ( FromJSON(parseJSON)
  , ToJSON(toJSON)
  , Value(String)
  )
import Data.Text (Text)
import qualified Data.Text as T

data UiLanguage
  = UiLanguageEn
  | UiLanguagePtBR
  deriving (Show, Eq, Ord)

data Message
  = MsgAppTitle
  | MsgAppSubtitle
  | MsgUsage String
  | MsgHelpConfig
  | MsgHelpDemo
  | MsgHelpLang
  | MsgHelpScreenshot
  | MsgHelpHelp
  | MsgLabelSerial
  | MsgLabelStatus
  | MsgLabelTargets
  | MsgLabelOutcome
  | MsgLabelVolume
  | MsgLabelRaw
  | MsgLabelPorts
  | MsgLabelDiagnostics
  | MsgLabelHint
  | MsgLabelDemo
  | MsgLabelLanguage
  | MsgLabelTheme
  | MsgLabelAudio
  | MsgLabelLastSerial
  | MsgLabelCurrentPort
  | MsgLabelAvailable
  | MsgLabelAutoConnect
  | MsgLabelPreferredPort
  | MsgLabelDemoMode
  | MsgSectionConnection
  | MsgSectionSettings
  | MsgSectionAbout
  | MsgFooterHint
  | MsgStatusOnline
  | MsgStatusSyncing
  | MsgStatusAttention
  | MsgNoPortsDetected
  | MsgFallbackToTui
  deriving (Show, Eq)

defaultLanguage :: UiLanguage
defaultLanguage = UiLanguageEn

parseUiLanguageCode :: String -> Maybe UiLanguage
parseUiLanguageCode rawCode =
  case map normalize rawCode of
    "en" -> Just UiLanguageEn
    "pt-br" -> Just UiLanguagePtBR
    "pt_br" -> Just UiLanguagePtBR
    "ptbr" -> Just UiLanguagePtBR
    _ -> Nothing
  where
    normalize '_' = '-'
    normalize ch = toLowerAscii ch

uiLanguageCode :: UiLanguage -> String
uiLanguageCode UiLanguageEn = "en"
uiLanguageCode UiLanguagePtBR = "pt-BR"

translate :: UiLanguage -> Message -> Text
translate language message =
  case (language, message) of
    (UiLanguageEn, MsgAppTitle) -> "Ioruba"
    (UiLanguagePtBR, MsgAppTitle) -> "Ioruba"
    (UiLanguageEn, MsgAppSubtitle) -> "Hardware-driven Linux audio mixer"
    (UiLanguagePtBR, MsgAppSubtitle) -> "Mixer de audio Linux guiado por hardware"
    (UiLanguageEn, MsgUsage programName) -> T.pack $ "Usage: " ++ programName ++ " [--config PATH] [--demo] [--lang en|pt-BR]"
    (UiLanguagePtBR, MsgUsage programName) -> T.pack $ "Uso: " ++ programName ++ " [--config PATH] [--demo] [--lang en|pt-BR]"
    (UiLanguageEn, MsgHelpConfig) -> "--config PATH   Load a specific YAML configuration file"
    (UiLanguagePtBR, MsgHelpConfig) -> "--config PATH   Carrega um arquivo YAML de configuracao especifico"
    (UiLanguageEn, MsgHelpDemo) -> "--demo          Start in demo mode without serial hardware"
    (UiLanguagePtBR, MsgHelpDemo) -> "--demo          Inicia em modo demo sem hardware serial"
    (UiLanguageEn, MsgHelpLang) -> "--lang CODE     Override UI language (en or pt-BR)"
    (UiLanguagePtBR, MsgHelpLang) -> "--lang CODE     Sobrescreve o idioma da interface (en ou pt-BR)"
    (UiLanguageEn, MsgHelpScreenshot) -> "--screenshot P  Save the current GUI rendering to a file"
    (UiLanguagePtBR, MsgHelpScreenshot) -> "--screenshot P  Salva o rendering atual da GUI em um arquivo"
    (UiLanguageEn, MsgHelpHelp) -> "--help          Show this help text"
    (UiLanguagePtBR, MsgHelpHelp) -> "--help          Mostra esta ajuda"
    (UiLanguageEn, MsgLabelSerial) -> "Serial"
    (UiLanguagePtBR, MsgLabelSerial) -> "Serial"
    (UiLanguageEn, MsgLabelStatus) -> "Status"
    (UiLanguagePtBR, MsgLabelStatus) -> "Status"
    (UiLanguageEn, MsgLabelTargets) -> "Targets"
    (UiLanguagePtBR, MsgLabelTargets) -> "Alvos"
    (UiLanguageEn, MsgLabelOutcome) -> "Outcome"
    (UiLanguagePtBR, MsgLabelOutcome) -> "Resultado"
    (UiLanguageEn, MsgLabelVolume) -> "Volume"
    (UiLanguagePtBR, MsgLabelVolume) -> "Volume"
    (UiLanguageEn, MsgLabelRaw) -> "Raw"
    (UiLanguagePtBR, MsgLabelRaw) -> "Bruto"
    (UiLanguageEn, MsgLabelPorts) -> "Ports"
    (UiLanguagePtBR, MsgLabelPorts) -> "Portas"
    (UiLanguageEn, MsgLabelDiagnostics) -> "Diagnostics"
    (UiLanguagePtBR, MsgLabelDiagnostics) -> "Diagnosticos"
    (UiLanguageEn, MsgLabelHint) -> "Hint"
    (UiLanguagePtBR, MsgLabelHint) -> "Dica"
    (UiLanguageEn, MsgLabelDemo) -> "Demo"
    (UiLanguagePtBR, MsgLabelDemo) -> "Demo"
    (UiLanguageEn, MsgLabelLanguage) -> "Language"
    (UiLanguagePtBR, MsgLabelLanguage) -> "Idioma"
    (UiLanguageEn, MsgLabelTheme) -> "Theme"
    (UiLanguagePtBR, MsgLabelTheme) -> "Tema"
    (UiLanguageEn, MsgLabelAudio) -> "Audio"
    (UiLanguagePtBR, MsgLabelAudio) -> "Audio"
    (UiLanguageEn, MsgLabelLastSerial) -> "Last Serial"
    (UiLanguagePtBR, MsgLabelLastSerial) -> "Ultima Serial"
    (UiLanguageEn, MsgLabelCurrentPort) -> "Current Port"
    (UiLanguagePtBR, MsgLabelCurrentPort) -> "Porta Atual"
    (UiLanguageEn, MsgLabelAvailable) -> "Available"
    (UiLanguagePtBR, MsgLabelAvailable) -> "Disponivel"
    (UiLanguageEn, MsgLabelAutoConnect) -> "Auto Connect"
    (UiLanguagePtBR, MsgLabelAutoConnect) -> "Auto Conectar"
    (UiLanguageEn, MsgLabelPreferredPort) -> "Preferred Port"
    (UiLanguagePtBR, MsgLabelPreferredPort) -> "Porta Preferida"
    (UiLanguageEn, MsgLabelDemoMode) -> "Demo Mode"
    (UiLanguagePtBR, MsgLabelDemoMode) -> "Modo Demo"
    (UiLanguageEn, MsgSectionConnection) -> "Connection"
    (UiLanguagePtBR, MsgSectionConnection) -> "Conexao"
    (UiLanguageEn, MsgSectionSettings) -> "Settings"
    (UiLanguagePtBR, MsgSectionSettings) -> "Preferencias"
    (UiLanguageEn, MsgSectionAbout) -> "About"
    (UiLanguagePtBR, MsgSectionAbout) -> "Sobre"
    (UiLanguageEn, MsgFooterHint) -> "Ctrl+C to exit. Use --config or ~/.config/ioruba/ioruba.yaml to remap knobs."
    (UiLanguagePtBR, MsgFooterHint) -> "Ctrl+C para sair. Use --config ou ~/.config/ioruba/ioruba.yaml para remapear os knobs."
    (UiLanguageEn, MsgStatusOnline) -> "ONLINE"
    (UiLanguagePtBR, MsgStatusOnline) -> "ONLINE"
    (UiLanguageEn, MsgStatusSyncing) -> "SYNCING"
    (UiLanguagePtBR, MsgStatusSyncing) -> "SINCRONIA"
    (UiLanguageEn, MsgStatusAttention) -> "ATTENTION"
    (UiLanguagePtBR, MsgStatusAttention) -> "ATENCAO"
    (UiLanguageEn, MsgNoPortsDetected) -> "No serial ports detected"
    (UiLanguagePtBR, MsgNoPortsDetected) -> "Nenhuma porta serial detectada"
    (UiLanguageEn, MsgFallbackToTui) -> "No graphical display detected. Falling back to TUI mode."
    (UiLanguagePtBR, MsgFallbackToTui) -> "Nenhum display grafico detectado. Fazendo fallback para o modo TUI."

translateString :: UiLanguage -> Message -> String
translateString language = T.unpack . translate language

instance FromJSON UiLanguage where
  parseJSON (String rawText) =
    case parseUiLanguageCode (T.unpack rawText) of
      Just language -> pure language
      Nothing -> fail $ "Unknown UI language: " ++ T.unpack rawText
  parseJSON _ = fail "UI language must be a string"

instance ToJSON UiLanguage where
  toJSON = String . T.pack . uiLanguageCode

toLowerAscii :: Char -> Char
toLowerAscii rawChar
  | rawChar >= 'A' && rawChar <= 'Z' = toEnum (fromEnum rawChar + 32)
  | otherwise = rawChar
