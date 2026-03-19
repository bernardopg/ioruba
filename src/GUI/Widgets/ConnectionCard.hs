module GUI.Widgets.ConnectionCard
  ( renderConnectionCard
  ) where

import App.I18n (Message(..), UiLanguage, translateString)
import App.Runtime.State (RuntimeSnapshot(..))

renderConnectionCard :: UiLanguage -> RuntimeSnapshot -> [String]
renderConnectionCard language snapshot =
  [ translateString language MsgSectionConnection
  , "  " ++ translateString language MsgLabelCurrentPort ++ ": " ++ maybe "none" id (runtimeSnapshotConnectionPort snapshot)
  , "  " ++ translateString language MsgLabelAvailable ++ ": " ++ renderPorts language (runtimeSnapshotAvailablePorts snapshot)
  , "  " ++ translateString language MsgLabelDemoMode ++ ": " ++ show (runtimeSnapshotDemoMode snapshot)
  ]
  where
    renderPorts currentLanguage [] = translateString currentLanguage MsgNoPortsDetected
    renderPorts _ ports = unwords ports
