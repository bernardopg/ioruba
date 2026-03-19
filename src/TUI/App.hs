module TUI.App
  ( runTuiApp
  ) where

import App.ConsoleControls
  ( ConsoleInputState
  , prepareConsoleInput
  , restoreConsoleInput
  , spawnConsoleControls
  )
import App.I18n (UiLanguage)
import App.Runtime.Core (RuntimeOptions)
import App.Runtime.Events (RuntimeEvent(..))
import App.Runtime.Service
  ( RuntimeService
  , readRuntimeSnapshot
  , startRuntimeService
  , stopRuntimeService
  , subscribeRuntimeEvents
  )
import Control.Concurrent.Async (Async, cancel)
import Control.Concurrent.STM (atomically, readTChan)
import Control.Exception (finally)
import TUI.MainWindow (MainWindow, createMainWindow, hideWindow, renderWindow, showWindow)

runTuiApp :: RuntimeOptions -> UiLanguage -> IO ()
runTuiApp runtimeOptions language = do
  service <- startRuntimeService runtimeOptions
  window <- createMainWindow
  inputState <- prepareConsoleInput
  controls <- spawnConsoleControls service
  events <- subscribeRuntimeEvents service
  initialSnapshot <- readRuntimeSnapshot service
  showWindow window
  renderWindow window language initialSnapshot
  let loop = do
        event <- atomically $ readTChan events
        case event of
          RuntimeEventSnapshotUpdated snapshot -> do
            renderWindow window language snapshot
            loop
          RuntimeEventStopped ->
            pure ()
          _ ->
            loop
  loop `finally` cleanup inputState controls window service

cleanup :: ConsoleInputState -> Async () -> MainWindow -> RuntimeService -> IO ()
cleanup inputState controls window service = do
  cancel controls
  restoreConsoleInput inputState
  hideWindow window
  stopRuntimeService service
