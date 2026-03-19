module Config.Parser
  ( loadConfig
  , parseConfig
  , defaultConfig
  ) where

import Config.Types
import Control.Exception (try, SomeException)
import qualified Data.ByteString.Char8 as BS
import Data.Yaml (decodeEither', decodeFileEither)

-- | Load configuration from YAML file
loadConfig :: FilePath -> IO (Either String Config)
loadConfig path = do
  result <- try $ decodeFileEither path
  case result of
    Left (e :: SomeException) -> return $ Left $ "Failed to read config file: " ++ show e
    Right (Left parseErr) -> return $ Left $ "Failed to parse config: " ++ show parseErr
    Right (Right config) -> return $ Right config

-- | Parse configuration from YAML string
parseConfig :: String -> Either String Config
parseConfig rawConfig =
  case decodeEither' (BS.pack rawConfig) of
    Left parseErr -> Left $ "Failed to parse config: " ++ show parseErr
    Right config -> Right config

-- | Default configuration
defaultConfig :: Config
defaultConfig = Config
  { configSerial = SerialConfig
      { serialPort = "/dev/ttyUSB0"
      , serialBaudRate = 9600
      }
  , configSliders =
      [ SliderConfig
          { sliderId = 0
          , sliderName = "Master"
          , sliderTargets = [MasterTarget]
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
