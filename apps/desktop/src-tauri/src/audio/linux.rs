use std::{
    collections::{HashMap, HashSet},
    process::Command,
    sync::{Mutex, OnceLock},
    time::{Duration, Instant},
};

use serde_json::Value;

use super::common::{self, describe_target};
use super::{
    ApplySliderTargetsRequest, ApplySliderTargetsResponse, AudioEndpoint, AudioError,
    AudioInventory, AudioTarget, ControlAction, ControlActionOutcome, OutcomeSeverity,
    RuntimeTargetOutcome, SliderOutcome, SliderTargetChange, TargetOutcomeStatus,
};

/// Janela durante a qual um snapshot do `pactl` é reusado entre chamadas. Movimentos
/// rápidos de knob disparam vários `apply_slider_targets_batch` em sequência; sem
/// cache cada um re-executa 5 comandos `pactl` (fork/exec) só para reler o mesmo
/// inventário. 250 ms é curto o bastante para refletir plugs/unplugs quase em tempo
/// real e longo o bastante para colapsar rajadas.
const SNAPSHOT_TTL: Duration = Duration::from_millis(250);

static SNAPSHOT_CACHE: OnceLock<Mutex<Option<(Instant, PactlSnapshot)>>> = OnceLock::new();

#[derive(Debug, Clone)]
struct SinkInput {
    index: u64,
    app_name: String,
    display_name: String,
    binary_name: String,
    media_name: String,
    application_id: String,
}

/// Inventário bruto do `pactl` lido de uma vez. As falhas por comando são
/// preservadas em `errors` para que `list_audio_inventory` possa reportá-las.
#[derive(Debug, Clone)]
struct PactlSnapshot {
    sink_inputs: Vec<SinkInput>,
    sinks: Vec<AudioEndpoint>,
    sources: Vec<AudioEndpoint>,
    default_sink: Option<String>,
    default_source: Option<String>,
    errors: Vec<String>,
}

fn snapshot_cache() -> &'static Mutex<Option<(Instant, PactlSnapshot)>> {
    SNAPSHOT_CACHE.get_or_init(|| Mutex::new(None))
}

/// Lê o snapshot do `pactl`, reusando o último resultado se ainda estiver dentro
/// da janela `SNAPSHOT_TTL`. Threads concorrentes podem, no pior caso, recomputar
/// em paralelo na expiração — aceitável, pois o resultado é idempotente e o lock
/// nunca é segurado durante o I/O do `pactl`.
fn read_pactl_snapshot() -> PactlSnapshot {
    if let Ok(guard) = snapshot_cache().lock() {
        if let Some((captured_at, snapshot)) = guard.as_ref() {
            if captured_at.elapsed() < SNAPSHOT_TTL {
                return snapshot.clone();
            }
        }
    }

    let snapshot = capture_pactl_snapshot();

    if let Ok(mut guard) = snapshot_cache().lock() {
        *guard = Some((Instant::now(), snapshot.clone()));
    }

    snapshot
}

fn capture_pactl_snapshot() -> PactlSnapshot {
    let mut errors = Vec::<String>::new();

    let sinks = match read_json_command(&["-f", "json", "list", "sinks"]) {
        Ok(value) => parse_sinks(&value).unwrap_or_else(|| {
            errors.push("Falha ao interpretar a lista de sinks do pactl".to_string());
            Vec::new()
        }),
        Err(error) => {
            errors.push(format!("Falha ao listar sinks: {error}"));
            Vec::new()
        }
    };

    let sink_inputs = match read_json_command(&["-f", "json", "list", "sink-inputs"]) {
        Ok(value) => parse_sink_inputs(&value).unwrap_or_else(|| {
            errors.push("Falha ao interpretar a lista de sink-inputs do pactl".to_string());
            Vec::new()
        }),
        Err(error) => {
            errors.push(format!("Falha ao listar sink-inputs: {error}"));
            Vec::new()
        }
    };

    let sources = match read_text_command(&["list", "sources"]) {
        Ok(raw) => parse_sources(&raw),
        Err(error) => {
            errors.push(format!("Falha ao listar sources: {error}"));
            Vec::new()
        }
    };

    let default_sink = match read_text_command(&["get-default-sink"]) {
        Ok(value) => Some(trim(value)).filter(|value| !value.is_empty()),
        Err(error) => {
            errors.push(format!("Falha ao consultar sink padrao: {error}"));
            None
        }
    };

    let default_source = match read_text_command(&["get-default-source"]) {
        Ok(value) => Some(trim(value)).filter(|value| !value.is_empty()),
        Err(error) => {
            errors.push(format!("Falha ao consultar source padrao: {error}"));
            None
        }
    };

    PactlSnapshot {
        sink_inputs,
        sinks,
        sources,
        default_sink,
        default_source,
        errors,
    }
}

