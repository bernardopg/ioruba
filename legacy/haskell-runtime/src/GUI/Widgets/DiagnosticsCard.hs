module GUI.Widgets.DiagnosticsCard
  ( renderDiagnosticsCard
  ) where

import App.I18n (Message(..), UiLanguage, translateString)
import App.Runtime.State (RuntimeDiagnostics(..))
import qualified Data.Text as T

renderDiagnosticsCard :: UiLanguage -> RuntimeDiagnostics -> [String]
renderDiagnosticsCard language diagnostics =
  [ translateString language MsgLabelDiagnostics
  , "  " ++ translateString language MsgLabelAudio ++ ": " ++ T.unpack (runtimeDiagnosticsAudioSummary diagnostics)
  , "  " ++ translateString language MsgLabelHint ++ ": " ++ T.unpack (runtimeDiagnosticsHint diagnostics)
  , "  " ++ translateString language MsgLabelLastSerial ++ ": " ++ maybe "none" T.unpack (runtimeDiagnosticsLastSerialLine diagnostics)
  ]
