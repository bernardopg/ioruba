module GUI.Themes
  ( ThemePalette(..)
  , applyTheme
  , detectSystemTheme
  , themePalette
  ) where

import Config.Types (Theme(..))

data ThemePalette = ThemePalette
  { paletteName :: String
  , paletteBackground :: String
  , paletteSurface :: String
  , paletteBorder :: String
  , paletteAccent :: String
  } deriving (Show, Eq)

applyTheme :: Theme -> IO ThemePalette
applyTheme theme = pure (themePalette theme)

detectSystemTheme :: IO Theme
detectSystemTheme = pure ThemeDark

themePalette :: Theme -> ThemePalette
themePalette theme =
  case theme of
    ThemeLight ->
      ThemePalette "light" "#f4f1eb" "#ffffff" "#d6d0c5" "#b05a2b"
    ThemeAuto ->
      themePalette ThemeDark
    ThemeDark ->
      ThemePalette "dark" "#0f1117" "#171a22" "#2b3140" "#61c0bf"
