module Audio.Mixer
  ( SliderValue(..)
  , calculateVolume
  , applyNoiseReduction
  , smoothTransition
  ) where

import Audio.Sink (Volume(..))
import Config.Types (NoiseReduction(..))

-- | Raw slider value from Arduino (0-1023)
newtype SliderValue = SliderValue { unSliderValue :: Int }
  deriving (Show, Eq, Ord)

-- | Calculate volume from slider value
-- Pure function: SliderValue -> Volume
calculateVolume :: SliderValue -> Volume
calculateVolume (SliderValue raw) = Volume $ fromIntegral raw / 1023.0

-- | Apply noise reduction to slider values
-- Filters out small fluctuations to prevent jitter
applyNoiseReduction :: NoiseReduction -> SliderValue -> SliderValue -> SliderValue
applyNoiseReduction level old new =
  case level of
    NoiseReductionLow -> if abs (unSliderValue new - unSliderValue old) > 5 then new else old
    NoiseReductionDefault -> if abs (unSliderValue new - unSliderValue old) > 10 then new else old
    NoiseReductionHigh -> if abs (unSliderValue new - unSliderValue old) > 20 then new else old

-- | Calculate smooth transition between two volumes
-- Returns intermediate volume based on transition progress (0.0 to 1.0)
smoothTransition :: Volume -> Volume -> Double -> Volume
smoothTransition (Volume start) (Volume end) progress =
  Volume $ start + (end - start) * clamp progress
  where
    clamp p = max 0.0 $ min 1.0 p
