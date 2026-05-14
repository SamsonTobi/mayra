#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::Arc;

use mayra_desktop_lib::sidecar::{SidecarSlot, SidecarState};
use tauri::Manager;
use tokio::sync::Mutex;

fn stop_sidecar_blocking(app: &tauri::AppHandle) {
    let handle = app.clone();
    tauri::async_runtime::block_on(async move {
        if let Some(state) = handle.try_state::<SidecarState>() {
            let _ = mayra_desktop_lib::sidecar::stop_sidecar_inner(&handle, state.inner()).await;
        }
    });
}

fn main() {
    let sidecar_state: SidecarState = Arc::new(Mutex::new(SidecarSlot::default()));

    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            if let Some(win) = app.get_webview_window("main") {
                let _ = win.unminimize();
                let _ = win.set_focus();
            }
        }))
        .plugin(tauri_plugin_log::Builder::default().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .manage(sidecar_state)
        .invoke_handler(tauri::generate_handler![
            mayra_desktop_lib::commands::start_sidecar,
            mayra_desktop_lib::commands::stop_sidecar,
            mayra_desktop_lib::commands::save_provider_key,
            mayra_desktop_lib::commands::provider_key_status,
            mayra_desktop_lib::commands::get_device_id,
            mayra_desktop_lib::commands::open_data_dir,
            mayra_desktop_lib::commands::notify,
            mayra_desktop_lib::commands::os_open_external,
        ])
        .build(tauri::generate_context!())
        .expect("error building Mayra desktop application")
        .run(|app_handle, event| {
            match event {
                tauri::RunEvent::ExitRequested { .. } => stop_sidecar_blocking(app_handle),
                tauri::RunEvent::Exit => stop_sidecar_blocking(app_handle),
                _ => {}
            }
        });
}
