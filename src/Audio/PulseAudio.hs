module Audio.PulseAudio
  ( PulseContext(..)
  , initPulseAudio
  , closePulseAudio
  , setMasterVolume
  , getMasterVolume
  , defaultSinkName
  , defaultSourceName
  ) where

import Audio.Backend
  ( parseFirstPercent
  , readAudioCommand
  , runAudioCommand
  , trim
  , volumePercentArg
  )
import Audio.Sink (Volume(..))
import Data.List (isPrefixOf)

data PulseContext = PulseContext
  { pulseServerName :: String
  , pulseDefaultSink :: String
  , pulseDefaultSource :: String
  } deriving (Show, Eq)

initPulseAudio :: IO (Either String PulseContext)
initPulseAudio = do
  result <- readAudioCommand "pactl" ["info"]
  pure $ do
    infoOutput <- result
    serverName <- lookupInfoField "Server Name:" infoOutput
    defaultSink <- lookupInfoField "Default Sink:" infoOutput
    defaultSource <- lookupInfoField "Default Source:" infoOutput
    Right $
      PulseContext
        { pulseServerName = serverName
        , pulseDefaultSink = defaultSink
        , pulseDefaultSource = defaultSource
        }

closePulseAudio :: PulseContext -> IO ()
closePulseAudio _ = pure ()

setMasterVolume :: PulseContext -> Volume -> IO ()
setMasterVolume _ volume = do
  _ <- runAudioCommand "pactl" ["set-sink-volume", "@DEFAULT_SINK@", volumePercentArg (unVolume volume)]
  pure ()

getMasterVolume :: PulseContext -> IO Volume
getMasterVolume _ = do
  result <- readAudioCommand "pactl" ["get-sink-volume", "@DEFAULT_SINK@"]
  pure $ case result >>= maybeToEither "Volume percentage not found" . parseFirstPercent of
    Right normalized -> Volume normalized
    Left _ -> Volume 0.0

defaultSinkName :: PulseContext -> String
defaultSinkName = pulseDefaultSink

defaultSourceName :: PulseContext -> String
defaultSourceName = pulseDefaultSource

lookupInfoField :: String -> String -> Either String String
lookupInfoField prefix rawOutput =
  case foldr step Nothing (lines rawOutput) of
    Just value -> Right value
    Nothing -> Left $ "Missing field in `pactl info`: " ++ prefix
  where
    step line acc =
      case acc of
        Just value -> Just value
        Nothing
          | prefix `isPrefixOf` line ->
              Just $ trim $ drop (length prefix) line
          | otherwise -> Nothing

maybeToEither :: left -> Maybe right -> Either left right
maybeToEither leftValue =
  maybe (Left leftValue) Right
