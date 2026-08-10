use std::collections::HashMap;
use std::time::{Duration, Instant};

use super::{
    ApplySliderTargetsRequest, ApplySliderTargetsResponse, AudioError, AudioTarget,
    OutcomeSeverity, RuntimeTargetOutcome, SliderOutcome, TargetOutcomeStatus,
};

/// Window during which a captured audio snapshot or resolved device handle is
/// reused across calls.
///
/// A knob sweep fires `apply_slider_targets_batch` once per serial frame. Without
/// a cache every one of those re-derives the same inventory: 5 `pactl` fork/execs
/// on Linux, a full COM apartment + `IMMDeviceEnumerator` + endpoint activation on
/// Windows, a `HasProperty`/`IsPropertySettable` probe sweep on macOS.
///
/// 250 ms is short enough that plugging a headset or switching the default output
/// is picked up as good as immediately, and long enough to collapse a burst. It is
/// also the staleness bound: for at most one window after the user switches
/// devices, writes may still land on the previous one.
pub const INVENTORY_TTL: Duration = Duration::from_millis(250);

/// Single-slot cache whose entry expires after `ttl`.
///
/// Deliberately not a map: every backend caches exactly one thing (the inventory
/// snapshot, or the resolved default-output handle), and a single slot keeps
/// invalidation obvious — there is no way to evict half of it.
pub struct TtlCache<T> {
    ttl: Duration,
    slot: Option<(Instant, T)>,
}

impl<T> TtlCache<T> {
    pub const fn new(ttl: Duration) -> Self {
        Self { ttl, slot: None }
    }

    /// The cached value, or `None` when empty or expired.
    #[cfg_attr(
        not(any(target_os = "linux", target_os = "macos")),
        allow(dead_code)
    )]
    pub fn get(&self) -> Option<&T> {
        match self.slot.as_ref() {
            Some((captured_at, value)) if captured_at.elapsed() < self.ttl => Some(value),
            _ => None,
        }
    }

    /// Replaces the entry and restarts its TTL.
    #[cfg_attr(
        not(any(target_os = "linux", target_os = "macos")),
        allow(dead_code)
    )]
    pub fn store(&mut self, value: T) {
        self.slot = Some((Instant::now(), value));
    }

    /// Drops the entry so the next read recomputes.
    ///
    /// Callers use this after a write that invalidates what was cached (a volume
    /// change makes the snapshot's reported levels wrong) and after an error that
    /// suggests the cached handle is dead (device unplugged).
    #[cfg_attr(
        not(any(target_os = "linux", target_os = "macos", target_os = "windows")),
        allow(dead_code)
    )]
    pub fn invalidate(&mut self) {
        self.slot = None;
    }

    /// Returns the cached value, running `init` first when empty or expired.
    ///
    /// Only for caches owned exclusively by one thread — it borrows the cache
    /// across `init`. Backends that keep the cache behind a `Mutex` use
    /// `get`/`store` instead so the lock is never held across I/O.
    ///
    /// A failing `init` leaves the (already expired) entry in place and is
    /// reported to the caller; it never installs a half-built value.
    #[cfg_attr(not(target_os = "windows"), allow(dead_code))]
    pub fn get_or_try_init<E>(&mut self, init: impl FnOnce() -> Result<T, E>) -> Result<&T, E> {
        let fresh = matches!(
            self.slot.as_ref(),
            Some((captured_at, _)) if captured_at.elapsed() < self.ttl
        );

        if !fresh {
            self.slot = Some((Instant::now(), init()?));
        }

        Ok(&self
            .slot
            .as_ref()
            .expect("slot is populated either by the freshness check or by init")
            .1)
    }
}

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

    #[test]
    fn ttl_cache_starts_empty_and_serves_a_stored_value() {
        let mut cache = TtlCache::<u32>::new(Duration::from_secs(60));
        assert_eq!(cache.get(), None);

        cache.store(7);
        assert_eq!(cache.get(), Some(&7));
    }

    #[test]
    fn ttl_cache_expires_entries_past_the_window() {
        // Zero TTL: every entry is born expired, which pins the boundary without
        // sleeping. `elapsed() < 0ns` is false even on the very next instruction.
        let mut cache = TtlCache::<u32>::new(Duration::ZERO);
        cache.store(7);
        assert_eq!(cache.get(), None);
    }

    #[test]
    fn ttl_cache_invalidate_drops_a_fresh_entry() {
        let mut cache = TtlCache::<u32>::new(Duration::from_secs(60));
        cache.store(7);

        cache.invalidate();

        assert_eq!(cache.get(), None);
    }

    #[test]
    fn ttl_cache_get_or_try_init_runs_once_while_fresh() {
        let mut cache = TtlCache::<u32>::new(Duration::from_secs(60));
        let mut calls = 0;

        for _ in 0..3 {
            let value = cache
                .get_or_try_init::<()>(|| {
                    calls += 1;
                    Ok(7)
                })
                .expect("init succeeds");
            assert_eq!(*value, 7);
        }

        assert_eq!(calls, 1, "a fresh entry must not be recomputed");
    }

    #[test]
    fn ttl_cache_get_or_try_init_recomputes_after_expiry() {
        let mut cache = TtlCache::<u32>::new(Duration::ZERO);
        let mut calls = 0;

        for _ in 0..3 {
            let _ = cache.get_or_try_init::<()>(|| {
                calls += 1;
                Ok(7)
            });
        }

        assert_eq!(calls, 3, "an expired entry must be recomputed on every read");
    }

    #[test]
    fn ttl_cache_get_or_try_init_propagates_errors_without_caching_them() {
        let mut cache = TtlCache::<u32>::new(Duration::from_secs(60));

        let failed = cache.get_or_try_init(|| Err::<u32, &str>("device is gone"));
        assert_eq!(failed, Err("device is gone"));
        assert_eq!(cache.get(), None, "a failed init must not populate the slot");

        // The next attempt still gets a chance to succeed.
        let recovered = cache.get_or_try_init::<&str>(|| Ok(7)).copied();
        assert_eq!(recovered, Ok(7));
    }

    #[test]
    fn ttl_cache_get_or_try_init_reinitializes_after_invalidate() {
        let mut cache = TtlCache::<u32>::new(Duration::from_secs(60));
        let mut calls = 0;

        let resolve = |cache: &mut TtlCache<u32>, calls: &mut u32| {
            cache
                .get_or_try_init::<()>(|| {
                    *calls += 1;
                    Ok(7)
                })
                .copied()
                .expect("init succeeds")
        };

        assert_eq!(resolve(&mut cache, &mut calls), 7);
        cache.invalidate();
        assert_eq!(resolve(&mut cache, &mut calls), 7);

        assert_eq!(calls, 2, "invalidate must force a re-resolve");
    }
}
