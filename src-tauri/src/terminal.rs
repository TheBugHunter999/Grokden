use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use parking_lot::Mutex;
use portable_pty::{
    native_pty_system, Child, ChildKiller, CommandBuilder, MasterPty, PtySize, SlavePty,
};
use serde::Serialize;
use std::collections::HashMap;
use std::io::{Read, Write};
use std::path::Path;
use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tauri::{AppHandle, Emitter, State};

const DEFAULT_COLS: u16 = 80;
const DEFAULT_ROWS: u16 = 24;
const READ_BUFFER_SIZE: usize = 4096;

#[derive(Clone, Serialize)]
struct TerminalOutputEvent {
    id: u32,
    data: String,
}

struct TerminalSession {
    _slave: Box<dyn SlavePty + Send>,
    master: Box<dyn MasterPty + Send>,
    writer: Mutex<Box<dyn Write + Send>>,
    // Keeps the child handle alive until the session is dropped.
    #[allow(dead_code)]
    child: Arc<Mutex<Box<dyn Child + Send + Sync>>>,
    killer: Box<dyn ChildKiller + Send + Sync>,
    alive: Arc<AtomicBool>,
}

pub struct TerminalState {
    sessions: Arc<Mutex<HashMap<u32, TerminalSession>>>,
    next_id: AtomicU32,
}

impl TerminalState {
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(Mutex::new(HashMap::new())),
            next_id: AtomicU32::new(1),
        }
    }

    #[cfg(test)]
    pub fn session_count(&self) -> usize {
        self.sessions.lock().len()
    }
}

impl Default for TerminalState {
    fn default() -> Self {
        Self::new()
    }
}

fn default_shell() -> String {
    #[cfg(windows)]
    {
        const POWERSHELL: &str =
            r"C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe";
        if Path::new(POWERSHELL).exists() {
            return POWERSHELL.to_string();
        }
        if let Ok(path) = std::env::var("COMSPEC") {
            if Path::new(&path).exists() {
                return path;
            }
        }
        "powershell.exe".to_string()
    }
    #[cfg(not(windows))]
    {
        std::env::var("SHELL").unwrap_or_else(|_| "/bin/bash".to_string())
    }
}

fn resolve_shell(shell: Option<String>) -> String {
    shell
        .filter(|value| !value.trim().is_empty())
        .unwrap_or_else(default_shell)
}

fn encode_output(bytes: &[u8]) -> String {
    if std::str::from_utf8(bytes).is_ok() {
        String::from_utf8_lossy(bytes).into_owned()
    } else {
        BASE64.encode(bytes)
    }
}

fn cleanup_spawned_child(killer: &mut Box<dyn ChildKiller + Send + Sync>) {
    let _ = killer.kill();
}

fn remove_session(
    id: u32,
    alive: &AtomicBool,
    sessions: &Arc<Mutex<HashMap<u32, TerminalSession>>>,
) {
    alive.store(false, Ordering::Relaxed);
    if let Some(session) = sessions.lock().remove(&id) {
        let mut killer = session.killer;
        cleanup_spawned_child(&mut killer);
    }
}

type OutputCallback = Arc<dyn Fn(u32, String) + Send + Sync>;

fn spawn_child_watcher(
    id: u32,
    child: Arc<Mutex<Box<dyn Child + Send + Sync>>>,
    alive: Arc<AtomicBool>,
    sessions: Arc<Mutex<HashMap<u32, TerminalSession>>>,
) {
    std::thread::spawn(move || {
        loop {
            if !alive.load(Ordering::Relaxed) {
                return;
            }

            let exited = {
                let mut child = child.lock();
                match child.try_wait() {
                    Ok(Some(_)) | Err(_) => true,
                    Ok(None) => false,
                }
            };

            if exited {
                remove_session(id, &alive, &sessions);
                return;
            }

            std::thread::sleep(Duration::from_millis(50));
        }
    });
}

fn spawn_reader_thread(
    id: u32,
    mut reader: Box<dyn Read + Send>,
    on_output: Option<OutputCallback>,
    alive: Arc<AtomicBool>,
    sessions: Arc<Mutex<HashMap<u32, TerminalSession>>>,
) {
    std::thread::spawn(move || {
        let mut buffer = [0u8; READ_BUFFER_SIZE];

        while alive.load(Ordering::Relaxed) {
            match reader.read(&mut buffer) {
                Ok(0) => break,
                Ok(count) => {
                    let data = encode_output(&buffer[..count]);
                    if let Some(on_output) = on_output.as_ref() {
                        on_output(id, data);
                    }
                }
                Err(_) => break,
            }
        }

        remove_session(id, &alive, &sessions);
    });
}

