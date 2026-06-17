mod grok_cli;
mod ide_import;
mod telemetry;
mod terminal;
mod workspace;

use ide_import::EditorImportResult;
use serde::Serialize;
use std::fs;
use std::fs::OpenOptions;
use std::io::ErrorKind;
use std::path::Path;
use std::sync::Mutex;
use tauri::{AppHandle, LogicalSize, Manager, State, window::Color};
use terminal::TerminalState;

const WIZARD_WIDTH: u32 = 1080;
const WIZARD_HEIGHT: u32 = 720;

const IGNORED_NAMES: &[&str] = &[
    "node_modules",
    ".git",
    "dist",
    "build",
    "target",
    ".svelte-kit",
];

#[derive(Serialize, Clone, Debug, PartialEq, Eq)]
struct FileEntry {
    name: String,
    path: String,
    is_dir: bool,
    is_symlink: bool,
}

fn build_file_entry(entry: &fs::DirEntry) -> Result<FileEntry, std::io::Error> {
    let name = entry.file_name().to_string_lossy().to_string();
    let path = entry.path().to_string_lossy().to_string();
    let file_type = entry.file_type()?;
    let is_symlink = file_type.is_symlink();

    if is_symlink {
        let is_dir = entry.metadata().map(|metadata| metadata.is_dir()).unwrap_or(false);
        return Ok(FileEntry {
            name,
            path,
            is_dir,
            is_symlink: true,
        });
    }

    let metadata = entry.metadata()?;
    Ok(FileEntry {
        name,
        path,
        is_dir: metadata.is_dir(),
        is_symlink: false,
    })
}

fn collect_folder_entries(
    folder_path: &Path,
    _follow_symlinks: bool,
) -> Result<Vec<FileEntry>, String> {
    if !folder_path.is_dir() {
        return Err("Path is not a directory".to_string());
    }

    let mut entries = Vec::new();

    for entry in fs::read_dir(folder_path).map_err(|e| e.to_string())? {
        let entry = match entry {
            Ok(entry) => entry,
            Err(error) if error.kind() == ErrorKind::PermissionDenied => continue,
            Err(error) => return Err(error.to_string()),
        };
        let name = entry.file_name().to_string_lossy().to_string();

        if IGNORED_NAMES.contains(&name.as_str()) {
            continue;
        }

        match build_file_entry(&entry) {
            Ok(file_entry) => entries.push(file_entry),
            Err(error) if error.kind() == ErrorKind::PermissionDenied => continue,
            Err(error) => {
                return Err(format!(
                    "Failed to read entry '{}': {error}",
                    entry.path().display()
                ));
            }
        }
    }

    entries.sort_by(|a, b| match (a.is_dir, b.is_dir) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    });

    Ok(entries)
}

#[tauri::command]
fn list_folder(folder_path: String, follow_symlinks: Option<bool>) -> Result<Vec<FileEntry>, String> {
    let follow_symlinks = follow_symlinks.unwrap_or(true);
    collect_folder_entries(Path::new(&folder_path), follow_symlinks)
}

const MAX_READ_FILE_BYTES: u64 = 10 * 1024 * 1024;

#[tauri::command]
fn read_file(
    state: State<'_, workspace::WorkspaceState>,
    file_path: String,
) -> Result<String, String> {
    let path = state.resolve_workspace_path(&file_path)?;
    let metadata = fs::metadata(&path).map_err(|e| format!("Failed to read file metadata: {e}"))?;
    if metadata.len() > MAX_READ_FILE_BYTES {
        return Err(format!(
            "File exceeds maximum read size of {} bytes",
            MAX_READ_FILE_BYTES
        ));
    }
    fs::read_to_string(&path).map_err(|e| format!("Failed to read file: {e}"))
}

