use std::ffi::OsString;
use std::path::Path;

#[cfg(unix)]
use std::os::unix::fs::PermissionsExt;

/// Returns the PATH directories visible to child processes.
/// On Windows release builds the parent process often has a minimal PATH;
/// portable-pty merges machine + user registry entries for PTY shells.
fn path_var() -> Option<OsString> {
    #[cfg(windows)]
    {
        use portable_pty::CommandBuilder;

        CommandBuilder::new("cmd.exe")
            .get_env("PATH")
            .map(|path| path.to_os_string())
            .filter(|path| !path.is_empty())
            .or_else(|| std::env::var_os("PATH").filter(|path| !path.is_empty()))
    }
    #[cfg(not(windows))]
    {
        std::env::var_os("PATH").filter(|path| !path.is_empty())
    }
}

fn path_extensions() -> Vec<String> {
    #[cfg(windows)]
    {
        let default = ".COM;.EXE;.BAT;.CMD";
        let pathext = std::env::var("PATHEXT").unwrap_or_else(|_| default.to_string());
        pathext
            .split(';')
            .filter(|ext| !ext.is_empty())
            .map(|ext| ext.to_ascii_lowercase())
            .collect()
    }
    #[cfg(not(windows))]
    {
        vec![String::new()]
    }
}

fn candidate_names(program: &str) -> Vec<String> {
    let base = program.trim();
    #[cfg(windows)]
    {
        let stem = base
            .strip_suffix(".exe")
            .or_else(|| base.strip_suffix(".EXE"))
            .unwrap_or(base);
        let mut names = vec![stem.to_string(), base.to_string()];
        for ext in path_extensions() {
            names.push(format!("{stem}{ext}"));
        }
        names.sort();
        names.dedup();
        names
    }
    #[cfg(not(windows))]
    {
        vec![base.to_string()]
    }
}

fn is_executable(path: &Path) -> bool {
    if !path.is_file() {
        return false;
    }
    #[cfg(unix)]
    {
        path.metadata()
            .map(|metadata| metadata.permissions().mode() & 0o111 != 0)
            .unwrap_or(false)
    }
    #[cfg(not(unix))]
    {
        true
    }
}

fn standard_grok_install_paths() -> Vec<std::path::PathBuf> {
    let mut paths = Vec::new();
    if let Some(home) = dirs::home_dir() {
        paths.push(home.join(".grok").join("bin").join("grok"));
        paths.push(home.join(".local").join("bin").join("grok"));
    }
    paths
}

fn is_grok_installed() -> bool {
    if is_program_on_path("grok") {
        return true;
    }
    for path in standard_grok_install_paths() {
        if is_executable(&path) {
            return true;
        }
    }
    false
}

/// Returns true when `program` resolves to an executable file on the process PATH.
pub fn is_program_on_path(program: &str) -> bool {
    let program = program.trim();
    if program.is_empty() {
        return false;
    }

    let path_var = match path_var() {
        Some(path) => path,
        None => return false,
    };

    let names = candidate_names(program);
    for dir in std::env::split_paths(&path_var) {
        if dir.as_os_str().is_empty() {
            continue;
        }
        for name in &names {
            if is_executable(&dir.join(name)) {
                return true;
            }
        }
    }

    false
}

#[tauri::command]
pub fn grok_cli_available() -> bool {
    is_grok_installed()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::sync::atomic::{AtomicUsize, Ordering};

    static TEST_DIR_COUNTER: AtomicUsize = AtomicUsize::new(0);

    fn with_path_dir<F: FnOnce(&Path, &Path)>(test: F) {
        let dir = std::env::temp_dir().join(format!(
            "grokden_path_probe_{}_{}",
            std::process::id(),
            TEST_DIR_COUNTER.fetch_add(1, Ordering::Relaxed)
        ));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).expect("create probe dir");
        test(&dir, &dir.join("grok_probe_bin"));
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn empty_program_is_not_on_path() {
        assert!(!is_program_on_path(""));
        assert!(!is_program_on_path("   "));
    }

    #[test]
    fn detects_program_in_custom_path_entry() {
        with_path_dir(|root, bin_dir| {
            fs::create_dir_all(bin_dir).expect("create bin dir");
            let program = bin_dir.join(if cfg!(windows) { "grok.exe" } else { "grok" });
            fs::write(&program, "stub").expect("write stub binary");
            #[cfg(unix)]
            {
                let mut perms = fs::metadata(&program).expect("metadata").permissions();
                perms.set_mode(0o755);
                fs::set_permissions(&program, perms).expect("chmod");
            }

            let original_path = std::env::var_os("PATH");
            let custom_path = if let Some(existing) = original_path.as_ref() {
                let mut paths = vec![bin_dir.as_os_str().to_os_string()];
                paths.extend(std::env::split_paths(existing).map(std::ffi::OsString::from));
                std::env::join_paths(paths).expect("join paths")
            } else {
                std::env::join_paths([bin_dir]).expect("join paths")
            };

            // SAFETY: test runs single-threaded; PATH restored before returning.
            unsafe { std::env::set_var("PATH", &custom_path) };
            assert!(is_program_on_path("grok"));
            if let Some(path) = original_path {
                unsafe { std::env::set_var("PATH", path) };
            } else {
                unsafe { std::env::remove_var("PATH") };
            }

            let _ = root;
        });
    }
}