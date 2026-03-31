use serde::{Deserialize, Serialize};
use std::fs;

#[derive(Serialize, Deserialize, Debug)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub children: Option<Vec<FileEntry>>,
}

#[tauri::command]
pub fn list_dir(path: String, depth: Option<u8>) -> Result<Vec<FileEntry>, String> {
    let max_depth = depth.unwrap_or(8);
    read_dir_recursive(&path, 0, max_depth)
}

fn read_dir_recursive(path: &str, current_depth: u8, max_depth: u8) -> Result<Vec<FileEntry>, String> {
    let entries = fs::read_dir(path).map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for entry in entries.flatten() {
        let meta = entry.metadata().map_err(|e| e.to_string())?;
        let name = entry.file_name().to_string_lossy().to_string();
        let entry_path = entry.path().to_string_lossy().to_string().replace('\\', "/");

        // Skip hidden and common noise dirs
        if name.starts_with('.') || name == "node_modules" || name == "target" {
            continue;
        }

        let is_dir = meta.is_dir();
        let children = if is_dir && current_depth < max_depth {
            read_dir_recursive(&entry.path().to_string_lossy(), current_depth + 1, max_depth).ok()
        } else {
            None
        };

        result.push(FileEntry {
            name,
            path: entry_path,
            is_dir,
            children,
        });
    }

    // Sort: dirs first, then files, both alphabetical
    result.sort_by(|a, b| {
        match (a.is_dir, b.is_dir) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        }
    });

    Ok(result)
}