#[tauri::command]
fn save_file(
    state: State<'_, workspace::WorkspaceState>,
    file_path: String,
    content: String,
) -> Result<(), String> {
    let path = state.resolve_workspace_path(&file_path)?;
    let mut tmp_path = path.clone();
    let file_name = path
        .file_name()
        .ok_or_else(|| "Invalid file path".to_string())?
        .to_string_lossy()
        .to_string();
    tmp_path.set_file_name(format!("{file_name}.tmp"));

    fs::write(&tmp_path, content).map_err(|e| format!("Failed to save file: {e}"))?;
    fs::rename(&tmp_path, &path).map_err(|e| {
        let _ = fs::remove_file(&tmp_path);
        format!("Failed to finalize save: {e}")
    })
}

fn validate_name(name: &str) -> Result<(), String> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err("Name cannot be empty".to_string());
    }
    if trimmed.contains("..") || trimmed.contains('/') || trimmed.contains('\\') {
        return Err("Name cannot contain .., /, or \\".to_string());
    }
    Ok(())
}

#[tauri::command]
fn path_exists(path: String) -> Result<bool, String> {
    Ok(Path::new(&path).exists())
}

#[tauri::command]
fn create_file(
    state: State<'_, workspace::WorkspaceState>,
    parent_path: String,
    name: String,
) -> Result<String, String> {
    validate_name(&name)?;
    let parent = state.resolve_workspace_path(&parent_path)?;
    if !parent.is_dir() {
        return Err("Parent path is not a directory".to_string());
    }

    let file_path = parent.join(name.trim());
    state.resolve_workspace_path(&file_path.to_string_lossy())?;

    OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&file_path)
        .map_err(|e| {
            if e.kind() == ErrorKind::AlreadyExists {
                "A file or folder with that name already exists".to_string()
            } else {
                format!("Failed to create file: {e}")
            }
        })?;
    Ok(file_path.to_string_lossy().to_string())
}

#[tauri::command]
fn create_folder(
    state: State<'_, workspace::WorkspaceState>,
    parent_path: String,
    name: String,
) -> Result<String, String> {
    validate_name(&name)?;
    let parent = state.resolve_workspace_path(&parent_path)?;
    if !parent.is_dir() {
        return Err("Parent path is not a directory".to_string());
    }

    let folder_path = parent.join(name.trim());
    state.resolve_workspace_path(&folder_path.to_string_lossy())?;

    if folder_path.exists() {
        return Err("A file or folder with that name already exists".to_string());
    }

    fs::create_dir(&folder_path).map_err(|e| format!("Failed to create folder: {e}"))?;
    Ok(folder_path.to_string_lossy().to_string())
}

fn center_window(main: &tauri::WebviewWindow) {
    let _ = main.center();
}

fn lock_wizard_window(main: &tauri::WebviewWindow) -> Result<(), String> {
    let _ = main.set_maximizable(false);
    let _ = main.set_resizable(false);
    main
        .set_size(LogicalSize::new(WIZARD_WIDTH, WIZARD_HEIGHT))
        .map_err(|e| e.to_string())?;
    center_window(main);
    Ok(())
}

