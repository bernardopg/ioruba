module Audio.Sink
  ( Sink(..)
  , SinkInput(..)
  , Volume(..)
  , listSinks
  , setSinkVolume
  , getSinkVolume
  ) where

import Data.Text (Text)
import Data.Word (Word32)

-- | Audio sink (output device or application)
data Sink = Sink
  { sinkIndex :: Word32
  , sinkName :: Text
  , sinkDescription :: Text
  } deriving (Show, Eq)

-- | Application audio stream (sink input)
data SinkInput = SinkInput
  { sinkInputIndex :: Word32
  , sinkInputName :: Text
  , sinkInputApplicationName :: Text
  } deriving (Show, Eq)

-- | Volume level (0.0 to 1.0)
newtype Volume = Volume { unVolume :: Double }
  deriving (Show, Eq, Ord)

-- | List all audio sinks
listSinks :: IO [Sink]
listSinks = do
  -- TODO: Implement PulseAudio sink enumeration
  return []

-- | Set volume for a sink
setSinkVolume :: Sink -> Volume -> IO ()
setSinkVolume sink vol = do
  -- TODO: Implement PulseAudio volume setting
  return ()

-- | Get current volume for a sink
getSinkVolume :: Sink -> IO Volume
getSinkVolume sink = do
  -- TODO: Implement PulseAudio volume getting
  return $ Volume 0.5
