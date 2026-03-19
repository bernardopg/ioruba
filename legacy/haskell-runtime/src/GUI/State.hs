module GUI.State
  ( GuiLayout(..)
  , GuiToast(..)
  , GuiState(..)
  , initialGuiState
  , layoutForWidth
  , reduceRuntimeEvent
  ) where

import App.I18n (UiLanguage)
import App.Runtime.Events (RuntimeEvent(..))
import App.Runtime.State (RuntimeSnapshot(..), RuntimeStatus(..))
import App.Settings (UiSettings(..))
import Config.Types (Config, Theme(..), configGUI, guiTheme)
import qualified Data.Text as T

data GuiLayout
  = GuiLayoutNarrow
  | GuiLayoutMedium
  | GuiLayoutWide
  deriving (Show, Eq)

data GuiToast = GuiToast
  { guiToastTitle :: T.Text
  , guiToastBody :: T.Text
  } deriving (Show, Eq)

data GuiState = GuiState
  { guiStateLanguage :: UiLanguage
  , guiStateTheme :: Theme
  , guiStateSettings :: UiSettings
  , guiStateSnapshot :: RuntimeSnapshot
  , guiStateLayout :: GuiLayout
  , guiStateToasts :: [GuiToast]
  } deriving (Show, Eq)

initialGuiState :: UiSettings -> Config -> RuntimeSnapshot -> GuiState
initialGuiState settings config snapshot =
  GuiState
    { guiStateLanguage = uiSettingsLanguage settings
    , guiStateTheme = guiTheme (configGUI config)
    , guiStateSettings = settings
    , guiStateSnapshot = snapshot
    , guiStateLayout = layoutForWidth (uiSettingsWindowWidth settings)
    , guiStateToasts = []
    }

layoutForWidth :: Int -> GuiLayout
layoutForWidth width
  | width >= 1200 = GuiLayoutWide
  | width >= 800 = GuiLayoutMedium
  | otherwise = GuiLayoutNarrow

reduceRuntimeEvent :: RuntimeEvent -> GuiState -> GuiState
reduceRuntimeEvent event state =
  case event of
    RuntimeEventStarted snapshot ->
      syncSettingsFromSnapshot snapshot state
    RuntimeEventSnapshotUpdated snapshot ->
      syncSettingsFromSnapshot snapshot state
    RuntimeEventStatusChanged status statusText ->
      pushToast
        (statusTitle status)
        statusText
        state
    RuntimeEventPortsChanged ports ->
      pushToast "ports" (T.pack (show (length ports)) <> " port(s) visible") state
    RuntimeEventCommandReceived command ->
      pushToast "command" (T.pack (show command)) state
    RuntimeEventError errText ->
      pushToast "error" errText state
    RuntimeEventStopped ->
      pushToast "runtime" "runtime stopped" state
  where
    pushToast title body currentState =
      currentState
        { guiStateToasts =
            take 4 (GuiToast title body : guiStateToasts currentState)
        }

    syncSettingsFromSnapshot snapshot currentState =
      currentState
        { guiStateSnapshot = snapshot
        , guiStateSettings =
            (guiStateSettings currentState)
              { uiSettingsDemoMode = runtimeSnapshotDemoMode snapshot
              , uiSettingsPreferredPort =
                  case runtimeSnapshotConnectionPort snapshot of
                    Just serialPath -> Just serialPath
                    Nothing -> uiSettingsPreferredPort (guiStateSettings currentState)
              }
        }

statusTitle :: RuntimeStatus -> T.Text
statusTitle runtimeStatus =
  case runtimeStatus of
    RuntimeBooting -> "booting"
    RuntimeReady -> "ready"
    RuntimeSearching -> "searching"
    RuntimeConnecting -> "connecting"
    RuntimeConnected -> "connected"
    RuntimeDemo -> "demo"
    RuntimeDisconnected -> "disconnected"
    RuntimeError -> "error"