/// Invalida o cache após uma escrita de volume: os valores reportados pelo `pactl`
/// mudaram, então a próxima leitura deve refletir o estado novo imediatamente.
fn invalidate_snapshot_cache() {
    if let Ok(mut guard) = snapshot_cache().lock() {
        *guard = None;
    }
}

pub fn list_audio_inventory() -> AudioInventory {
    if !has_pactl() {
        return AudioInventory {
            backend: "unsupported".to_string(),
            applications: Vec::new(),
            sinks: Vec::new(),
            sources: Vec::new(),
            default_sink: None,
            default_source: None,
            summary: "pactl was not found on PATH".to_string(),
            diagnostics: vec![
                "Install pipewire-pulse or pulseaudio-utils so pactl becomes available".to_string(),
            ],
        };
    }

    // Snapshot único do pactl (cacheado por SNAPSHOT_TTL). Falhas parciais por
    // comando ficam em `snapshot.errors` em vez de virar inventário vazio sem
    // pista de causa para o usuário.
    let snapshot = read_pactl_snapshot();
    let mut diagnostics = snapshot.errors.clone();

    let application_names = application_inventory_names(&snapshot.sink_inputs);
    let application_count = application_names.len();
    let sink_count = snapshot.sinks.len();
    let source_count = snapshot.sources.len();

    if diagnostics.is_empty() {
        diagnostics.push("pactl backend ready".to_string());
    }

    AudioInventory {
        backend: "pactl".to_string(),
        applications: application_names,
        sinks: snapshot.sinks,
        sources: snapshot.sources,
        default_sink: snapshot.default_sink,
        default_source: snapshot.default_source,
        summary: format!(
            "{} app(s), {} sink(s), {} source(s)",
            application_count, sink_count, source_count
        ),
        diagnostics,
    }
}

pub fn apply_slider_targets_batch(
    request: ApplySliderTargetsRequest,
) -> Result<ApplySliderTargetsResponse, AudioError> {
    if !has_pactl() {
        return Err(AudioError::BackendUnavailable(
            "pactl was not found on PATH".to_string(),
        ));
    }

    let mut outcomes = HashMap::new();
    let snapshot = read_pactl_snapshot();

    for slider in request.sliders {
        let outcome = apply_targets(
            &slider,
            &snapshot.sink_inputs,
            &snapshot.sinks,
            &snapshot.sources,
            snapshot.default_sink.as_deref(),
            snapshot.default_source.as_deref(),
        )?;
        outcomes.insert(slider.slider_id, outcome);
    }

    // O lote alterou volumes: invalida o cache para que a próxima leitura
    // (ex.: refresh de inventário no frontend) reflita os novos valores.
    invalidate_snapshot_cache();

    Ok(ApplySliderTargetsResponse { outcomes })
}

pub fn dispatch_control_action(action: ControlAction) -> Result<ControlActionOutcome, AudioError> {
    match action {
        ControlAction::Mute => {
            if !has_pactl() {
                return Ok(ControlActionOutcome {
                    action,
                    supported: false,
                    detail: "pactl was not found on PATH; cannot toggle default output mute"
                        .to_string(),
                });
            }

            run_command(&["set-sink-mute", "@DEFAULT_SINK@", "toggle"])?;
            invalidate_snapshot_cache();
            Ok(ControlActionOutcome {
                action,
                supported: true,
                detail: "Toggled mute on the default output".to_string(),
            })
        }
        ControlAction::Next => run_playerctl_action(action, "next", "Skipped to next media item"),
        ControlAction::Prev => {
            run_playerctl_action(action, "previous", "Skipped to previous media item")
        }
    }
}

