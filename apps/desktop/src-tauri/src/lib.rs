mod audio;
mod watch;

use std::{
    fs::{self, OpenOptions},
    io::Write,
    path::{Path, PathBuf},
    sync::{
        atomic::{AtomicU64, Ordering},
        Mutex, OnceLock,
    },
    time::{SystemTime, UNIX_EPOCH},
};

use tauri::{
    menu::MenuBuilder,
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, WindowEvent,
};
use tauri_plugin_autostart::ManagerExt;
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

const TRAY_ICON_ID: &str = "main-tray";
const TRAY_SHOW_ID: &str = "show-main-window";
const TRAY_QUIT_ID: &str = "quit-app";
const STATE_SCHEMA_VERSION_KEY: &str = "schemaVersion";

/// Serializa todo acesso ao `ioruba-state.json` para evitar race entre a leitura
/// no boot e escritas concorrentes (ex.: salvamentos em rajada vindos da store).
static STATE_LOCK: OnceLock<Mutex<()>> = OnceLock::new();
/// Contador monotônico usado no sufixo do arquivo temporário de escrita atômica.
/// Garante nomes `.tmp` distintos mesmo quando o mesmo processo grava em rajada.
static TEMP_FILE_COUNTER: AtomicU64 = AtomicU64::new(0);

fn state_lock() -> &'static Mutex<()> {
    STATE_LOCK.get_or_init(|| Mutex::new(()))
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct ExportWatchLogResult {
    path: String,
    entries: usize,
}

