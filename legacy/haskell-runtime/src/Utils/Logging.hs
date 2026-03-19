module Utils.Logging
  ( LogLevel(..)
  , logDebug
  , logInfo
  , logWarn
  , logError
  , initLogger
  ) where

import Data.Text (Text)
import qualified Data.Text as T
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
initLogger _ =
  -- TODO: Implement fast-logger setup
  pure ()

-- | Log debug message
logDebug :: Text -> IO ()
logDebug = logMessage Debug

-- | Log info message
logInfo :: Text -> IO ()
logInfo = logMessage Info

-- | Log warning message
logWarn :: Text -> IO ()
logWarn = logMessage Warning

-- | Log error message
logError :: Text -> IO ()
logError = logMessage Error

-- | Internal logging function
logMessage :: LogLevel -> Text -> IO ()
logMessage level msg =
  -- TODO: Implement proper structured logging
  TIO.putStrLn $ "[" <> T.pack (show level) <> "] " <> msg
