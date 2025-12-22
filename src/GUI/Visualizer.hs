module GUI.Visualizer
  ( Visualizer
  , createVisualizer
  , updateLevel
  ) where

import Audio.Sink (Volume(..))

-- | Audio level visualizer widget
data Visualizer = Visualizer
  { visualizerLevel :: Volume
  } deriving (Show)

-- | Create a new visualizer widget
createVisualizer :: IO Visualizer
createVisualizer = do
  -- TODO: Implement GTK/Cairo visualizer
  return $ Visualizer { visualizerLevel = Volume 0.0 }

-- | Update visualizer with new audio level
updateLevel :: Visualizer -> Volume -> IO ()
updateLevel viz level = do
  -- TODO: Implement level update and redraw
  return ()
