module App.Options
  ( AppCliOptions(..)
  , defaultAppCliOptions
  , parseAppCliOptions
  , renderUsage
  ) where

import App.I18n
  ( Message(..)
  , UiLanguage(..)
  , parseUiLanguageCode
  , translateString
  )

data AppCliOptions = AppCliOptions
  { cliConfigPath :: Maybe FilePath
  , cliDemoMode :: Bool
  , cliLanguageOverride :: Maybe UiLanguage
  , cliScreenshotPath :: Maybe FilePath
  , cliShowHelp :: Bool
  } deriving (Show, Eq)

defaultAppCliOptions :: AppCliOptions
defaultAppCliOptions =
  AppCliOptions
    { cliConfigPath = Nothing
    , cliDemoMode = False
    , cliLanguageOverride = Nothing
    , cliScreenshotPath = Nothing
    , cliShowHelp = False
    }

parseAppCliOptions :: [String] -> Either String AppCliOptions
parseAppCliOptions = go defaultAppCliOptions
  where
    go options [] = Right options
    go options ("--help":remaining) = go options { cliShowHelp = True } remaining
    go options ("-h":remaining) = go options { cliShowHelp = True } remaining
    go options ("--demo":remaining) = go options { cliDemoMode = True } remaining
    go options ("--config":path:remaining) =
      go options { cliConfigPath = Just path } remaining
    go options ("--lang":rawLanguage:remaining) =
      case parseUiLanguageCode rawLanguage of
        Just language ->
          go options { cliLanguageOverride = Just language } remaining
        Nothing ->
          Left $ "Unknown language code: " ++ rawLanguage
    go options ("--screenshot":path:remaining) =
      go options { cliScreenshotPath = Just path } remaining
    go _ ("--config":[]) = Left "Missing value for --config"
    go _ ("--lang":[]) = Left "Missing value for --lang"
    go _ ("--screenshot":[]) = Left "Missing value for --screenshot"
    go _ (unknownArg:_) = Left $ "Unknown argument: " ++ unknownArg

renderUsage :: String -> UiLanguage -> String
renderUsage programName language =
  unlines
    [ translateString language MsgAppTitle
    , translateString language MsgAppSubtitle
    , translateString language (MsgUsage programName)
    , ""
    , "Options:"
    , "  " ++ translateString language MsgHelpConfig
    , "  " ++ translateString language MsgHelpDemo
    , "  " ++ translateString language MsgHelpLang
    , "  " ++ translateString language MsgHelpScreenshot
    , "  " ++ translateString language MsgHelpHelp
    ]
