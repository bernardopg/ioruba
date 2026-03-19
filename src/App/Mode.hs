module App.Mode
  ( AppMode(..)
  ) where

data AppMode
  = GuiMode
  | TuiMode
  | DemoMode
  deriving (Show, Eq)
