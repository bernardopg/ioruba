module App.Runtime.State
  ( SliderMap
  , OutcomeMap
  , RuntimeStatus(..)
  , RuntimeKnobSnapshot(..)
  , RuntimeDiagnostics(..)
  , RuntimeSnapshot(..)
  , initialRuntimeSnapshot
  , buildRuntimeSnapshot
  , sliderValueToPercent
  , describeTarget
  , runtimeStatusTone
  ) where

import Audio.Mixer (SliderValue(..))
import Config.Types (AudioTarget(..), Config, SliderConfig(..), configSliders)
import Data.Map.Strict (Map)
import qualified Data.Map.Strict as Map
import Data.Text (Text)
import qualified Data.Text as T

type SliderMap = Map Int SliderValue
type OutcomeMap = Map Int Text

data RuntimeStatus
  = RuntimeBooting
  | RuntimeReady
  | RuntimeSearching
  | RuntimeConnecting
  | RuntimeConnected
  | RuntimeDemo
  | RuntimeDisconnected
  | RuntimeError
  deriving (Show, Eq, Ord)

data RuntimeKnobSnapshot = RuntimeKnobSnapshot
  { runtimeKnobId :: Int
  , runtimeKnobName :: Text
  , runtimeKnobPercent :: Int
  , runtimeKnobRawValue :: Int
  , runtimeKnobTargets :: [Text]
  , runtimeKnobOutcome :: Text
  , runtimeKnobAccent :: Text
  } deriving (Show, Eq)

data RuntimeDiagnostics = RuntimeDiagnostics
  { runtimeDiagnosticsAudioSummary :: Text
  , runtimeDiagnosticsActiveApplications :: [Text]
  , runtimeDiagnosticsLastSerialLine :: Maybe Text
  , runtimeDiagnosticsHint :: Text
  } deriving (Show, Eq)

data RuntimeSnapshot = RuntimeSnapshot
  { runtimeSnapshotStatus :: RuntimeStatus
  , runtimeSnapshotStatusText :: Text
  , runtimeSnapshotConnectionPort :: Maybe FilePath
  , runtimeSnapshotAvailablePorts :: [FilePath]
  , runtimeSnapshotKnobs :: [RuntimeKnobSnapshot]
  , runtimeSnapshotDiagnostics :: RuntimeDiagnostics
  , runtimeSnapshotDemoMode :: Bool
  } deriving (Show, Eq)

initialRuntimeSnapshot :: Config -> Bool -> RuntimeSnapshot
initialRuntimeSnapshot config demoMode =
  buildRuntimeSnapshot
    config
    (if demoMode then RuntimeDemo else RuntimeBooting)
    (if demoMode then "Demo mode enabled" else "Starting Ioruba runtime...")
    []
    Nothing
    Nothing
    demoMode
    Map.empty
    Map.empty
    Map.empty

buildRuntimeSnapshot
  :: Config
  -> RuntimeStatus
  -> Text
  -> [FilePath]
  -> Maybe FilePath
  -> Maybe Text
  -> Bool
  -> SliderMap
  -> SliderMap
  -> OutcomeMap
  -> RuntimeSnapshot
buildRuntimeSnapshot config status statusText availablePorts connectionPort lastSerialLine demoMode currentValues appliedValues outcomes =
  RuntimeSnapshot
    { runtimeSnapshotStatus = status
    , runtimeSnapshotStatusText = statusText
    , runtimeSnapshotConnectionPort = connectionPort
    , runtimeSnapshotAvailablePorts = availablePorts
    , runtimeSnapshotKnobs = map buildKnobSnapshot (configSliders config)
    , runtimeSnapshotDiagnostics =
        RuntimeDiagnostics
          { runtimeDiagnosticsAudioSummary = audioSummary
          , runtimeDiagnosticsActiveApplications = activeApplications
          , runtimeDiagnosticsLastSerialLine = lastSerialLine
          , runtimeDiagnosticsHint = hintForStatus status statusText
          }
    , runtimeSnapshotDemoMode = demoMode
    }
  where
    buildKnobSnapshot sliderConfig =
      let sliderKey = sliderId sliderConfig
          rawSliderValue = currentRawValue currentValues sliderKey
          appliedSliderValue = Map.findWithDefault (SliderValue rawSliderValue) sliderKey appliedValues
       in RuntimeKnobSnapshot
            { runtimeKnobId = sliderKey
            , runtimeKnobName = sliderName sliderConfig
            , runtimeKnobPercent = sliderValueToPercent appliedSliderValue
            , runtimeKnobRawValue = rawSliderValue
            , runtimeKnobTargets = map describeTarget (sliderTargets sliderConfig)
            , runtimeKnobOutcome = Map.findWithDefault "waiting for data" sliderKey outcomes
            , runtimeKnobAccent = accentForKnob sliderKey
            }

    activeApplications =
      [ name
      | sliderConfig <- configSliders config
      , ApplicationTarget name <- sliderTargets sliderConfig
      ]

    audioSummary =
      T.pack (show (length activeApplications))
        <> " app target(s), "
        <> T.pack (show (length (configSliders config)))
        <> " knob(s)"

buildHint :: RuntimeStatus -> Text -> Text
buildHint status statusText =
  case status of
    RuntimeBooting -> "Initializing runtime services"
    RuntimeReady -> "Ready to connect"
    RuntimeSearching -> "Waiting for an Arduino Nano serial device"
    RuntimeConnecting -> "Opening serial port and waiting for data"
    RuntimeConnected -> statusText
    RuntimeDemo -> "Synthetic readings are driving the UI"
    RuntimeDisconnected -> statusText
    RuntimeError -> statusText

hintForStatus :: RuntimeStatus -> Text -> Text
hintForStatus = buildHint

currentRawValue :: SliderMap -> Int -> Int
currentRawValue sliderValues sliderKey =
  case Map.lookup sliderKey sliderValues of
    Just (SliderValue rawValue) -> rawValue
    Nothing -> 0

sliderValueToPercent :: SliderValue -> Int
sliderValueToPercent (SliderValue rawValue) = (rawValue * 100) `div` 1023

describeTarget :: AudioTarget -> Text
describeTarget audioTarget =
  case audioTarget of
    MasterTarget -> "master"
    ApplicationTarget appName -> "app:" <> appName
    SourceTarget sourceNameText -> "source:" <> sourceNameText
    SinkTarget sinkNameText -> "sink:" <> sinkNameText

accentForKnob :: Int -> Text
accentForKnob knobIdValue =
  palette !! (knobIdValue `mod` length palette)
  where
    palette = ["cyan", "amber", "teal", "rose", "lime"]

runtimeStatusTone :: RuntimeStatus -> Text
runtimeStatusTone status =
  case status of
    RuntimeConnected -> "positive"
    RuntimeDemo -> "positive"
    RuntimeBooting -> "neutral"
    RuntimeReady -> "neutral"
    RuntimeSearching -> "warning"
    RuntimeConnecting -> "warning"
    RuntimeDisconnected -> "warning"
    RuntimeError -> "critical"
