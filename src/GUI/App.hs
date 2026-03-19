module GUI.App
  ( runGuiApp
  ) where

import App.Runtime.Commands (RuntimeCommand(..))
import App.Runtime.Core (RuntimeOptions(..))
import App.Runtime.Service
  ( RuntimeService
  , readRuntimeSnapshot
  , sendRuntimeCommand
  , startRuntimeService
  , stopRuntimeService
  )
import App.Settings (UiSettings(..), saveUiSettings)
import Control.Concurrent (threadDelay)
import Control.Concurrent.Async (Async, async, cancel, waitAny)
import Control.Exception (finally)
import qualified Data.ByteString.Char8 as BS8
import qualified Data.ByteString.Lazy as LBS
import Data.IORef (IORef, modifyIORef', newIORef, readIORef)
import Data.Maybe (isJust)
import GUI.Bridge (spawnRuntimeBridge)
import GUI.MainWindow (renderGuiStateJson, renderMainWindow, renderMainWindowShell)
import GUI.State (GuiState(..), initialGuiState, reduceRuntimeEvent)
import System.Directory
  ( XdgDirectory(XdgCache)
  , createDirectoryIfMissing
  , getXdgDirectory
  , renameFile
  )
import System.FilePath ((</>), takeDirectory)
import System.Process
  ( CreateProcess(std_err, std_in, std_out)
  , StdStream(NoStream)
  , createProcess
  , proc
  , waitForProcess
  )

data GuiOutput
  = GuiOutputScreenshot FilePath
  | GuiOutputLive
      { guiOutputHtmlPath :: FilePath
      , guiOutputStatePath :: FilePath
      }

runGuiApp :: RuntimeOptions -> Maybe FilePath -> IO ()
runGuiApp runtimeOptions maybeScreenshotPath = do
  service <- startRuntimeService runtimeOptions
  initialSnapshot <- readRuntimeSnapshot service
  stateRef <-
    newIORef $
      initialGuiState
        (runtimeOptionsUiSettings runtimeOptions)
        (runtimeOptionsConfig runtimeOptions)
        initialSnapshot
  output <- resolveOutputPaths maybeScreenshotPath
  prepareOutput stateRef output
  maybeWindowWatcher <-
    if isJust maybeScreenshotPath
      then pure Nothing
      else Just <$> openNativeWindow (runtimeOptionsUiSettings runtimeOptions) output service
  bridge <-
    spawnRuntimeBridge service $ \event -> do
      modifyIORef' stateRef (reduceRuntimeEvent event)
      renderCurrent stateRef output
  let finalize = cleanup bridge service stateRef
      waiters = bridge : maybe [] pure maybeWindowWatcher
  (if isJust maybeScreenshotPath
      then threadDelay 300000
      else do
        _ <- waitAny waiters
        pure ())
    `finally` finalize

resolveOutputPaths :: Maybe FilePath -> IO GuiOutput
resolveOutputPaths (Just path) = pure (GuiOutputScreenshot path)
resolveOutputPaths Nothing = do
  cacheDir <- getXdgDirectory XdgCache "ioruba"
  let guiDir = cacheDir </> "gui"
  createDirectoryIfMissing True guiDir
  pure
    GuiOutputLive
      { guiOutputHtmlPath = guiDir </> "index.html"
      , guiOutputStatePath = guiDir </> "state.json"
      }

prepareOutput :: IORef GuiState -> GuiOutput -> IO ()
prepareOutput stateRef output = do
  state <- readIORef stateRef
  case output of
    GuiOutputScreenshot path -> do
      createDirectoryIfMissing True (takeDirectory path)
      writeStringAtomic path (renderMainWindow state)
    GuiOutputLive htmlPath statePath -> do
      createDirectoryIfMissing True (takeDirectory htmlPath)
      writeStringAtomic htmlPath (renderMainWindowShell state)
      writeBytesAtomic statePath (renderGuiStateJson state)

renderCurrent :: IORef GuiState -> GuiOutput -> IO ()
renderCurrent stateRef output = do
  state <- readIORef stateRef
  case output of
    GuiOutputScreenshot path -> writeStringAtomic path (renderMainWindow state)
    GuiOutputLive _ statePath -> writeBytesAtomic statePath (renderGuiStateJson state)

writeStringAtomic :: FilePath -> String -> IO ()
writeStringAtomic path contents =
  writeBytesAtomic path (LBS.fromStrict (toBytes contents))
  where
    toBytes = BS8.pack

writeBytesAtomic :: FilePath -> LBS.ByteString -> IO ()
writeBytesAtomic path contents = do
  let tempPath = path ++ ".tmp"
  LBS.writeFile tempPath contents
  renameFile tempPath path

openNativeWindow :: UiSettings -> GuiOutput -> RuntimeService -> IO (Async ())
openNativeWindow _ (GuiOutputScreenshot _) _ =
  error "openNativeWindow called with screenshot output"
openNativeWindow uiSettings GuiOutputLive{guiOutputHtmlPath = htmlPath, guiOutputStatePath = statePath} service = do
  putStrLn $ "Opening native GUI window"
  let helperPath = "scripts/gui/native_window.py"
      helperArgs =
        [ helperPath
        , "--file"
        , htmlPath
        , "--state-file"
        , statePath
        , "--title"
        , "Ioruba GUI"
        , "--width"
        , show (uiSettingsWindowWidth uiSettings)
        , "--height"
        , show (uiSettingsWindowHeight uiSettings)
        ]
      launchProcess = proc "python3" helperArgs
  (_, _, _, processHandle) <-
    createProcess
      launchProcess
        { std_in = NoStream
        , std_out = NoStream
        , std_err = NoStream
        }
  async $ do
    _ <- waitForProcess processHandle
    sendRuntimeCommand service RuntimeCommandShutdown

cleanup :: Async () -> RuntimeService -> IORef GuiState -> IO ()
cleanup bridge service stateRef = do
  state <- readIORef stateRef
  saveUiSettings (guiStateSettings state)
  cancel bridge
  stopRuntimeService service
