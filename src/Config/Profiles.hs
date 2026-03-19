module Config.Profiles
  ( Profile(..)
  , loadProfile
  , saveProfile
  , listProfiles
  ) where

import Config.Types
import Data.Text (Text)
import System.Directory (listDirectory, doesFileExist)
import System.FilePath ((</>), takeBaseName)

-- | Audio profile with name and configuration
data Profile = Profile
  { profileName :: Text
  , profileConfig :: Config
  } deriving (Show, Eq)

-- | Load a profile from file
loadProfile :: FilePath -> Text -> IO (Either String Profile)
loadProfile profilesDir name = do
  let profilePath = profilesDir </> (show name ++ ".yaml")
  exists <- doesFileExist profilePath
  if exists
    then do
      -- TODO: Actually load and parse the profile
      return $ Left "Profile loading not yet implemented"
    else
      return $ Left $ "Profile not found: " ++ show name

-- | Save a profile to file
saveProfile :: FilePath -> Profile -> IO (Either String ())
saveProfile _ _ = do
  -- TODO: Implement profile saving
  return $ Right ()

-- | List all available profiles
listProfiles :: FilePath -> IO [Text]
listProfiles profilesDir = do
  files <- listDirectory profilesDir
  let profileNames = map (show . takeBaseName) $ filter isYaml files
  return $ map (read :: String -> Text) profileNames
  where
    isYaml f = drop (length f - 5) f == ".yaml"
