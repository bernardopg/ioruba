module Main (main) where

import App.Config (loadValidatedConfig, resolveConfigPath)
import App.I18n (UiLanguage(..))
import App.Mode (AppMode(..))
import App.Options (AppCliOptions(..), parseAppCliOptions, renderUsage)
import App.Runtime.Core (RuntimeOptions(..))
import App.Settings (UiSettings(..), applyLanguageOverride, loadUiSettings)
import Control.Monad (when)
import System.Environment (getArgs)
import System.Exit (exitFailure, exitSuccess)
import System.IO (BufferMode(NoBuffering), hSetBuffering, stdout)
import TUI.App (runTuiApp)

main :: IO ()
main = do
  hSetBuffering stdout NoBuffering
  args <- getArgs
  case parseAppCliOptions args of
    Left parseError -> do
      putStrLn parseError
      putStrLn $ renderUsage "stack exec ioruba --" UiLanguageEn
      exitFailure
    Right cliOptions -> do
      let helpLanguage = maybe UiLanguageEn id (cliLanguageOverride cliOptions)
      when (cliShowHelp cliOptions) $ do
        putStrLn $ renderUsage "stack exec ioruba --" helpLanguage
        exitSuccess

      configPath <- resolveConfigPath (cliConfigPath cliOptions)
      config <- loadValidatedConfig configPath
      uiSettings <- applyLanguageOverride (cliLanguageOverride cliOptions) <$> loadUiSettings
      let runtimeOptions =
            RuntimeOptions
              { runtimeOptionsMode = if cliDemoMode cliOptions then DemoMode else TuiMode
              , runtimeOptionsConfig = config
              , runtimeOptionsUiSettings =
                  uiSettings
                    { uiSettingsDemoMode = cliDemoMode cliOptions || uiSettingsDemoMode uiSettings
                    }
              }
      runTuiApp runtimeOptions (uiSettingsLanguage (runtimeOptionsUiSettings runtimeOptions))
