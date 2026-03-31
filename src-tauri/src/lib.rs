// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod pty;
mod git;
mod fs_ops;
mod proxy;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let pty_state = std::sync::Arc::new(std::sync::Mutex::new(pty::PtyState { pty_master: None }));

    tauri::Builder::default()
        .setup(|app| {
            tauri::async_runtime::spawn(proxy::start_proxy(app.handle().clone()));
            Ok(())
        })
        .manage(pty_state)
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            pty::spawn_pty,
            pty::pty_write,
            pty::pty_resize,
            git::get_git_stats,
            fs_ops::list_dir
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