fn apply_targets(
    slider: &SliderTargetChange,
    sink_inputs: &[SinkInput],
    sinks: &[AudioEndpoint],
    sources: &[AudioEndpoint],
    default_sink: Option<&str>,
    default_source: Option<&str>,
) -> Result<SliderOutcome, AudioError> {
    let volume_arg = volume_percent(slider.normalized_value);
    let mut target_outcomes = Vec::new();
    let mut applied_keys = HashSet::<String>::new();

    for target in &slider.targets {
        match target {
            AudioTarget::Master => {
                let target_label = describe_target(target);
                let command_key = "sink:@DEFAULT_SINK@".to_string();
                if !applied_keys.insert(command_key) {
                    target_outcomes.push(RuntimeTargetOutcome {
                        target: target_label,
                        status: TargetOutcomeStatus::Skipped,
                        detail: "Default output already updated by another target in this batch"
                            .to_string(),
                        matched: vec!["@DEFAULT_SINK@".to_string()],
                    });
                    continue;
                }

                match run_command(&["set-sink-volume", "@DEFAULT_SINK@", &volume_arg]) {
                    Ok(()) => target_outcomes.push(RuntimeTargetOutcome {
                        target: target_label,
                        status: TargetOutcomeStatus::Updated,
                        detail: format!("Updated the default output to {volume_arg}"),
                        matched: vec![default_sink.unwrap_or("@DEFAULT_SINK@").to_string()],
                    }),
                    Err(error) => target_outcomes.push(RuntimeTargetOutcome {
                        target: target_label,
                        status: TargetOutcomeStatus::Error,
                        detail: error.to_string(),
                        matched: vec![default_sink.unwrap_or("@DEFAULT_SINK@").to_string()],
                    }),
                }
            }
            AudioTarget::Application { name } => {
                let matches = resolve_application_matches(sink_inputs, name);
                let matched = matches
                    .iter()
                    .map(|input| describe_sink_input(input))
                    .collect::<Vec<_>>();

                if matches.is_empty() {
                    target_outcomes.push(RuntimeTargetOutcome {
                        target: describe_target(target),
                        status: TargetOutcomeStatus::Idle,
                        detail: format!(
                            "No active sink-input matched application '{name}'. Keep the app playing audio and refresh the inventory."
                        ),
                        matched,
                    });
                } else {
                    let mut updated = 0usize;
                    let mut skipped = 0usize;
                    let mut errors = Vec::<String>::new();

                    for input in &matches {
                        let key = format!("sink-input:{}", input.index);
                        if !applied_keys.insert(key) {
                            skipped += 1;
                            continue;
                        }

                        if let Err(error) = run_command(&[
                            "set-sink-input-volume",
                            &input.index.to_string(),
                            &volume_arg,
                        ]) {
                            errors.push(format!("{} -> {}", describe_sink_input(input), error));
                        } else {
                            updated += 1;
                        }
                    }

                    let (status, detail) = if !errors.is_empty() {
                        (
                            TargetOutcomeStatus::Error,
                            format!(
                                "Failed to update {}/{} stream(s) for '{name}': {}",
                                errors.len(),
                                matches.len(),
                                errors.join(" | ")
                            ),
                        )
                    } else if updated > 0 {
                        (
                            TargetOutcomeStatus::Updated,
                            format!(
                                "Updated {updated} active stream(s) for '{name}' to {volume_arg}{}",
                                if skipped > 0 {
                                    format!(" (skipped {skipped} duplicate match(es))")
                                } else {
                                    String::new()
                                }
                            ),
                        )
                    } else {
                        (
                            TargetOutcomeStatus::Skipped,
                            format!(
                                "All matched stream(s) for '{name}' were already updated earlier in this batch"
                            ),
                        )
                    };

                    target_outcomes.push(RuntimeTargetOutcome {
                        target: describe_target(target),
                        status,
                        detail,
                        matched,
                    });
                }
            }
            AudioTarget::Source { name } => {
                let matches = match normalize_name(name).as_str() {
                    "default_microphone" => default_source
                        .map(|source_name| {
                            sources
                                .iter()
                                .filter(|source| source.name == source_name)
                                .collect::<Vec<_>>()
                        })
                        .unwrap_or_else(|| {
                            sources
                                .iter()
                                .filter(|source| !source.name.ends_with(".monitor"))
                                .take(1)
                                .collect::<Vec<_>>()
                        }),
                    _ => sources
                        .iter()
                        .filter(|source| {
                            contains_case_insensitive(&source.name, name)
                                || contains_case_insensitive(&source.description, name)
                        })
                        .collect::<Vec<_>>(),
                };
                let matched = matches
                    .iter()
                    .map(|source| format!("{} ({})", source.description, source.name))
                    .collect::<Vec<_>>();

                if matches.is_empty() {
                    target_outcomes.push(RuntimeTargetOutcome {
                        target: describe_target(target),
                        status: TargetOutcomeStatus::Unavailable,
                        detail: format!(
                            "No source matched '{name}' in the current Linux inventory"
                        ),
                        matched,
                    });
                } else {
                    let mut updated = 0usize;
                    let mut skipped = 0usize;
                    let mut errors = Vec::<String>::new();

                    for source in &matches {
                        let key = format!("source:{}", source.name);
                        if !applied_keys.insert(key) {
                            skipped += 1;
                            continue;
                        }

                        if let Err(error) =
                            run_command(&["set-source-volume", &source.name, &volume_arg])
                        {
                            errors.push(format!("{} -> {}", source.name, error));
                        } else {
                            updated += 1;
                        }
                    }

                    let (status, detail) = if !errors.is_empty() {
                        (
                            TargetOutcomeStatus::Error,
                            format!("Failed to update source '{name}': {}", errors.join(" | ")),
                        )
                    } else if updated > 0 {
                        (
                            TargetOutcomeStatus::Updated,
                            format!(
                                "Updated {updated} source target(s) for '{name}' to {volume_arg}{}",
                                if skipped > 0 {
                                    format!(" (skipped {skipped} duplicate match(es))")
                                } else {
                                    String::new()
                                }
                            ),
                        )
                    } else {
                        (
                            TargetOutcomeStatus::Skipped,
                            format!("Source '{name}' was already updated earlier in this batch"),
                        )
                    };

                    target_outcomes.push(RuntimeTargetOutcome {
                        target: describe_target(target),
                        status,
                        detail,
                        matched,
                    });
                }
            }
            AudioTarget::Sink { name } => {
                let matches = match normalize_name(name).as_str() {
                    "default_output" => default_sink
                        .map(|sink_name| {
                            sinks
                                .iter()
                                .filter(|sink| sink.name == sink_name)
                                .collect::<Vec<_>>()
                        })
                        .unwrap_or_default(),
                    _ => sinks
                        .iter()
                        .filter(|sink| {
                            contains_case_insensitive(&sink.name, name)
                                || contains_case_insensitive(&sink.description, name)
                        })
                        .collect::<Vec<_>>(),
                };
                let matched = matches
                    .iter()
                    .map(|sink| format!("{} ({})", sink.description, sink.name))
                    .collect::<Vec<_>>();

                if matches.is_empty() {
                    target_outcomes.push(RuntimeTargetOutcome {
                        target: describe_target(target),
                        status: TargetOutcomeStatus::Unavailable,
                        detail: format!("No sink matched '{name}' in the current Linux inventory"),
                        matched,
                    });
                } else {
                    let mut updated = 0usize;
                    let mut skipped = 0usize;
                    let mut errors = Vec::<String>::new();

                    for sink in &matches {
                        let key = format!("sink:{}", sink.name);
                        if !applied_keys.insert(key) {
                            skipped += 1;
                            continue;
                        }

                        if let Err(error) =
                            run_command(&["set-sink-volume", &sink.name, &volume_arg])
                        {
                            errors.push(format!("{} -> {}", sink.name, error));
                        } else {
                            updated += 1;
                        }
                    }

                    let (status, detail) = if !errors.is_empty() {
                        (
                            TargetOutcomeStatus::Error,
                            format!("Failed to update sink '{name}': {}", errors.join(" | ")),
                        )
                    } else if updated > 0 {
                        (
                            TargetOutcomeStatus::Updated,
                            format!(
                                "Updated {updated} sink target(s) for '{name}' to {volume_arg}{}",
                                if skipped > 0 {
                                    format!(" (skipped {skipped} duplicate match(es))")
                                } else {
                                    String::new()
                                }
                            ),
                        )
                    } else {
                        (
                            TargetOutcomeStatus::Skipped,
                            format!("Sink '{name}' was already updated earlier in this batch"),
                        )
                    };

                    target_outcomes.push(RuntimeTargetOutcome {
                        target: describe_target(target),
                        status,
                        detail,
                        matched,
                    });
                }
            }
        }
    }

    Ok(build_slider_outcome(target_outcomes))
}

