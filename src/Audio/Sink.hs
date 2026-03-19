module Audio.Sink
  ( Sink(..)
  , SinkInput(..)
  , Volume(..)
  , listSinks
  , listSinkInputs
  , getDefaultSink
  , setSinkVolume
  , setDefaultSinkVolume
  , setSinkInputVolume
  , setApplicationVolumeByName
  , getSinkVolume
  ) where

import Audio.Backend
  ( clampNormalized
  , containsCaseInsensitive
  , readAudioCommand
  , runAudioCommand
  , trim
  , volumePercentArg
  )
import qualified Data.Aeson as Aeson
import Data.Aeson
  ( FromJSON(parseJSON)
  , eitherDecodeStrict'
  , (.:)
  , (.:?)
  , withObject
  )
import qualified Data.Aeson.KeyMap as KeyMap
import qualified Data.Aeson.Types as AesonTypes
import Data.Bifunctor (first)
import qualified Data.ByteString.Char8 as BS
import Data.List (find)
import Data.Maybe (fromMaybe)
import Data.Text (Text)
import qualified Data.Text as T
import Data.Word (Word32)
import Text.Read (readMaybe)

-- | Audio sink (output device or application)
data Sink = Sink
  { sinkIndex :: Word32
  , sinkName :: Text
  , sinkDescription :: Text
  , sinkVolume :: Volume
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

instance FromJSON Sink where
  parseJSON = withObject "Sink" $ \obj -> do
    rawIndex <- obj .: "index"
    name <- obj .: "name"
    rawDescription <- obj .:? "description"
    volumeValue <- obj .: "volume"
    volume <- parseVolumeValue volumeValue
    pure $
      Sink
        { sinkIndex = rawIndex
        , sinkName = name
        , sinkDescription = fromMaybe name rawDescription
        , sinkVolume = volume
        }

instance FromJSON SinkInput where
  parseJSON = withObject "SinkInput" $ \obj -> do
    rawIndex <- obj .: "index"
    rawName <- obj .:? "name"
    appName <- case KeyMap.lookup "properties" obj of
      Nothing -> pure $ fromMaybe "Unknown application" rawName
      Just propertiesValue ->
        withObject "properties" (\properties -> do
          propName <- properties .:? "application.name"
          pure $ fromMaybe (fromMaybe "Unknown application" rawName) propName
        ) propertiesValue
    let displayName = fromMaybe appName rawName
    pure $
      SinkInput
        { sinkInputIndex = rawIndex
        , sinkInputName = displayName
        , sinkInputApplicationName = appName
        }

listSinks :: IO [Sink]
listSinks = do
  result <- readAudioCommand "pactl" ["-f", "json", "list", "sinks"]
  pure $ either (const []) id (decodeJsonList result)

listSinkInputs :: IO [SinkInput]
listSinkInputs = do
  result <- readAudioCommand "pactl" ["-f", "json", "list", "sink-inputs"]
  pure $ either (const []) id (decodeJsonList result)

getDefaultSink :: IO (Maybe Sink)
getDefaultSink = do
  defaultSinkResult <- readAudioCommand "pactl" ["get-default-sink"]
  case defaultSinkResult of
    Left _ -> pure Nothing
    Right sinkNameText -> do
      sinks <- listSinks
      pure $
        find
          (\sink -> T.strip (sinkName sink) == T.pack (trim sinkNameText))
          sinks

setSinkVolume :: Sink -> Volume -> IO ()
setSinkVolume sink volume =
  ignoreResult $
    runAudioCommand
      "pactl"
      ["set-sink-volume", show (sinkIndex sink), volumePercentArg (unVolume volume)]

setDefaultSinkVolume :: Volume -> IO ()
setDefaultSinkVolume volume =
  ignoreResult $
    runAudioCommand
      "pactl"
      ["set-sink-volume", "@DEFAULT_SINK@", volumePercentArg (unVolume volume)]

setSinkInputVolume :: SinkInput -> Volume -> IO ()
setSinkInputVolume sinkInput volume =
  ignoreResult $
    runAudioCommand
      "pactl"
      ["set-sink-input-volume", show (sinkInputIndex sinkInput), volumePercentArg (unVolume volume)]

setApplicationVolumeByName :: Text -> Volume -> IO Int
setApplicationVolumeByName appName volume = do
  sinkInputs <- listSinkInputs
  let matchingInputs =
        filter
          (\sinkInput ->
             containsCaseInsensitive
               (T.unpack appName)
               (T.unpack (sinkInputApplicationName sinkInput))
               || containsCaseInsensitive
                    (T.unpack appName)
                    (T.unpack (sinkInputName sinkInput)))
          sinkInputs
  mapM_ (`setSinkInputVolume` volume) matchingInputs
  pure $ length matchingInputs

getSinkVolume :: Sink -> IO Volume
getSinkVolume sink = do
  sinks <- listSinks
  pure $
    maybe (Volume 0.5) sinkVolume $
      find (\candidate -> sinkIndex candidate == sinkIndex sink) sinks

parseVolumeValue :: Aeson.Value -> AesonTypes.Parser Volume
parseVolumeValue =
  withObject "volume" $ \obj ->
    case KeyMap.elems obj of
      [] -> pure $ Volume 0.5
      firstChannel : _ ->
        withObject "channel-volume" (\channel -> do
          percentText <- channel .: "value_percent"
          pure $
            Volume (clampNormalized (parsePercentText percentText))
        ) firstChannel

parsePercentText :: Text -> Double
parsePercentText rawText =
  case readMaybe (filter (/= '%') (T.unpack rawText)) of
    Just percentage -> percentage / 100.0
    Nothing -> 0.5

decodeJsonList :: FromJSON a => Either String String -> Either String [a]
decodeJsonList result = do
  rawText <- result
  first showDecodeError (eitherDecodeStrict' (BS.pack rawText))
  where
    showDecodeError err = "Failed to decode pactl JSON: " ++ err

ignoreResult :: IO (Either String ()) -> IO ()
ignoreResult action = do
  _ <- action
  pure ()
