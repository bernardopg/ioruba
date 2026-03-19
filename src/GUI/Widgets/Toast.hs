module GUI.Widgets.Toast
  ( renderToasts
  ) where

import GUI.State (GuiToast(..))
import qualified Data.Text as T

renderToasts :: [GuiToast] -> [String]
renderToasts =
  map (\toast -> "toast: " ++ T.unpack (guiToastTitle toast) ++ " | " ++ T.unpack (guiToastBody toast))
