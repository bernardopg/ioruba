{-# LANGUAGE OverloadedStrings #-}

module Config.ParserSpec (spec) where

import Config.Parser (parseConfig)
import Config.Types
  ( AudioConfig(..)
  , AudioTarget(..)
  , Config(..)
  , GUIConfig(..)
  , NoiseReduction(..)
  , SerialConfig(..)
  , SliderConfig(..)
  , Theme(..)
  )
import Data.Either (isLeft)
import Test.Hspec

spec :: Spec
spec = describe "parseConfig" $ do
  it "parses the documented YAML schema" $ do
    parseConfig documentedConfig `shouldBe` Right expectedConfig

  it "rejects unknown target types" $ do
    parseConfig invalidTargetConfig `shouldSatisfy` isLeft

documentedConfig :: String
documentedConfig = unlines
  [ "serial:"
  , "  port: /dev/ttyUSB0"
  , "  baud_rate: 9600"
  , ""
  , "sliders:"
  , "  - id: 0"
  , "    name: Master Volume"
  , "    targets:"
  , "      - type: master"
  , "  - id: 1"
  , "    name: Music"
  , "    targets:"
  , "      - type: application"
  , "        name: Spotify"
  , ""
  , "audio:"
  , "  noise_reduction: default"
  , "  smooth_transitions: true"
  , "  transition_duration_ms: 50"
  , ""
  , "gui:"
  , "  theme: dark"
  , "  show_visualizers: true"
  , "  tray_icon: true"
  ]

invalidTargetConfig :: String
invalidTargetConfig = unlines
  [ "serial:"
  , "  port: /dev/ttyUSB0"
  , "  baud_rate: 9600"
  , ""
  , "sliders:"
  , "  - id: 0"
  , "    name: Broken"
  , "    targets:"
  , "      - type: mystery"
  , ""
  , "audio:"
  , "  noise_reduction: default"
  , "  smooth_transitions: true"
  , "  transition_duration_ms: 50"
  , ""
  , "gui:"
  , "  theme: dark"
  , "  show_visualizers: true"
  , "  tray_icon: true"
  ]

expectedConfig :: Config
expectedConfig = Config
  { configSerial = SerialConfig
      { serialPort = "/dev/ttyUSB0"
      , serialBaudRate = 9600
      }
  , configSliders =
      [ SliderConfig
          { sliderId = 0
          , sliderName = "Master Volume"
          , sliderTargets = [MasterTarget]
          , sliderInverted = Nothing
          }
      , SliderConfig
          { sliderId = 1
          , sliderName = "Music"
          , sliderTargets = [ApplicationTarget "Spotify"]
          , sliderInverted = Nothing
          }
      ]
  , configAudio = AudioConfig
      { audioNoiseReduction = NoiseReductionDefault
      , audioSmoothTransitions = True
      , audioTransitionDurationMs = 50
      }
  , configGUI = GUIConfig
      { guiTheme = ThemeDark
      , guiShowVisualizers = True
      , guiTrayIcon = True
      }
  }
