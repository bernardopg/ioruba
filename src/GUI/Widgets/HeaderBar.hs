module GUI.Widgets.HeaderBar
  ( renderHeaderBar
  ) where

import App.I18n (Message(..), translateString)
import App.Runtime.State (RuntimeSnapshot(..))
import GUI.State (GuiState(..))
import qualified Data.Text as T

renderHeaderBar :: GuiState -> [String]
renderHeaderBar state =
  [ "IORUBA GUI"
  , translateString (guiStateLanguage state) MsgLabelStatus
      ++ "=" ++ show (runtimeSnapshotStatus snapshot)
      ++ "  "
      ++ translateString (guiStateLanguage state) MsgLabelLanguage
      ++ "=" ++ show (guiStateLanguage state)
      ++ "  "
      ++ translateString (guiStateLanguage state) MsgLabelTheme
      ++ "=" ++ show (guiStateTheme state)
  , T.unpack (runtimeSnapshotStatusText snapshot)
  ]
  where
    snapshot = guiStateSnapshot state
