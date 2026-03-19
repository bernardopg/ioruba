module GUI.Themes
  ( applyTheme
  , detectSystemTheme
  ) where

import Config.Types (Theme(..))

-- | Apply theme to GTK application
applyTheme :: Theme -> IO ()
applyTheme _ = do
  -- TODO: Implement GTK theme switching
  return ()

-- | Detect system theme preference (dark/light)
detectSystemTheme :: IO Theme
detectSystemTheme = do
  -- TODO: Implement system theme detection
  return ThemeDark
