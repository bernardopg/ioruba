{-# LANGUAGE OverloadedStrings #-}

module App.I18nSpec (spec) where

import App.I18n
  ( Message(..)
  , UiLanguage(..)
  , parseUiLanguageCode
  , translate
  )
import Test.Hspec

spec :: Spec
spec = describe "App.I18n" $ do
  it "parses en and pt-BR aliases" $ do
    parseUiLanguageCode "en" `shouldBe` Just UiLanguageEn
    parseUiLanguageCode "pt-BR" `shouldBe` Just UiLanguagePtBR
    parseUiLanguageCode "pt_br" `shouldBe` Just UiLanguagePtBR

  it "falls back to english strings when explicitly requested" $ do
    translate UiLanguageEn MsgStatusAttention `shouldBe` "ATTENTION"

  it "returns portuguese translations" $ do
    translate UiLanguagePtBR MsgLabelTargets `shouldBe` "Alvos"
