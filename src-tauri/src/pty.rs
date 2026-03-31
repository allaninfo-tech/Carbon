use portable_pty::{CommandBuilder, NativePtySystem, PtySize, PtySystem};
use std::sync::{Arc, Mutex};
use std::io::{Read, Write};
use tauri::{Emitter, Listener, Manager};
use std::thread;

pub struct PtyState {
    pub pty_master: Option<Box<dyn portable_pty::MasterPty + Send>>,
}

#[tauri::command]
pub fn spawn_pty(
    window: tauri::Window,
    state: tauri::State<'_, Arc<Mutex<PtyState>>>,
) -> Result<(), String> {
    let pty_system = NativePtySystem::default();
    let pair = pty_system
        .openpty(PtySize {
            rows: 24,
            cols: 80,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| e.to_string())?;

    // We'll run powershell.exe on Windows for now, but claude-code could be the default
    #[cfg(target_os = "windows")]
    let cmd = "powershell.exe";
    #[cfg(not(target_os = "windows"))]
    let cmd = "bash"; // or dynamically detect

    let mut cmd_builder = CommandBuilder::new(cmd);
    
    // Inject the local proxy URL for Claude Code.
    cmd_builder.env("ANTHROPIC_BASE_URL", "http://127.0.0.1:14201");
    // Also inject CLAUDE_BASE_URL for good measure
    cmd_builder.env("CLAUDE_BASE_URL", "http://127.0.0.1:14201");

    let _child = pair.slave.spawn_command(cmd_builder).map_err(|e| e.to_string())?;
    
    let mut reader = pair.master.try_clone_reader().map_err(|e| e.to_string())?;
    
    // Store master pty to be able to write and resize
    {
        let mut st = state.lock().unwrap();
        st.pty_master = Some(pair.master);
    }

    let window_clone = window.clone();
    thread::spawn(move || {
        let mut buf = [0u8; 1024];
        while let Ok(n) = reader.read(&mut buf) {
            if n == 0 {
                break;
            }
            let chunk = String::from_utf8_lossy(&buf[..n]).to_string();
            // Emit to frontend
            let _ = window_clone.emit("pty-out", chunk);
        }
    });

    Ok(())
}

#[tauri::command]
pub fn pty_write(
    data: String,
    state: tauri::State<'_, Arc<Mutex<PtyState>>>,
) -> Result<(), String> {
    let mut st = state.lock().unwrap();
    if let Some(ref mut master) = st.pty_master {
        if let Ok(mut writer) = master.try_clone_writer() {
            let _ = writer.write_all(data.as_bytes());
        }
    }
    Ok(())
}

#[tauri::command]
pub fn pty_resize(
    rows: u16,
    cols: u16,
    state: tauri::State<'_, Arc<Mutex<PtyState>>>,
) -> Result<(), String> {
    let mut st = state.lock().unwrap();
    if let Some(ref mut master) = st.pty_master {
        let _ = master.resize(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        });
    }
    Ok(())
}
