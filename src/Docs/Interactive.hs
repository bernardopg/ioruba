module Docs.Interactive
  ( showTutorial
  , showHelp
  ) where

import Data.Text (Text)

-- | Show interactive tutorial
showTutorial :: Text -> IO ()
showTutorial tutorialName = do
  -- TODO: Implement in-app tutorial system
  return ()

-- | Show context-sensitive help
showHelp :: Text -> IO ()
showHelp topic = do
  -- TODO: Implement help system
  return ()