fn spawn_terminal_session(
    shell: Option<String>,
    shell_args: Option<Vec<String>>,
    cwd: Option<String>,
    state: &TerminalState,
    on_output: Option<OutputCallback>,
) -> Result<u32, String> {
    let shell_path = resolve_shell(shell);

    if let Some(ref dir) = cwd {
        let path = Path::new(dir);
        if !path.is_dir() {
            return Err(format!("Working directory does not exist: {dir}"));
        }
    }

    let pty_system = native_pty_system();
    let pair = pty_system
        .openpty(PtySize {
            rows: DEFAULT_ROWS,
            cols: DEFAULT_COLS,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|error| format!("Failed to open PTY: {error}"))?;

    let mut command = CommandBuilder::new(&shell_path);
    if let Some(args) = shell_args {
        for arg in args {
            command.arg(arg);
        }
    } else if shell_path.to_lowercase().contains("powershell") {
        command.arg("-NoLogo");
    }
    if let Some(dir) = cwd {
        command.cwd(dir);
    }

    let child = pair
        .slave
        .spawn_command(command)
        .map_err(|error| format!("Failed to spawn shell '{shell_path}': {error}"))?;

    let mut killer = child.clone_killer();

    let reader = match pair.master.try_clone_reader() {
        Ok(reader) => reader,
        Err(error) => {
            cleanup_spawned_child(&mut killer);
            return Err(format!("Failed to clone PTY reader: {error}"));
        }
    };

    let writer = match pair.master.take_writer() {
        Ok(writer) => writer,
        Err(error) => {
            cleanup_spawned_child(&mut killer);
            return Err(format!("Failed to open PTY writer: {error}"));
        }
    };

    let id = state.next_id.fetch_add(1, Ordering::Relaxed);
    let alive = Arc::new(AtomicBool::new(true));
    let child = Arc::new(Mutex::new(child));

    spawn_reader_thread(
        id,
        reader,
        on_output,
        Arc::clone(&alive),
        Arc::clone(&state.sessions),
    );
    spawn_child_watcher(
        id,
        Arc::clone(&child),
        Arc::clone(&alive),
        Arc::clone(&state.sessions),
    );

    let session = TerminalSession {
        _slave: pair.slave,
        master: pair.master,
        writer: Mutex::new(writer),
        child,
        killer,
        alive,
    };

    state.sessions.lock().insert(id, session);

    Ok(id)
}

#[tauri::command]
pub fn terminal_spawn(
    shell: Option<String>,
    cwd: Option<String>,
    state: State<'_, TerminalState>,
    app_handle: AppHandle,
) -> Result<u32, String> {
    let app_handle = app_handle.clone();
    let on_output: OutputCallback = Arc::new(move |id, data| {
        let _ = app_handle.emit("terminal-output", TerminalOutputEvent { id, data });
    });
    spawn_terminal_session(shell, None, cwd, state.inner(), Some(on_output))
}

fn write_terminal_session(id: u32, data: String, state: &TerminalState) -> Result<(), String> {
    let sessions = state.sessions.lock();
    let session = sessions
        .get(&id)
        .ok_or_else(|| format!("Terminal session {id} not found"))?;

    if !session.alive.load(Ordering::Relaxed) {
        return Err(format!("Terminal session {id} is closed"));
    }

    let mut writer = session.writer.lock();
    writer
        .write_all(data.as_bytes())
        .map_err(|error| format!("Failed to write to terminal {id}: {error}"))?;
    writer
        .flush()
        .map_err(|error| format!("Failed to flush terminal {id}: {error}"))?;

    Ok(())
}

#[tauri::command]
pub fn terminal_write(id: u32, data: String, state: State<'_, TerminalState>) -> Result<(), String> {
    write_terminal_session(id, data, state.inner())
}

fn resize_terminal_session(id: u32, cols: u32, rows: u32, state: &TerminalState) -> Result<(), String> {
    let sessions = state.sessions.lock();
    let session = sessions
        .get(&id)
        .ok_or_else(|| format!("Terminal session {id} not found"))?;

    if !session.alive.load(Ordering::Relaxed) {
        return Err(format!("Terminal session {id} is closed"));
    }

    let cols = u16::try_from(cols).map_err(|_| "Column count exceeds u16::MAX".to_string())?;
    let rows = u16::try_from(rows).map_err(|_| "Row count exceeds u16::MAX".to_string())?;

    session
        .master
        .resize(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|error| format!("Failed to resize terminal {id}: {error}"))?;

    Ok(())
}

#[tauri::command]
pub fn terminal_resize(
    id: u32,
    cols: u32,
    rows: u32,
    state: State<'_, TerminalState>,
) -> Result<(), String> {
    resize_terminal_session(id, cols, rows, state.inner())
}

fn close_terminal_session(id: u32, state: &TerminalState) -> Result<(), String> {
    let session = {
        let mut sessions = state.sessions.lock();
        sessions
            .remove(&id)
            .ok_or_else(|| format!("Terminal session {id} not found"))?
    };

    let TerminalSession { killer, alive, .. } = session;
    alive.store(false, Ordering::Relaxed);

    let mut killer = killer;
    cleanup_spawned_child(&mut killer);

    // Dropping writer/master/slave sends EOF and tears down the PTY.
    Ok(())
}

#[tauri::command]
pub fn terminal_close(id: u32, state: State<'_, TerminalState>) -> Result<(), String> {
    close_terminal_session(id, state.inner())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{Duration, Instant};

    fn wait_until<F: Fn() -> bool>(predicate: F, timeout: Duration) -> bool {
        let start = Instant::now();
        while start.elapsed() < timeout {
            if predicate() {
                return true;
            }
            std::thread::sleep(Duration::from_millis(25));
        }
        false
    }

    #[test]
    fn resolve_shell_rejects_blank_override() {
        assert_eq!(resolve_shell(Some("   ".to_string())), default_shell());
    }

    #[test]
    fn encode_output_round_trips_utf8_and_base64() {
        assert_eq!(encode_output(b"hello"), "hello");
        let encoded = encode_output(&[0xff, 0xfe, 0xfd]);
        assert_ne!(encoded, "");
        assert!(BASE64.decode(encoded).is_ok());
    }

    #[test]
    fn terminal_spawn_rejects_missing_cwd() {
        let state = TerminalState::new();
        let err = spawn_terminal_session(
            None,
            None,
            Some(r"C:\this\path\should\not\exist\Grokden".to_string()),
            &state,
            None,
        )
        .expect_err("missing cwd should fail");

        assert!(err.contains("Working directory does not exist"));
        assert_eq!(state.session_count(), 0);
    }

    #[test]
    fn terminal_spawn_rejects_invalid_shell() {
        let state = TerminalState::new();
        let err = spawn_terminal_session(
            Some("Grokden_nonexistent_shell.exe".to_string()),
            None,
            None,
            &state,
            None,
        )
        .expect_err("invalid shell should fail");

        assert!(err.contains("Failed to spawn shell"));
        assert_eq!(state.session_count(), 0);
    }

    #[test]
    fn terminal_supports_multiple_concurrent_sessions() {
        let state = TerminalState::new();
        let mut ids = Vec::new();

        for _ in 0..3 {
            let id = spawn_terminal_session(None, None, None, &state, None)
                .expect("spawn session");
            ids.push(id);
        }

        assert_eq!(ids.len(), 3);
        assert_eq!(ids.iter().collect::<std::collections::HashSet<_>>().len(), 3);
        assert_eq!(state.session_count(), 3);

        for id in ids {
            close_terminal_session(id, &state).expect("close session");
        }

        assert_eq!(state.session_count(), 0);
    }

    #[test]
    fn terminal_write_resize_and_close_error_paths() {
        let state = TerminalState::new();
        let missing = 999_999;

        assert!(write_terminal_session(missing, "x".into(), &state).is_err());
        assert!(resize_terminal_session(missing, 80, 24, &state).is_err());
        assert!(close_terminal_session(missing, &state).is_err());

        let id = spawn_terminal_session(None, None, None, &state, None)
            .expect("spawn session");
        resize_terminal_session(id, 120, 40, &state).expect("resize");
        write_terminal_session(id, "echo Grokden\r\n".into(), &state).expect("write");
        close_terminal_session(id, &state).expect("close");
        assert!(close_terminal_session(id, &state).is_err());
    }

    #[test]
    fn terminal_cleans_up_after_shell_exits() {
        let state = TerminalState::new();
        let _id = spawn_terminal_session(
            Some("cmd.exe".to_string()),
            Some(vec!["/C".to_string(), "exit".to_string()]),
            None,
            &state,
            None,
        )
        .expect("spawn session");

        let cleaned = wait_until(|| state.session_count() == 0, Duration::from_secs(5));
        assert!(cleaned, "session should be removed after shell exits");
    }
}