#[tauri::command]
fn load_persisted_state(app: tauri::AppHandle) -> Result<String, String> {
    let _guard = state_lock().lock().map_err(|error| error.to_string())?;
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
    let _guard = state_lock().lock().map_err(|error| error.to_string())?;
    let path = app_state_path(&app)?;
    let backup_path = save_state_payload(&path, &payload)?;

    if let Some(backup_path) = backup_path {
        watch::emit(
            &app,
            watch::WatchScope::Backend,
            watch::WatchLevel::Warning,
            "Backup do estado persistido criado",
            Some(backup_path.display().to_string()),
        );
    }

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
    let result = watch::load_entries_with_report(&path)?;

    if result.malformed_count > 0 {
        watch::emit(
            &app,
            watch::WatchScope::Backend,
            watch::WatchLevel::Warning,
            "Entradas malformadas ignoradas no watch log",
            Some(format!(
                "{} linha(s) descartada(s) em {}",
                result.malformed_count,
                path.display()
            )),
        );
    }

    Ok(result.entries)
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
async fn export_watch_log(
    app: tauri::AppHandle,
    entries: Vec<watch::WatchLogEntry>,
) -> Result<Option<ExportWatchLogResult>, String> {
    let Some(file_path) = app
        .dialog()
        .file()
        .add_filter("JSON Lines", &["jsonl"])
        .add_filter("Text", &["txt"])
        .set_file_name("ioruba-watch-log.jsonl")
        .set_title("Exportar watch log")
        .blocking_save_file()
    else {
        watch::emit(
            &app,
            watch::WatchScope::App,
            watch::WatchLevel::Warning,
            "Exportacao do watch log cancelada",
            None,
        );
        return Ok(None);
    };

    let path = file_path.into_path().map_err(|error| error.to_string())?;
    let exported_entries = watch::export_entries(&path, &entries)?;
    watch::emit(
        &app,
        watch::WatchScope::Backend,
        watch::WatchLevel::Info,
        "Watch log exportado",
        Some(format!(
            "{} evento(s) em {}",
            exported_entries,
            path.display()
        )),
    );

    Ok(Some(ExportWatchLogResult {
        path: path.display().to_string(),
        entries: exported_entries,
    }))
}

#[tauri::command]
async fn export_profile(
    app: tauri::AppHandle,
    file_name: String,
    payload: String,
) -> Result<Option<String>, String> {
    let Some(file_path) = app
        .dialog()
        .file()
        .add_filter("JSON", &["json"])
        .set_file_name(&file_name)
        .set_title("Exportar perfil")
        .blocking_save_file()
    else {
        watch::emit(
            &app,
            watch::WatchScope::App,
            watch::WatchLevel::Warning,
            "Exportacao de perfil cancelada",
            None,
        );
        return Ok(None);
    };

    let path = file_path.into_path().map_err(|error| error.to_string())?;
    atomic_write(&path, &payload)?;
    watch::emit(
        &app,
        watch::WatchScope::Backend,
        watch::WatchLevel::Info,
        "Perfil exportado",
        Some(path.display().to_string()),
    );

    Ok(Some(path.display().to_string()))
}

#[tauri::command]
async fn export_session_stats(
    app: tauri::AppHandle,
    file_name: String,
    payload: String,
) -> Result<Option<String>, String> {
    let Some(file_path) = app
        .dialog()
        .file()
        .add_filter("JSON", &["json"])
        .add_filter("CSV", &["csv"])
        .set_file_name(&file_name)
        .set_title("Exportar estatisticas da sessao")
        .blocking_save_file()
    else {
        watch::emit(
            &app,
            watch::WatchScope::App,
            watch::WatchLevel::Warning,
            "Exportacao de estatisticas cancelada",
            None,
        );
        return Ok(None);
    };

    let path = file_path.into_path().map_err(|error| error.to_string())?;
    atomic_write(&path, &payload)?;
    watch::emit(
        &app,
        watch::WatchScope::Backend,
        watch::WatchLevel::Info,
        "Estatisticas da sessao exportadas",
        Some(path.display().to_string()),
    );

    Ok(Some(path.display().to_string()))
}

#[tauri::command]
async fn import_profile(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let Some(file_path) = app
        .dialog()
        .file()
        .add_filter("JSON", &["json"])
        .set_title("Importar perfil")
        .blocking_pick_file()
    else {
        watch::emit(
            &app,
            watch::WatchScope::App,
            watch::WatchLevel::Warning,
            "Importacao de perfil cancelada",
            None,
        );
        return Ok(None);
    };

    let path = file_path.into_path().map_err(|error| error.to_string())?;
    let payload = fs::read_to_string(&path).map_err(|error| error.to_string())?;
    watch::emit(
        &app,
        watch::WatchScope::Backend,
        watch::WatchLevel::Info,
        "Perfil importado do disco",
        Some(format!("{} bytes de {}", payload.len(), path.display())),
    );

    Ok(Some(payload))
}

#[tauri::command]
fn get_launch_on_login_enabled(app: tauri::AppHandle) -> Result<bool, String> {
    let enabled = app
        .autolaunch()
        .is_enabled()
        .map_err(|error| error.to_string())?;

    watch::emit(
        &app,
        watch::WatchScope::Backend,
        watch::WatchLevel::Info,
        "Estado de inicializacao com a sessao consultado",
        Some(if enabled { "ativado" } else { "desativado" }.to_string()),
    );

    Ok(enabled)
}

#[tauri::command]
fn set_launch_on_login_enabled(app: tauri::AppHandle, enabled: bool) -> Result<bool, String> {
    let autostart = app.autolaunch();

    if enabled {
        autostart.enable().map_err(|error| error.to_string())?;
    } else {
        autostart.disable().map_err(|error| error.to_string())?;
    }

    let actual = autostart.is_enabled().map_err(|error| error.to_string())?;
    watch::emit(
        &app,
        watch::WatchScope::Backend,
        watch::WatchLevel::Info,
        "Inicializacao com a sessao atualizada",
        Some(if actual { "ativado" } else { "desativado" }.to_string()),
    );

    Ok(actual)
}

#[tauri::command]
async fn apply_slider_targets_batch(
    app: tauri::AppHandle,
    request: audio::ApplySliderTargetsRequest,
) -> Result<audio::ApplySliderTargetsResponse, String> {
    let slider_count = request.sliders.len();
    watch::emit(
        &app,
        watch::WatchScope::Backend,
        watch::WatchLevel::Info,
        "Aplicando lote de sliders",
        Some(format!("{slider_count} slider(s)")),
    );

    // O backend de áudio dispara vários comandos `pactl` bloqueantes (fork/exec)
    // por lote. Executá-los na thread de comando do Tauri serializaria o I/O e
    // poderia travar comandos concorrentes sob rajadas de knobs. spawn_blocking
    // move o trabalho para o pool de blocking do runtime, mantendo a thread de
    // comando livre.
    let result =
        tauri::async_runtime::spawn_blocking(move || audio::apply_slider_targets_batch(request))
            .await
            .map_err(|error| format!("falha ao agendar lote de sliders: {error}"))?;

    match result {
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

fn save_state_payload(path: &Path, payload: &str) -> Result<Option<PathBuf>, String> {
    let payload_schema_version = schema_version_from_payload(payload)?;
    let backup_path = backup_state_before_schema_change(path, payload_schema_version)?;
    atomic_write(path, payload)?;
    Ok(backup_path)
}

fn schema_version_from_payload(payload: &str) -> Result<Option<u64>, String> {
    let value: serde_json::Value = serde_json::from_str(payload).map_err(|error| {
        format!("estado persistido invalido: JSON nao pode ser parseado ({error})")
    })?;

    Ok(value
        .get(STATE_SCHEMA_VERSION_KEY)
        .and_then(serde_json::Value::as_u64))
}

fn backup_state_before_schema_change(
    path: &Path,
    next_schema_version: Option<u64>,
) -> Result<Option<PathBuf>, String> {
    if !path.exists() {
        return Ok(None);
    }

    let current_payload = fs::read_to_string(path).map_err(|error| error.to_string())?;
    let current_schema_version = schema_version_from_payload(&current_payload).unwrap_or(None);

    if current_schema_version == next_schema_version {
        return Ok(None);
    }

    let backup_path = backup_state_path(path, current_schema_version);
    fs::copy(path, &backup_path).map_err(|error| error.to_string())?;
    Ok(Some(backup_path))
}

fn backup_state_path(path: &Path, schema_version: Option<u64>) -> PathBuf {
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or_default();
    let schema_label = schema_version
        .map(|version| format!("v{version}"))
        .unwrap_or_else(|| "vunknown".to_string());
    let file_name = format!("ioruba-state.backup.{schema_label}.{timestamp}.json");

    path.parent()
        .map(|parent| parent.join(&file_name))
        .unwrap_or_else(|| PathBuf::from(file_name))
}

fn atomic_write(path: &Path, payload: &str) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }

    // Sufixo único por escrita: pid + contador monotônico + timestamp evitam
    // colisão entre salvamentos em rajada do mesmo processo no mesmo arquivo.
    let unique = TEMP_FILE_COUNTER.fetch_add(1, Ordering::Relaxed);
    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_nanos())
        .unwrap_or_default();
    let temp_path =
        path.with_extension(format!("json.tmp.{}.{unique}.{stamp}", std::process::id()));

    // Escreve o conteúdo e força flush ao disco (fsync) ANTES do rename. Sem isso,
    // um crash entre rename e flush poderia deixar o arquivo final com tamanho
    // correto mas conteúdo zerado em alguns filesystems.
    let write_result = (|| -> std::io::Result<()> {
        let mut file = OpenOptions::new()
            .write(true)
            .create(true)
            .truncate(true)
            .open(&temp_path)?;
        file.write_all(payload.as_bytes())?;
        file.sync_all()?;
        Ok(())
    })();

    if let Err(error) = write_result {
        let _ = fs::remove_file(&temp_path);
        return Err(error.to_string());
    }

    fs::rename(&temp_path, path).map_err(|error| {
        let _ = fs::remove_file(&temp_path);
        error.to_string()
    })?;

    // fsync do diretório-pai garante que a entrada de diretório do rename esteja
    // durável. Best-effort: nem todo filesystem suporta, então não falhamos aqui.
    if let Some(parent) = path.parent() {
        if let Ok(dir) = fs::File::open(parent) {
            let _ = dir.sync_all();
        }
    }

    Ok(())
}