fn has_pactl() -> bool {
    command_succeeds("pactl", &["--version"])
}

fn has_playerctl() -> bool {
    command_succeeds("playerctl", &["--version"])
}

fn command_succeeds(program: &str, args: &[&str]) -> bool {
    Command::new(program)
        .args(args)
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false)
}

fn run_playerctl_action(
    action: ControlAction,
    command: &str,
    success_detail: &str,
) -> Result<ControlActionOutcome, AudioError> {
    if !has_playerctl() {
        return Ok(ControlActionOutcome {
            action,
            supported: false,
            detail: "playerctl was not found on PATH; install it for media next/prev actions"
                .to_string(),
        });
    }

    let output = Command::new("playerctl")
        .arg(command)
        .output()
        .map_err(|error| AudioError::CommandFailed(error.to_string()))?;

    if output.status.success() {
        Ok(ControlActionOutcome {
            action,
            supported: true,
            detail: success_detail.to_string(),
        })
    } else {
        Err(AudioError::CommandFailed(
            String::from_utf8_lossy(&output.stderr).trim().to_string(),
        ))
    }
}

fn run_command(args: &[&str]) -> Result<(), AudioError> {
    let output = Command::new("pactl")
        .args(args)
        .output()
        .map_err(|error| AudioError::CommandFailed(error.to_string()))?;

    if output.status.success() {
        Ok(())
    } else {
        Err(AudioError::CommandFailed(
            String::from_utf8_lossy(&output.stderr).trim().to_string(),
        ))
    }
}

