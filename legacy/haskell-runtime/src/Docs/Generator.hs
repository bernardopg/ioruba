module Docs.Generator
  ( generateDocs
  , generateModuleDocs
  ) where

-- | Generate all documentation
generateDocs :: FilePath -> IO ()
generateDocs _ = do
  -- TODO: Implement Haddock-based doc generation
  return ()

-- | Generate documentation for a specific module
generateModuleDocs :: String -> FilePath -> IO ()
generateModuleDocs _ _ = do
  -- TODO: Implement module doc generation
  return ()
