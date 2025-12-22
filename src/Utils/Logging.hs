module Utils.Logging
  ( LogLevel(..)
  , logDebug
  , logInfo
  , logWarn
  , logError
  , initLogger
  ) where

import Data.Text (Text)
import qualified Data.Text.IO as TIO

-- | Log level
data LogLevel
  = Debug
  | Info
  | Warning
  | Error
  deriving (Show, Eq, Ord)

-- | Initialize logger
initLogger :: LogLevel -> IO ()
initLogger minLevel = do
  -- TODO: Implement fast-logger setup
  return ()

-- | Log debug message
logDebug :: Text -> IO ()
logDebug msg = logMessage Debug msg

-- | Log info message
logInfo :: Text -> IO ()
logInfo msg = logMessage Info msg

-- | Log warning message
logWarn :: Text -> IO ()
logWarn msg = logMessage Warning msg

-- | Log error message
logError :: Text -> IO ()
logError msg = logMessage Error msg

-- | Internal logging function
logMessage :: LogLevel -> Text -> IO ()
logMessage level msg = do
  -- TODO: Implement proper structured logging
  TIO.putStrLn $ formatLog level msg
  where
    formatLog lvl m = "[" <> (read $ show lvl :: Text) <> "] " <> m
