module Main (main) where

import Control.Exception (IOException, try)
import Control.Monad (forever)
import Control.Concurrent (threadDelay)
import qualified Data.ByteString.Char8 as BS
import Hardware.Serial
import Hardware.Protocol
import System.Environment (getArgs)
import System.Exit (exitFailure, exitSuccess)
import System.IO (Handle, IOMode(ReadMode), stdin, withBinaryFile)
import System.IO.Error (isEOFError)
import System.Posix.Files
  ( FileStatus
  , getFileStatus
  , isCharacterDevice
  )

data InputMode
  = SerialInput FilePath
  | HandleInput String Handle
  | HandlePath FilePath

main :: IO ()
main = do
  args <- getArgs
  let target = case args of
        (p:_) -> p
        []    -> "/dev/ttyUSB0"

  inputMode <- resolveInputMode target

  case inputMode of
    SerialInput port -> runSerialMonitor port
    HandleInput label handle -> runHandleMonitor label handle
    HandlePath path -> withBinaryFile path ReadMode $ \handle ->
      runHandleMonitor path handle

resolveInputMode :: FilePath -> IO InputMode
resolveInputMode "-" = pure $ HandleInput "stdin" stdin
resolveInputMode "/dev/stdin" = pure $ HandleInput "stdin" stdin
resolveInputMode path = do
  statusResult <- try $ getFileStatus path :: IO (Either IOException FileStatus)
  case statusResult of
    Right status | not (isCharacterDevice status) ->
      pure $ HandlePath path
    _ ->
      pure $ SerialInput path

runSerialMonitor :: FilePath -> IO ()
runSerialMonitor port = do
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
      printConnectedBanner
      forever $ do
        maybeLine <- readLine serial
        case maybeLine of
          Nothing -> threadDelay 10000  -- 10ms delay if no data
          Just line -> processLine line

runHandleMonitor :: String -> Handle -> IO ()
runHandleMonitor label handle = do
  putStrLn $ "📥 Reading slider values from " ++ label ++ "..."
  printConnectedBanner
  loop
  where
    loop = do
      maybeLine <- readHandleLine handle
      case maybeLine of
        Nothing -> do
          putStrLn "ℹ️  End of input."
          exitSuccess
        Just line -> do
          processLine line
          loop

printConnectedBanner :: IO ()
printConnectedBanner = do
  putStrLn "✅ Connected!"
  putStrLn "📊 Reading slider values... (Ctrl+C to exit)\n"

readHandleLine :: Handle -> IO (Maybe BS.ByteString)
readHandleLine handle = do
  result <- try $ BS.hGetLine handle
  case result of
    Right line -> pure $ Just line
    Left err
      | isEOFError err -> pure Nothing
      | otherwise -> ioError err

processLine :: BS.ByteString -> IO ()
processLine line =
  case parseSliderData line of
    Left err ->
      putStrLn $ "⚠️  Parse error: " ++ err ++ " (raw: " ++ show line ++ ")"
    Right (SliderState values) -> do
      putStrLn $ "🎚️  Sliders: " ++ formatSliders values
      putStrLn $ "   Volumes: " ++ formatVolumes values
      putStrLn ""

-- | Format slider values for display
formatSliders :: [SliderValue] -> String
formatSliders values = unwords $ zipWith formatSlider ([0 :: Int ..]) values
  where
    formatSlider i (SliderValue v) =
      "[" ++ show i ++ ":" ++ padLeft 4 (show v) ++ "]"
    padLeft n s = replicate (n - length s) ' ' ++ s

-- | Format as volume percentages
formatVolumes :: [SliderValue] -> String
formatVolumes values = unwords $ zipWith formatVolume ([0 :: Int ..]) values
  where
    formatVolume i (SliderValue v) =
      "[" ++ show i ++ ":" ++ padLeft 3 (show percent) ++ "%]"
      where
        percent = (v * 100) `div` 1023
    padLeft n s = replicate (n - length s) ' ' ++ s
