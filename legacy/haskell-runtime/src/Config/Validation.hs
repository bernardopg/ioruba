module Config.Validation
  ( validateConfig
  , ValidationError(..)
  ) where

import Config.Types
-- | Configuration validation errors
data ValidationError
  = InvalidBaudRate Int
  | InvalidSliderId Int
  | DuplicateSliderId Int
  | EmptySliderName
  | NoTargetsForSlider Int
  | InvalidTransitionDuration Int
  deriving (Show, Eq)

-- | Validate configuration
validateConfig :: Config -> Either [ValidationError] Config
validateConfig config =
  case errors of
    [] -> Right config
    _  -> Left errors
  where
    errors = concat
      [ validateSerial (configSerial config)
      , validateSliders (configSliders config)
      , validateAudio (configAudio config)
      ]

-- | Validate serial configuration
validateSerial :: SerialConfig -> [ValidationError]
validateSerial serial
  | serialBaudRate serial `notElem` validBaudRates =
      [InvalidBaudRate (serialBaudRate serial)]
  | otherwise = []
  where
    validBaudRates = [9600, 19200, 38400, 57600, 115200]

-- | Validate slider configurations
validateSliders :: [SliderConfig] -> [ValidationError]
validateSliders sliders = checkDuplicateIds ++ concatMap validateSlider sliders
  where
    sliderIds = map sliderId sliders
    checkDuplicateIds =
      [ DuplicateSliderId sid
      | sid <- sliderIds
      , length (filter (== sid) sliderIds) > 1
      ]

-- | Validate a single slider
validateSlider :: SliderConfig -> [ValidationError]
validateSlider slider = concat
  [ [ EmptySliderName | sliderName slider == "" ]
  , [ NoTargetsForSlider (sliderId slider) | null (sliderTargets slider) ]
  , [ InvalidSliderId (sliderId slider) | sliderId slider < 0 ]
  ]

-- | Validate audio configuration
validateAudio :: AudioConfig -> [ValidationError]
validateAudio audio
  | audioTransitionDurationMs audio < 0 || audioTransitionDurationMs audio > 1000 =
      [InvalidTransitionDuration (audioTransitionDurationMs audio)]
  | otherwise = []
