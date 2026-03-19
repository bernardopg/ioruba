module Hardware.ProtocolSpec (spec) where

import Audio.Mixer (SliderValue(..))
import Hardware.Protocol (SliderState(..), parseSliderData)
import qualified Data.ByteString.Char8 as BS
import Test.Hspec

spec :: Spec
spec = describe "parseSliderData" $ do
  it "parses newline-terminated slider payloads" $ do
    parseSliderData (BS.pack "512|768|1023|0|256\n")
      `shouldBe` Right (SliderState [SliderValue 512, SliderValue 768, SliderValue 1023, SliderValue 0, SliderValue 256])

  it "ignores NUL noise emitted before valid slider payloads" $ do
    parseSliderData (BS.pack "\NUL\NUL1|815|697\n")
      `shouldBe` Right (SliderState [SliderValue 1, SliderValue 815, SliderValue 697])

  it "rejects out-of-range slider values" $ do
    parseSliderData (BS.pack "512|2048|0\n")
      `shouldBe` Left "Invalid slider value: 2048"
