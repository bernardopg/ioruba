module GUI.Widgets.StatusBanner
  ( renderStatusBanner
  ) where

import App.Runtime.State (RuntimeSnapshot(..))
import qualified Data.Text as T

renderStatusBanner :: RuntimeSnapshot -> String
renderStatusBanner snapshot =
  "Status Banner: " ++ T.unpack (runtimeSnapshotStatusText snapshot)
