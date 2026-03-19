module GUI.Visualizer
  ( Visualizer(..)
  , createVisualizer
  , renderVisualizer
  , updateLevel
  ) where

import Audio.Sink (Volume(..))

newtype Visualizer = Visualizer
  { visualizerLevel :: Volume
  } deriving (Show)

createVisualizer :: IO Visualizer
createVisualizer =
  pure $ Visualizer { visualizerLevel = Volume 0.0 }

updateLevel :: Visualizer -> Volume -> IO ()
updateLevel _ _ = pure ()

renderVisualizer :: Int -> String
renderVisualizer percent =
  replicate filled '#' ++ replicate (10 - filled) '.'
  where
    filled = max 0 (min 10 (percent `div` 10))
