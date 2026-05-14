//! Spawn and supervise the FastAPI orchestrator sidecar (spec §2.4).

use serde::Serialize;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_shell::process::CommandChild;
use tauri_plugin_shell::ShellExt;
use tokio::sync::Mutex;

pub struct SidecarRuntime {
    pub port: u16,
    pub token: String,
    child: CommandChild,
}

pub type SidecarState = Arc<Mutex<Option<SidecarRuntime>>>;

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SidecarReadyPayload {
    pub port: u16,
    pub token: String,
}

fn mayra_data_dir(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    let base = app
        .path()
        .app_local_data_dir()
        .map_err(|e| e.to_string())?;
    Ok(base.join("Mayra"))
}

pub async fn start_sidecar_inner(app: &AppHandle, state: &SidecarState) -> Result<SidecarReadyPayload, String> {
    {
        let guard = state.lock().await;
        if guard.is_some() {
            return Err("sidecar already running".into());
        }
    }

    let port = crate::pick_unused_loopback_port().map_err(|e| e.to_string())?;
    let token = crate::generate_sidecar_token();
    let data_dir = mayra_data_dir(app)?;
    tokio::fs::create_dir_all(&data_dir).await.map_err(|e| e.to_string())?;
    let _ = tokio::fs::create_dir_all(data_dir.join("screenshots")).await;
    let _ = tokio::fs::create_dir_all(data_dir.join("logs")).await;

    let sidecar_cmd = app
        .shell()
        .sidecar("mayra-orchestrator")
        .map_err(|e| format!("mayra-orchestrator sidecar not found (packaging lane): {e}"))?;

    let port_arg = format!("--port={port}");
    let token_arg = format!("--token={token}");
    let data_arg = format!("--data-dir={}", data_dir.display());

    let (mut rx, child) = sidecar_cmd
        .args([&port_arg, &token_arg, &data_arg])
        .spawn()
        .map_err(|e| format!("failed to spawn orchestrator: {e}"))?;

    tokio::spawn(async move {
        while let Some(_evt) = rx.recv().await {}
    });

    let client = reqwest::Client::new();
    let mut healthy = false;
    for _ in 0..50 {
        tokio::time::sleep(std::time::Duration::from_millis(200)).await;
        if let Ok(resp) = client
            .get(format!("http://127.0.0.1:{port}/healthz"))
            .send()
            .await
        {
            if resp.status().is_success() {
                healthy = true;
                break;
            }
        }
    }

    if !healthy {
        let _ = child.kill();
        return Err(
            "orchestrator did not become healthy at /healthz (binary missing or wrong triple?)".into(),
        );
    }

    let payload = SidecarReadyPayload {
        port,
        token: token.clone(),
    };

    {
        let mut guard = state.lock().await;
        *guard = Some(SidecarRuntime {
            port,
            token,
            child,
        });
    }

    app.emit("orchestrator-ready", payload.clone())
        .map_err(|e| format!("emit orchestrator-ready: {e}"))?;

    Ok(payload)
}

pub async fn stop_sidecar_inner(app: &AppHandle, state: &SidecarState) -> Result<(), String> {
    let runtime = { state.lock().await.take() };

    if let Some(mut rt) = runtime {
        let client = reqwest::Client::new();
        let _ = client
            .post(format!("http://127.0.0.1:{}/v1/shutdown", rt.port))
            .header("Authorization", format!("Bearer {}", rt.token))
            .send()
            .await;
        tokio::time::sleep(std::time::Duration::from_secs(2)).await;
        let _ = rt.child.kill();
    }

    let _ = app;
    Ok(())
}