fn read_text_command(args: &[&str]) -> Result<String, AudioError> {
    let output = Command::new("pactl")
        .args(args)
        .output()
        .map_err(|error| AudioError::CommandFailed(error.to_string()))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(AudioError::CommandFailed(
            String::from_utf8_lossy(&output.stderr).trim().to_string(),
        ))
    }
}

fn read_json_command(args: &[&str]) -> Result<Value, AudioError> {
    let output = read_text_command(args)?;
    serde_json::from_str(&output).map_err(|error| AudioError::ParseFailed(error.to_string()))
}

fn application_inventory_names(inputs: &[SinkInput]) -> Vec<String> {
    let mut seen = HashSet::<String>::new();
    let mut names = inputs
        .iter()
        .map(SinkInput::primary_name)
        .filter(|value| !value.trim().is_empty())
        .filter_map(|value| {
            let key = normalize_name(value);
            if seen.insert(key) {
                Some(value.to_string())
            } else {
                None
            }
        })
        .collect::<Vec<_>>();

    names.sort_by_key(|value| normalize_name(value));
    names
}

fn parse_sinks(value: &Value) -> Option<Vec<AudioEndpoint>> {
    let array = value.as_array()?;
    Some(
        array
            .iter()
            .filter_map(|entry| {
                Some(AudioEndpoint {
                    name: entry.get("name")?.as_str()?.to_string(),
                    description: entry
                        .get("description")
                        .and_then(Value::as_str)
                        .unwrap_or_else(|| entry.get("name").and_then(Value::as_str).unwrap_or(""))
                        .to_string(),
                })
            })
            .collect(),
    )
}

fn parse_sink_inputs(value: &Value) -> Option<Vec<SinkInput>> {
    let array = value.as_array()?;
    Some(
        array
            .iter()
            .filter_map(|entry| {
                let index = entry.get("index")?.as_u64()?;
                let name = entry
                    .get("name")
                    .and_then(Value::as_str)
                    .unwrap_or("Unknown");
                let properties = entry.get("properties").and_then(Value::as_object);
                let app_name = entry
                    .get("properties")
                    .and_then(Value::as_object)
                    .and_then(|properties| properties.get("application.name"))
                    .and_then(Value::as_str)
                    .unwrap_or(name);

                Some(SinkInput {
                    index,
                    app_name: app_name.to_string(),
                    display_name: name.to_string(),
                    binary_name: property_text(properties, "application.process.binary")
                        .unwrap_or_default(),
                    media_name: property_text(properties, "media.name").unwrap_or_default(),
                    application_id: property_text(properties, "application.id").unwrap_or_default(),
                })
            })
            .collect(),
    )
}

