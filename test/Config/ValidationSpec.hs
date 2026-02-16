module Config.ValidationSpec (spec) where

import Config.Types
import Config.Validation
import Test.Hspec

-- | Helper to create a valid base config for testing
validConfig :: Config
validConfig =
  Config
    { configSerial =
        SerialConfig
          { serialPort = "/dev/ttyUSB0",
            serialBaudRate = 9600
          },
      configSliders =
        [ SliderConfig
            { sliderId = 0,
              sliderName = "Master",
              sliderTargets = [MasterTarget],
              sliderInverted = Nothing
            }
        ],
      configAudio =
        AudioConfig
          { audioNoiseReduction = NoiseReductionDefault,
            audioSmoothTransitions = True,
            audioTransitionDurationMs = 50
          },
      configGUI =
        GUIConfig
          { guiTheme = ThemeDark,
            guiShowVisualizers = True,
            guiTrayIcon = True
          }
    }

spec :: Spec
spec = describe "Config.Validation" $ do
  describe "validateConfig" $ do
    it "accepts valid configuration" $ do
      validateConfig validConfig `shouldBe` Right validConfig

    it "rejects invalid baud rate" $ do
      let config = validConfig {configSerial = (configSerial validConfig) {serialBaudRate = 1234}}
      validateConfig config `shouldSatisfy` isLeft

    it "accepts all standard baud rates" $ do
      let baudRates = [9600, 19200, 38400, 57600, 115200]
      mapM_
        ( \rate -> do
            let config = validConfig {configSerial = (configSerial validConfig) {serialBaudRate = rate}}
            validateConfig config `shouldBe` Right config
        )
        baudRates

    it "rejects duplicate slider IDs" $ do
      let sliders =
            [ SliderConfig 0 "Master" [MasterTarget] Nothing,
              SliderConfig 0 "Duplicate" [MasterTarget] Nothing
            ]
          config = validConfig {configSliders = sliders}
      validateConfig config `shouldSatisfy` isLeft

    it "rejects empty slider name" $ do
      let sliders = [SliderConfig 0 "" [MasterTarget] Nothing]
          config = validConfig {configSliders = sliders}
      validateConfig config `shouldSatisfy` isLeft

    it "rejects slider with no targets" $ do
      let sliders = [SliderConfig 0 "Empty" [] Nothing]
          config = validConfig {configSliders = sliders}
      validateConfig config `shouldSatisfy` isLeft

    it "rejects negative slider ID" $ do
      let sliders = [SliderConfig (-1) "Negative" [MasterTarget] Nothing]
          config = validConfig {configSliders = sliders}
      validateConfig config `shouldSatisfy` isLeft

    it "rejects negative transition duration" $ do
      let config = validConfig {configAudio = (configAudio validConfig) {audioTransitionDurationMs = -1}}
      validateConfig config `shouldSatisfy` isLeft

    it "rejects transition duration above 1000ms" $ do
      let config = validConfig {configAudio = (configAudio validConfig) {audioTransitionDurationMs = 1001}}
      validateConfig config `shouldSatisfy` isLeft

    it "accepts transition duration at boundary (0ms)" $ do
      let config = validConfig {configAudio = (configAudio validConfig) {audioTransitionDurationMs = 0}}
      validateConfig config `shouldBe` Right config

    it "accepts transition duration at boundary (1000ms)" $ do
      let config = validConfig {configAudio = (configAudio validConfig) {audioTransitionDurationMs = 1000}}
      validateConfig config `shouldBe` Right config

    it "accepts multiple valid sliders with different IDs" $ do
      let sliders =
            [ SliderConfig 0 "Master" [MasterTarget] Nothing,
              SliderConfig 1 "Music" [ApplicationTarget "Spotify"] Nothing,
              SliderConfig 2 "Browser" [ApplicationTarget "Firefox"] Nothing
            ]
          config = validConfig {configSliders = sliders}
      validateConfig config `shouldBe` Right config

    it "rejects config with multiple errors" $ do
      let config =
            validConfig
              { configSerial = (configSerial validConfig) {serialBaudRate = 0},
                configSliders = [SliderConfig (-1) "" [] Nothing],
                configAudio = (configAudio validConfig) {audioTransitionDurationMs = 5000}
              }
      case validateConfig config of
        Left errors -> length errors `shouldSatisfy` (> 1)
        Right _ -> expectationFailure "Should have failed validation"

isLeft :: Either a b -> Bool
isLeft (Left _) = True
isLeft _ = False
