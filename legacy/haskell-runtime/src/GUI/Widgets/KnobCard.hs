module GUI.Widgets.KnobCard
  ( renderKnobCard
  ) where

import App.Runtime.State (RuntimeKnobSnapshot(..))
import qualified Data.Text as T
import GUI.Visualizer (renderVisualizer)

renderKnobCard :: RuntimeKnobSnapshot -> [String]
renderKnobCard knob =
  [ "Knob " ++ show (runtimeKnobId knob + 1) ++ " [" ++ T.unpack (runtimeKnobAccent knob) ++ "]"
  , "  name: " ++ T.unpack (runtimeKnobName knob)
  , "  level: " ++ show (runtimeKnobPercent knob) ++ "%  [" ++ renderVisualizer (runtimeKnobPercent knob) ++ "]"
  , "  raw: " ++ show (runtimeKnobRawValue knob)
  , "  targets: " ++ unwords (map T.unpack (runtimeKnobTargets knob))
  , "  outcome: " ++ T.unpack (runtimeKnobOutcome knob)
  ]
