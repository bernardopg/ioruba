use serde::{Deserialize, Serialize};
use std::{
    fs,
    path::Path,
    sync::{Mutex, OnceLock},
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, Emitter, Runtime};

const WATCH_EVENT_NAME: &str = "ioruba:watch-log";
const WATCH_LOG_MAX_BYTES: usize = 1_048_576;
static WATCH_LOG_LOCK: OnceLock<Mutex<()>> = OnceLock::new();

#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
#[allow(dead_code)]
pub enum WatchScope {
    App,
    Serial,
    Backend,
}

#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
#[allow(dead_code)]
pub enum WatchLevel {
    Info,
    Warning,
    Error,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WatchEvent {
    pub timestamp_ms: u64,
    pub scope: WatchScope,
    pub level: WatchLevel,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub detail: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WatchLogEntry {
    pub seq: u64,
    pub timestamp_ms: u64,
    pub scope: WatchScope,
    pub level: WatchLevel,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub detail: Option<String>,
}

pub fn watch_log_lock() -> &'static Mutex<()> {
    WATCH_LOG_LOCK.get_or_init(|| Mutex::new(()))
}

pub fn emit<R: Runtime>(
    app: &AppHandle<R>,
    scope: WatchScope,
    level: WatchLevel,
    message: impl Into<String>,
    detail: Option<String>,
) {
    let event = WatchEvent {
        timestamp_ms: now_ms(),
        scope,
        level,
        message: message.into(),
        detail,
    };

    println!(
        "[watch][{}][{}] {}{}",
        scope_label(scope),
        level_label(level),
        event.message,
        event
            .detail
            .as_ref()
            .map(|value| format!(" | {value}"))
            .unwrap_or_default()
    );

    let _ = app.emit(WATCH_EVENT_NAME, event);
}

pub fn load_entries(path: &Path) -> Result<Vec<WatchLogEntry>, String> {
    if !path.exists() {
        return Ok(Vec::new());
    }

    let payload = fs::read_to_string(path).map_err(|error| error.to_string())?;
    let mut entries = Vec::new();

    for line in payload.lines() {
        if line.trim().is_empty() {
            continue;
        }

        match serde_json::from_str::<WatchLogEntry>(line) {
            Ok(entry) => entries.push(entry),
            Err(_error) => {
                continue;
            }
        }
    }

    Ok(trim_watch_entries(&entries, WATCH_LOG_MAX_BYTES))
}

pub fn save_entries(path: &Path, entries: &[WatchLogEntry]) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }

    let trimmed = trim_watch_entries(entries, WATCH_LOG_MAX_BYTES);
    let payload = trimmed
        .iter()
        .map(|entry| serde_json::to_string(entry).map_err(|error| error.to_string()))
        .collect::<Result<Vec<_>, _>>()?
        .join("\n");

    if payload.is_empty() {
        fs::write(path, "").map_err(|error| error.to_string())?;
    } else {
        fs::write(path, format!("{payload}\n")).map_err(|error| error.to_string())?;
    }

    Ok(())
}

pub fn append_entry(path: &Path, entry: WatchLogEntry) -> Result<(), String> {
    let mut entries = load_entries(path)?;
    entries.push(entry);
    save_entries(path, &entries)
}

pub fn clear_entries(path: &Path) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }

    fs::write(path, "").map_err(|error| error.to_string())?;
    Ok(())
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as u64)
        .unwrap_or_default()
}

fn scope_label(scope: WatchScope) -> &'static str {
    match scope {
        WatchScope::App => "app",
        WatchScope::Serial => "serial",
        WatchScope::Backend => "backend",
    }
}

fn level_label(level: WatchLevel) -> &'static str {
    match level {
        WatchLevel::Info => "info",
        WatchLevel::Warning => "warning",
        WatchLevel::Error => "error",
    }
}

fn trim_watch_entries(entries: &[WatchLogEntry], max_bytes: usize) -> Vec<WatchLogEntry> {
    let mut kept = Vec::new();
    let mut total_bytes = 0usize;

    for entry in entries.iter().rev() {
        let serialized = match serde_json::to_string(entry) {
            Ok(serialized) => serialized,
            Err(_) => continue,
        };

        let entry_bytes = serialized.len() + 1;
        if !kept.is_empty() && total_bytes + entry_bytes > max_bytes {
            continue;
        }

        total_bytes += entry_bytes;
        kept.push(entry.clone());
    }

    kept.reverse();
    kept
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn trims_old_entries_when_file_limit_is_reached() {
        let entries = vec![
            WatchLogEntry {
                seq: 1,
                timestamp_ms: 1,
                scope: WatchScope::App,
                level: WatchLevel::Info,
                message: "primeiro".into(),
                detail: None,
            },
            WatchLogEntry {
                seq: 2,
                timestamp_ms: 2,
                scope: WatchScope::Serial,
                level: WatchLevel::Warning,
                message: "segundo".into(),
                detail: Some("x".repeat(64)),
            },
            WatchLogEntry {
                seq: 3,
                timestamp_ms: 3,
                scope: WatchScope::Backend,
                level: WatchLevel::Error,
                message: "terceiro".into(),
                detail: Some("y".repeat(128)),
            },
        ];

        let trimmed = trim_watch_entries(&entries, 220);

        assert_eq!(trimmed.last().map(|entry| entry.seq), Some(3));
        assert!(trimmed.len() < entries.len());
    }
}
