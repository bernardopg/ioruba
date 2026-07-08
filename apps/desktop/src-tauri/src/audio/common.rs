use std::collections::HashMap;

use super::{
    ApplySliderTargetsRequest, ApplySliderTargetsResponse, AudioError, AudioTarget,
    OutcomeSeverity, RuntimeTargetOutcome, SliderOutcome, TargetOutcomeStatus,
};

/// Renders an `AudioTarget` as the stable identifier used in outcome payloads
/// (`master`, `application:<name>`, `source:<name>`, `sink:<name>`).
pub fn describe_target(target: &AudioTarget) -> String {
    match target {
        AudioTarget::Master => "master".to_string(),
        AudioTarget::Application { name } => format!("application:{name}"),
        AudioTarget::Source { name } => format!("source:{name}"),
        AudioTarget::Sink { name } => format!("sink:{name}"),
    }
}

/// Clamps a normalized volume to `0.0..=1.0` and converts it to an integer percent.
pub fn volume_percent(normalized: f64) -> u32 {
    (normalized.clamp(0.0, 1.0) * 100.0).round() as u32
}

/// Shared slider-batch behavior for backends that can only drive the
/// default/master output (Windows WASAPI and macOS CoreAudio today). The
/// platform-specific part is reduced to the `set_master_volume` closure; the
/// batching, per-target outcomes and summaries live here so they are covered
/// by host-independent tests on every platform.
#[cfg_attr(not(any(target_os = "windows", target_os = "macos")), allow(dead_code))]
pub struct MasterOnlyBackend {
    /// Human-facing platform name used in outcome strings ("Windows", "macOS").
    pub platform: &'static str,
    /// Identifier reported as the matched endpoint (e.g. `@DEFAULT_RENDER@`).
    pub output_id: &'static str,
}

#[cfg_attr(not(any(target_os = "windows", target_os = "macos")), allow(dead_code))]
impl MasterOnlyBackend {
    pub fn apply_batch(
        &self,
        request: ApplySliderTargetsRequest,
        mut set_master_volume: impl FnMut(f64) -> Result<(), AudioError>,
    ) -> ApplySliderTargetsResponse {
        let outcomes = request
            .sliders
            .into_iter()
            .map(|slider| {
                let percent = volume_percent(slider.normalized_value);
                let mut targets = Vec::<RuntimeTargetOutcome>::new();
                let mut master_updated = false;

                for target in &slider.targets {
                    match target {
                        AudioTarget::Master => {
                            if master_updated {
                                targets.push(RuntimeTargetOutcome {
                                    target: describe_target(target),
                                    status: TargetOutcomeStatus::Skipped,
                                    detail: format!(
                                        "{} default output already updated by this slider",
                                        self.platform
                                    ),
                                    matched: vec![self.output_id.to_string()],
                                });
                                continue;
                            }

                            match set_master_volume(slider.normalized_value) {
                                Ok(()) => {
                                    master_updated = true;
                                    targets.push(RuntimeTargetOutcome {
                                        target: describe_target(target),
                                        status: TargetOutcomeStatus::Updated,
                                        detail: format!(
                                            "Updated {} default output to {percent}%",
                                            self.platform
                                        ),
                                        matched: vec![self.output_id.to_string()],
                                    });
                                }
                                Err(error) => {
                                    targets.push(RuntimeTargetOutcome {
                                        target: describe_target(target),
                                        status: TargetOutcomeStatus::Error,
                                        detail: error.to_string(),
                                        matched: vec![self.output_id.to_string()],
                                    });
                                }
                            }
                        }
                        AudioTarget::Application { .. }
                        | AudioTarget::Source { .. }
                        | AudioTarget::Sink { .. } => {
                            targets.push(RuntimeTargetOutcome {
                                target: describe_target(target),
                                status: TargetOutcomeStatus::Unavailable,
                                detail: format!(
                                    "{} backend currently supports only the master/default output target",
                                    self.platform
                                ),
                                matched: Vec::new(),
                            });
                        }
                    }
                }

                (slider.slider_id, self.summarize_slider_outcome(targets))
            })
            .collect::<HashMap<_, _>>();

        ApplySliderTargetsResponse { outcomes }
    }

