module App.Runtime.Events
  ( RuntimeEvent(..)
  ) where

import App.Runtime.Commands (RuntimeCommand)
import App.Runtime.State (RuntimeSnapshot, RuntimeStatus)
import Data.Text (Text)

data RuntimeEvent
  = RuntimeEventStarted RuntimeSnapshot
  | RuntimeEventSnapshotUpdated RuntimeSnapshot
  | RuntimeEventStatusChanged RuntimeStatus Text
  | RuntimeEventPortsChanged [FilePath]
  | RuntimeEventCommandReceived RuntimeCommand
  | RuntimeEventError Text
  | RuntimeEventStopped
  deriving (Show, Eq)
