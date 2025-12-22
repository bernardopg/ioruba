module GUI.MainWindow
  ( MainWindow
  , createMainWindow
  , showWindow
  , hideWindow
  ) where

-- | Main application window
data MainWindow = MainWindow
  { windowTitle :: String
  } deriving (Show)

-- | Create the main application window
createMainWindow :: IO MainWindow
createMainWindow = do
  -- TODO: Implement GTK window creation
  return $ MainWindow { windowTitle = "Iarubá Audio Mixer" }

-- | Show the main window
showWindow :: MainWindow -> IO ()
showWindow win = do
  -- TODO: Implement window showing
  return ()

-- | Hide the main window
hideWindow :: MainWindow -> IO ()
hideWindow win = do
  -- TODO: Implement window hiding
  return ()
