module GUI.Bridge
  ( spawnRuntimeBridge
  ) where

import App.Runtime.Events (RuntimeEvent(..))
import App.Runtime.Service (RuntimeService, subscribeRuntimeEvents)
import Control.Concurrent.Async (Async, async)
import Control.Concurrent.STM (atomically, readTChan)

spawnRuntimeBridge :: RuntimeService -> (RuntimeEvent -> IO ()) -> IO (Async ())
spawnRuntimeBridge service handleEvent = do
  events <- subscribeRuntimeEvents service
  async (loop events)
  where
    loop events = do
      event <- atomically $ readTChan events
      handleEvent event
      case event of
        RuntimeEventStopped -> pure ()
        _ -> loop events
