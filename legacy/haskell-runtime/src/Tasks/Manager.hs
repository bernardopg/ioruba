module Tasks.Manager
  ( Task(..)
  , TaskPriority(..)
  , TaskStatus(..)
  , addTask
  , completeTask
  , listTasks
  ) where

import Data.Text (Text)
import Data.Time (UTCTime, getCurrentTime)

-- | Task priority
data TaskPriority
  = PriorityLow
  | PriorityMedium
  | PriorityHigh
  deriving (Show, Eq, Ord)

-- | Task status
data TaskStatus
  = StatusPending
  | StatusInProgress
  | StatusCompleted
  deriving (Show, Eq)

-- | Task definition
data Task = Task
  { taskId :: Int
  , taskTitle :: Text
  , taskDescription :: Maybe Text
  , taskPriority :: TaskPriority
  , taskStatus :: TaskStatus
  , taskCreatedAt :: UTCTime
  , taskCompletedAt :: Maybe UTCTime
  } deriving (Show, Eq)

-- | Add a new task
addTask :: Text -> Maybe Text -> TaskPriority -> IO Task
addTask title desc priority = do
  now <- getCurrentTime
  -- TODO: Implement persistence and ID generation
  return $ Task
    { taskId = 1
    , taskTitle = title
    , taskDescription = desc
    , taskPriority = priority
    , taskStatus = StatusPending
    , taskCreatedAt = now
    , taskCompletedAt = Nothing
    }

-- | Mark task as completed
completeTask :: Task -> IO Task
completeTask task = do
  now <- getCurrentTime
  return $ task
    { taskStatus = StatusCompleted
    , taskCompletedAt = Just now
    }

-- | List all tasks
listTasks :: IO [Task]
listTasks = do
  -- TODO: Implement persistence query
  return []
