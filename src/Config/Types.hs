{-# LANGUAGE DeriveAnyClass #-}

module Config.Types
  ( Config(..)
  , SerialConfig(..)
  , SliderConfig(..)
  , AudioTarget(..)
  , AudioConfig(..)
  , GUIConfig(..)
  , NoiseReduction(..)
  , Theme(..)
  ) where

import Data.Aeson (FromJSON, ToJSON)
import Data.Text (Text)
import GHC.Generics (Generic)

-- | Main application configuration
data Config = Config
  { configSerial :: SerialConfig
  , configSliders :: [SliderConfig]
  , configAudio :: AudioConfig
  , configGUI :: GUIConfig
  } deriving (Show, Eq, Generic, FromJSON, ToJSON)

-- | Serial port configuration
data SerialConfig = SerialConfig
  { serialPort :: FilePath
  , serialBaudRate :: Int
  } deriving (Show, Eq, Generic, FromJSON, ToJSON)

-- | Configuration for a single slider
data SliderConfig = SliderConfig
  { sliderId :: Int
  , sliderName :: Text
  , sliderTargets :: [AudioTarget]
  , sliderInverted :: Maybe Bool
  } deriving (Show, Eq, Generic, FromJSON, ToJSON)

-- | Audio target (application, master, mic, etc.)
data AudioTarget
  = MasterTarget
  | ApplicationTarget { targetAppName :: Text }
  | SourceTarget { targetSourceName :: Text }
  | SinkTarget { targetSinkName :: Text }
  deriving (Show, Eq, Generic, FromJSON, ToJSON)

-- | Audio system configuration
data AudioConfig = AudioConfig
  { audioNoiseReduction :: NoiseReduction
  , audioSmoothTransitions :: Bool
  , audioTransitionDurationMs :: Int
  } deriving (Show, Eq, Generic, FromJSON, ToJSON)

-- | Noise reduction level
data NoiseReduction
  = NoiseReductionLow
  | NoiseReductionDefault
  | NoiseReductionHigh
  deriving (Show, Eq, Generic, FromJSON, ToJSON)

-- | GUI configuration
data GUIConfig = GUIConfig
  { guiTheme :: Theme
  , guiShowVisualizers :: Bool
  , guiTrayIcon :: Bool
  } deriving (Show, Eq, Generic, FromJSON, ToJSON)

-- | Theme selection
data Theme
  = ThemeDark
  | ThemeLight
  | ThemeAuto
  deriving (Show, Eq, Generic, FromJSON, ToJSON)
