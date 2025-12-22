module Main where

import Control.Monad (forever, when)
import Control.Concurrent (threadDelay)
import qualified Data.ByteString.Char8 as BS
import Hardware.Serial
import Hardware.Protocol
import System.Environment (getArgs)
import System.Exit (exitFailure)

main :: IO ()
main = do
  args <- getArgs
  let port = case args of
        (p:_) -> p
        []    -> "/dev/ttyUSB0"

  putStrLn $ "🔌 Connecting to Arduino on " ++ port ++ " at 9600 baud..."

  let config = SerialConfig
        { serialConfigPath = port
        , serialConfigBaud = 9600
        }

  result <- openSerial config
  case result of
    Left err -> do
      putStrLn $ "❌ Error: " ++ err
      putStrLn "\n💡 Tips:"
      putStrLn "  - Check if Arduino is connected"
      putStrLn "  - Try: ls /dev/ttyUSB* /dev/ttyACM*"
      putStrLn "  - Ensure you're in 'dialout' group: sudo usermod -a -G dialout $USER"
      exitFailure

    Right serial -> do
      putStrLn "✅ Connected!"
      putStrLn "📊 Reading slider values... (Ctrl+C to exit)\n"

      -- Read and display slider values
      forever $ do
        maybeLine <- readLine serial
        case maybeLine of
          Nothing -> threadDelay 10000  -- 10ms delay if no data
          Just line -> do
            case parseSliderData line of
              Left err ->
                putStrLn $ "⚠️  Parse error: " ++ err ++ " (raw: " ++ show line ++ ")"
              Right (SliderState values) -> do
                putStrLn $ "🎚️  Sliders: " ++ formatSliders values
                putStrLn $ "   Volumes: " ++ formatVolumes values
                putStrLn ""

-- | Format slider values for display
formatSliders :: [SliderValue] -> String
formatSliders values = unwords $ zipWith formatSlider [0..] values
  where
    formatSlider i (SliderValue v) =
      "[" ++ show i ++ ":" ++ padLeft 4 (show v) ++ "]"
    padLeft n s = replicate (n - length s) ' ' ++ s

-- | Format as volume percentages
formatVolumes :: [SliderValue] -> String
formatVolumes values = unwords $ zipWith formatVolume [0..] values
  where
    formatVolume i (SliderValue v) =
      "[" ++ show i ++ ":" ++ padLeft 3 (show percent) ++ "%]"
      where
        percent = (v * 100) `div` 1023
    padLeft n s = replicate (n - length s) ' ' ++ s
