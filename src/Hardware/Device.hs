module Hardware.Device
  ( detectArduino
  , listSerialPorts
  ) where

import System.Directory (listDirectory, doesFileExist)
import Control.Monad (filterM)

-- | Detect Arduino device on serial ports
detectArduino :: IO (Maybe FilePath)
detectArduino = do
  ports <- listSerialPorts
  -- TODO: Implement actual Arduino detection by attempting connection
  case ports of
    (p:_) -> return $ Just p
    [] -> return Nothing

-- | List all available serial ports
listSerialPorts :: IO [FilePath]
listSerialPorts = do
  let devPath = "/dev"
  allDevices <- listDirectory devPath
  let serialDevices = filter isSerialDevice allDevices
  filterM (doesFileExist . (devPath <>)) serialDevices
  where
    isSerialDevice name =
      "ttyUSB" `elem` words name ||
      "ttyACM" `elem` words name ||
      "ttyS" `elem` words name
    (</>) = (++)
