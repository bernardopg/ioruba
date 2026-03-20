mod audio;
mod watch;

use std::{fs, path::PathBuf};

use tauri::Manager;

#[tauri::command]
fn load_persisted_state(app: tauri::AppHandle) -> Result<String, String> {
    let path = app_state_path(&app)?;
    if !path.exists() {
        watch::emit(
            &app,
            watch::WatchScope::Backend,
            watch::WatchLevel::Info,
            "Estado persistido nao encontrado",
            Some(path.display().to_string()),
        );
        return Ok(String::new());
    }

    let payload = fs::read_to_string(&path).map_err(|error| error.to_string())?;
    watch::emit(
        &app,
        watch::WatchScope::Backend,
        watch::WatchLevel::Info,
        "Estado persistido carregado",
        Some(format!("{} bytes em {}", payload.len(), path.display())),
    );
    Ok(payload)
}

#[tauri::command]
fn save_persisted_state(app: tauri::AppHandle, payload: String) -> Result<(), String> {
    let path = app_state_path(&app)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    fs::write(&path, &payload).map_err(|error| error.to_string())?;
    watch::emit(
        &app,
        watch::WatchScope::Backend,
        watch::WatchLevel::Info,
        "Estado persistido salvo",
        Some(format!("{} bytes em {}", payload.len(), path.display())),
    );
    Ok(())
}

#[tauri::command]
fn list_audio_inventory() -> Result<audio::AudioInventory, String> {
    Ok(audio::list_audio_inventory())
}

#[tauri::command]
fn load_watch_log_entries(app: tauri::AppHandle) -> Result<Vec<watch::WatchLogEntry>, String> {
    let _guard = watch::watch_log_lock()
        .lock()
        .map_err(|error| error.to_string())?;
    let path = watch_log_path(&app)?;
    watch::load_entries(&path)
}

#[tauri::command]
fn save_watch_log_entries(
    app: tauri::AppHandle,
    entries: Vec<watch::WatchLogEntry>,
) -> Result<(), String> {
    let _guard = watch::watch_log_lock()
        .lock()
        .map_err(|error| error.to_string())?;
    let path = watch_log_path(&app)?;
    watch::save_entries(&path, &entries)
}

#[tauri::command]
fn append_watch_log_entry(
    app: tauri::AppHandle,
    entry: watch::WatchLogEntry,
) -> Result<(), String> {
    let _guard = watch::watch_log_lock()
        .lock()
        .map_err(|error| error.to_string())?;
    let path = watch_log_path(&app)?;
    watch::append_entry(&path, entry)
}

#[tauri::command]
fn clear_watch_log_entries(app: tauri::AppHandle) -> Result<(), String> {
    let _guard = watch::watch_log_lock()
        .lock()
        .map_err(|error| error.to_string())?;
    let path = watch_log_path(&app)?;
    watch::clear_entries(&path)
}

#[tauri::command]
fn apply_slider_targets_batch(
    app: tauri::AppHandle,
    request: audio::ApplySliderTargetsRequest,
) -> Result<audio::ApplySliderTargetsResponse, String> {
    watch::emit(
        &app,
        watch::WatchScope::Backend,
        watch::WatchLevel::Info,
        "Aplicando lote de sliders",
        Some(format!("{} slider(s)", request.sliders.len())),
    );

    match audio::apply_slider_targets_batch(request) {
        Ok(response) => {
            watch::emit(
                &app,
                watch::WatchScope::Backend,
                watch::WatchLevel::Info,
                "Lote de sliders concluido",
                Some(format!("{} resultado(s)", response.outcomes.len())),
            );
            Ok(response)
        }
        Err(error) => {
            watch::emit(
                &app,
                watch::WatchScope::Backend,
                watch::WatchLevel::Error,
                "Falha ao aplicar lote de sliders",
                Some(error.to_string()),
            );
            Err(error.to_string())
        }
    }
}

fn app_state_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_config_dir()
        .map_err(|error| error.to_string())
        .map(|path| path.join("ioruba-state.json"))
}

fn watch_log_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_config_dir()
        .map_err(|error| error.to_string())
        .map(|path| path.join("ioruba-watch.log"))
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_serialplugin::init())
        .invoke_handler(tauri::generate_handler![
            load_persisted_state,
            save_persisted_state,
            list_audio_inventory,
            apply_slider_targets_batch,
            load_watch_log_entries,
            save_watch_log_entries,
            append_watch_log_entry,
            clear_watch_log_entries
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
