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

import Data.Aeson
  ( FromJSON(parseJSON)
  , ToJSON(toJSON)
  , (.:)
  , (.:?)
  , (.=)
  , object
  , withObject
  , withText
  )
import qualified Data.Aeson.Types as Aeson
import Data.Text (Text)
import qualified Data.Text as T
import GHC.Generics (Generic)

-- | Main application configuration
data Config = Config
  { configSerial :: SerialConfig
  , configSliders :: [SliderConfig]
  , configAudio :: AudioConfig
  , configGUI :: GUIConfig
  } deriving (Show, Eq, Generic)

-- | Serial port configuration
data SerialConfig = SerialConfig
  { serialPort :: FilePath
  , serialBaudRate :: Int
  } deriving (Show, Eq, Generic)

-- | Configuration for a single slider
data SliderConfig = SliderConfig
  { sliderId :: Int
  , sliderName :: Text
  , sliderTargets :: [AudioTarget]
  , sliderInverted :: Maybe Bool
  } deriving (Show, Eq, Generic)

-- | Audio target (application, master, mic, etc.)
data AudioTarget
  = MasterTarget
  | ApplicationTarget Text
  | SourceTarget Text
  | SinkTarget Text
  deriving (Show, Eq, Generic)

-- | Audio system configuration
data AudioConfig = AudioConfig
  { audioNoiseReduction :: NoiseReduction
  , audioSmoothTransitions :: Bool
  , audioTransitionDurationMs :: Int
  } deriving (Show, Eq, Generic)

-- | Noise reduction level
data NoiseReduction
  = NoiseReductionLow
  | NoiseReductionDefault
  | NoiseReductionHigh
  deriving (Show, Eq, Generic)

-- | GUI configuration
data GUIConfig = GUIConfig
  { guiTheme :: Theme
  , guiShowVisualizers :: Bool
  , guiTrayIcon :: Bool
  } deriving (Show, Eq, Generic)

-- | Theme selection
data Theme
  = ThemeDark
  | ThemeLight
  | ThemeAuto
  deriving (Show, Eq, Generic)

instance FromJSON Config where
  parseJSON = withObject "Config" $ \obj ->
    Config
      <$> obj .: "serial"
      <*> obj .: "sliders"
      <*> obj .: "audio"
      <*> obj .: "gui"

instance ToJSON Config where
  toJSON config =
    object
      [ "serial" .= configSerial config
      , "sliders" .= configSliders config
      , "audio" .= configAudio config
      , "gui" .= configGUI config
      ]

instance FromJSON SerialConfig where
  parseJSON = withObject "SerialConfig" $ \obj ->
    SerialConfig
      <$> obj .: "port"
      <*> obj .: "baud_rate"

instance ToJSON SerialConfig where
  toJSON serialConfig =
    object
      [ "port" .= serialPort serialConfig
      , "baud_rate" .= serialBaudRate serialConfig
      ]

instance FromJSON SliderConfig where
  parseJSON = withObject "SliderConfig" $ \obj ->
    SliderConfig
      <$> obj .: "id"
      <*> obj .: "name"
      <*> obj .: "targets"
      <*> obj .:? "inverted"

instance ToJSON SliderConfig where
  toJSON slider =
    object
      [ "id" .= sliderId slider
      , "name" .= sliderName slider
      , "targets" .= sliderTargets slider
      , "inverted" .= sliderInverted slider
      ]

instance FromJSON AudioTarget where
  parseJSON = withObject "AudioTarget" $ \obj -> do
    targetType <- obj .: "type" :: Aeson.Parser Text
    case T.toLower targetType of
      "master" -> pure MasterTarget
      "application" -> ApplicationTarget <$> obj .: "name"
      "source" -> SourceTarget <$> obj .: "name"
      "sink" -> SinkTarget <$> obj .: "name"
      other -> fail $ "Unknown audio target type: " ++ T.unpack other

instance ToJSON AudioTarget where
  toJSON MasterTarget = object ["type" .= ("master" :: Text)]
  toJSON (ApplicationTarget name) =
    object ["type" .= ("application" :: Text), "name" .= name]
  toJSON (SourceTarget name) =
    object ["type" .= ("source" :: Text), "name" .= name]
  toJSON (SinkTarget name) =
    object ["type" .= ("sink" :: Text), "name" .= name]

instance FromJSON AudioConfig where
  parseJSON = withObject "AudioConfig" $ \obj ->
    AudioConfig
      <$> obj .: "noise_reduction"
      <*> obj .: "smooth_transitions"
      <*> obj .: "transition_duration_ms"

instance ToJSON AudioConfig where
  toJSON audio =
    object
      [ "noise_reduction" .= audioNoiseReduction audio
      , "smooth_transitions" .= audioSmoothTransitions audio
      , "transition_duration_ms" .= audioTransitionDurationMs audio
      ]

instance FromJSON NoiseReduction where
  parseJSON = parseTextEnum "NoiseReduction"
    [ ("low", NoiseReductionLow)
    , ("default", NoiseReductionDefault)
    , ("high", NoiseReductionHigh)
    ]

instance ToJSON NoiseReduction where
  toJSON NoiseReductionLow = toJSON ("low" :: Text)
  toJSON NoiseReductionDefault = toJSON ("default" :: Text)
  toJSON NoiseReductionHigh = toJSON ("high" :: Text)

instance FromJSON GUIConfig where
  parseJSON = withObject "GUIConfig" $ \obj ->
    GUIConfig
      <$> obj .: "theme"
      <*> obj .: "show_visualizers"
      <*> obj .: "tray_icon"

instance ToJSON GUIConfig where
  toJSON gui =
    object
      [ "theme" .= guiTheme gui
      , "show_visualizers" .= guiShowVisualizers gui
      , "tray_icon" .= guiTrayIcon gui
      ]

instance FromJSON Theme where
  parseJSON = parseTextEnum "Theme"
    [ ("dark", ThemeDark)
    , ("light", ThemeLight)
    , ("auto", ThemeAuto)
    ]

instance ToJSON Theme where
  toJSON ThemeDark = toJSON ("dark" :: Text)
  toJSON ThemeLight = toJSON ("light" :: Text)
  toJSON ThemeAuto = toJSON ("auto" :: Text)

parseTextEnum :: String -> [(Text, a)] -> Aeson.Value -> Aeson.Parser a
parseTextEnum label options =
  withText label $ \rawText ->
    case lookup (T.toLower rawText) options of
      Just value -> pure value
      Nothing -> fail $ "Unknown " ++ label ++ ": " ++ T.unpack rawText
