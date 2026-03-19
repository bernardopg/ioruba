module App.Runtime.Commands
  ( RuntimeCommand(..)
  ) where

data RuntimeCommand
  = RuntimeCommandConnect
  | RuntimeCommandDisconnect
  | RuntimeCommandSetPreferredPort (Maybe FilePath)
  | RuntimeCommandSetDemoMode Bool
  | RuntimeCommandRefreshPorts
  | RuntimeCommandShutdown
  deriving (Show, Eq)
