module Main (main) where

import App.Config (loadValidatedConfig, resolveConfigPath)
import App.I18n (Message(..), UiLanguage(..), translateString)
import App.Mode (AppMode(..))
import App.Options (AppCliOptions(..), parseAppCliOptions, renderUsage)
import App.Runtime.Core (RuntimeOptions(..))
import App.Settings (UiSettings(..), applyLanguageOverride, loadUiSettings)
import Control.Monad (when)
import GUI.App (runGuiApp)
import System.Environment (getArgs, lookupEnv)
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
      putStrLn $ renderUsage "stack exec ioruba-gui --" UiLanguageEn
      exitFailure
    Right cliOptions -> do
      let helpLanguage = maybe UiLanguageEn id (cliLanguageOverride cliOptions)
      when (cliShowHelp cliOptions) $ do
        putStrLn $ renderUsage "stack exec ioruba-gui --" helpLanguage
        exitSuccess

      configPath <- resolveConfigPath (cliConfigPath cliOptions)
      config <- loadValidatedConfig configPath
      uiSettings <- applyLanguageOverride (cliLanguageOverride cliOptions) <$> loadUiSettings
      let runtimeOptions =
            RuntimeOptions
              { runtimeOptionsMode = if cliDemoMode cliOptions then DemoMode else GuiMode
              , runtimeOptionsConfig = config
              , runtimeOptionsUiSettings =
                  uiSettings
                    { uiSettingsDemoMode = cliDemoMode cliOptions || uiSettingsDemoMode uiSettings
                    }
              }
          language = uiSettingsLanguage (runtimeOptionsUiSettings runtimeOptions)
      displayEnv <- lookupEnv "DISPLAY"
      if cliScreenshotPath cliOptions == Nothing && displayEnv == Nothing
        then do
          putStrLn $ translateString language MsgFallbackToTui
          runTuiApp (runtimeOptions { runtimeOptionsMode = TuiMode }) language
        else runGuiApp runtimeOptions (cliScreenshotPath cliOptions)
