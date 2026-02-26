module Hardware.ProtocolSpec (spec) where

import Audio.Mixer (SliderValue (..))
import Hardware.Protocol
import Test.Hspec
import Test.QuickCheck

spec :: Spec
spec = describe "Hardware.Protocol" $ do
  describe "parseSliderData" $ do
    it "parses a single slider value" $ do
      let result = parseSliderData "512"
      result `shouldBe` Right (SliderState [SliderValue 512])

    it "parses multiple pipe-separated values" $ do
      let result = parseSliderData "0|512|1023"
      result
        `shouldBe` Right
          (SliderState [SliderValue 0, SliderValue 512, SliderValue 1023])

    it "parses five slider values" $ do
      let result = parseSliderData "0|256|512|768|1023"
      result
        `shouldBe` Right
          ( SliderState
              [ SliderValue 0,
                SliderValue 256,
                SliderValue 512,
                SliderValue 768,
                SliderValue 1023
              ]
          )

    it "rejects values above 1023" $ do
      let result = parseSliderData "1024"
      result `shouldSatisfy` isLeft

    it "rejects negative values" $ do
      let result = parseSliderData "-1"
      result `shouldSatisfy` isLeft

    it "rejects non-numeric input" $ do
      let result = parseSliderData "abc"
      result `shouldSatisfy` isLeft

    it "rejects empty input" $ do
      let result = parseSliderData ""
      result `shouldSatisfy` isLeft

    it "handles values with whitespace" $ do
      let result = parseSliderData " 512 "
      result `shouldBe` Right (SliderState [SliderValue 512])

    it "accepts boundary value 0" $ do
      let result = parseSliderData "0"
      result `shouldBe` Right (SliderState [SliderValue 0])

    it "accepts boundary value 1023" $ do
      let result = parseSliderData "1023"
      result `shouldBe` Right (SliderState [SliderValue 1023])

  describe "encodeSliderData" $ do
    it "encodes a single value" $ do
      let state = SliderState [SliderValue 512]
      encodeSliderData state `shouldBe` "512"

    it "encodes multiple values with pipe separator" $ do
      let state = SliderState [SliderValue 0, SliderValue 512, SliderValue 1023]
      encodeSliderData state `shouldBe` "0|512|1023"

    it "encodes empty state" $ do
      let state = SliderState []
      encodeSliderData state `shouldBe` ""

  describe "roundtrip" $ do
    it "parse . encode == identity for valid values" $
      property $ \values -> do
        let validValues =
              map (\(NonNegative n) -> SliderValue (n `mod` 1024)) values
            state = SliderState validValues
        case validValues of
          [] -> pure () -- empty case is edge case
          _ -> parseSliderData (encodeSliderData state) `shouldBe` Right state

isLeft :: Either a b -> Bool
isLeft (Left _) = True
isLeft _ = False
