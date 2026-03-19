module GUI.Settings
  ( SettingsDialog(..)
  , createSettingsDialog
  , renderSettingsDialogPreview
  , showSettings
  ) where

import Config.Types (Config)
import GUI.Dialogs.Settings (renderSettingsDialog)
import App.Settings (defaultUiSettings)
import App.I18n (defaultLanguage)

newtype SettingsDialog = SettingsDialog
  { settingsConfig :: Config
  } deriving (Show)

createSettingsDialog :: Config -> IO SettingsDialog
createSettingsDialog config =
  pure $ SettingsDialog { settingsConfig = config }

showSettings :: SettingsDialog -> IO (Maybe Config)
showSettings dialog =
  pure $ Just (settingsConfig dialog)

renderSettingsDialogPreview :: SettingsDialog -> [String]
renderSettingsDialogPreview _ =
  renderSettingsDialog defaultLanguage defaultUiSettings
