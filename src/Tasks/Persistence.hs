module Tasks.Persistence
  ( initDatabase
  , saveTask
  , loadTasks
  ) where

import Tasks.Manager (Task)

-- | Initialize SQLite database
initDatabase :: FilePath -> IO ()
initDatabase dbPath = do
  -- TODO: Implement SQLite initialization
  return ()

-- | Save task to database
saveTask :: FilePath -> Task -> IO ()
saveTask dbPath task = do
  -- TODO: Implement task saving
  return ()

-- | Load all tasks from database
loadTasks :: FilePath -> IO [Task]
loadTasks dbPath = do
  -- TODO: Implement task loading
  return []
