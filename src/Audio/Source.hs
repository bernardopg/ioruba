module Audio.Source
  ( Source(..)
  , getDefaultSource
  , listSources
  , setSourceVolume
  , setDefaultSourceVolume
  , getSourceVolume
  ) where

import Control.Applicative ((<|>))
import Audio.Backend
  ( parseFirstPercent
  , readAudioCommand
  , runAudioCommand
  , trim
  , volumePercentArg
  )
import Audio.Sink (Volume(..))
import Data.List (find, isPrefixOf)
import Data.Text (Text)
import qualified Data.Text as T
import Data.Word (Word32)

data Source = Source
  { sourceIndex :: Word32
  , sourceName :: Text
  , sourceDescription :: Text
  } deriving (Show, Eq)

getDefaultSource :: IO (Maybe Source)
getDefaultSource = do
  result <- readAudioCommand "pactl" ["get-default-source"]
  case result of
    Left _ -> preferNonMonitor
    Right rawName -> do
      sources <- listSources
      let targetName = T.pack (trim rawName)
      pure $
        find (\source -> T.strip (sourceName source) == targetName) sources
          <|> find (not . isMonitorSource) sources
  where
    preferNonMonitor = do
      sources <- listSources
      pure $ find (not . isMonitorSource) sources

listSources :: IO [Source]
listSources = do
  result <- readAudioCommand "pactl" ["list", "sources"]
  pure $ either (const []) parseSources result

setSourceVolume :: Source -> Volume -> IO ()
setSourceVolume source volume = do
  _ <- runAudioCommand
    "pactl"
    ["set-source-volume", T.unpack (sourceName source), volumePercentArg (unVolume volume)]
  pure ()

setDefaultSourceVolume :: Volume -> IO ()
setDefaultSourceVolume volume = do
  defaultSource <- getDefaultSource
  case defaultSource of
    Just source -> setSourceVolume source volume
    Nothing -> do
      _ <- runAudioCommand
        "pactl"
        ["set-source-volume", "@DEFAULT_SOURCE@", volumePercentArg (unVolume volume)]
      pure ()

getSourceVolume :: Source -> IO Volume
getSourceVolume source = do
  result <- readAudioCommand "pactl" ["get-source-volume", T.unpack (sourceName source)]
  pure $ case result >>= maybeToEither "Volume percentage not found" . parseFirstPercent of
    Right normalized -> Volume normalized
    Left _ -> Volume 0.0

parseSources :: String -> [Source]
parseSources rawOutput =
  mapMaybe parseSourceBlock $ splitBlocks "Source #" (lines rawOutput)

parseSourceBlock :: [String] -> Maybe Source
parseSourceBlock block = do
  header <- listToMaybe block
  sourceId <- parseHeaderNumber "Source #" header
  sourceNameText <- T.pack <$> lookupField "Name:" block
  let sourceDescriptionText =
        T.pack $ maybe (T.unpack sourceNameText) id (lookupField "Description:" block)
  pure $
    Source
      { sourceIndex = sourceId
      , sourceName = sourceNameText
      , sourceDescription = sourceDescriptionText
      }

splitBlocks :: String -> [String] -> [[String]]
splitBlocks prefix = finalize . foldr step []
  where
    step line [] = [[line]]
    step line (current:rest)
      | prefix `isPrefixOf` line = [line] : current : rest
      | otherwise = (line : current) : rest

    finalize = filter (not . null)

lookupField :: String -> [String] -> Maybe String
lookupField prefix = foldr step Nothing
  where
    step line acc =
      case acc of
        Just value -> Just value
        Nothing
          | trimmedPrefix prefix line ->
              Just $ trim $ drop (length prefix) (dropWhile (== ' ') line)
          | otherwise -> Nothing

trimmedPrefix :: String -> String -> Bool
trimmedPrefix prefix line = prefix `isPrefixOf` dropWhile (== ' ') line

parseHeaderNumber :: String -> String -> Maybe Word32
parseHeaderNumber prefix rawHeader =
  case reads (drop (length prefix) rawHeader) of
    [(value, "")] -> Just value
    _ -> Nothing

maybeToEither :: left -> Maybe right -> Either left right
maybeToEither leftValue =
  maybe (Left leftValue) Right

listToMaybe :: [a] -> Maybe a
listToMaybe [] = Nothing
listToMaybe (value:_) = Just value

mapMaybe :: (a -> Maybe b) -> [a] -> [b]
mapMaybe _ [] = []
mapMaybe f (value:rest) =
  case f value of
    Just mapped -> mapped : mapMaybe f rest
    Nothing -> mapMaybe f rest

isMonitorSource :: Source -> Bool
isMonitorSource source = ".monitor" `T.isSuffixOf` sourceName source
