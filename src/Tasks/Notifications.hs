module Tasks.Notifications
  ( sendNotification
  , scheduleReminder
  ) where

import Data.Text (Text)
import Data.Time (UTCTime)

-- | Send a desktop notification
sendNotification :: Text -> Text -> IO ()
sendNotification _ _ = do
  -- TODO: Implement DBus notification
  return ()

-- | Schedule a reminder notification
scheduleReminder :: Text -> Text -> UTCTime -> IO ()
scheduleReminder _ _ _ = do
  -- TODO: Implement scheduled notifications
  return ()
