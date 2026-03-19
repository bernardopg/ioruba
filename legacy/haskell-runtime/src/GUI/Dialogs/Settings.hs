module GUI.Dialogs.Settings
  ( renderSettingsDialog
  ) where

import App.I18n (Message(..), UiLanguage, translateString, uiLanguageCode)
import App.Settings (UiSettings(..))

renderSettingsDialog :: UiLanguage -> UiSettings -> [String]
renderSettingsDialog language settings =
  [ translateString language MsgSectionSettings
  , "  " ++ translateString language MsgLabelLanguage ++ ": " ++ uiLanguageCode (uiSettingsLanguage settings)
  , "  " ++ translateString language MsgLabelPreferredPort ++ ": " ++ maybe "none" id (uiSettingsPreferredPort settings)
  , "  " ++ translateString language MsgLabelAutoConnect ++ ": " ++ show (uiSettingsAutoConnect settings)
  , "  " ++ translateString language MsgLabelDemoMode ++ ": " ++ show (uiSettingsDemoMode settings)
  ]
