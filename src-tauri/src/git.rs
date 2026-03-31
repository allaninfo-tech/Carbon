use serde::{Serialize, Deserialize};
use std::process::Command;

#[derive(Serialize, Deserialize, Default, Clone)]
pub struct GitStat {
    pub added: u32,
    pub deleted: u32,
}

#[tauri::command]
pub fn get_git_stats(cwd: String) -> Result<std::collections::HashMap<String, GitStat>, String> {
    let output = Command::new("git")
        .arg("diff")
        .arg("--stat")
        .current_dir(cwd)
        .output()
        .map_err(|e| format!("Failed to run git diff: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut stats = std::collections::HashMap::new();

    // Output is typically like:
    //  src/main.rs | 5 +++--
    //  1 file changed, 3 insertions(+), 2 deletions(-)
    for line in stdout.lines() {
        if line.contains('|') {
            let parts: Vec<&str> = line.split('|').collect();
            if parts.len() == 2 {
                let file_path = parts[0].trim().replace('\\', "/");
                let changes = parts[1].trim();
                
                let mut added = 0;
                let mut deleted = 0;
                
                // Very naive parsing of the + and - characters at the end
                if let Some(plus_minus) = changes.split_whitespace().last() {
                    added = plus_minus.chars().filter(|&c| c == '+').count() as u32;
                    deleted = plus_minus.chars().filter(|&c| c == '-').count() as u32;
                }

                stats.insert(file_path, GitStat { added, deleted });
            }
        }
    }

    Ok(stats)
}
