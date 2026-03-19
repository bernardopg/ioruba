module Audio.Backend
  ( runAudioCommand
  , readAudioCommand
  , clampNormalized
  , volumePercentArg
  , parseFirstPercent
  , containsCaseInsensitive
  , trim
  ) where

import Data.Char (isDigit, toLower)
import Data.List (isInfixOf)
import System.Exit (ExitCode(..))
import System.Process (readProcessWithExitCode)

runAudioCommand :: FilePath -> [String] -> IO (Either String ())
runAudioCommand command args = do
  result <- readProcessWithExitCode command args ""
  pure $ case result of
    (ExitSuccess, _, _) ->
      Right ()
    (_, _, stderrOutput) ->
      Left $ trim stderrOutput

readAudioCommand :: FilePath -> [String] -> IO (Either String String)
readAudioCommand command args = do
  result <- readProcessWithExitCode command args ""
  pure $ case result of
    (ExitSuccess, stdoutOutput, _) ->
      Right stdoutOutput
    (_, _, stderrOutput) ->
      Left $ trim stderrOutput

clampNormalized :: Double -> Double
clampNormalized rawValue = max 0.0 $ min 1.0 rawValue

volumePercentArg :: Double -> String
volumePercentArg normalized =
  show (round (clampNormalized normalized * 100.0) :: Int) ++ "%"

parseFirstPercent :: String -> Maybe Double
parseFirstPercent rawOutput = do
  token <- firstPercentToken $ words rawOutput
  digits <- extractDigits token
  pure $ fromIntegral digits / 100.0
  where
    firstPercentToken [] = Nothing
    firstPercentToken (token:rest)
      | '%' `elem` token = Just token
      | otherwise = firstPercentToken rest

    extractDigits token =
      case reads (takeWhile isDigit token) of
        [(value, "")] -> Just (value :: Int)
        _ -> Nothing

containsCaseInsensitive :: String -> String -> Bool
containsCaseInsensitive needle haystack =
  map toLower needle `isInfixOf` map toLower haystack

trim :: String -> String
trim = reverse . dropWhile (`elem` ['\n', '\r', ' ', '\t']) . reverse . dropWhile (`elem` ['\n', '\r', ' ', '\t'])
