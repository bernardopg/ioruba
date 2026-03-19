{-# LANGUAGE OverloadedStrings #-}

module GUI.StateSpec (spec) where

import App.I18n (UiLanguage(..))
import App.Runtime.Events (RuntimeEvent(..))
import App.Runtime.State
  ( RuntimeDiagnostics(..)
  , RuntimeSnapshot(..)
  , RuntimeStatus(..)
  )
import App.Settings (UiSettings(..), defaultUiSettings)
import Config.Parser (defaultConfig)
import GUI.State
  ( GuiLayout(..)
  , guiStateSettings
  , guiStateLayout
  , guiStateSnapshot
  , guiStateToasts
  , initialGuiState
  , layoutForWidth
  , reduceRuntimeEvent
  )
import Test.Hspec

spec :: Spec
spec = describe "GUI.State" $ do
  it "selects responsive layouts based on width" $ do
    layoutForWidth 700 `shouldBe` GuiLayoutNarrow
    layoutForWidth 900 `shouldBe` GuiLayoutMedium
    layoutForWidth 1400 `shouldBe` GuiLayoutWide

  it "updates the snapshot when runtime pushes a new one" $ do
    let initialState = initialGuiState defaultUiSettings defaultConfig initialSnapshot
        nextSnapshot =
          initialSnapshot
            { runtimeSnapshotStatus = RuntimeConnected
            , runtimeSnapshotConnectionPort = Just "/dev/ttyUSB7"
            , runtimeSnapshotDemoMode = True
            }
        nextState = reduceRuntimeEvent (RuntimeEventSnapshotUpdated nextSnapshot) initialState
    guiStateSnapshot nextState `shouldBe` nextSnapshot
    uiSettingsPreferredPort (guiStateSettings nextState) `shouldBe` Just "/dev/ttyUSB7"
    uiSettingsDemoMode (guiStateSettings nextState) `shouldBe` True

  it "creates toasts on runtime errors" $ do
    let initialState = initialGuiState defaultUiSettings defaultConfig initialSnapshot
        nextState = reduceRuntimeEvent (RuntimeEventError "boom") initialState
    length (guiStateToasts nextState) `shouldBe` 1

initialSnapshot :: RuntimeSnapshot
initialSnapshot =
  RuntimeSnapshot
    { runtimeSnapshotStatus = RuntimeReady
    , runtimeSnapshotStatusText = "ready"
    , runtimeSnapshotConnectionPort = Nothing
    , runtimeSnapshotAvailablePorts = []
    , runtimeSnapshotKnobs = []
    , runtimeSnapshotDiagnostics =
        RuntimeDiagnostics
          { runtimeDiagnosticsAudioSummary = "0 app target(s), 0 knob(s)"
          , runtimeDiagnosticsActiveApplications = []
          , runtimeDiagnosticsLastSerialLine = Nothing
          , runtimeDiagnosticsHint = "ready"
          }
    , runtimeSnapshotDemoMode = False
    }