fn unlock_workspace_window(main: &tauri::WebviewWindow) -> Result<(), String> {
    let _ = main.set_maximizable(true);
    main.set_resizable(true).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn read_editor_settings(source: String) -> Result<EditorImportResult, String> {
    ide_import::read_editor_settings(source)
}

#[tauri::command]
fn telemetry_record(
    app: AppHandle,
    event: String,
    properties: Option<serde_json::Value>,
) -> Result<(), String> {
    telemetry::record_event(&app, event, properties)
}

#[tauri::command]
fn telemetry_set_enabled(enabled: bool) -> Result<(), String> {
    telemetry::set_enabled(enabled);
    Ok(())
}

#[tauri::command]
fn telemetry_get_storage_info(app: AppHandle) -> Result<telemetry::TelemetryStorageInfo, String> {
    telemetry::storage_info(&app)
}

#[tauri::command]
fn telemetry_clear(app: AppHandle) -> Result<(), String> {
    telemetry::clear_events(&app)
}

#[tauri::command]
fn prepare_wizard_window(app: AppHandle) -> Result<(), String> {
    let Some(main) = app.get_webview_window("main") else {
        return Ok(());
    };
    let _ = main.unminimize();
    if main.is_maximized().unwrap_or(false) {
        let _ = main.unmaximize();
    }
    if main.is_fullscreen().unwrap_or(false) {
        let _ = main.set_fullscreen(false);
    }
    lock_wizard_window(&main)?;
    let _ = main.show();
    let _ = main.set_focus();
    Ok(())
}

#[tauri::command]
fn transition_to_workspace(app: AppHandle) -> Result<(), String> {
    let Some(main) = app.get_webview_window("main") else {
        return Ok(());
    };
    let _ = main.unminimize();
    let _ = main.show();
    if main.is_fullscreen().unwrap_or(false) {
        let _ = main.set_fullscreen(false);
    }
    if main.is_maximized().unwrap_or(false) {
        let _ = main.unmaximize();
    }
    unlock_workspace_window(&main)?;
    center_window(&main);
    let _ = main.set_focus();
    Ok(())
}

#[tauri::command]
fn app_ready(app: AppHandle) -> Result<(), String> {
    transition_to_workspace(app)
}

#[derive(Serialize, Clone, Debug, PartialEq, Eq)]
struct WindowTransparencyResult {
    effect: String,
    percent: u8,
}

static LAST_WINDOW_TRANSPARENCY: Mutex<Option<WindowTransparencyResult>> = Mutex::new(None);

/// Toggle webview background only — frosted glass is handled in CSS via backdrop-filter.
#[tauri::command]
fn set_window_transparency(
    app: AppHandle,
    percent: u8,
) -> Result<WindowTransparencyResult, String> {
    let percent = percent.clamp(50, 100);

    if let Ok(last) = LAST_WINDOW_TRANSPARENCY.lock() {
        if let Some(cached) = last.as_ref() {
            if cached.percent == percent {
                return Ok(cached.clone());
            }
        }
    }

    let opaque_bg = Color::from((9_u8, 9, 13, 255));
    let transparent_bg = Color::from((0_u8, 0, 0, 0));

    let result = if percent >= 100 {
        WindowTransparencyResult {
            effect: "opaque".to_string(),
            percent,
        }
    } else {
        WindowTransparencyResult {
            effect: "css-blur".to_string(),
            percent,
        }
    };

    let Some(window) = app.get_webview_window("main") else {
        return Ok(result);
    };

    if percent >= 100 {
        window
            .set_background_color(Some(opaque_bg))
            .map_err(|e| e.to_string())?;
    } else {
        window
            .set_background_color(Some(transparent_bg))
            .map_err(|e| e.to_string())?;
    }

    if let Ok(mut last) = LAST_WINDOW_TRANSPARENCY.lock() {
        *last = Some(result.clone());
    }

    Ok(result)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(TerminalState::new())
        .manage(workspace::WorkspaceState::new())
        .setup(|app| {
            if let Some(main) = app.get_webview_window("main") {
                let _ = lock_wizard_window(&main);
                let _ = main.set_background_color(Some(Color::from((9_u8, 9, 13, 255))));
                let _ = main.show();
                let _ = main.set_focus();
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            list_folder,
            read_file,
            save_file,
            path_exists,
            create_file,
            create_folder,
            grok_cli::grok_cli_available,
            terminal::terminal_spawn,
            terminal::terminal_write,
            terminal::terminal_resize,
            terminal::terminal_close,
            read_editor_settings,
            telemetry_record,
            telemetry_set_enabled,
            telemetry_get_storage_info,
            telemetry_clear,
            app_ready,
            prepare_wizard_window,
            transition_to_workspace,
            set_window_transparency,
            workspace::workspace_open,
            workspace::workspace_close,
            workspace::workspace_get_info,
            workspace::workspace_children,
            workspace::workspace_refresh,
            workspace::workspace_git_status,
            workspace::workspace_search_fuzzy
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}



#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicUsize, Ordering};

    static TEST_DIR_COUNTER: AtomicUsize = AtomicUsize::new(0);

    fn can_create_symlinks() -> bool {
        let dir = std::env::temp_dir().join(format!(
            "grokden_symlink_probe_{}_{}",
            std::process::id(),
            TEST_DIR_COUNTER.fetch_add(1, Ordering::Relaxed)
        ));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).expect("create probe dir");
        let target = dir.join("target.txt");
        let link = dir.join("link.txt");
        fs::write(&target, "x").expect("write probe target");

        #[cfg(unix)]
        let result = std::os::unix::fs::symlink(&target, &link);
        #[cfg(windows)]
        let result = std::os::windows::fs::symlink_file(&target, &link);

        let _ = fs::remove_dir_all(&dir);
        result.is_ok()
    }

    fn with_test_dir<F: FnOnce(&Path)>(test: F) {
        let dir = std::env::temp_dir().join(format!(
            "grokden_list_folder_test_{}_{}",
            std::process::id(),
            TEST_DIR_COUNTER.fetch_add(1, Ordering::Relaxed)
        ));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).expect("create test dir");
        test(&dir);
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn list_folder_rejects_missing_directory() {
        let err = collect_folder_entries(
            Path::new("/nonexistent/grokden/missing-folder"),
            true,
        )
            .expect_err("missing directory should fail");
        assert_eq!(err, "Path is not a directory");
    }

    #[test]
    fn list_folder_lists_regular_files_and_directories() {
        with_test_dir(|dir| {
            fs::write(dir.join("alpha.txt"), "a").expect("write file");
            fs::create_dir(dir.join("Beta")).expect("create dir");

            let entries = collect_folder_entries(dir, true).expect("list folder");
            assert_eq!(entries.len(), 2);
            assert!(entries.iter().any(|entry| entry.name == "Beta" && entry.is_dir));
            assert!(entries
                .iter()
                .any(|entry| entry.name == "alpha.txt" && !entry.is_dir && !entry.is_symlink));
        });
    }

    #[test]
    fn list_folder_skips_ignored_names() {
        with_test_dir(|dir| {
            fs::create_dir(dir.join("node_modules")).expect("create ignored dir");
            fs::write(dir.join("visible.txt"), "x").expect("write visible file");

            let entries = collect_folder_entries(dir, true).expect("list folder");
            assert_eq!(entries.len(), 1);
            assert_eq!(entries[0].name, "visible.txt");
        });
    }

    #[test]
    fn list_folder_handles_symlinks_when_available() {
        if !can_create_symlinks() {
            eprintln!("Skipping symlink tests: symlink creation unavailable");
            return;
        }

        with_test_dir(|dir| {
            let real_dir = dir.join("real_dir");
            let real_file = dir.join("real_file.txt");
            let link_dir = dir.join("link_dir");
            let link_file = dir.join("link_file.txt");
            let broken_link = dir.join("broken_link");

            fs::create_dir(&real_dir).expect("create real dir");
            fs::write(&real_file, "data").expect("write real file");

            #[cfg(unix)]
            {
                std::os::unix::fs::symlink(&real_dir, &link_dir).expect("dir symlink");
                std::os::unix::fs::symlink(&real_file, &link_file).expect("file symlink");
                std::os::unix::fs::symlink(dir.join("missing"), &broken_link).expect("broken symlink");
            }
            #[cfg(windows)]
            {
                std::os::windows::fs::symlink_dir(&real_dir, &link_dir).expect("dir symlink");
                std::os::windows::fs::symlink_file(&real_file, &link_file).expect("file symlink");
                std::os::windows::fs::symlink_file(dir.join("missing"), &broken_link)
                    .expect("broken symlink");
            }

            let follow = collect_folder_entries(dir, true).expect("list with follow");
            let no_follow = collect_folder_entries(dir, false).expect("list without follow");

            for entries in [follow, no_follow] {
                let dir_link = entries
                    .iter()
                    .find(|entry| entry.name == "link_dir")
                    .expect("dir symlink entry");
                assert!(dir_link.is_symlink);
                assert!(dir_link.is_dir);

                let file_link = entries
                    .iter()
                    .find(|entry| entry.name == "link_file")
                    .expect("file symlink entry");
                assert!(file_link.is_symlink);
                assert!(!file_link.is_dir);

                let broken = entries
                    .iter()
                    .find(|entry| entry.name == "broken_link")
                    .expect("broken symlink entry");
                assert!(broken.is_symlink);
                assert!(!broken.is_dir);
            }
        });
    }
}