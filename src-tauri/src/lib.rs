mod grok_cli;
mod terminal;

use serde::Serialize;
use std::fs;
use std::path::Path;
use terminal::TerminalState;

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
        let entry = entry.map_err(|e| e.to_string())?;
        let name = entry.file_name().to_string_lossy().to_string();

        if IGNORED_NAMES.contains(&name.as_str()) {
            continue;
        }

        match build_file_entry(&entry) {
            Ok(file_entry) => entries.push(file_entry),
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

#[tauri::command]
fn read_file(file_path: String) -> Result<String, String> {
    fs::read_to_string(&file_path).map_err(|e| format!("Failed to read file: {e}"))
}

#[tauri::command]
fn save_file(file_path: String, content: String) -> Result<(), String> {
    fs::write(&file_path, content).map_err(|e| format!("Failed to save file: {e}"))
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
fn create_file(parent_path: String, name: String) -> Result<String, String> {
    validate_name(&name)?;
    let parent = Path::new(&parent_path);
    if !parent.is_dir() {
        return Err("Parent path is not a directory".to_string());
    }

    let file_path = parent.join(name.trim());
    if file_path.exists() {
        return Err("A file or folder with that name already exists".to_string());
    }

    fs::write(&file_path, "").map_err(|e| format!("Failed to create file: {e}"))?;
    Ok(file_path.to_string_lossy().to_string())
}

#[tauri::command]
fn create_folder(parent_path: String, name: String) -> Result<String, String> {
    validate_name(&name)?;
    let parent = Path::new(&parent_path);
    if !parent.is_dir() {
        return Err("Parent path is not a directory".to_string());
    }

    let folder_path = parent.join(name.trim());
    if folder_path.exists() {
        return Err("A file or folder with that name already exists".to_string());
    }

    fs::create_dir(&folder_path).map_err(|e| format!("Failed to create folder: {e}"))?;
    Ok(folder_path.to_string_lossy().to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(TerminalState::new())
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
            terminal::terminal_close
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