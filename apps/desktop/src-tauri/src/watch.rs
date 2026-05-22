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

pub struct WatchLogLoadResult {
    pub entries: Vec<WatchLogEntry>,
    pub malformed_count: usize,
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
    load_entries_with_report(path).map(|result| result.entries)
}

pub fn load_entries_with_report(path: &Path) -> Result<WatchLogLoadResult, String> {
    if !path.exists() {
        return Ok(WatchLogLoadResult {
            entries: Vec::new(),
            malformed_count: 0,
        });
    }

    let payload = fs::read_to_string(path).map_err(|error| error.to_string())?;
    let mut entries = Vec::new();
    let mut malformed_count = 0usize;

    for line in payload.lines() {
        if line.trim().is_empty() {
            continue;
        }

        match serde_json::from_str::<WatchLogEntry>(line) {
            Ok(entry) => entries.push(entry),
            Err(_error) => {
                malformed_count += 1;
            }
        }
    }

    Ok(WatchLogLoadResult {
        entries: trim_watch_entries(&entries, WATCH_LOG_MAX_BYTES),
        malformed_count,
    })
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

pub fn export_entries(path: &Path, entries: &[WatchLogEntry]) -> Result<usize, String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }

    let payload = entries
        .iter()
        .map(|entry| serde_json::to_string(entry).map_err(|error| error.to_string()))
        .collect::<Result<Vec<_>, _>>()?
        .join("\n");

    if payload.is_empty() {
        fs::write(path, "").map_err(|error| error.to_string())?;
    } else {
        fs::write(path, format!("{payload}\n")).map_err(|error| error.to_string())?;
    }

    Ok(entries.len())
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

    #[test]
    fn exports_entries_as_json_lines() {
        let temp_path = std::env::temp_dir().join(format!(
            "ioruba-watch-export-test-{}.jsonl",
            std::process::id()
        ));
        let entries = vec![WatchLogEntry {
            seq: 1,
            timestamp_ms: 42,
            scope: WatchScope::App,
            level: WatchLevel::Info,
            message: "exportado".into(),
            detail: Some("detalhe".into()),
        }];

        let count = export_entries(&temp_path, &entries).expect("export should succeed");
        let payload = fs::read_to_string(&temp_path).expect("export should be readable");
        let _ = fs::remove_file(&temp_path);

        assert_eq!(count, 1);
        assert_eq!(payload.lines().count(), 1);
        assert!(payload.contains("\"message\":\"exportado\""));
    }

    #[test]
    fn reports_malformed_lines_when_loading_entries() {
        let temp_path = std::env::temp_dir().join(format!(
            "ioruba-watch-load-test-{}.jsonl",
            std::process::id()
        ));
        let valid_entry = WatchLogEntry {
            seq: 1,
            timestamp_ms: 42,
            scope: WatchScope::Serial,
            level: WatchLevel::Warning,
            message: "valido".into(),
            detail: None,
        };
        let payload = format!(
            "{}\nnot-json\n\n{{\"seq\":\"broken\"}}\n",
            serde_json::to_string(&valid_entry).expect("entry should serialize")
        );
        fs::write(&temp_path, payload).expect("test log should be writable");

        let result = load_entries_with_report(&temp_path).expect("load should succeed");
        let _ = fs::remove_file(&temp_path);

        assert_eq!(result.entries.len(), 1);
        assert_eq!(result.malformed_count, 2);
    }
}
