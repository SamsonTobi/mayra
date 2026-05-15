//! IPC surface (spec §2.3) — OS-facing commands only.

use crate::chrome_probe::ChromeSession;
use crate::sidecar::{SidecarReadyPayload, SidecarState};
use tauri::{command, AppHandle, Manager, State};

#[command]
pub async fn start_sidecar(
    app: AppHandle,
    state: State<'_, SidecarState>,
) -> Result<SidecarReadyPayload, String> {
    crate::sidecar::start_sidecar_inner(&app, state.inner()).await
}

#[command]
pub async fn stop_sidecar(app: AppHandle, state: State<'_, SidecarState>) -> Result<(), String> {
    crate::sidecar::stop_sidecar_inner(&app, state.inner()).await
}

#[command]
pub async fn save_provider_key(
    app: AppHandle,
    state: State<'_, SidecarState>,
    provider: String,
    key: String,
) -> Result<(), String> {
    let entry = keyring::Entry::new("mayra", &format!("provider:{provider}"))
        .map_err(|e| e.to_string())?;
    entry.set_password(&key).map_err(|e| e.to_string())?;
    crate::sidecar::stop_sidecar_inner(&app, state.inner()).await?;
    crate::sidecar::start_sidecar_inner(&app, state.inner()).await?;
    Ok(())
}

#[command]
pub async fn provider_key_status(provider: String) -> Result<serde_json::Value, String> {
    let entry = keyring::Entry::new("mayra", &format!("provider:{provider}"))
        .map_err(|e| e.to_string())?;
    match entry.get_password() {
        Ok(secret) if !secret.is_empty() => {
            let cs: Vec<char> = secret.chars().collect();
            let last4: String = cs.iter().rev().take(4).rev().collect();
            Ok(serde_json::json!({
                "configured": true,
                "last4": last4
            }))
        }
        _ => Ok(serde_json::json!({
            "configured": false,
            "last4": ""
        })),
    }
}

#[command]
pub fn get_device_id() -> Result<String, String> {
    let entry = keyring::Entry::new("mayra", "device_id").map_err(|e| e.to_string())?;
    if let Ok(id) = entry.get_password() {
        if !id.is_empty() {
            return Ok(id);
        }
    }
    let id = uuid::Uuid::new_v4().to_string();
    entry.set_password(&id).map_err(|e| e.to_string())?;
    Ok(id)
}

#[command]
pub fn open_data_dir(app: AppHandle) -> Result<(), String> {
    let dir = app
        .path()
        .app_local_data_dir()
        .map_err(|e| e.to_string())?
        .join("Mayra");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    open::that(&dir).map_err(|e| e.to_string())?;
    Ok(())
}

#[command]
pub async fn notify(app: AppHandle, title: String, body: String) -> Result<(), String> {
    use tauri_plugin_notification::NotificationExt;
    app.notification()
        .builder()
        .title(title)
        .body(body)
        .show()
        .map_err(|e| e.to_string())
}

#[command]
pub fn asset_url(app: AppHandle, path: String) -> Result<String, String> {
    use std::path::PathBuf;
    let p = PathBuf::from(path.trim());
    let canon = p.canonicalize().map_err(|e| e.to_string())?;
    let base = app
        .path()
        .app_local_data_dir()
        .map_err(|e| e.to_string())?
        .join("Mayra")
        .join("screenshots");
    let base_canon = base.canonicalize().unwrap_or(base);
    if !canon.starts_with(&base_canon) {
        return Err("path is outside app Mayra/screenshots directory".into());
    }
    Ok(canon.to_string_lossy().into_owned())
}

#[command]
pub async fn probe_chrome_ports(ports: Vec<u16>) -> Result<Vec<ChromeSession>, String> {
    Ok(crate::chrome_probe::probe_chrome_ports(ports).await)
}

#[command]
pub fn launch_chromium_remote_debug(
    app: AppHandle,
    browser: String,
    port: u16,
) -> Result<(), String> {
    crate::chromium_launch::launch_chromium_remote_debug(&app, &browser, port)
}

#[command]
pub fn os_open_external(url: String) -> Result<(), String> {
    let parsed = url::Url::parse(&url).map_err(|e| e.to_string())?;
    if parsed.scheme() != "https" {
        return Err("only https URLs are allowed".into());
    }
    let host = parsed
        .host_str()
        .ok_or_else(|| "missing host".to_string())?;
    if host != "supabase.co" && !host.ends_with(".supabase.co") {
        return Err("only https://*.supabase.co hosts are allowed".into());
    }
    open::that(url).map_err(|e| e.to_string())?;
    Ok(())
}
