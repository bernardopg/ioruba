module Tasks.Persistence
  ( initDatabase
  , saveTask
  , loadTasks
  ) where

import Tasks.Manager (Task)

-- | Initialize SQLite database
initDatabase :: FilePath -> IO ()
initDatabase _ = do
  -- TODO: Implement SQLite initialization
  return ()

-- | Save task to database
saveTask :: FilePath -> Task -> IO ()
saveTask _ _ = do
  -- TODO: Implement task saving
  return ()

-- | Load all tasks from database
loadTasks :: FilePath -> IO [Task]
loadTasks _ = do
  -- TODO: Implement task loading
  return []
