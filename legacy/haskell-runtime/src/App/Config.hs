module App.Config
  ( loadValidatedConfig
  , resolveConfigPath
  ) where

import Config.Parser (defaultConfig, loadConfig)
import Config.Types (Config)
import Config.Validation (validateConfig)
import Data.Maybe (maybeToList)
import System.Directory (XdgDirectory(XdgConfig), doesFileExist, getXdgDirectory)
import System.Environment (getExecutablePath, lookupEnv)
import System.Exit (exitFailure)
import System.FilePath ((</>), takeDirectory)

resolveConfigPath :: Maybe FilePath -> IO FilePath
resolveConfigPath maybeConfiguredPath =
  case maybeConfiguredPath of
    Just path -> pure path
    Nothing -> do
      explicitConfigPath <- lookupEnv "IORUBA_CONFIG_PATH"
      xdgConfigDir <- getXdgDirectory XdgConfig "ioruba"
      executablePath <- getExecutablePath
      let executableDir = takeDirectory executablePath
          candidatePaths =
            maybeToList explicitConfigPath
              ++ [ xdgConfigDir </> "ioruba.yaml"
                 , xdgConfigDir </> "nano-3knobs.yaml"
                 , "/etc/ioruba/ioruba.yaml"
                 , "/etc/ioruba/nano-3knobs.yaml"
                 , executableDir </> "../share/ioruba/config/ioruba.yaml"
                 , executableDir </> "../share/ioruba/config/nano-3knobs.yaml"
                 , executableDir </> "../config/nano-3knobs.yaml"
                 , executableDir </> "../config/ioruba.yaml"
                 , "config/nano-3knobs.yaml"
                 , "config/ioruba.yaml"
                 ]
      findFirstExistingPath candidatePaths "config/ioruba.yaml"

loadValidatedConfig :: FilePath -> IO Config
loadValidatedConfig configPath = do
  putStrLn $ "Loading configuration from " ++ configPath
  configResult <- loadConfig configPath
  config <-
    case configResult of
      Right loadedConfig ->
        pure loadedConfig
      Left loadError -> do
        putStrLn $ "Failed to load config: " ++ loadError
        putStrLn "Falling back to default configuration."
        pure defaultConfig

  case validateConfig config of
    Left validationErrors -> do
      putStrLn "Configuration validation failed:"
      mapM_ print validationErrors
      exitFailure
    Right validConfig ->
      pure validConfig

findFirstExistingPath :: [FilePath] -> FilePath -> IO FilePath
findFirstExistingPath [] fallbackPath = pure fallbackPath
findFirstExistingPath (candidatePath:remainingPaths) fallbackPath = do
  candidateExists <- doesFileExist candidatePath
  if candidateExists
    then pure candidatePath
    else findFirstExistingPath remainingPaths fallbackPath
