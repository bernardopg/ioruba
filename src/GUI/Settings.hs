module GUI.Settings
  ( SettingsDialog
  , createSettingsDialog
  , showSettings
  ) where

import Config.Types (Config)

-- | Settings dialog window
newtype SettingsDialog = SettingsDialog
  { settingsConfig :: Config
  } deriving (Show)

-- | Create settings dialog
createSettingsDialog :: Config -> IO SettingsDialog
createSettingsDialog config =
  -- TODO: Implement GTK settings dialog
  pure $ SettingsDialog { settingsConfig = config }

-- | Show settings dialog
showSettings :: SettingsDialog -> IO (Maybe Config)
showSettings _ =
  -- TODO: Implement dialog showing and return updated config if saved
  pure Nothing
