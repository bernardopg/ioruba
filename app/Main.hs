module Main (main) where

import Config.Parser (loadConfig, defaultConfig)
import Config.Validation (validateConfig)
import System.Environment (getArgs)
import System.Exit (exitFailure)

-- | Main entry point
main :: IO ()
main = do
  putStrLn "Starting Iarubá Audio Mixer..."

  -- Parse command line arguments
  args <- getArgs
  let configPath = case args of
        ("--config":path:_) -> path
        _ -> "config/iaruba.yaml"

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
    Right _validConfig -> do
      putStrLn "Configuration validated successfully"
      putStrLn "Application ready!"
      putStrLn "Press Ctrl+C to exit"
      _ <- getLine
      putStrLn "Shutting down..."
