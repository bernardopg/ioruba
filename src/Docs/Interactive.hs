module Docs.Interactive
  ( showTutorial
  , showHelp
  ) where

import Data.Text (Text)

-- | Show interactive tutorial
showTutorial :: Text -> IO ()
showTutorial _ = do
  -- TODO: Implement in-app tutorial system
  return ()

-- | Show context-sensitive help
showHelp :: Text -> IO ()
showHelp _ = do
  -- TODO: Implement help system
  return ()
