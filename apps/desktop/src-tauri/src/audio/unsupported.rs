use std::collections::HashMap;

use super::{
    ApplySliderTargetsRequest, ApplySliderTargetsResponse, AudioEndpoint, AudioError,
    AudioInventory, AudioTarget, OutcomeSeverity, RuntimeTargetOutcome, SliderOutcome,
    TargetOutcomeStatus,
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
        diagnostics: vec![
            "Only the Linux pactl backend is implemented in this migration".to_string(),
        ],
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
                SliderOutcome {
                    summary: "Audio backend unavailable on this platform".to_string(),
                    severity: OutcomeSeverity::Warning,
                    targets: slider
                        .targets
                        .iter()
                        .map(|target| RuntimeTargetOutcome {
                            target: describe_target(target),
                            status: TargetOutcomeStatus::Unavailable,
                            detail: "Only the Linux pactl backend is implemented in this migration"
                                .to_string(),
                            matched: Vec::new(),
                        })
                        .collect(),
                },
            )
        })
        .collect::<HashMap<_, _>>();

    Ok(ApplySliderTargetsResponse { outcomes })
}

fn describe_target(target: &AudioTarget) -> String {
    match target {
        AudioTarget::Master => "master".to_string(),
        AudioTarget::Application { name } => format!("application:{name}"),
        AudioTarget::Source { name } => format!("source:{name}"),
        AudioTarget::Sink { name } => format!("sink:{name}"),
    }
}
