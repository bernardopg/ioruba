module Main (main) where

import Control.Concurrent (threadDelay)
import Control.Monad (forever)
import Config.Parser (loadConfig, defaultConfig)
import Config.Types (Config(..), SerialConfig(..))
import Config.Validation (validateConfig)
import System.Directory (doesPathExist)
import System.Environment (getArgs)
import System.Exit (exitFailure)

-- | Main entry point
main :: IO ()
main = do
  putStrLn "Starting Ioruba Audio Mixer..."

  -- Parse command line arguments
  args <- getArgs
  let configPath = case args of
        ("--config":path:_) -> path
        _ -> "config/ioruba.yaml"

  -- Load configuration
  putStrLn $ "Loading configuration from: " ++ configPath
  configResult <- loadConfig configPath

  config <- case configResult of
    Left err -> do
      putStrLn $ "Failed to load config: " ++ err
      putStrLn "Using default configuration"
      return defaultConfig
    Right cfg -> return cfg

  -- Validate configuration
  case validateConfig config of
    Left errors -> do
      putStrLn "Configuration validation failed:"
      mapM_ (putStrLn . show) errors
      exitFailure
    Right validConfig -> do
      putStrLn "Configuration validated successfully"
      serialPortExists <- doesPathExist $ serialPort $ configSerial validConfig
      putStrLn $ "Configured serial port: " ++ serialPort (configSerial validConfig)
      if serialPortExists
        then putStrLn "Serial port path is available"
        else putStrLn "Warning: configured serial port path is not available"
      putStrLn "Main audio control and GUI loop are still scaffolded."
      putStrLn "Use `stack exec test-serial /dev/ttyUSB0` (or stdin/FIFO) to test hardware input."
      putStrLn "Press Ctrl+C to exit"
      forever $ threadDelay 1000000
