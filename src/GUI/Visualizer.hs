module GUI.Visualizer
  ( Visualizer
  , createVisualizer
  , updateLevel
  ) where

import Audio.Sink (Volume(..))

-- | Audio level visualizer widget
newtype Visualizer = Visualizer
  { visualizerLevel :: Volume
  } deriving (Show)

-- | Create a new visualizer widget
createVisualizer :: IO Visualizer
createVisualizer =
  -- TODO: Implement GTK/Cairo visualizer
  pure $ Visualizer { visualizerLevel = Volume 0.0 }

-- | Update visualizer with new audio level
updateLevel :: Visualizer -> Volume -> IO ()
updateLevel _ _ =
  -- TODO: Implement level update and redraw
  pure ()
