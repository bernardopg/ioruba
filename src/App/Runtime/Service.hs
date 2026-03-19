module App.Runtime.Service
  ( RuntimeService
  , startRuntimeService
  , stopRuntimeService
  , readRuntimeSnapshot
  , sendRuntimeCommand
  , subscribeRuntimeEvents
  ) where

import App.Mode (AppMode(..))
import App.Runtime.Commands (RuntimeCommand(..))
import App.Runtime.Core (RuntimeOptions(..), runRuntimeCore)
import App.Runtime.Events (RuntimeEvent)
import App.Runtime.State (RuntimeSnapshot, initialRuntimeSnapshot)
import App.Settings (UiSettings(..))
import Control.Concurrent.Async (Async, async, waitCatch)
import Control.Concurrent.STM
  ( TChan
  , TQueue
  , TVar
  , atomically
  , dupTChan
  , newBroadcastTChanIO
  , newTQueueIO
  , newTVarIO
  , readTVar
  , writeTChan
  , writeTQueue
  )

data RuntimeService = RuntimeService
  { runtimeServiceCommands :: TQueue RuntimeCommand
  , runtimeServiceEvents :: TChan RuntimeEvent
  , runtimeServiceSnapshot :: TVar RuntimeSnapshot
  , runtimeServiceWorker :: Async ()
  }

startRuntimeService :: RuntimeOptions -> IO RuntimeService
startRuntimeService options = do
  commands <- newTQueueIO
  events <- newBroadcastTChanIO
  snapshotVar <- newTVarIO initialSnapshot
  worker <-
    async $
      runRuntimeCore options commands snapshotVar $
        \event -> atomically $ writeTChan events event
  pure $
    RuntimeService
      { runtimeServiceCommands = commands
      , runtimeServiceEvents = events
      , runtimeServiceSnapshot = snapshotVar
      , runtimeServiceWorker = worker
      }
  where
    initialSnapshot =
      initialRuntimeSnapshot
        (runtimeOptionsConfig options)
        (runtimeOptionsMode options == DemoMode || uiSettingsDemoMode (runtimeOptionsUiSettings options))

stopRuntimeService :: RuntimeService -> IO ()
stopRuntimeService service = do
  sendRuntimeCommand service RuntimeCommandShutdown
  _ <- waitCatch (runtimeServiceWorker service)
  pure ()

readRuntimeSnapshot :: RuntimeService -> IO RuntimeSnapshot
readRuntimeSnapshot service =
  atomically $ readTVar (runtimeServiceSnapshot service)

sendRuntimeCommand :: RuntimeService -> RuntimeCommand -> IO ()
sendRuntimeCommand service command =
  atomically $ writeTQueue (runtimeServiceCommands service) command

subscribeRuntimeEvents :: RuntimeService -> IO (TChan RuntimeEvent)
subscribeRuntimeEvents service =
  atomically $ dupTChan (runtimeServiceEvents service)
