use std::collections::HashMap;

use super::{
    ApplySliderTargetsRequest, ApplySliderTargetsResponse, AudioEndpoint, AudioError, AudioInventory,
};

pub fn list_audio_inventory() -> AudioInventory {
    AudioInventory {
        backend: "unsupported".to_string(),
        applications: Vec::new(),
        sinks: Vec::<AudioEndpoint>::new(),
        sources: Vec::<AudioEndpoint>::new(),
        default_sink: None,
        default_source: None,
        summary: "Audio backend unavailable on this platform".to_string(),
        diagnostics: vec!["Only the Linux pactl backend is implemented in this migration".to_string()],
    }
}

pub fn apply_slider_targets_batch(
    request: ApplySliderTargetsRequest,
) -> Result<ApplySliderTargetsResponse, AudioError> {
    let outcomes = request
        .sliders
        .into_iter()
        .map(|slider| {
            (
                slider.slider_id,
                "unsupported platform backend".to_string(),
            )
        })
        .collect::<HashMap<_, _>>();

    Ok(ApplySliderTargetsResponse { outcomes })
}