fn parse_sources(raw: &str) -> Vec<AudioEndpoint> {
    split_blocks("Source #", raw.lines())
        .into_iter()
        .filter_map(|block| {
            let name = lookup_field("Name:", &block)?;
            let description = lookup_field("Description:", &block).unwrap_or_else(|| name.clone());
            Some(AudioEndpoint { name, description })
        })
        .collect()
}

fn split_blocks<'a, I>(prefix: &str, lines: I) -> Vec<Vec<String>>
where
    I: Iterator<Item = &'a str>,
{
    let mut blocks = Vec::<Vec<String>>::new();
    let mut current = Vec::<String>::new();

    for line in lines {
        if line.trim_start().starts_with(prefix) && !current.is_empty() {
            blocks.push(current);
            current = Vec::new();
        }
        current.push(line.to_string());
    }

    if !current.is_empty() {
        blocks.push(current);
    }

    blocks
}

fn lookup_field(prefix: &str, block: &[String]) -> Option<String> {
    block.iter().find_map(|line| {
        let trimmed = line.trim_start();
        trimmed
            .strip_prefix(prefix)
            .map(|value| value.trim().to_string())
    })
}

fn normalize_name(value: &str) -> String {
    value.to_ascii_lowercase()
}

fn property_text(properties: Option<&serde_json::Map<String, Value>>, key: &str) -> Option<String> {
    properties
        .and_then(|properties| properties.get(key))
        .and_then(Value::as_str)
        .map(trimmed_string)
        .filter(|value| !value.is_empty())
}

fn resolve_application_matches<'a>(inputs: &'a [SinkInput], needle: &str) -> Vec<&'a SinkInput> {
    let mut scored = inputs
        .iter()
        .filter_map(|input| application_match_score(input, needle).map(|score| (score, input)))
        .collect::<Vec<_>>();

    scored.sort_by(|left, right| {
        right
            .0
            .cmp(&left.0)
            .then_with(|| left.1.index.cmp(&right.1.index))
    });

    let Some(max_score) = scored.first().map(|(score, _)| *score) else {
        return Vec::new();
    };

    let threshold = if max_score >= 95 {
        max_score
    } else if max_score >= 80 {
        80
    } else {
        max_score
    };

    scored
        .into_iter()
        .filter(|(score, _)| *score >= threshold)
        .map(|(_, input)| input)
        .collect()
}

fn application_match_score(input: &SinkInput, needle: &str) -> Option<u16> {
    let normalized_needle = normalize_name(needle);
    if normalized_needle.is_empty() {
        return None;
    }

    let mut best = 0u16;
    for candidate in input.match_labels() {
        let normalized_candidate = normalize_name(candidate);
        if normalized_candidate.is_empty() {
            continue;
        }

        let score = if normalized_candidate == normalized_needle {
            100
        } else if normalized_candidate.replace('-', " ") == normalized_needle
            || normalized_needle.replace('-', " ") == normalized_candidate
        {
            96
        } else if normalized_candidate
            .split(|character: char| !character.is_ascii_alphanumeric())
            .any(|part| !part.is_empty() && part == normalized_needle)
        {
            92
        } else if normalized_candidate.starts_with(&normalized_needle)
            || normalized_needle.starts_with(&normalized_candidate)
        {
            84
        } else if normalized_candidate.contains(&normalized_needle)
            || normalized_needle.contains(&normalized_candidate)
        {
            72
        } else {
            0
        };

        best = best.max(score);
    }

    (best > 0).then_some(best)
}

fn describe_sink_input(input: &SinkInput) -> String {
    let mut parts = vec![format!("#{} {}", input.index, input.primary_name())];

    if !input.media_name.is_empty()
        && normalize_name(&input.media_name) != normalize_name(input.primary_name())
    {
        parts.push(format!("media {}", input.media_name));
    }

    if !input.binary_name.is_empty() {
        parts.push(format!("bin {}", input.binary_name));
    }

    parts.join(" · ")
}

