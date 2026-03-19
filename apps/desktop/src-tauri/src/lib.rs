mod audio;

use std::{fs, path::PathBuf};

use tauri::Manager;

#[tauri::command]
fn load_persisted_state(app: tauri::AppHandle) -> Result<String, String> {
    let path = app_state_path(&app)?;
    if !path.exists() {
        return Ok(String::new());
    }

    fs::read_to_string(path).map_err(|error| error.to_string())
}

#[tauri::command]
fn save_persisted_state(app: tauri::AppHandle, payload: String) -> Result<(), String> {
    let path = app_state_path(&app)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    fs::write(path, payload).map_err(|error| error.to_string())
}

#[tauri::command]
fn list_audio_inventory() -> Result<audio::AudioInventory, String> {
    Ok(audio::list_audio_inventory())
}

#[tauri::command]
fn apply_slider_targets_batch(
    request: audio::ApplySliderTargetsRequest,
) -> Result<audio::ApplySliderTargetsResponse, String> {
    audio::apply_slider_targets_batch(request).map_err(|error| error.to_string())
}

fn app_state_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_config_dir()
        .map_err(|error| error.to_string())
        .map(|path| path.join("ioruba-state.json"))
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_serialplugin::init())
        .invoke_handler(tauri::generate_handler![
            load_persisted_state,
            save_persisted_state,
            list_audio_inventory,
            apply_slider_targets_batch
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