fn show_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

fn hide_to_tray(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
        watch::emit(
            app,
            watch::WatchScope::App,
            watch::WatchLevel::Info,
            "Janela ocultada para o tray",
            Some("runtime permanece ativo em segundo plano".to_string()),
        );
    }
}

fn toggle_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let visible = window.is_visible().unwrap_or(false);
        let focused = window.is_focused().unwrap_or(false);
        if visible && focused {
            hide_to_tray(app);
        } else {
            show_main_window(app);
        }
    }
}

fn launched_by_autostart() -> bool {
    std::env::args().any(|arg| arg == "--autostart")
}

fn setup_tray(app: &tauri::App) -> tauri::Result<()> {
    let menu = MenuBuilder::new(app)
        .text(TRAY_SHOW_ID, "Abrir Ioruba")
        .separator()
        .text(TRAY_QUIT_ID, "Sair")
        .build()?;

    let mut tray_builder = TrayIconBuilder::with_id(TRAY_ICON_ID)
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id().as_ref() {
            TRAY_SHOW_ID => show_main_window(app),
            TRAY_QUIT_ID => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                show_main_window(tray.app_handle());
            }
        });

    if let Some(icon) = app.default_window_icon().cloned() {
        tray_builder = tray_builder.icon(icon);
    }

    tray_builder.build(app)?;

    Ok(())
}

