module GUI.Settings
  ( SettingsDialog
  , createSettingsDialog
  , showSettings
  ) where

import Config.Types (Config)

-- | Settings dialog window
data SettingsDialog = SettingsDialog
  { settingsConfig :: Config
  } deriving (Show)

-- | Create settings dialog
createSettingsDialog :: Config -> IO SettingsDialog
createSettingsDialog config = do
  -- TODO: Implement GTK settings dialog
  return $ SettingsDialog { settingsConfig = config }

-- | Show settings dialog
showSettings :: SettingsDialog -> IO (Maybe Config)
showSettings dialog = do
  -- TODO: Implement dialog showing and return updated config if saved
  return Nothing
