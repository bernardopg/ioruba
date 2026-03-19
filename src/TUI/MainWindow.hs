module TUI.MainWindow
  ( MainWindow
  , createMainWindow
  , hideWindow
  , renderWindow
  , showWindow
  ) where

import App.I18n
  ( Message(..)
  , UiLanguage
  , translateString
  )
import App.ConsoleControls (consoleControlHint)
import App.Runtime.State
  ( RuntimeKnobSnapshot(..)
  , RuntimeSnapshot(..)
  , RuntimeStatus(..)
  )
import Data.List (intercalate)
import qualified Data.Text as T
import System.Console.ANSI
  ( Color(..)
  , ColorIntensity(..)
  , ConsoleIntensity(BoldIntensity)
  , ConsoleLayer(Foreground)
  , SGR(..)
  , clearScreen
  , hideCursor
  , setCursorPosition
  , setSGR
  , showCursor
  )

newtype MainWindow = MainWindow
  { windowTitle :: String
  } deriving (Show)

createMainWindow :: IO MainWindow
createMainWindow =
  pure $ MainWindow { windowTitle = "Ioruba Runtime Dashboard" }

showWindow :: MainWindow -> IO ()
showWindow _ = hideCursor

hideWindow :: MainWindow -> IO ()
hideWindow _ = showCursor

renderWindow :: MainWindow -> UiLanguage -> RuntimeSnapshot -> IO ()
renderWindow window language snapshot = do
  clearScreen
  setCursorPosition 0 0
  renderHeader window language snapshot
  mapM_ (renderKnobSnapshot language) (runtimeSnapshotKnobs snapshot)
  renderFooter language

renderHeader :: MainWindow -> UiLanguage -> RuntimeSnapshot -> IO ()
renderHeader window language snapshot = do
  setSGR [SetColor Foreground Vivid Cyan]
  putStrLn $ translateString language MsgAppTitle
  setSGR [SetColor Foreground Dull White]
  putStrLn $ windowTitle window
  putStrLn "=============================================================="
  renderStatusPill language (runtimeSnapshotStatus snapshot)
  setSGR [SetColor Foreground Dull White]
  putStrLn $
    padLabel (translateString language MsgLabelSerial)
      ++ maybe "searching" id (runtimeSnapshotConnectionPort snapshot)
  putStrLn $
    padLabel (translateString language MsgLabelStatus)
      ++ T.unpack (runtimeSnapshotStatusText snapshot)
  putStrLn $
    padLabel (translateString language MsgLabelPorts)
      ++ renderPorts language snapshot
  putStrLn ""

renderStatusPill :: UiLanguage -> RuntimeStatus -> IO ()
renderStatusPill language runtimeStatus = do
  setSGR [SetColor Foreground Vivid statusColor, SetConsoleIntensity BoldIntensity]
  putStrLn $ "[ " ++ statusLabel ++ " ]"
  setSGR [Reset]
  where
    (statusLabel, statusColor) =
      case runtimeStatus of
        RuntimeConnected -> (translateString language MsgStatusOnline, Green)
        RuntimeDemo -> (translateString language MsgStatusOnline, Green)
        RuntimeBooting -> (translateString language MsgStatusSyncing, Yellow)
        RuntimeReady -> (translateString language MsgStatusSyncing, Yellow)
        RuntimeSearching -> (translateString language MsgStatusSyncing, Yellow)
        RuntimeConnecting -> (translateString language MsgStatusSyncing, Yellow)
        RuntimeDisconnected -> (translateString language MsgStatusAttention, Red)
        RuntimeError -> (translateString language MsgStatusAttention, Red)

renderKnobSnapshot :: UiLanguage -> RuntimeKnobSnapshot -> IO ()
renderKnobSnapshot language knobSnapshot = do
  putStrLn $ "Knob " ++ show (runtimeKnobId knobSnapshot + 1) ++ "  " ++ T.unpack (runtimeKnobName knobSnapshot)
  putStrLn $ "  Dial    : " ++ renderDial (runtimeKnobPercent knobSnapshot)
  putStrLn $
    "  " ++ padKey (translateString language MsgLabelVolume)
      ++ padLeft 3 (show (runtimeKnobPercent knobSnapshot))
      ++ "%"
  putStrLn $
    "  " ++ padKey (translateString language MsgLabelRaw)
      ++ padLeft 4 (show (runtimeKnobRawValue knobSnapshot))
  putStrLn $ "  Meter   : " ++ renderBar (runtimeKnobPercent knobSnapshot)
  putStrLn $
    "  " ++ padKey (translateString language MsgLabelTargets)
      ++ intercalate ", " (map T.unpack (runtimeKnobTargets knobSnapshot))
  putStrLn $
    "  " ++ padKey (translateString language MsgLabelOutcome)
      ++ T.unpack (runtimeKnobOutcome knobSnapshot)
  putStrLn "--------------------------------------------------------------"
  putStrLn ""

renderFooter :: UiLanguage -> IO ()
renderFooter language = do
  setSGR [SetColor Foreground Dull Black]
  putStrLn consoleControlHint
  putStrLn $ translateString language MsgFooterHint
  setSGR [Reset]

renderPorts :: UiLanguage -> RuntimeSnapshot -> String
renderPorts language snapshot =
  case runtimeSnapshotAvailablePorts snapshot of
    [] -> translateString language MsgNoPortsDetected
    ports -> intercalate ", " ports

padLabel :: String -> String
padLabel label = label ++ replicate (max 0 (8 - length label)) ' ' ++ ": "

padKey :: String -> String
padKey key = key ++ replicate (max 0 (8 - length key)) ' ' ++ ": "

renderBar :: Int -> String
renderBar percent =
  "[" ++ replicate filled '=' ++ replicate (20 - filled) '.' ++ "]"
  where
    filled = max 0 $ min 20 (percent `div` 5)

renderDial :: Int -> String
renderDial percent =
  dialFrame ++ " " ++ renderNeedle percent
  where
    dialFrame = "(" ++ padLeft 3 (show percent) ++ "%)"

renderNeedle :: Int -> String
renderNeedle percent
  | percent < 17 = "<--------"
  | percent < 34 = "<<------"
  | percent < 50 = "<<<----"
  | percent < 67 = "--^----"
  | percent < 84 = "---->>>"
  | otherwise = "------>>"

padLeft :: Int -> String -> String
padLeft size rawValue =
  replicate (max 0 (size - length rawValue)) ' ' ++ rawValue
