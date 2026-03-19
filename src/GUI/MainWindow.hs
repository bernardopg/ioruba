module GUI.MainWindow
  ( MainWindow
  , SliderView(..)
  , createMainWindow
  , showWindow
  , hideWindow
  , renderWindow
  ) where

import Data.List (intercalate, isInfixOf)
import System.Console.ANSI
  ( Color(..)
  , ColorIntensity(..)
  , ConsoleLayer(Foreground)
  , ConsoleIntensity(BoldIntensity)
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

data SliderView = SliderView
  { sliderViewId :: Int
  , sliderViewName :: String
  , sliderViewPercent :: Int
  , sliderViewRawValue :: Int
  , sliderViewTargets :: [String]
  , sliderViewOutcome :: String
  } deriving (Show, Eq)

createMainWindow :: IO MainWindow
createMainWindow =
  pure $ MainWindow { windowTitle = "Ioruba Live Dashboard" }

showWindow :: MainWindow -> IO ()
showWindow _ = hideCursor

hideWindow :: MainWindow -> IO ()
hideWindow _ = showCursor

renderWindow :: MainWindow -> FilePath -> String -> [SliderView] -> IO ()
renderWindow window serialPort statusLine sliderViews = do
  clearScreen
  setCursorPosition 0 0
  renderHeader window serialPort statusLine
  mapM_ renderSliderView sliderViews
  renderFooter

renderHeader :: MainWindow -> FilePath -> String -> IO ()
renderHeader window serialPort statusLine = do
  setSGR [SetColor Foreground Vivid Cyan]
  putStrLn "IORUBA"
  setSGR [SetColor Foreground Dull White]
  putStrLn $ windowTitle window
  putStrLn "=============================================================="
  renderStatusPill statusLine
  setSGR [SetColor Foreground Dull White]
  putStrLn $ "Serial  : " ++ serialPort
  putStrLn $ "Status  : " ++ statusLine
  putStrLn ""

renderStatusPill :: String -> IO ()
renderStatusPill statusLine = do
  setSGR [SetColor Foreground Vivid statusColor, SetConsoleIntensity BoldIntensity]
  putStrLn $ "[ " ++ statusLabel ++ " ]"
  setSGR [Reset]
  where
    statusLabel
      | hasWord ["receiving", "updated", "ready", "connected"] = "ONLINE"
      | hasWord ["reconnect", "waiting", "searching", "idle"] = "SYNCING"
      | otherwise = "ATTENTION"

    statusColor
      | hasWord ["receiving", "updated", "ready", "connected"] = Green
      | hasWord ["reconnect", "waiting", "searching", "idle"] = Yellow
      | otherwise = Red

    hasWord needles = any (`isInfixOf` loweredStatus) needles
    loweredStatus = map toLowerAscii statusLine

renderSliderView :: SliderView -> IO ()
renderSliderView sliderView = do
  putStrLn $ "Knob " ++ show (sliderViewId sliderView + 1) ++ "  " ++ sliderViewName sliderView
  putStrLn $ "  Dial    : " ++ renderDial (sliderViewPercent sliderView)
  putStrLn $ "  Volume  : " ++ padLeft 3 (show (sliderViewPercent sliderView)) ++ "%"
  putStrLn $ "  Raw     : " ++ padLeft 4 (show (sliderViewRawValue sliderView))
  putStrLn $ "  Meter   : " ++ renderBar (sliderViewPercent sliderView)
  putStrLn $ "  Targets : " ++ intercalate ", " (sliderViewTargets sliderView)
  putStrLn $ "  Result  : " ++ sliderViewOutcome sliderView
  putStrLn "--------------------------------------------------------------"
  putStrLn ""

renderFooter :: IO ()
renderFooter = do
  setSGR [SetColor Foreground Dull Black]
  putStrLn "Ctrl+C to exit. Configuration is driven by config/ioruba.yaml."
  setSGR [Reset]

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
padLeft size rawValue = replicate (max 0 (size - length rawValue)) ' ' ++ rawValue

toLowerAscii :: Char -> Char
toLowerAscii rawChar
  | rawChar >= 'A' && rawChar <= 'Z' =
      toEnum (fromEnum rawChar + 32)
  | otherwise = rawChar
