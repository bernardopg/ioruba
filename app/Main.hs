module Main (main) where

import Audio.Backend (containsCaseInsensitive)
import Audio.Mixer (SliderValue(..), applyNoiseReduction, calculateVolume)
import Audio.PulseAudio (PulseContext, closePulseAudio, initPulseAudio, setMasterVolume)
import Audio.Sink
  ( Sink(..)
  , Volume(..)
  , getDefaultSink
  , listSinks
  , setApplicationVolumeByName
  , setSinkVolume
  )
import Audio.Source
  ( Source(..)
  , getDefaultSource
  , listSources
  , setSourceVolume
  )
import Config.Parser (defaultConfig, loadConfig)
import Config.Types
  ( AudioTarget(..)
  , Config(..)
  , SliderConfig(..)
  , audioNoiseReduction
  , configAudio
  , configSerial
  , configSliders
  , serialBaudRate
  , serialPort
  )
import Config.Validation (validateConfig)
import Control.Concurrent (threadDelay)
import Control.Exception (SomeException, finally, try)
import Control.Monad (forM, when)
import Data.Char (isAsciiUpper, toLower)
import qualified Data.ByteString.Char8 as BS
import qualified Data.List as List
import qualified Data.Map.Strict as Map
import Data.IORef (IORef, modifyIORef', newIORef, readIORef)
import Data.Maybe (fromMaybe, maybeToList)
import qualified Data.Text as T
import GUI.MainWindow
  ( MainWindow
  , SliderView(..)
  , createMainWindow
  , hideWindow
  , renderWindow
  , showWindow
  )
import Hardware.Device (detectArduino)
import Hardware.Protocol (SliderState(..), parseSliderData, sanitizeSerialPayload)
import Hardware.Serial (SerialConfig(..), SerialPort, closeSerial, openSerial, readLine)
import System.Directory (XdgDirectory(XdgConfig), doesFileExist, getXdgDirectory)
import System.Environment (getArgs, getExecutablePath, lookupEnv)
import System.Exit (exitFailure, exitSuccess)
import System.FilePath ((</>), takeDirectory)
import System.IO (BufferMode(NoBuffering), hSetBuffering, stdout)

type SliderMap = Map.Map Int SliderValue
type OutcomeMap = Map.Map Int String

data SliderEvent
  = FullSliderState SliderMap
  | SliderDelta Int SliderValue

data RuntimeRefs = RuntimeRefs
  { runtimeCurrentValues :: IORef SliderMap
  , runtimeAppliedValues :: IORef SliderMap
  , runtimeOutcomes :: IORef OutcomeMap
  }

main :: IO ()
main = do
  hSetBuffering stdout NoBuffering
  args <- getArgs
  when (any (`elem` args) ["--help", "-h"]) $ do
    printUsage
    exitSuccess

  configPath <- resolveConfigPath args
  config <- loadValidatedConfig configPath
  pulseContext <- initPulseContext
  window <- createMainWindow
  refs <- createRuntimeRefs

  showWindow window
  renderStatus window refs config "booting" "Starting Ioruba runtime..."

  runtimeResult <-
    try (runtimeLoop config pulseContext window refs)
      `finally` (hideWindow window >> closePulseAudio pulseContext)

  case runtimeResult of
    Left (err :: SomeException) -> do
      putStrLn $ "Runtime stopped unexpectedly: " ++ show err
      exitFailure
    Right () ->
      pure ()

printUsage :: IO ()
printUsage = do
  putStrLn "Ioruba"
  putStrLn "Usage: stack exec ioruba -- [--config PATH]"
  putStrLn ""
  putStrLn "Options:"
  putStrLn "  --config PATH   Load a specific YAML configuration file"
  putStrLn "  --help          Show this help text"

createRuntimeRefs :: IO RuntimeRefs
createRuntimeRefs =
  RuntimeRefs <$> newIORef Map.empty <*> newIORef Map.empty <*> newIORef Map.empty

runtimeLoop :: Config -> PulseContext -> MainWindow -> RuntimeRefs -> IO ()
runtimeLoop config pulseContext window refs = do
  serialPath <- waitForSerialPath config window refs
  serialHandle <- waitForSerialOpen config serialPath window refs
  disconnectReason <- consumeSerial config pulseContext window refs serialPath serialHandle
  closeSerial serialHandle
  renderStatus window refs config serialPath disconnectReason
  threadDelay retryDelayMicros
  runtimeLoop config pulseContext window refs

waitForSerialPath :: Config -> MainWindow -> RuntimeRefs -> IO FilePath
waitForSerialPath config window refs = do
  maybeSerialPath <- resolveAvailableSerialPath config
  case maybeSerialPath of
    Just serialPath ->
      pure serialPath
    Nothing -> do
      renderStatus window refs config "searching" "Searching for an Arduino Nano on /dev/ttyUSB* or /dev/ttyACM*..."
      threadDelay retryDelayMicros
      waitForSerialPath config window refs

waitForSerialOpen :: Config -> FilePath -> MainWindow -> RuntimeRefs -> IO SerialPort
waitForSerialOpen config serialPath window refs = do
  let serialSettings =
        SerialConfig
          { serialConfigPath = serialPath
          , serialConfigBaud = serialBaudRate (configSerial config)
          }
  openResult <- openSerial serialSettings
  case openResult of
    Right serialHandle -> do
      renderStatus window refs config serialPath "Connected. Waiting for serial packets..."
      pure serialHandle
    Left openError -> do
      renderStatus window refs config serialPath ("Failed to open serial port: " ++ openError)
      threadDelay retryDelayMicros
      waitForSerialOpen config serialPath window refs

consumeSerial
  :: Config
  -> PulseContext
  -> MainWindow
  -> RuntimeRefs
  -> FilePath
  -> SerialPort
  -> IO String
consumeSerial config pulseContext window refs serialPath serialHandle =
  go 0
  where
    go idleTicks = do
      readResult <- try (readLine serialHandle)
      case readResult of
        Left (err :: SomeException) ->
          pure $ "Serial read failed: " ++ show err
        Right Nothing
          | idleTicks >= idleThresholdTicks ->
              pure "No serial packets received for 3s. Reconnecting..."
          | otherwise -> do
              renderStatus window refs config serialPath "Waiting for firmware heartbeat..."
              threadDelay idlePollDelayMicros
              go (idleTicks + 1)
        Right (Just rawLine)
          | BS.all (`elem` ['\r', '\n', ' ']) rawLine -> do
              threadDelay idlePollDelayMicros
              go idleTicks
          | otherwise ->
              case parseSliderEvent rawLine of
                Left parseError -> do
                  renderStatus
                    window
                    refs
                    config
                    serialPath
                    ("Packet parse error: " ++ parseError ++ " | raw: " ++ sanitizeLine rawLine)
                  go 0
                Right sliderEvent -> do
                  updateCurrentValues (runtimeCurrentValues refs) sliderEvent
                  currentValues <- readIORef (runtimeCurrentValues refs)
                  (nextAppliedValues, nextOutcomes) <-
                    applyConfiguredSliders config pulseContext currentValues refs
                  renderSnapshot
                    window
                    config
                    serialPath
                    ("Receiving data | " ++ sanitizeLine rawLine)
                    currentValues
                    nextAppliedValues
                    nextOutcomes
                  go 0

resolveConfigPath :: [String] -> IO FilePath
resolveConfigPath args =
  case args of
    ("--config":path:_) -> pure path
    _ -> do
      explicitConfigPath <- lookupEnv "IORUBA_CONFIG_PATH"
      xdgConfigDir <- getXdgDirectory XdgConfig "ioruba"
      executablePath <- getExecutablePath
      let executableDir = takeDirectory executablePath
          candidatePaths =
            maybeToList explicitConfigPath
              ++ [ xdgConfigDir </> "ioruba.yaml"
                 , xdgConfigDir </> "nano-3knobs.yaml"
                 , "/etc/ioruba/ioruba.yaml"
                 , "/etc/ioruba/nano-3knobs.yaml"
                 , executableDir </> "../share/ioruba/config/ioruba.yaml"
                 , executableDir </> "../share/ioruba/config/nano-3knobs.yaml"
                 , executableDir </> "../config/nano-3knobs.yaml"
                 , executableDir </> "../config/ioruba.yaml"
                 , "config/nano-3knobs.yaml"
                 , "config/ioruba.yaml"
                 ]
      findFirstExistingPath candidatePaths "config/ioruba.yaml"

loadValidatedConfig :: FilePath -> IO Config
loadValidatedConfig configPath = do
  putStrLn $ "Loading configuration from " ++ configPath
  configResult <- loadConfig configPath
  config <-
    case configResult of
      Right loadedConfig ->
        pure loadedConfig
      Left loadError -> do
        putStrLn $ "Failed to load config: " ++ loadError
        putStrLn "Falling back to default configuration."
        pure defaultConfig

  case validateConfig config of
    Left validationErrors -> do
      putStrLn "Configuration validation failed:"
      mapM_ print validationErrors
      exitFailure
    Right validConfig ->
      pure validConfig

initPulseContext :: IO PulseContext
initPulseContext = do
  result <- initPulseAudio
  case result of
    Right context -> pure context
    Left errorMessage -> do
      putStrLn $ "Failed to initialize audio backend: " ++ errorMessage
      exitFailure

resolveAvailableSerialPath :: Config -> IO (Maybe FilePath)
resolveAvailableSerialPath config = do
  let configuredPath = serialPort (configSerial config)
  configuredExists <- doesFileExist configuredPath
  if configuredExists
    then pure $ Just configuredPath
    else detectArduino

parseSliderEvent :: BS.ByteString -> Either String SliderEvent
parseSliderEvent rawLine
  | BS.isPrefixOf "P" cleanLine = parseLegacyDelta cleanLine
  | otherwise =
      FullSliderState . sliderStateToMap <$> parseSliderData cleanLine
  where
    cleanLine = sanitizeSerialPayload rawLine

parseLegacyDelta :: BS.ByteString -> Either String SliderEvent
parseLegacyDelta rawLine =
  case break (== ':') (BS.unpack rawLine) of
    ('P':sliderIdText, ':':valueText) ->
      case (reads sliderIdText, reads valueText) of
        ([(sliderIdValue, "")], [(rawValue, "")])
          | sliderIdValue >= 1 && rawValue >= 0 && rawValue <= 1023 ->
              Right $ SliderDelta (sliderIdValue - 1) (SliderValue rawValue)
        _ -> Left "Invalid legacy slider line"
    _ -> Left "Unknown slider line format"

sliderStateToMap :: SliderState -> SliderMap
sliderStateToMap (SliderState sliderValues) =
  Map.fromList $ zip [0 ..] sliderValues

updateCurrentValues :: IORef SliderMap -> SliderEvent -> IO ()
updateCurrentValues currentValuesRef sliderEvent =
  modifyIORef' currentValuesRef $
    case sliderEvent of
      FullSliderState sliderValues -> const sliderValues
      SliderDelta sliderIdValue sliderValue ->
        Map.insert sliderIdValue sliderValue

applyConfiguredSliders
  :: Config
  -> PulseContext
  -> SliderMap
  -> RuntimeRefs
  -> IO (SliderMap, OutcomeMap)
applyConfiguredSliders config pulseContext currentValues refs = do
  previousAppliedValues <- readIORef (runtimeAppliedValues refs)
  previousOutcomes <- readIORef (runtimeOutcomes refs)
  let noiseReduction = audioNoiseReduction (configAudio config)

  updates <- forM (configSliders config) $ \sliderConfig -> do
    let sliderIdValue = sliderId sliderConfig
    case Map.lookup sliderIdValue currentValues of
      Nothing ->
        pure Nothing
      Just rawSliderValue -> do
        let filteredSliderValue =
              case Map.lookup sliderIdValue previousAppliedValues of
                Just previousSliderValue ->
                  applyNoiseReduction noiseReduction previousSliderValue rawSliderValue
                Nothing ->
                  rawSliderValue

        outcome <-
          if Map.lookup sliderIdValue previousAppliedValues == Just filteredSliderValue
            then pure $ Map.findWithDefault "unchanged" sliderIdValue previousOutcomes
            else applyTargets pulseContext sliderConfig filteredSliderValue

        pure $ Just (sliderIdValue, filteredSliderValue, outcome)

  let updateTriples = collectJust updates
      nextAppliedValues =
        foldr
          (\(sliderIdValue, filteredSliderValue, _) -> Map.insert sliderIdValue filteredSliderValue)
          previousAppliedValues
          updateTriples
      nextOutcomes =
        foldr
          (\(sliderIdValue, _, outcome) -> Map.insert sliderIdValue outcome)
          previousOutcomes
          updateTriples

  modifyIORef' (runtimeAppliedValues refs) (const nextAppliedValues)
  modifyIORef' (runtimeOutcomes refs) (const nextOutcomes)
  pure (nextAppliedValues, nextOutcomes)

renderStatus :: MainWindow -> RuntimeRefs -> Config -> FilePath -> String -> IO ()
renderStatus window refs config serialPath statusLine = do
  currentValues <- readIORef (runtimeCurrentValues refs)
  appliedValues <- readIORef (runtimeAppliedValues refs)
  outcomes <- readIORef (runtimeOutcomes refs)
  renderSnapshot window config serialPath statusLine currentValues appliedValues outcomes

renderSnapshot
  :: MainWindow
  -> Config
  -> FilePath
  -> String
  -> SliderMap
  -> SliderMap
  -> OutcomeMap
  -> IO ()
renderSnapshot window config serialPath statusLine currentValues appliedValues outcomes =
  renderWindow window serialPath statusLine (buildSliderViews config currentValues appliedValues outcomes)

buildSliderViews :: Config -> SliderMap -> SliderMap -> OutcomeMap -> [SliderView]
buildSliderViews config currentValues appliedValues outcomes =
  map
    (\sliderConfig ->
      let sliderIdValue = sliderId sliderConfig
          rawSliderValue = currentRawValue currentValues sliderIdValue
          appliedSliderValue = Map.findWithDefault (SliderValue rawSliderValue) sliderIdValue appliedValues
       in SliderView
            { sliderViewId = sliderIdValue
            , sliderViewName = T.unpack (sliderName sliderConfig)
            , sliderViewPercent = sliderValueToPercent appliedSliderValue
            , sliderViewRawValue = rawSliderValue
            , sliderViewTargets = map describeTarget (sliderTargets sliderConfig)
            , sliderViewOutcome = Map.findWithDefault "waiting for data" sliderIdValue outcomes
            }
    )
    (configSliders config)

applyTargets :: PulseContext -> SliderConfig -> SliderValue -> IO String
applyTargets pulseContext sliderConfig sliderValue = do
  let targetVolume = sliderToVolume sliderConfig sliderValue
  results <- mapM (applyTarget pulseContext targetVolume) (sliderTargets sliderConfig)
  pure $ List.intercalate " | " results

applyTarget :: PulseContext -> Volume -> AudioTarget -> IO String
applyTarget pulseContext targetVolume audioTarget =
  case audioTarget of
    MasterTarget -> do
      setMasterVolume pulseContext targetVolume
      pure "master updated"
    ApplicationTarget appName -> do
      matchCount <- setApplicationVolumeByName appName targetVolume
      pure $
        if matchCount == 0
          then "app idle: " ++ T.unpack appName
          else
            "app updated: "
              ++ T.unpack appName
              ++ " ("
              ++ show matchCount
              ++ " "
              ++ pluralize "stream" matchCount
              ++ ")"
    SourceTarget sourceNameText -> do
      matches <- resolveSources sourceNameText
      mapM_ (`setSourceVolume` targetVolume) matches
      pure $
        if null matches
          then "source unavailable: " ++ T.unpack sourceNameText
          else "source updated: " ++ T.unpack sourceNameText
    SinkTarget sinkNameText -> do
      matches <- resolveSinks sinkNameText
      mapM_ (`setSinkVolume` targetVolume) matches
      pure $
        if null matches
          then "sink unavailable: " ++ T.unpack sinkNameText
          else "sink updated: " ++ T.unpack sinkNameText

resolveSources :: T.Text -> IO [Source]
resolveSources sourceNameText
  | normalizeName sourceNameText == "default_microphone" =
      maybeToList <$> getDefaultSource
  | otherwise =
      filter
        (\source ->
          matchesName sourceNameText (sourceName source)
            || matchesName sourceNameText (sourceDescription source)
        )
        <$> listSources

resolveSinks :: T.Text -> IO [Sink]
resolveSinks sinkNameText
  | normalizeName sinkNameText == "default_output" =
      maybeToList <$> getDefaultSink
  | otherwise =
      filter
        (\sink ->
          matchesName sinkNameText (sinkName sink)
            || matchesName sinkNameText (sinkDescription sink)
        )
        <$> listSinks

matchesName :: T.Text -> T.Text -> Bool
matchesName targetName candidate =
  containsCaseInsensitive (T.unpack targetName) (T.unpack candidate)
    || containsCaseInsensitive (T.unpack candidate) (T.unpack targetName)

normalizeName :: T.Text -> String
normalizeName = map lowerAscii . T.unpack

lowerAscii :: Char -> Char
lowerAscii rawChar
  | isAsciiUpper rawChar =
      toLower rawChar
  | otherwise = rawChar

sliderToVolume :: SliderConfig -> SliderValue -> Volume
sliderToVolume sliderConfig sliderValue =
  case calculateVolume sliderValue of
    Volume normalized ->
      if fromMaybe False (sliderInverted sliderConfig)
        then Volume (1.0 - normalized)
        else Volume normalized

describeTarget :: AudioTarget -> String
describeTarget audioTarget =
  case audioTarget of
    MasterTarget -> "master"
    ApplicationTarget appName -> "app:" ++ T.unpack appName
    SourceTarget sourceNameText -> "source:" ++ T.unpack sourceNameText
    SinkTarget sinkNameText -> "sink:" ++ T.unpack sinkNameText

currentRawValue :: SliderMap -> Int -> Int
currentRawValue sliderValues sliderIdValue =
  case Map.lookup sliderIdValue sliderValues of
    Just (SliderValue rawValue) -> rawValue
    Nothing -> 0

sliderValueToPercent :: SliderValue -> Int
sliderValueToPercent (SliderValue rawValue) = (rawValue * 100) `div` 1023

sanitizeLine :: BS.ByteString -> String
sanitizeLine = filter (`notElem` ['\r', '\n']) . BS.unpack

collectJust :: [Maybe a] -> [a]
collectJust = foldr step []
  where
    step maybeValue values =
      case maybeValue of
        Just value -> value : values
        Nothing -> values

pluralize :: String -> Int -> String
pluralize noun count
  | count == 1 = noun
  | otherwise = noun ++ "s"

idleThresholdTicks :: Int
idleThresholdTicks = 30

idlePollDelayMicros :: Int
idlePollDelayMicros = 100000

retryDelayMicros :: Int
retryDelayMicros = 1000000

findFirstExistingPath :: [FilePath] -> FilePath -> IO FilePath
findFirstExistingPath [] fallbackPath = pure fallbackPath
findFirstExistingPath (candidatePath:remainingPaths) fallbackPath = do
  candidateExists <- doesFileExist candidatePath
  if candidateExists
    then pure candidatePath
    else findFirstExistingPath remainingPaths fallbackPath
