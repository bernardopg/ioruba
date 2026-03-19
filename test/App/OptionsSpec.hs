module App.OptionsSpec (spec) where

import App.I18n (UiLanguage(..))
import App.Options
  ( AppCliOptions(..)
  , defaultAppCliOptions
  , parseAppCliOptions
  )
import Test.Hspec

spec :: Spec
spec = describe "App.Options" $ do
  it "parses gui-friendly flags" $ do
    parseAppCliOptions ["--demo", "--lang", "pt-BR", "--config", "config/custom.yaml", "--screenshot", "out.txt"]
      `shouldBe`
        Right
          defaultAppCliOptions
            { cliConfigPath = Just "config/custom.yaml"
            , cliDemoMode = True
            , cliLanguageOverride = Just UiLanguagePtBR
            , cliScreenshotPath = Just "out.txt"
            }

  it "rejects unknown languages" $ do
    parseAppCliOptions ["--lang", "de"]
      `shouldBe`
        Left "Unknown language code: de"

  it "rejects missing flag values" $ do
    parseAppCliOptions ["--config"] `shouldBe` Left "Missing value for --config"
