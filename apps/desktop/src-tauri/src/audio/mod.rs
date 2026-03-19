use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use thiserror::Error;

#[cfg(target_os = "linux")]
mod linux;
#[cfg(not(target_os = "linux"))]
mod unsupported;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "lowercase")]
pub enum AudioTarget {
    Master,
    Application { name: String },
    Source { name: String },
    Sink { name: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SliderTargetChange {
    pub slider_id: u32,
    pub slider_name: String,
    pub normalized_value: f64,
    pub targets: Vec<AudioTarget>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApplySliderTargetsRequest {
    pub sliders: Vec<SliderTargetChange>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ApplySliderTargetsResponse {
    pub outcomes: HashMap<u32, String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioEndpoint {
    pub name: String,
    pub description: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioInventory {
    pub backend: String,
    pub applications: Vec<String>,
    pub sinks: Vec<AudioEndpoint>,
    pub sources: Vec<AudioEndpoint>,
    pub default_sink: Option<String>,
    pub default_source: Option<String>,
    pub summary: String,
    pub diagnostics: Vec<String>,
}

#[derive(Debug, Error)]
pub enum AudioError {
    #[error("Audio backend unavailable: {0}")]
    BackendUnavailable(String),
    #[error("Audio command failed: {0}")]
    CommandFailed(String),
    #[error("Audio parse failed: {0}")]
    ParseFailed(String),
}

#[cfg(target_os = "linux")]
pub fn list_audio_inventory() -> AudioInventory {
    linux::list_audio_inventory()
}

#[cfg(not(target_os = "linux"))]
pub fn list_audio_inventory() -> AudioInventory {
    unsupported::list_audio_inventory()
}

#[cfg(target_os = "linux")]
pub fn apply_slider_targets_batch(
    request: ApplySliderTargetsRequest,
) -> Result<ApplySliderTargetsResponse, AudioError> {
    linux::apply_slider_targets_batch(request)
}

#[cfg(not(target_os = "linux"))]
pub fn apply_slider_targets_batch(
    request: ApplySliderTargetsRequest,
) -> Result<ApplySliderTargetsResponse, AudioError> {
    unsupported::apply_slider_targets_batch(request)
}
