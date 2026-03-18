module GUI.MainWindow
  ( MainWindow
  , createMainWindow
  , showWindow
  , hideWindow
  ) where

-- | Main application window
newtype MainWindow = MainWindow
  { windowTitle :: String
  } deriving (Show)

-- | Create the main application window
createMainWindow :: IO MainWindow
createMainWindow =
  -- TODO: Implement GTK window creation
  pure $ MainWindow { windowTitle = "Ioruba Audio Mixer" }

-- | Show the main window
showWindow :: MainWindow -> IO ()
showWindow _ =
  -- TODO: Implement window showing
  pure ()

-- | Hide the main window
hideWindow :: MainWindow -> IO ()
hideWindow _ =
  -- TODO: Implement window hiding
  pure ()
