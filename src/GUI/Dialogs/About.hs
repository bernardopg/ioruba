module GUI.Dialogs.About
  ( renderAboutDialog
  ) where

import App.I18n (Message(..), UiLanguage, translateString)

renderAboutDialog :: UiLanguage -> [String]
renderAboutDialog language =
  [ translateString language MsgSectionAbout
  , "Ioruba"
  , "Linux-first hardware-driven audio controller"
  , "GUI shell built on the shared runtime service"
  ]
