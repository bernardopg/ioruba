module App.Runtime.Core
  ( RuntimeOptions(..)
  , runRuntimeCore
  ) where

import App.Mode (AppMode(..))
import App.Runtime.Commands (RuntimeCommand(..))
import App.Runtime.Events (RuntimeEvent(..))
import App.Runtime.State
  ( OutcomeMap
  , RuntimeDiagnostics(..)
  , RuntimeSnapshot(..)
  , RuntimeStatus(..)
  , SliderMap
  , buildRuntimeSnapshot
  , initialRuntimeSnapshot
  )
import App.Settings (UiSettings(..))
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
import Control.Concurrent (threadDelay)
import Control.Concurrent.STM
  ( TQueue
  , TVar
  , atomically
  , flushTQueue
  , writeTVar
  )
import Control.Exception (SomeException, try)
import Control.Monad (foldM, forM)
import Data.Char (isAsciiUpper, toLower)
import qualified Data.ByteString.Char8 as BS
import qualified Data.List as List
import qualified Data.Map.Strict as Map
import Data.IORef (IORef, modifyIORef', newIORef, readIORef, writeIORef)
import Data.Maybe (fromMaybe, maybeToList)
import qualified Data.Text as T
import Hardware.Device (detectArduino, listSerialPorts)
import Hardware.Protocol (SliderState(..), parseSliderData, sanitizeSerialPayload)
import Hardware.Serial (SerialConfig(..), SerialPort, closeSerial, openSerial, readLine)

data RuntimeOptions = RuntimeOptions
  { runtimeOptionsMode :: AppMode
  , runtimeOptionsConfig :: Config
  , runtimeOptionsUiSettings :: UiSettings
  }

data RuntimeRefs = RuntimeRefs
  { runtimeCurrentValues :: IORef SliderMap
  , runtimeAppliedValues :: IORef SliderMap
  , runtimeOutcomes :: IORef OutcomeMap
  }

data ControlState = ControlState
  { controlConnectWanted :: Bool
  , controlPreferredPort :: Maybe FilePath
  , controlDemoMode :: Bool
  , controlShutdownRequested :: Bool
  } deriving (Show, Eq)

data ConnectionState
  = ConnectionClosed
  | ConnectionOpen FilePath SerialPort Int

data LoopState = LoopState
  { loopConfig :: Config
  , loopControl :: ControlState
  , loopConnection :: ConnectionState
  , loopAvailablePorts :: [FilePath]
  , loopSnapshot :: RuntimeSnapshot
  , loopPulseContext :: Maybe PulseContext
  , loopDemoTick :: Int
  }

runRuntimeCore
  :: RuntimeOptions
  -> TQueue RuntimeCommand
  -> TVar RuntimeSnapshot
  -> (RuntimeEvent -> IO ())
  -> IO ()
runRuntimeCore options commandQueue snapshotVar publishEvent = do
  refs <- createRuntimeRefs
  pulseContext <- initPulseContext publishEvent
  let initialSnapshot =
        initialRuntimeSnapshot
          (runtimeOptionsConfig options)
          (initialDemoMode options)
      initialControl =
        ControlState
          { controlConnectWanted = uiSettingsAutoConnect (runtimeOptionsUiSettings options) && not (initialDemoMode options)
          , controlPreferredPort = uiSettingsPreferredPort (runtimeOptionsUiSettings options)
          , controlDemoMode = initialDemoMode options
          , controlShutdownRequested = False
          }
      initialState =
        LoopState
          { loopConfig = runtimeOptionsConfig options
          , loopControl = initialControl
          , loopConnection = ConnectionClosed
          , loopAvailablePorts = []
          , loopSnapshot = initialSnapshot
          , loopPulseContext = pulseContext
          , loopDemoTick = 0
          }
  stateRef <- newIORef initialState
  atomically $ writeTVar snapshotVar initialSnapshot
  publishEvent (RuntimeEventStarted initialSnapshot)
  loopResult <- try (loop refs stateRef initialState)
  finalState <- readIORef stateRef
  closeConnection (loopConnection finalState)
  maybe (pure ()) closePulseAudio pulseContext
  case loopResult of
    Left (err :: SomeException) ->
      publishEvent (RuntimeEventError (T.pack (show err)))
    Right () ->
      pure ()
  publishEvent RuntimeEventStopped
  where
    loop refs stateRef state = do
      writeIORef stateRef state
      commands <- atomically $ flushTQueue commandQueue
      stateAfterCommands <- applyCommands publishEvent snapshotVar refs commands state
      writeIORef stateRef stateAfterCommands
      if controlShutdownRequested (loopControl stateAfterCommands)
        then pure ()
        else do
          availablePorts <- listSerialPorts
          stateWithPorts <- publishPorts publishEvent snapshotVar refs availablePorts stateAfterCommands
          writeIORef stateRef stateWithPorts
          nextState <-
            if controlDemoMode (loopControl stateWithPorts)
              then runDemoStep snapshotVar publishEvent refs stateWithPorts
              else runHardwareStep snapshotVar publishEvent refs stateWithPorts
          loop refs stateRef nextState

initialDemoMode :: RuntimeOptions -> Bool
initialDemoMode options =
  runtimeOptionsMode options == DemoMode || uiSettingsDemoMode (runtimeOptionsUiSettings options)

createRuntimeRefs :: IO RuntimeRefs
createRuntimeRefs =
  RuntimeRefs <$> newIORef Map.empty <*> newIORef Map.empty <*> newIORef Map.empty

initPulseContext :: (RuntimeEvent -> IO ()) -> IO (Maybe PulseContext)
initPulseContext publishEvent = do
  result <- initPulseAudio
  case result of
    Right context -> pure $ Just context
    Left errorMessage -> do
      publishEvent (RuntimeEventError (T.pack errorMessage))
      pure Nothing

applyCommands
  :: (RuntimeEvent -> IO ())
  -> TVar RuntimeSnapshot
  -> RuntimeRefs
  -> [RuntimeCommand]
  -> LoopState
  -> IO LoopState
applyCommands publishEvent snapshotVar refs commands state0 =
  foldM step state0 commands
  where
    step state command = do
      publishEvent (RuntimeEventCommandReceived command)
      case command of
        RuntimeCommandConnect ->
          publishSnapshot snapshotVar publishEvent refs $
            setRuntimeState RuntimeConnecting "Connecting..." $
              state
                { loopControl = (loopControl state) { controlConnectWanted = True, controlDemoMode = False } }
        RuntimeCommandDisconnect -> do
          closeConnection (loopConnection state)
          publishSnapshot snapshotVar publishEvent refs $
            setRuntimeState RuntimeReady "Disconnected" $
              state
                { loopControl = (loopControl state) { controlConnectWanted = False }
                , loopConnection = ConnectionClosed
                }
        RuntimeCommandSetPreferredPort maybePort -> do
          closeConnection (loopConnection state)
          publishSnapshot snapshotVar publishEvent refs $
            setRuntimeState RuntimeReady "Preferred port updated" $
              state
                { loopControl = (loopControl state) { controlPreferredPort = maybePort }
                , loopConnection = ConnectionClosed
                }
        RuntimeCommandSetDemoMode enabled -> do
          closeConnection (loopConnection state)
          let nextStatus = if enabled then RuntimeDemo else RuntimeReady
              nextText = if enabled then "Demo mode enabled" else "Demo mode disabled"
          publishSnapshot snapshotVar publishEvent refs $
            setRuntimeState nextStatus nextText $
              state
                { loopControl =
                    (loopControl state)
                      { controlDemoMode = enabled
                      , controlConnectWanted = not enabled
                      }
                , loopConnection = ConnectionClosed
                }
        RuntimeCommandRefreshPorts ->
          pure state
        RuntimeCommandShutdown ->
          pure state
            { loopControl = (loopControl state) { controlShutdownRequested = True }
            }

publishPorts
  :: (RuntimeEvent -> IO ())
  -> TVar RuntimeSnapshot
  -> RuntimeRefs
  -> [FilePath]
  -> LoopState
  -> IO LoopState
publishPorts publishEvent snapshotVar refs availablePorts state
  | availablePorts == loopAvailablePorts state = pure state
  | otherwise = do
      publishEvent (RuntimeEventPortsChanged availablePorts)
      publishSnapshot snapshotVar publishEvent refs $
        state { loopAvailablePorts = availablePorts }

runDemoStep
  :: TVar RuntimeSnapshot
  -> (RuntimeEvent -> IO ())
  -> RuntimeRefs
  -> LoopState
  -> IO LoopState
runDemoStep snapshotVar publishEvent refs state = do
  let demoTick = loopDemoTick state + 1
      sliderValues =
        Map.fromList $
          zip
            [0 ..]
            [ SliderValue ((demoTick * 17) `mod` 1023)
            , SliderValue ((demoTick * 31 + 340) `mod` 1023)
            , SliderValue ((demoTick * 23 + 680) `mod` 1023)
            ]
      knobCount = length (configSliders (loopConfig state))
      normalizedSliderValues =
        Map.filterWithKey (\key _ -> key < knobCount) sliderValues
  modifyIORef' (runtimeCurrentValues refs) (const normalizedSliderValues)
  modifyIORef' (runtimeAppliedValues refs) (const normalizedSliderValues)
  modifyIORef' (runtimeOutcomes refs) $
    const $
      Map.fromList
        [ (0, "demo master updated")
        , (1, "demo application targets updated")
        , (2, "demo source updated")
        ]
  threadDelay 100000
  publishSnapshot snapshotVar publishEvent refs $
    setRuntimeState RuntimeDemo "Demo mode streaming synthetic readings" $
      state { loopDemoTick = demoTick, loopConnection = ConnectionClosed }

runHardwareStep
  :: TVar RuntimeSnapshot
  -> (RuntimeEvent -> IO ())
  -> RuntimeRefs
  -> LoopState
  -> IO LoopState
runHardwareStep snapshotVar publishEvent refs state
  | not (controlConnectWanted (loopControl state)) = do
      threadDelay idlePollDelayMicros
      publishSnapshot snapshotVar publishEvent refs $
        setRuntimeState RuntimeReady "Runtime ready. Waiting for connect command." $
          state { loopConnection = ConnectionClosed }
  | otherwise =
      case loopConnection state of
        ConnectionClosed ->
          connectStep snapshotVar publishEvent refs state
        ConnectionOpen serialPath serialHandle idleTicks ->
          readStep snapshotVar publishEvent refs state serialPath serialHandle idleTicks

connectStep
  :: TVar RuntimeSnapshot
  -> (RuntimeEvent -> IO ())
  -> RuntimeRefs
  -> LoopState
  -> IO LoopState
connectStep snapshotVar publishEvent refs state = do
  maybeSerialPath <- resolveAvailableSerialPath (loopConfig state) (loopControl state) (loopAvailablePorts state)
  case maybeSerialPath of
    Nothing -> do
      threadDelay retryDelayMicros
      publishSnapshot snapshotVar publishEvent refs $
        setRuntimeState RuntimeSearching "Searching for an Arduino Nano on /dev/ttyUSB* or /dev/ttyACM*..." state
    Just serialPath -> do
      let serialSettings =
            SerialConfig
              { serialConfigPath = serialPath
              , serialConfigBaud = serialBaudRate (configSerial (loopConfig state))
              }
      openResult <- openSerial serialSettings
      case openResult of
        Right serialHandle ->
          publishSnapshot snapshotVar publishEvent refs $
            setRuntimeState RuntimeConnecting "Connected. Waiting for serial packets..." $
              state { loopConnection = ConnectionOpen serialPath serialHandle 0 }
        Left openError -> do
          threadDelay retryDelayMicros
          publishSnapshot snapshotVar publishEvent refs $
            setRuntimeState RuntimeDisconnected (T.pack openError) state

readStep
  :: TVar RuntimeSnapshot
  -> (RuntimeEvent -> IO ())
  -> RuntimeRefs
  -> LoopState
  -> FilePath
  -> SerialPort
  -> Int
  -> IO LoopState
readStep snapshotVar publishEvent refs state serialPath serialHandle idleTicks = do
  readResult <- try (readLine serialHandle)
  case readResult of
    Left (err :: SomeException) -> do
      closeSerial serialHandle
      threadDelay retryDelayMicros
      publishSnapshot snapshotVar publishEvent refs $
        setRuntimeState RuntimeDisconnected (T.pack ("Serial read failed: " ++ show err)) $
          state { loopConnection = ConnectionClosed }
    Right Nothing
      | idleTicks + 1 >= idleThresholdTicks -> do
          closeSerial serialHandle
          threadDelay retryDelayMicros
          publishSnapshot snapshotVar publishEvent refs $
            setRuntimeState RuntimeDisconnected "No serial packets received for 3s. Reconnecting..." $
              state { loopConnection = ConnectionClosed }
      | otherwise -> do
          threadDelay idlePollDelayMicros
          publishSnapshot snapshotVar publishEvent refs $
            setRuntimeState RuntimeConnecting "Waiting for firmware heartbeat..." $
              state { loopConnection = ConnectionOpen serialPath serialHandle (idleTicks + 1) }
    Right (Just rawLine)
      | BS.all (`elem` ['\r', '\n', ' ']) rawLine -> do
          threadDelay idlePollDelayMicros
          pure state { loopConnection = ConnectionOpen serialPath serialHandle idleTicks }
      | otherwise ->
          case parseSliderEvent rawLine of
            Left parseError ->
              publishSnapshot snapshotVar publishEvent refs $
                setRuntimeState RuntimeConnected ("Packet parse error: " <> T.pack parseError <> " | raw: " <> T.pack (sanitizeLine rawLine)) $
                  state { loopConnection = ConnectionOpen serialPath serialHandle 0 }
            Right sliderEvent -> do
              updateCurrentValues (runtimeCurrentValues refs) sliderEvent
              currentValues <- readIORef (runtimeCurrentValues refs)
              (nextAppliedValues, nextOutcomes) <-
                applyConfiguredSliders (loopConfig state) (loopPulseContext state) currentValues refs
              publishComputedSnapshot
                snapshotVar
                publishEvent
                state
                  { loopConnection = ConnectionOpen serialPath serialHandle 0
                  }
                RuntimeConnected
                ("Receiving data | " <> T.pack (sanitizeLine rawLine))
                (Just serialPath)
                (Just (T.pack (sanitizeLine rawLine)))
                currentValues
                nextAppliedValues
                nextOutcomes

publishSnapshot
  :: TVar RuntimeSnapshot
  -> (RuntimeEvent -> IO ())
  -> RuntimeRefs
  -> LoopState
  -> IO LoopState
publishSnapshot snapshotVar publishEvent refs state = do
  currentValues <- readIORef (runtimeCurrentValues refs)
  appliedValues <- readIORef (runtimeAppliedValues refs)
  outcomes <- readIORef (runtimeOutcomes refs)
  publishComputedSnapshot
    snapshotVar
    publishEvent
    state
    (runtimeSnapshotStatus (loopSnapshot state))
    (runtimeSnapshotStatusText (loopSnapshot state))
    (runtimeSnapshotConnectionPort (loopSnapshot state))
    (runtimeDiagnosticsLastSerialLine (runtimeSnapshotDiagnostics (loopSnapshot state)))
    currentValues
    appliedValues
    outcomes

publishComputedSnapshot
  :: TVar RuntimeSnapshot
  -> (RuntimeEvent -> IO ())
  -> LoopState
  -> RuntimeStatus
  -> T.Text
  -> Maybe FilePath
  -> Maybe T.Text
  -> SliderMap
  -> SliderMap
  -> OutcomeMap
  -> IO LoopState
publishComputedSnapshot snapshotVar publishEvent state status statusText connectionPort lastSerialLine currentValues appliedValues outcomes = do
  let nextSnapshot =
        buildRuntimeSnapshot
          (loopConfig state)
          status
          statusText
          (loopAvailablePorts state)
          connectionPort
          lastSerialLine
          (controlDemoMode (loopControl state))
          currentValues
          appliedValues
          outcomes
      previousSnapshot = loopSnapshot state
      nextState = state { loopSnapshot = nextSnapshot }
  atomically $ writeTVar snapshotVar nextSnapshot
  if nextSnapshot /= previousSnapshot
    then do
      publishEvent (RuntimeEventSnapshotUpdated nextSnapshot)
      if runtimeSnapshotStatus previousSnapshot /= status || runtimeSnapshotStatusText previousSnapshot /= statusText
        then publishEvent (RuntimeEventStatusChanged status statusText)
        else pure ()
      pure nextState
    else pure nextState

setRuntimeState :: RuntimeStatus -> T.Text -> LoopState -> LoopState
setRuntimeState status statusText state =
  state
    { loopSnapshot =
        (loopSnapshot state)
          { runtimeSnapshotStatus = status
          , runtimeSnapshotStatusText = statusText
          , runtimeSnapshotConnectionPort = currentConnectionPort (loopConnection state)
          , runtimeSnapshotDemoMode = controlDemoMode (loopControl state)
          }
    }

currentConnectionPort :: ConnectionState -> Maybe FilePath
currentConnectionPort ConnectionClosed = Nothing
currentConnectionPort (ConnectionOpen serialPath _ _) = Just serialPath

closeConnection :: ConnectionState -> IO ()
closeConnection ConnectionClosed = pure ()
closeConnection (ConnectionOpen _ serialHandle _) = closeSerial serialHandle

resolveAvailableSerialPath :: Config -> ControlState -> [FilePath] -> IO (Maybe FilePath)
resolveAvailableSerialPath config controlState availablePorts =
  case preferredPort of
    Just portPath
      | portPath `elem` availablePorts -> pure (Just portPath)
    _ ->
      if configuredPath `elem` availablePorts
        then pure (Just configuredPath)
        else detectArduino
  where
    preferredPort = controlPreferredPort controlState
    configuredPath = serialPort (configSerial config)

data SliderEvent
  = FullSliderState SliderMap
  | SliderDelta Int SliderValue

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
  -> Maybe PulseContext
  -> SliderMap
  -> RuntimeRefs
  -> IO (SliderMap, OutcomeMap)
applyConfiguredSliders config maybePulseContext currentValues refs = do
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
            else applyTargets maybePulseContext sliderConfig filteredSliderValue

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

applyTargets :: Maybe PulseContext -> SliderConfig -> SliderValue -> IO T.Text
applyTargets maybePulseContext sliderConfig sliderValue = do
  let targetVolume = sliderToVolume sliderConfig sliderValue
  results <- mapM (applyTarget maybePulseContext targetVolume) (sliderTargets sliderConfig)
  pure $ T.pack (List.intercalate " | " results)

applyTarget :: Maybe PulseContext -> Volume -> AudioTarget -> IO String
applyTarget maybePulseContext targetVolume audioTarget =
  case (maybePulseContext, audioTarget) of
    (Nothing, _) ->
      pure "audio backend unavailable"
    (Just pulseContext, MasterTarget) -> do
      setMasterVolume pulseContext targetVolume
      pure "master updated"
    (Just _, ApplicationTarget appName) -> do
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
    (Just _, SourceTarget sourceNameText) -> do
      matches <- resolveSources sourceNameText
      mapM_ (`setSourceVolume` targetVolume) matches
      pure $
        if null matches
          then "source unavailable: " ++ T.unpack sourceNameText
          else "source updated: " ++ T.unpack sourceNameText
    (Just _, SinkTarget sinkNameText) -> do
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
  | isAsciiUpper rawChar = toLower rawChar
  | otherwise = rawChar

sliderToVolume :: SliderConfig -> SliderValue -> Volume
sliderToVolume sliderConfig sliderValue =
  case calculateVolume sliderValue of
    Volume normalized ->
      if fromMaybe False (sliderInverted sliderConfig)
        then Volume (1.0 - normalized)
        else Volume normalized

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
