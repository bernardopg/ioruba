module Audio.MixerSpec (spec) where

import Audio.Mixer
import Audio.Sink (Volume (..))
import Config.Types (NoiseReduction (..))
import Test.Hspec
import Test.QuickCheck

finiteDouble :: Gen Double
finiteDouble = arbitrary `suchThat` (\x -> not (isNaN x) && not (isInfinite x))

spec :: Spec
spec = describe "Audio.Mixer" $ do
  describe "calculateVolume" $ do
    it "returns 0.0 for slider value 0" $
      calculateVolume (SliderValue 0) `shouldBe` Volume 0.0

    it "returns 1.0 for slider value 1023" $
      calculateVolume (SliderValue 1023) `shouldBe` Volume 1.0

    it "returns approximately 0.5 for slider value 512" $ do
      let Volume vol = calculateVolume (SliderValue 512)
      vol `shouldSatisfy` (\v -> v > 0.49 && v < 0.51)

    it "always returns volume between 0.0 and 1.0 for valid slider values" $
      property $ \(NonNegative n) -> do
        let sv = SliderValue (n `mod` 1024)
            Volume vol = calculateVolume sv
        vol `shouldSatisfy` (>= 0.0)
        vol `shouldSatisfy` (<= 1.0)

    it "is monotonically increasing" $
      property $ \(NonNegative a) (NonNegative b) -> do
        let sa = SliderValue (a `mod` 1024)
            sb = SliderValue (b `mod` 1024)
            Volume va = calculateVolume sa
            Volume vb = calculateVolume sb
        if a `mod` 1024 <= b `mod` 1024
          then va `shouldSatisfy` (<= vb)
          else vb `shouldSatisfy` (<= va)

  describe "applyNoiseReduction" $ do
    it "filters small changes with default noise reduction" $ do
      let old = SliderValue 500
          new = SliderValue 505
      applyNoiseReduction NoiseReductionDefault old new `shouldBe` old

    it "allows large changes with default noise reduction" $ do
      let old = SliderValue 500
          new = SliderValue 520
      applyNoiseReduction NoiseReductionDefault old new `shouldBe` new

    it "is more sensitive with low noise reduction" $ do
      let old = SliderValue 500
          new = SliderValue 507
      applyNoiseReduction NoiseReductionLow old new `shouldBe` new

    it "filters more aggressively with high noise reduction" $ do
      let old = SliderValue 500
          new = SliderValue 515
      applyNoiseReduction NoiseReductionHigh old new `shouldBe` old

    it "allows changes above high threshold" $ do
      let old = SliderValue 500
          new = SliderValue 525
      applyNoiseReduction NoiseReductionHigh old new `shouldBe` new

    it "returns old value when change equals threshold exactly (default)" $ do
      let old = SliderValue 500
          new = SliderValue 510
      applyNoiseReduction NoiseReductionDefault old new `shouldBe` old

  describe "smoothTransition" $ do
    it "returns start volume at progress 0.0" $ do
      let start = Volume 0.2
          end = Volume 0.8
      smoothTransition start end 0.0 `shouldBe` start

    it "returns end volume at progress 1.0" $ do
      let start = Volume 0.2
          end = Volume 0.8
      smoothTransition start end 1.0 `shouldBe` end

    it "returns midpoint at progress 0.5" $ do
      let start = Volume 0.0
          end = Volume 1.0
          Volume mid = smoothTransition start end 0.5
      mid `shouldSatisfy` (\v -> abs (v - 0.5) < 0.001)

    it "clamps progress below 0.0" $ do
      let start = Volume 0.2
          end = Volume 0.8
      smoothTransition start end (-0.5) `shouldBe` start

    it "clamps progress above 1.0" $ do
      let start = Volume 0.2
          end = Volume 0.8
      smoothTransition start end 1.5 `shouldBe` end

    it "produces values between start and end for any valid progress" $
      property $
        forAll finiteDouble $ \start' ->
          forAll finiteDouble $ \end' ->
            forAll finiteDouble $ \progress ->
              let s = abs start'
                  e = abs end'
                  p = abs progress
                  lower = min s e
                  upper = max s e
                  epsilon = 1.0e-12 * max 1.0 upper
                  Volume result =
                    smoothTransition (Volume lower) (Volume upper) p
               in result >= lower - epsilon && result <= upper + epsilon
