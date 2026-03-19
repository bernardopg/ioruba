module Hardware.Serial
  ( SerialPort
  , openSerial
  , closeSerial
  , readSerial
  , readLine
  , SerialConfig(..)
  ) where

import Control.Exception (SomeException, catch, try)
import Data.ByteString (ByteString)
import qualified Data.ByteString as BS
import qualified Data.ByteString.Char8 as BS8
import System.IO
  ( BufferMode(NoBuffering)
  , Handle
  , IOMode(ReadWriteMode)
  , hClose
  , hSetBinaryMode
  , hSetBuffering
  , openBinaryFile
  )
import System.Process (callProcess)

newtype SerialPort = SerialPort Handle

data SerialConfig = SerialConfig
  { serialConfigPath :: FilePath
  , serialConfigBaud :: Int
  } deriving (Show, Eq)

openSerial :: SerialConfig -> IO (Either String SerialPort)
openSerial config = do
  result <- try $ do
    configurePortIfPossible config
    handle <- openBinaryFile (serialConfigPath config) ReadWriteMode
    hSetBuffering handle NoBuffering
    hSetBinaryMode handle True
    pure $ SerialPort handle
  case result of
    Left (e :: SomeException) ->
      pure $ Left $ "Failed to open serial port: " ++ show e
    Right serialPort ->
      pure $ Right serialPort

closeSerial :: SerialPort -> IO ()
closeSerial (SerialPort handle) = hClose handle

readSerial :: SerialPort -> IO ByteString
readSerial (SerialPort handle) = BS.hGetSome handle 1024

readLine :: SerialPort -> IO (Maybe ByteString)
readLine serial = do
  line <- readUntilNewline serial BS.empty
  if BS.null line
    then pure Nothing
    else pure $ Just $ BS8.takeWhile (/= '\n') line

readUntilNewline :: SerialPort -> ByteString -> IO ByteString
readUntilNewline serial acc = do
  chunk <- readSerial serial
  if BS.null chunk
    then pure acc
    else
      let combined = acc <> chunk
       in if BS8.elem '\n' combined
            then pure combined
            else readUntilNewline serial combined

configurePortIfPossible :: SerialConfig -> IO ()
configurePortIfPossible config =
  callProcess
    "stty"
    [ "-F"
    , serialConfigPath config
    , show (serialConfigBaud config)
    , "raw"
    , "-echo"
    , "min"
    , "0"
    , "time"
    , "1"
    ]
    `catch` ignoreConfigurationFailure
  where
    ignoreConfigurationFailure :: SomeException -> IO ()
    ignoreConfigurationFailure _ = pure ()
