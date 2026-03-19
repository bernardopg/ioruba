module App.ConsoleControls
  ( ConsoleInputState(..)
  , consoleControlHint
  , prepareConsoleInput
  , restoreConsoleInput
  , spawnConsoleControls
  ) where

import App.Runtime.Commands (RuntimeCommand(..))
import App.Runtime.Service
  ( RuntimeService
  , readRuntimeSnapshot
  , sendRuntimeCommand
  )
import App.Runtime.State (RuntimeSnapshot(..))
import Control.Concurrent.Async (Async, async)
import Control.Exception (IOException, catch)
import Data.Char (toLower)
import System.IO
  ( BufferMode(..)
  , hGetBuffering
  , hGetEcho
  , hSetBuffering
  , hSetEcho
  , stdin
  )

data ConsoleInputState = ConsoleInputState
  { consoleInputBuffering :: BufferMode
  , consoleInputEcho :: Bool
  }

consoleControlHint :: String
consoleControlHint =
  "[c]onnect  [x] disconnect  [r] rescan  [m] demo toggle  [q] quit"

prepareConsoleInput :: IO ConsoleInputState
prepareConsoleInput = do
  previousBuffering <- hGetBuffering stdin
  previousEcho <- hGetEcho stdin
  hSetBuffering stdin NoBuffering
  hSetEcho stdin False
  pure $
    ConsoleInputState
      { consoleInputBuffering = previousBuffering
      , consoleInputEcho = previousEcho
      }

restoreConsoleInput :: ConsoleInputState -> IO ()
restoreConsoleInput inputState = do
  hSetBuffering stdin (consoleInputBuffering inputState)
  hSetEcho stdin (consoleInputEcho inputState)

spawnConsoleControls :: RuntimeService -> IO (Async ())
spawnConsoleControls service =
  async (loop `catch` stopOnInputFailure)
  where
    loop = do
      rawChar <- getChar
      let commandChar = toLower rawChar
      case commandChar of
        'c' -> sendRuntimeCommand service RuntimeCommandConnect
        'x' -> sendRuntimeCommand service RuntimeCommandDisconnect
        'r' -> sendRuntimeCommand service RuntimeCommandRefreshPorts
        'm' -> do
          snapshot <- readRuntimeSnapshot service
          sendRuntimeCommand service (RuntimeCommandSetDemoMode (not (runtimeSnapshotDemoMode snapshot)))
        'q' -> sendRuntimeCommand service RuntimeCommandShutdown
        _ -> pure ()
      if commandChar == 'q'
        then pure ()
        else loop

    stopOnInputFailure :: IOException -> IO ()
    stopOnInputFailure _ =
      sendRuntimeCommand service RuntimeCommandShutdown
