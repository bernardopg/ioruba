module Hardware.Device
  ( detectArduino
  , listSerialPorts
  ) where

import Data.List (isPrefixOf, sort)
import Data.Maybe (listToMaybe)
import System.Directory (doesPathExist, listDirectory)
import System.FilePath ((</>))
import Control.Monad (filterM)

-- | Detect Arduino device on serial ports
detectArduino :: IO (Maybe FilePath)
detectArduino = do
  ports <- listSerialPorts
  pure $ listToMaybe (preferredPorts ports ++ ports)
  where
    preferredPorts = filter isPreferredArduinoPort
    isPreferredArduinoPort path =
      any (`isPrefixOf` path)
        [ "/dev/ttyUSB"
        , "/dev/ttyACM"
        ]

-- | List all available serial ports
listSerialPorts :: IO [FilePath]
listSerialPorts = do
  let devPath = "/dev"
  allDevices <- listDirectory devPath
  let serialDevices = filter isSerialDevice allDevices
  sort <$> filterM doesPathExist (map (devPath </>) serialDevices)
  where
    isSerialDevice name =
      any (`isPrefixOf` name)
        [ "ttyUSB"
        , "ttyACM"
        , "ttyS"
        ]
