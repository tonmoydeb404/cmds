// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use std::sync::Mutex;
use std::time::Duration;
use tauri::{Manager, State};
use tokio::time::timeout;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
struct CommandItem {
    id: String,
    name: String,
    command: String,
    is_detached: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct CommandGroup {
    id: String,
    name: String,
    commands: Vec<CommandItem>,
}

#[derive(Debug, Serialize, Deserialize)]
struct AppData {
    groups: HashMap<String, CommandGroup>,
}

type AppState = Mutex<HashMap<String, CommandGroup>>;

// Helper function to get data file path
fn get_data_file_path(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    // Create the directory if it doesn't exist
    if !app_data_dir.exists() {
        fs::create_dir_all(&app_data_dir)
            .map_err(|e| format!("Failed to create app data directory: {}", e))?;
    }

    Ok(app_data_dir.join("command_groups.json"))
}

// Load data from file
fn load_data(app_handle: &tauri::AppHandle) -> Result<HashMap<String, CommandGroup>, String> {
    let file_path = get_data_file_path(app_handle)?;

    if !file_path.exists() {
        return Ok(HashMap::new());
    }

    let content =
        fs::read_to_string(&file_path).map_err(|e| format!("Failed to read data file: {}", e))?;

    let app_data: AppData =
        serde_json::from_str(&content).map_err(|e| format!("Failed to parse data file: {}", e))?;

    Ok(app_data.groups)
}

// Save data to file
fn save_data(
    app_handle: &tauri::AppHandle,
    groups: &HashMap<String, CommandGroup>,
) -> Result<(), String> {
    let file_path = get_data_file_path(app_handle)?;

    let app_data = AppData {
        groups: groups.clone(),
    };

    let content = serde_json::to_string_pretty(&app_data)
        .map_err(|e| format!("Failed to serialize data: {}", e))?;

    fs::write(&file_path, content).map_err(|e| format!("Failed to write data file: {}", e))?;

    Ok(())
}

#[tauri::command]
async fn create_group(
    state: State<'_, AppState>,
    app_handle: tauri::AppHandle,
    name: String,
) -> Result<String, String> {
    let id = Uuid::new_v4().to_string();
    let group = CommandGroup {
        id: id.clone(),
        name,
        commands: Vec::new(),
    };

    {
        let mut groups = state.lock().unwrap();
        groups.insert(id.clone(), group);
        save_data(&app_handle, &groups)?;
    }

    Ok(id)
}

#[tauri::command]
async fn get_groups(state: State<'_, AppState>) -> Result<Vec<CommandGroup>, String> {
    let groups = state.lock().unwrap();
    Ok(groups.values().cloned().collect())
}

#[tauri::command]
async fn delete_group(
    state: State<'_, AppState>,
    app_handle: tauri::AppHandle,
    group_id: String,
) -> Result<(), String> {
    {
        let mut groups = state.lock().unwrap();
        groups.remove(&group_id);
        save_data(&app_handle, &groups)?;
    }
    Ok(())
}

#[tauri::command]
async fn add_command_to_group(
    state: State<'_, AppState>,
    app_handle: tauri::AppHandle,
    group_id: String,
    name: String,
    command: String,
    is_detached: Option<bool>,
) -> Result<String, String> {
    let command_id = Uuid::new_v4().to_string();
    let command_item = CommandItem {
        id: command_id.clone(),
        name,
        command,
        is_detached,
    };

    {
        let mut groups = state.lock().unwrap();
        if let Some(group) = groups.get_mut(&group_id) {
            group.commands.push(command_item);
            save_data(&app_handle, &groups)?;
            Ok(command_id)
        } else {
            Err("Group not found".to_string())
        }
    }
}

#[tauri::command]
async fn delete_command_from_group(
    state: State<'_, AppState>,
    app_handle: tauri::AppHandle,
    group_id: String,
    command_id: String,
) -> Result<(), String> {
    {
        let mut groups = state.lock().unwrap();
        if let Some(group) = groups.get_mut(&group_id) {
            group.commands.retain(|cmd| cmd.id != command_id);
            save_data(&app_handle, &groups)?;
            Ok(())
        } else {
            Err("Group not found".to_string())
        }
    }
}

#[tauri::command]
async fn execute_command(command: String) -> Result<String, String> {
    // Set a timeout for command execution (30 seconds)
    let execution_future = tokio::task::spawn_blocking(move || {
        let output = if cfg!(target_os = "windows") {
            Command::new("cmd").args(["/C", &command]).output()
        } else {
            Command::new("sh").arg("-c").arg(&command).output()
        };

        match output {
            Ok(output) => {
                let stdout = String::from_utf8_lossy(&output.stdout);
                let stderr = String::from_utf8_lossy(&output.stderr);

                if output.status.success() {
                    Ok(stdout.to_string())
                } else {
                    Err(format!("Command failed: {}", stderr))
                }
            }
            Err(e) => Err(format!("Failed to execute command: {}", e)),
        }
    });

    match timeout(Duration::from_secs(30), execution_future).await {
        Ok(Ok(result)) => result,
        Ok(Err(e)) => Err(format!("Task error: {}", e)),
        Err(_) => Err("Command timed out after 30 seconds".to_string()),
    }
}

#[tauri::command]
async fn execute_command_detached(command: String) -> Result<String, String> {
    use std::process::Stdio;

    let result = if cfg!(target_os = "windows") {
        Command::new("cmd")
            .args(["/C", &command])
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .stdin(Stdio::null())
            .spawn()
    } else {
        Command::new("sh")
            .arg("-c")
            .arg(&command)
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .stdin(Stdio::null())
            .spawn()
    };

    match result {
        Ok(_child) => {
            // Process started successfully, we don't need to track the PID
            Ok("Process started successfully in background".to_string())
        }
        Err(e) => Err(format!("Failed to start command: {}", e)),
    }
}

#[tauri::command]
async fn execute_group_commands(
    state: State<'_, AppState>,
    group_id: String,
) -> Result<Vec<(String, String)>, String> {
    // Clone the commands first, then release the lock
    let commands = {
        let groups = state.lock().unwrap();
        if let Some(group) = groups.get(&group_id) {
            group.commands.clone()
        } else {
            return Err("Group not found".to_string());
        }
    }; // Lock is released here

    let mut results = Vec::new();

    for cmd in commands {
        let result = if cmd.is_detached.unwrap_or(false) {
            execute_command_detached(cmd.command).await
        } else {
            execute_command(cmd.command).await
        };

        match result {
            Ok(output) => results.push((cmd.name, output)),
            Err(error) => results.push((cmd.name, format!("Error: {}", error))),
        }
    }

    Ok(results)
}

#[tauri::command]
async fn export_data(
    state: State<'_, AppState>,
    app_handle: tauri::AppHandle,
) -> Result<String, String> {
    let groups = state.lock().unwrap();
    let app_data = AppData {
        groups: groups.clone(),
    };

    let _content = serde_json::to_string_pretty(&app_data)
        .map_err(|e| format!("Failed to serialize data: {}", e))?;

    let file_path = get_data_file_path(&app_handle)?;
    Ok(format!("Data saved to: {}", file_path.display()))
}

#[tauri::command]
async fn import_data(
    state: State<'_, AppState>,
    app_handle: tauri::AppHandle,
    data: String,
) -> Result<String, String> {
    let app_data: AppData =
        serde_json::from_str(&data).map_err(|e| format!("Failed to parse import data: {}", e))?;

    {
        let mut groups = state.lock().unwrap();
        *groups = app_data.groups;
        save_data(&app_handle, &groups)?;
    }

    Ok("Data imported successfully".to_string())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // Load data on startup
            let app_handle = app.handle();
            let state: State<AppState> = app.state();

            match load_data(&app_handle) {
                Ok(groups) => {
                    let mut app_groups = state.lock().unwrap();
                    *app_groups = groups;
                    println!("Data loaded successfully");
                }
                Err(e) => {
                    println!("Failed to load data: {}", e);
                    // Continue with empty state
                }
            }

            Ok(())
        })
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            create_group,
            get_groups,
            delete_group,
            add_command_to_group,
            delete_command_from_group,
            execute_command,
            execute_command_detached,
            execute_group_commands,
            export_data,
            import_data
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