fn build_slider_outcome(targets: Vec<RuntimeTargetOutcome>) -> SliderOutcome {
    let mut updated = 0usize;
    let mut idle = 0usize;
    let mut unavailable = 0usize;
    let mut skipped = 0usize;
    let mut errors = 0usize;

    for target in &targets {
        match target.status {
            TargetOutcomeStatus::Updated => updated += 1,
            TargetOutcomeStatus::Idle => idle += 1,
            TargetOutcomeStatus::Unavailable => unavailable += 1,
            TargetOutcomeStatus::Skipped => skipped += 1,
            TargetOutcomeStatus::Error => errors += 1,
        }
    }

    let severity = if errors > 0 {
        OutcomeSeverity::Error
    } else if unavailable > 0 || idle > 0 {
        OutcomeSeverity::Warning
    } else if updated > 0 {
        OutcomeSeverity::Success
    } else {
        OutcomeSeverity::Info
    };

    let summary = if targets.len() == 1 {
        targets[0].detail.clone()
    } else {
        let mut parts = Vec::<String>::new();
        if updated > 0 {
            parts.push(format!("{updated} updated"));
        }
        if idle > 0 {
            parts.push(format!("{idle} idle"));
        }
        if unavailable > 0 {
            parts.push(format!("{unavailable} unavailable"));
        }
        if skipped > 0 {
            parts.push(format!("{skipped} skipped"));
        }
        if errors > 0 {
            parts.push(format!("{errors} error"));
        }

        if parts.is_empty() {
            "No target actions were produced".to_string()
        } else {
            parts.join(" | ")
        }
    };

    SliderOutcome {
        summary,
        severity,
        targets,
    }
}

fn contains_case_insensitive(candidate: &str, needle: &str) -> bool {
    normalize_name(candidate).contains(&normalize_name(needle))
        || normalize_name(needle).contains(&normalize_name(candidate))
}

fn volume_percent(normalized: f64) -> String {
    format!("{}%", common::volume_percent(normalized))
}

fn trim(value: String) -> String {
    value.trim().to_string()
}

fn trimmed_string(value: &str) -> String {
    value.trim().to_string()
}

impl SinkInput {
    fn primary_name(&self) -> &str {
        if !self.app_name.is_empty() {
            &self.app_name
        } else if !self.binary_name.is_empty() {
            &self.binary_name
        } else if !self.media_name.is_empty() {
            &self.media_name
        } else {
            &self.display_name
        }
    }

    fn match_labels(&self) -> Vec<&str> {
        let mut labels = Vec::<&str>::new();

        for value in [
            self.app_name.as_str(),
            self.binary_name.as_str(),
            self.media_name.as_str(),
            self.application_id.as_str(),
            self.display_name.as_str(),
        ] {
            if !value.trim().is_empty()
                && !labels
                    .iter()
                    .any(|candidate| normalize_name(candidate) == normalize_name(value))
            {
                labels.push(value);
            }
        }

        labels
    }
}

#[cfg(test)]
mod tests {
    use super::{
        application_inventory_names, invalidate_snapshot_cache, parse_sink_inputs, parse_sinks,
        parse_sources, resolve_application_matches, snapshot_cache, PactlSnapshot, SNAPSHOT_TTL,
    };
    use serde_json::json;
    use std::time::Instant;

    #[test]
    fn snapshot_cache_serves_fresh_entries_and_clears_on_invalidate() {
        let snapshot = PactlSnapshot {
            sink_inputs: Vec::new(),
            sinks: Vec::new(),
            sources: Vec::new(),
            default_sink: Some("sink-cacheado".to_string()),
            default_source: None,
            errors: Vec::new(),
        };

        {
            let mut guard = snapshot_cache().lock().expect("cache lock");
            *guard = Some((Instant::now(), snapshot));
        }

        // Entrada recente (dentro do TTL) continua disponível para reuso.
        {
            let guard = snapshot_cache().lock().expect("cache lock");
            let (captured_at, cached) = guard.as_ref().expect("cache should be populated");
            assert!(captured_at.elapsed() < SNAPSHOT_TTL);
            assert_eq!(cached.default_sink.as_deref(), Some("sink-cacheado"));
        }

        // Após uma escrita de volume o cache é descartado para forçar releitura.
        invalidate_snapshot_cache();
        let guard = snapshot_cache().lock().expect("cache lock");
        assert!(guard.is_none());
    }