pub fn run() {
    // Atalho global: Ctrl+Alt+I alterna a visibilidade da janela principal.
    // Funciona como fallback caso o compositor nao tenha um StatusNotifierWatcher
    // (ex.: Hyprland sem waybar/ironbar configurado com o modulo tray).
    let toggle_shortcut = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::ALT), Code::KeyI);

    tauri::Builder::default()
        .plugin(
            tauri_plugin_autostart::Builder::new()
                .args(["--autostart"])
                .build(),
        )
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(move |app, shortcut, event| {
                    if shortcut == &toggle_shortcut && event.state() == ShortcutState::Pressed {
                        toggle_main_window(app);
                    }
                })
                .build(),
        )
        .on_window_event(|window, event| {
            if window.label() != "main" {
                return;
            }
            match event {
                WindowEvent::CloseRequested { api, .. } => {
                    // Intercepta o fechamento vindo do compositor (Hyprland
                    // killactive, botao X do decor, Alt+F4, etc.) e oculta a
                    // janela em vez de encerrar o processo. A saida real so
                    // acontece via item "Sair" no menu do tray.
                    api.prevent_close();
                    hide_to_tray(window.app_handle());
                }
                WindowEvent::Destroyed => {
                    watch::emit(
                        window.app_handle(),
                        watch::WatchScope::App,
                        watch::WatchLevel::Info,
                        "Janela principal destruida",
                        None,
                    );
                }
                _ => {}
            }
        })
        .setup(move |app| {
            setup_tray(app)?;
            if let Err(error) = app.global_shortcut().register(toggle_shortcut) {
                watch::emit(
                    app.handle(),
                    watch::WatchScope::App,
                    watch::WatchLevel::Warning,
                    "Falha ao registrar atalho global Ctrl+Alt+I",
                    Some(error.to_string()),
                );
            } else {
                watch::emit(
                    app.handle(),
                    watch::WatchScope::App,
                    watch::WatchLevel::Info,
                    "Atalho global registrado",
                    Some("Ctrl+Alt+I alterna janela principal".to_string()),
                );
            }
            if launched_by_autostart() {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.hide();
                }
                watch::emit(
                    app.handle(),
                    watch::WatchScope::App,
                    watch::WatchLevel::Info,
                    "Aplicacao iniciada por autostart",
                    Some("janela principal mantida oculta no tray".to_string()),
                );
            }
            Ok(())
        })
        .plugin(tauri_plugin_serialplugin::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            load_persisted_state,
            save_persisted_state,
            list_audio_inventory,
            apply_slider_targets_batch,
            load_watch_log_entries,
            save_watch_log_entries,
            append_watch_log_entry,
            clear_watch_log_entries,
            export_watch_log,
            export_profile,
            export_session_stats,
            import_profile,
            get_launch_on_login_enabled,
            set_launch_on_login_enabled
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_state_dir(test_name: &str) -> PathBuf {
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|duration| duration.as_millis())
            .unwrap_or_default();
        let path = std::env::temp_dir().join(format!(
            "ioruba-state-{test_name}-{}-{timestamp}",
            std::process::id()
        ));
        fs::create_dir_all(&path).expect("temp dir should be created");
        path
    }

    #[test]
    fn save_state_payload_creates_backup_when_schema_changes() {
        let dir = temp_state_dir("schema-change");
        let path = dir.join("ioruba-state.json");
        fs::write(&path, r#"{"selectedProfileId":"legacy","profiles":[]}"#)
            .expect("legacy state should be writable");

        let backup = save_state_payload(&path, r#"{"schemaVersion":1,"profiles":[]}"#)
            .expect("state save should succeed")
            .expect("schema change should create backup");
        let saved_payload = fs::read_to_string(&path).expect("state should be readable");
        let backup_payload = fs::read_to_string(&backup).expect("backup should be readable");
        let backup_file_name = backup
            .file_name()
            .and_then(|file_name| file_name.to_str())
            .expect("backup should have valid file name");
        let _ = fs::remove_dir_all(&dir);

        assert_eq!(saved_payload, r#"{"schemaVersion":1,"profiles":[]}"#);
        assert!(backup_file_name.contains(".backup.vunknown."));
        assert!(backup_payload.contains("\"selectedProfileId\":\"legacy\""));
    }

    #[test]
    fn save_state_payload_skips_backup_when_schema_is_unchanged() {
        let dir = temp_state_dir("schema-unchanged");
        let path = dir.join("ioruba-state.json");
        fs::write(&path, r#"{"schemaVersion":1,"profiles":[]}"#).expect("state should be writable");

        let backup = save_state_payload(&path, r#"{"schemaVersion":1,"profiles":["next"]}"#)
            .expect("state save should succeed");
        let saved_payload = fs::read_to_string(&path).expect("state should be readable");
        let _ = fs::remove_dir_all(&dir);

        assert!(backup.is_none());
        assert_eq!(saved_payload, r#"{"schemaVersion":1,"profiles":["next"]}"#);
    }

    #[test]
    fn save_state_payload_rejects_invalid_json_before_overwrite() {
        let dir = temp_state_dir("invalid-json");
        let path = dir.join("ioruba-state.json");
        fs::write(&path, r#"{"schemaVersion":1,"profiles":[]}"#).expect("state should be writable");

        let result = save_state_payload(&path, "{invalid");
        let saved_payload = fs::read_to_string(&path).expect("state should be readable");
        let _ = fs::remove_dir_all(&dir);

        assert!(result.is_err());
        assert_eq!(saved_payload, r#"{"schemaVersion":1,"profiles":[]}"#);
    }
}
