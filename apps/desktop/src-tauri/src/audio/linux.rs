use std::{collections::HashMap, process::Command};

use serde_json::Value;

use super::{
    ApplySliderTargetsRequest, ApplySliderTargetsResponse, AudioEndpoint, AudioError, AudioInventory,
    AudioTarget, SliderTargetChange,
};

#[derive(Debug, Clone)]
struct SinkInput {
    index: u64,
    app_name: String,
    display_name: String,
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

    let sinks = read_json_command(&["-f", "json", "list", "sinks"])
        .ok()
        .and_then(|value| parse_sinks(&value))
        .unwrap_or_default();
    let applications = read_json_command(&["-f", "json", "list", "sink-inputs"])
        .ok()
        .and_then(|value| parse_sink_inputs(&value))
        .unwrap_or_default();
    let sources = read_text_command(&["list", "sources"])
        .ok()
        .map(|raw| parse_sources(&raw))
        .unwrap_or_default();
    let default_sink = read_text_command(&["get-default-sink"])
        .ok()
        .map(trim)
        .filter(|value| !value.is_empty());
    let default_source = read_text_command(&["get-default-source"])
        .ok()
        .map(trim)
        .filter(|value| !value.is_empty());
    let sink_count = sinks.len();
    let source_count = sources.len();
    let application_count = applications.len();

    AudioInventory {
        backend: "pactl".to_string(),
        applications: applications
            .iter()
            .map(|input| input.app_name.clone())
            .collect(),
        sinks,
        sources,
        default_sink,
        default_source,
        summary: format!(
            "{} app(s), {} sink(s), {} source(s)",
            application_count,
            sink_count,
            source_count
        ),
        diagnostics: vec!["pactl backend ready".to_string()],
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
    let sink_inputs = parse_sink_inputs(
        &read_json_command(&["-f", "json", "list", "sink-inputs"])?,
    )
    .unwrap_or_default();
    let sinks = parse_sinks(&read_json_command(&["-f", "json", "list", "sinks"])?)
        .unwrap_or_default();
    let sources = parse_sources(&read_text_command(&["list", "sources"])?);
    let default_sink = read_text_command(&["get-default-sink"]).ok().map(trim);
    let default_source = read_text_command(&["get-default-source"]).ok().map(trim);

    for slider in request.sliders {
        let outcome = apply_targets(
            &slider,
            &sink_inputs,
            &sinks,
            &sources,
            default_sink.as_deref(),
            default_source.as_deref(),
        )?;
        outcomes.insert(slider.slider_id, outcome);
    }

    Ok(ApplySliderTargetsResponse { outcomes })
}

fn apply_targets(
    slider: &SliderTargetChange,
    sink_inputs: &[SinkInput],
    sinks: &[AudioEndpoint],
    sources: &[AudioEndpoint],
    default_sink: Option<&str>,
    default_source: Option<&str>,
) -> Result<String, AudioError> {
    let volume_arg = volume_percent(slider.normalized_value);
    let mut results = Vec::new();

    for target in &slider.targets {
        match target {
            AudioTarget::Master => {
                run_command(&["set-sink-volume", "@DEFAULT_SINK@", &volume_arg])?;
                results.push("master updated".to_string());
            }
            AudioTarget::Application { name } => {
                let matches = sink_inputs
                    .iter()
                    .filter(|input| {
                        contains_case_insensitive(&input.app_name, name)
                            || contains_case_insensitive(&input.display_name, name)
                    })
                    .collect::<Vec<_>>();

                for input in &matches {
                    run_command(&[
                        "set-sink-input-volume",
                        &input.index.to_string(),
                        &volume_arg,
                    ])?;
                }

                if matches.is_empty() {
                    results.push(format!("app idle: {name}"));
                } else {
                    results.push(format!("app updated: {name} ({})", matches.len()));
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

                for source in &matches {
                    run_command(&["set-source-volume", &source.name, &volume_arg])?;
                }

                if matches.is_empty() {
                    results.push(format!("source unavailable: {name}"));
                } else {
                    results.push(format!("source updated: {name}"));
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

                for sink in &matches {
                    run_command(&["set-sink-volume", &sink.name, &volume_arg])?;
                }

                if matches.is_empty() {
                    results.push(format!("sink unavailable: {name}"));
                } else {
                    results.push(format!("sink updated: {name}"));
                }
            }
        }
    }

    Ok(results.join(" | "))
}

fn has_pactl() -> bool {
    Command::new("pactl")
        .arg("--version")
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false)
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
                let name = entry.get("name").and_then(Value::as_str).unwrap_or("Unknown");
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

fn contains_case_insensitive(candidate: &str, needle: &str) -> bool {
    normalize_name(candidate).contains(&normalize_name(needle))
        || normalize_name(needle).contains(&normalize_name(candidate))
}

fn volume_percent(normalized: f64) -> String {
    let clamped = normalized.clamp(0.0, 1.0);
    format!("{}%", (clamped * 100.0).round() as u32)
}

fn trim(value: String) -> String {
    value.trim().to_string()
}

#[cfg(test)]
mod tests {
    use super::{parse_sink_inputs, parse_sinks, parse_sources};
    use serde_json::json;

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