    #[test]
    fn parses_sink_inventory() {
        let payload = json!([
            {
                "name": "alsa_output.usb",
                "description": "USB Output"
            }
        ]);

        let sinks = parse_sinks(&payload).expect("sinks");
        assert_eq!(sinks[0].name, "alsa_output.usb");
        assert_eq!(sinks[0].description, "USB Output");
    }

    #[test]
    fn parses_sink_inputs_inventory() {
        let payload = json!([
            {
                "index": 42,
                "name": "Playback",
                "properties": {
                    "application.name": "Spotify"
                }
            }
        ]);

        let inputs = parse_sink_inputs(&payload).expect("inputs");
        assert_eq!(inputs[0].index, 42);
        assert_eq!(inputs[0].app_name, "Spotify");
    }

    #[test]
    fn falls_back_to_display_name_when_application_name_is_missing() {
        let payload = json!([
            {
                "index": 77,
                "name": "Firefox Playback",
                "properties": {
                    "media.name": "YouTube"
                }
            }
        ]);

        let inputs = parse_sink_inputs(&payload).expect("inputs");
        assert_eq!(inputs[0].app_name, "Firefox Playback");
        assert_eq!(inputs[0].media_name, "YouTube");
    }

    #[test]
    fn keeps_valid_sink_inputs_when_payload_contains_broken_entries() {
        let payload = json!([
            {
                "name": "Missing index",
                "properties": {
                    "application.name": "Broken"
                }
            },
            {
                "index": 42,
                "name": "Playback",
                "properties": {
                    "application.name": "Spotify",
                    "application.process.binary": "spotify"
                }
            }
        ]);

        let inputs = parse_sink_inputs(&payload).expect("inputs");
        assert_eq!(inputs.len(), 1);
        assert_eq!(inputs[0].binary_name, "spotify");
    }

    #[test]
    fn deduplicates_application_inventory_names() {
        let payload = json!([
            {
                "index": 1,
                "name": "Playback 1",
                "properties": {
                    "application.name": "Spotify"
                }
            },
            {
                "index": 2,
                "name": "Playback 2",
                "properties": {
                    "application.name": "Spotify"
                }
            },
            {
                "index": 3,
                "name": "Firefox Playback",
                "properties": {
                    "application.name": "Firefox"
                }
            }
        ]);

        let inputs = parse_sink_inputs(&payload).expect("inputs");
        assert_eq!(
            application_inventory_names(&inputs),
            vec!["Firefox", "Spotify"]
        );
    }

    #[test]
    fn prefers_exact_application_matches_and_keeps_multiple_streams() {
        let payload = json!([
            {
                "index": 10,
                "name": "Playback 1",
                "properties": {
                    "application.name": "Spotify",
                    "application.process.binary": "spotify"
                }
            },
            {
                "index": 11,
                "name": "Playback 2",
                "properties": {
                    "application.name": "Spotify",
                    "application.process.binary": "spotify"
                }
            },
            {
                "index": 12,
                "name": "Playback 3",
                "properties": {
                    "application.name": "Spotify Helper",
                    "application.process.binary": "spotify-helper"
                }
            }
        ]);

        let inputs = parse_sink_inputs(&payload).expect("inputs");
        let matches = resolve_application_matches(&inputs, "Spotify");

        assert_eq!(matches.len(), 2);
        assert_eq!(matches[0].app_name, "Spotify");
        assert_eq!(matches[1].app_name, "Spotify");
    }

    #[test]
    fn returns_none_for_non_array_json_payloads() {
        let payload = json!({ "broken": true });
        assert!(parse_sinks(&payload).is_none());
        assert!(parse_sink_inputs(&payload).is_none());
    }

    #[test]
    fn parses_sources_inventory() {
        let payload = r#"
Source #55
    Name: alsa_input.usb
    Description: USB Microphone
Source #56
    Name: alsa_output.monitor
    Description: Monitor Source
"#;

        let sources = parse_sources(payload);
        assert_eq!(sources.len(), 2);
        assert_eq!(sources[0].name, "alsa_input.usb");
    }
}
