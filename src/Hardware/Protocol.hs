module Hardware.Protocol
  ( SliderState(..)
  , SliderValue(..)
  , sanitizeSerialPayload
  , parseSliderData
  , encodeSliderData
  ) where

import Audio.Mixer (SliderValue(..))
import Data.ByteString (ByteString)
import qualified Data.ByteString as BS
import qualified Data.ByteString.Char8 as BS8
import Data.Char (isSpace)
import Data.Text (Text)
import qualified Data.Text as T
import qualified Data.Text.Encoding as TE

-- | State of all sliders
newtype SliderState = SliderState { unSliderState :: [SliderValue] }
  deriving (Show, Eq)

-- | Remove common boot/reset noise emitted by serial devices before parsing.
sanitizeSerialPayload :: ByteString -> ByteString
sanitizeSerialPayload =
  BS8.dropWhileEnd isSpace
    . BS8.dropWhile isSpace
    . BS.filter (/= 0)

-- | Parse slider data from Arduino
-- Format: "0|512|1023|768|256\n"
parseSliderData :: ByteString -> Either String SliderState
parseSliderData bytes =
  case T.splitOn "|" (TE.decodeUtf8 $ sanitizeSerialPayload bytes) of
    [] -> Left "Empty slider data"
    values -> do
      sliderVals <- traverse parseValue $ filter (not . T.null) values
      return $ SliderState sliderVals
  where
    parseValue :: Text -> Either String SliderValue
    parseValue t =
      case reads (T.unpack $ T.strip t) of
        [(val, "")] | val >= 0 && val <= 1023 -> Right $ SliderValue val
        _ -> Left $ "Invalid slider value: " ++ T.unpack t

-- | Encode slider data to send to Arduino (for testing/calibration)
encodeSliderData :: SliderState -> ByteString
encodeSliderData (SliderState values) =
  TE.encodeUtf8 $ T.intercalate "|" $ map (T.pack . show . unSliderValue) values
