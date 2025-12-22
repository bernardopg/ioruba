module Utils.Error
  ( AppError(..)
  , AudioError(..)
  , ConfigError(..)
  , HardwareError(..)
  ) where

import Data.Text (Text)

-- | Application-wide error type
data AppError
  = AppAudioError AudioError
  | AppConfigError ConfigError
  | AppHardwareError HardwareError
  deriving (Show, Eq)

-- | Audio system errors
data AudioError
  = PulseAudioConnectionFailed Text
  | SinkNotFound Text
  | SourceNotFound Text
  | VolumeOutOfRange Double
  deriving (Show, Eq)

-- | Configuration errors
data ConfigError
  = ConfigFileNotFound FilePath
  | ConfigParseFailed Text
  | ConfigValidationFailed [Text]
  deriving (Show, Eq)

-- | Hardware communication errors
data HardwareError
  = SerialPortNotFound FilePath
  | SerialOpenFailed Text
  | SerialReadFailed Text
  | ProtocolParseFailed Text
  deriving (Show, Eq)