    fn summarize_slider_outcome(&self, targets: Vec<RuntimeTargetOutcome>) -> SliderOutcome {
        if targets.is_empty() {
            return SliderOutcome {
                summary: format!("No {} audio targets configured", self.platform),
                severity: OutcomeSeverity::Info,
                targets,
            };
        }

        let errors = targets
            .iter()
            .filter(|target| matches!(target.status, TargetOutcomeStatus::Error))
            .count();
        let updated = targets
            .iter()
            .filter(|target| matches!(target.status, TargetOutcomeStatus::Updated))
            .count();
        let unavailable = targets
            .iter()
            .filter(|target| matches!(target.status, TargetOutcomeStatus::Unavailable))
            .count();

        let severity = if errors > 0 {
            OutcomeSeverity::Error
        } else if updated > 0 && unavailable == 0 {
            OutcomeSeverity::Success
        } else {
            OutcomeSeverity::Warning
        };

        let summary = if updated > 0 {
            format!(
                "Updated {} default output{}",
                self.platform,
                if unavailable > 0 {
                    format!("; {unavailable} unsupported target(s)")
                } else {
                    String::new()
                }
            )
        } else if unavailable > 0 {
            format!(
                "{} backend supports only master/default output",
                self.platform
            )
        } else {
            format!("No {} audio targets configured", self.platform)
        };

        SliderOutcome {
            summary,
            severity,
            targets,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::super::SliderTargetChange;
    use super::*;

    const BACKEND: MasterOnlyBackend = MasterOnlyBackend {
        platform: "Windows",
        output_id: "@DEFAULT_RENDER@",
    };

    fn request(targets: Vec<AudioTarget>) -> ApplySliderTargetsRequest {
        ApplySliderTargetsRequest {
            sliders: vec![SliderTargetChange {
                slider_id: 7,
                slider_name: "Master".to_string(),
                normalized_value: 0.5,
                targets,
            }],
        }
    }

    #[test]
    fn describe_target_covers_every_variant() {
        assert_eq!(describe_target(&AudioTarget::Master), "master");
        assert_eq!(
            describe_target(&AudioTarget::Application {
                name: "spotify".to_string()
            }),
            "application:spotify"
        );
        assert_eq!(
            describe_target(&AudioTarget::Source {
                name: "mic".to_string()
            }),
            "source:mic"
        );
        assert_eq!(
            describe_target(&AudioTarget::Sink {
                name: "hdmi".to_string()
            }),
            "sink:hdmi"
        );
    }

    #[test]
    fn volume_percent_clamps_and_rounds() {
        assert_eq!(volume_percent(0.0), 0);
        assert_eq!(volume_percent(0.25), 25);
        assert_eq!(volume_percent(1.0), 100);
        assert_eq!(volume_percent(1.5), 100);
        assert_eq!(volume_percent(-0.2), 0);
        assert_eq!(volume_percent(0.999), 100);
    }

    #[test]
    fn apply_batch_updates_master_and_reports_success() {
        let mut applied = Vec::new();
        let response = BACKEND.apply_batch(request(vec![AudioTarget::Master]), |normalized| {
            applied.push(normalized);
            Ok(())
        });

        assert_eq!(applied, vec![0.5]);
        let outcome = &response.outcomes[&7];
        assert!(matches!(outcome.severity, OutcomeSeverity::Success));
        assert_eq!(outcome.summary, "Updated Windows default output");
        assert_eq!(outcome.targets.len(), 1);
        assert!(matches!(
            outcome.targets[0].status,
            TargetOutcomeStatus::Updated
        ));
        assert_eq!(
            outcome.targets[0].detail,
            "Updated Windows default output to 50%"
        );
        assert_eq!(outcome.targets[0].matched, vec!["@DEFAULT_RENDER@"]);
    }

    #[test]
    fn apply_batch_skips_duplicate_master_targets() {
        let mut calls = 0;
        let response = BACKEND.apply_batch(
            request(vec![AudioTarget::Master, AudioTarget::Master]),
            |_| {
                calls += 1;
                Ok(())
            },
        );

        assert_eq!(calls, 1);
        let outcome = &response.outcomes[&7];
        assert!(matches!(outcome.severity, OutcomeSeverity::Success));
        assert!(matches!(
            outcome.targets[1].status,
            TargetOutcomeStatus::Skipped
        ));
    }

    #[test]
    fn apply_batch_surfaces_setter_errors() {
        let response = BACKEND.apply_batch(request(vec![AudioTarget::Master]), |_| {
            Err(AudioError::CommandFailed("boom".to_string()))
        });

        let outcome = &response.outcomes[&7];
        assert!(matches!(outcome.severity, OutcomeSeverity::Error));
        assert!(matches!(
            outcome.targets[0].status,
            TargetOutcomeStatus::Error
        ));
        assert_eq!(outcome.targets[0].detail, "Audio command failed: boom");
    }

    #[test]
    fn apply_batch_marks_non_master_targets_unavailable() {
        let mut calls = 0;
        let response = BACKEND.apply_batch(
            request(vec![AudioTarget::Application {
                name: "spotify".to_string(),
            }]),
            |_| {
                calls += 1;
                Ok(())
            },
        );

        assert_eq!(calls, 0);
        let outcome = &response.outcomes[&7];
        assert!(matches!(outcome.severity, OutcomeSeverity::Warning));
        assert_eq!(
            outcome.summary,
            "Windows backend supports only master/default output"
        );
        assert!(matches!(
            outcome.targets[0].status,
            TargetOutcomeStatus::Unavailable
        ));
    }

    #[test]
    fn apply_batch_mixed_targets_warn_with_unsupported_count() {
        let response = BACKEND.apply_batch(
            request(vec![
                AudioTarget::Master,
                AudioTarget::Sink {
                    name: "hdmi".to_string(),
                },
            ]),
            |_| Ok(()),
        );

        let outcome = &response.outcomes[&7];
        assert!(matches!(outcome.severity, OutcomeSeverity::Warning));
        assert_eq!(
            outcome.summary,
            "Updated Windows default output; 1 unsupported target(s)"
        );
    }

    #[test]
    fn apply_batch_reports_empty_target_list_as_info() {
        let response = BACKEND.apply_batch(request(Vec::new()), |_| Ok(()));

        let outcome = &response.outcomes[&7];
        assert!(matches!(outcome.severity, OutcomeSeverity::Info));
        assert_eq!(outcome.summary, "No Windows audio targets configured");
        assert!(outcome.targets.is_empty());
    }
}
