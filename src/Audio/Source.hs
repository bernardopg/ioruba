module Audio.Source
  ( Source(..)
  , listSources
  , setSourceVolume
  , getSourceVolume
  ) where

import Audio.Sink (Volume(..))
import Data.Text (Text)
import Data.Word (Word32)

-- | Audio source (input device like microphone)
data Source = Source
  { sourceIndex :: Word32
  , sourceName :: Text
  , sourceDescription :: Text
  } deriving (Show, Eq)

-- | List all audio sources
listSources :: IO [Source]
listSources = do
  -- TODO: Implement PulseAudio source enumeration
  return []

-- | Set volume for a source
setSourceVolume :: Source -> Volume -> IO ()
setSourceVolume source vol = do
  -- TODO: Implement PulseAudio source volume setting
  return ()

-- | Get current volume for a source
getSourceVolume :: Source -> IO Volume
getSourceVolume source = do
  -- TODO: Implement PulseAudio source volume getting
  return $ Volume 0.5
