module App.Settings
  ( UiSettings(..)
  , SettingsStore(..)
  , defaultUiSettings
  , buildSettingsStore
  , loadUiSettings
  , saveUiSettings
  , applyLanguageOverride
  ) where

import App.I18n (UiLanguage(..))
import Control.Exception (SomeException, try)
import Data.Aeson
  ( FromJSON(parseJSON)
  , ToJSON(toJSON)
  , (.!=)
  , (.:)
  , (.:?)
  , (.=)
  , eitherDecodeStrict'
  , encode
  , object
  , withObject
  )
import qualified Data.ByteString.Lazy as LBS
import System.Directory
  ( XdgDirectory(XdgConfig)
  , createDirectoryIfMissing
  , doesFileExist
  , getXdgDirectory
  )
import System.FilePath (takeDirectory, (</>))

data UiSettings = UiSettings
  { uiSettingsLanguage :: UiLanguage
  , uiSettingsWindowWidth :: Int
  , uiSettingsWindowHeight :: Int
  , uiSettingsPreferredPort :: Maybe FilePath
  , uiSettingsAutoConnect :: Bool
  , uiSettingsDemoMode :: Bool
  , uiSettingsShowVisualizers :: Bool
  } deriving (Show, Eq)

data SettingsStore = SettingsStore
  { settingsStorePath :: FilePath
  , settingsStoreLoad :: IO UiSettings
  , settingsStoreSave :: UiSettings -> IO ()
  }

defaultUiSettings :: UiSettings
defaultUiSettings =
  UiSettings
    { uiSettingsLanguage = UiLanguagePtBR
    , uiSettingsWindowWidth = 1440
    , uiSettingsWindowHeight = 900
    , uiSettingsPreferredPort = Nothing
    , uiSettingsAutoConnect = True
    , uiSettingsDemoMode = False
    , uiSettingsShowVisualizers = True
    }

buildSettingsStore :: IO SettingsStore
buildSettingsStore = do
  configDir <- getXdgDirectory XdgConfig "ioruba"
  let path = configDir </> "ui-state.json"
  pure $
    SettingsStore
      { settingsStorePath = path
      , settingsStoreLoad = loadUiSettingsFromPath path
      , settingsStoreSave = saveUiSettingsToPath path
      }

loadUiSettings :: IO UiSettings
loadUiSettings = do
  store <- buildSettingsStore
  settingsStoreLoad store

saveUiSettings :: UiSettings -> IO ()
saveUiSettings settings = do
  store <- buildSettingsStore
  settingsStoreSave store settings

applyLanguageOverride :: Maybe UiLanguage -> UiSettings -> UiSettings
applyLanguageOverride maybeLanguage settings =
  settings
    { uiSettingsLanguage =
        maybe (uiSettingsLanguage settings) id maybeLanguage
    }

loadUiSettingsFromPath :: FilePath -> IO UiSettings
loadUiSettingsFromPath path = do
  exists <- doesFileExist path
  if not exists
    then pure defaultUiSettings
    else do
      decodeResult <- try $ do
        rawBytes <- LBS.readFile path
        pure $ eitherDecodeStrict' (LBS.toStrict rawBytes)
      case decodeResult of
        Left (_ :: SomeException) -> pure defaultUiSettings
        Right (Left _) -> pure defaultUiSettings
        Right (Right settings) -> pure settings

saveUiSettingsToPath :: FilePath -> UiSettings -> IO ()
saveUiSettingsToPath path settings = do
  createDirectoryIfMissing True (takeDirectory path)
  LBS.writeFile path (encode settings)

instance FromJSON UiSettings where
  parseJSON =
    withObject "UiSettings" $ \obj ->
      UiSettings
        <$> obj .:? "language" .!= UiLanguagePtBR
        <*> obj .:? "window_width" .!= 1440
        <*> obj .:? "window_height" .!= 900
        <*> obj .:? "preferred_port"
        <*> obj .:? "auto_connect" .!= True
        <*> obj .:? "demo_mode" .!= False
        <*> obj .:? "show_visualizers" .!= True

instance ToJSON UiSettings where
  toJSON settings =
    object
      [ "language" .= uiSettingsLanguage settings
      , "window_width" .= uiSettingsWindowWidth settings
      , "window_height" .= uiSettingsWindowHeight settings
      , "preferred_port" .= uiSettingsPreferredPort settings
      , "auto_connect" .= uiSettingsAutoConnect settings
      , "demo_mode" .= uiSettingsDemoMode settings
      , "show_visualizers" .= uiSettingsShowVisualizers settings
      ]
