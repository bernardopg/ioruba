module Hardware.Serial
  ( SerialPort
  , openSerial
  , closeSerial
  , readSerial
  , readLine
  , SerialConfig(..)
  ) where

import Control.Exception (try, SomeException)
import Data.ByteString (ByteString)
import qualified Data.ByteString as BS
import qualified Data.ByteString.Char8 as BS8
import qualified System.Hardware.Serialport as SP
import System.Hardware.Serialport (CommSpeed(..), SerialPortSettings(..), defaultSerialSettings)

-- | Serial port handle (wraps serialport library handle)
newtype SerialPort = SerialPort
  { unwrapSerialPort :: SP.SerialPort
  }

-- | Serial port configuration
data SerialConfig = SerialConfig
  { serialConfigPath :: FilePath
  , serialConfigBaud :: Int
  } deriving (Show, Eq)

-- | Convert our baud rate to serialport library baud rate
toBaudRate :: Int -> CommSpeed
toBaudRate 9600   = CS9600
toBaudRate 19200  = CS19200
toBaudRate 38400  = CS38400
toBaudRate 57600  = CS57600
toBaudRate 115200 = CS115200
toBaudRate _      = CS9600  -- Default fallback

-- | Open serial port with configuration
openSerial :: SerialConfig -> IO (Either String SerialPort)
openSerial config = do
  result <- try $ SP.openSerial (serialConfigPath config) defaultSerialSettings
    { commSpeed = toBaudRate (serialConfigBaud config)
    , timeout = 10  -- 100ms timeout
    }
  case result of
    Left (e :: SomeException) ->
      return $ Left $ "Failed to open serial port: " ++ show e
    Right port ->
      return $ Right $ SerialPort port

-- | Close serial port
closeSerial :: SerialPort -> IO ()
closeSerial (SerialPort port) = SP.closeSerial port

-- | Read raw bytes from serial port
readSerial :: SerialPort -> IO ByteString
readSerial (SerialPort port) = SP.recv port 1024

-- | Read a line from serial port (until newline)
readLine :: SerialPort -> IO (Maybe ByteString)
readLine serial = do
  line <- readUntilNewline serial BS.empty
  if BS.null line
    then return Nothing
    else return $ Just $ BS8.takeWhile (/= '\n') line

-- | Helper: read until newline character
readUntilNewline :: SerialPort -> ByteString -> IO ByteString
readUntilNewline serial acc = do
  chunk <- readSerial serial
  if BS.null chunk
    then return acc
    else
      let combined = acc <> chunk
      in if BS8.elem '\n' combined
         then return combined
         else readUntilNewline serial combined
