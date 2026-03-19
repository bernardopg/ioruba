{-# LANGUAGE OverloadedStrings #-}

module App.SettingsSpec (spec) where

import App.I18n (UiLanguage(..))
import App.Settings (UiSettings(..), defaultUiSettings)
import Data.Aeson (eitherDecode, encode)
import Test.Hspec

spec :: Spec
spec = describe "UiSettings JSON" $ do
  it "roundtrips persisted settings" $ do
    let settings =
          defaultUiSettings
            { uiSettingsLanguage = UiLanguageEn
            , uiSettingsWindowWidth = 1280
            , uiSettingsWindowHeight = 720
            , uiSettingsPreferredPort = Just "/dev/ttyUSB9"
            , uiSettingsAutoConnect = False
            , uiSettingsDemoMode = True
            }
    eitherDecode (encode settings) `shouldBe` Right settings

  it "accepts missing optional fields with defaults" $ do
    eitherDecode "{\"language\":\"pt-BR\"}" `shouldBe`
      Right
        defaultUiSettings
          { uiSettingsLanguage = UiLanguagePtBR
          }
