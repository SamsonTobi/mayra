//! Spawn and supervise the FastAPI orchestrator sidecar (spec §2.4).

use serde::Serialize;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_shell::process::{CommandChild, CommandEvent, TerminatedPayload};
use tauri_plugin_shell::ShellExt;
use tokio::sync::Mutex;

use crate::sidecar_env;

pub struct SidecarRuntime {
    pub generation: u64,
    pub port: u16,
    pub token: String,
    child: CommandChild,
}

#[derive(Default)]
pub struct SidecarSlot {
    pub(crate) runtime: Option<SidecarRuntime>,
    pub(crate) next_generation: u64,
}

pub type SidecarState = Arc<Mutex<SidecarSlot>>;

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SidecarReadyPayload {
    pub port: u16,
    pub token: String,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct OrchestratorFailedPayload {
    pub reason: String,
    pub exit_code: Option<i32>,
    pub exit_signal: Option<i32>,
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
        let slot = state.lock().await;
        if slot.runtime.is_some() {
            return Err("sidecar already running".into());
        }
    }
    launch_sidecar(app, state).await
}

async fn launch_sidecar(app: &AppHandle, state: &SidecarState) -> Result<SidecarReadyPayload, String> {
    {
        let slot = state.lock().await;
        if slot.runtime.is_some() {
            return Err("sidecar already running".into());
        }
    }

    let env_pairs = sidecar_env::sidecar_env_pairs()?;

    let port = crate::pick_unused_loopback_port().map_err(|e| e.to_string())?;
    let token = crate::generate_sidecar_token();
    let data_dir = mayra_data_dir(app)?;
    tokio::fs::create_dir_all(&data_dir).await.map_err(|e| e.to_string())?;
    let _ = tokio::fs::create_dir_all(data_dir.join("screenshots")).await;
    let _ = tokio::fs::create_dir_all(data_dir.join("logs")).await;

    let sidecar_cmd = app
        .shell()
        .sidecar("mayra-orchestrator")
        .map_err(|e| format!("mayra-orchestrator sidecar not found (packaging lane): {e}"))?
        .envs(env_pairs);

    let port_arg = format!("--port={port}");
    let token_arg = format!("--token={token}");
    let data_arg = format!("--data-dir={}", data_dir.display());

    let (mut rx, child) = sidecar_cmd
        .args([&port_arg, &token_arg, &data_arg])
        .spawn()
        .map_err(|e| format!("failed to spawn orchestrator: {e}"))?;

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
        tokio::spawn(async move {
            while rx.recv().await.is_some() {}
        });
        return Err(
            "orchestrator did not become healthy at /healthz (binary missing or wrong triple?)".into(),
        );
    }

    let generation = {
        let mut slot = state.lock().await;
        if slot.runtime.is_some() {
            let _ = child.kill();
            return Err("sidecar already running".into());
        }
        slot.next_generation = slot.next_generation.saturating_add(1);
        let gen = slot.next_generation;
        slot.runtime = Some(SidecarRuntime {
            generation: gen,
            port,
            token: token.clone(),
            child,
        });
        gen
    };

    let payload = SidecarReadyPayload {
        port,
        token: token.clone(),
    };

    let app_w = app.clone();
    let state_w = Arc::clone(state);
    tokio::spawn(async move {
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(bytes) | CommandEvent::Stderr(bytes) => {
                    let line = String::from_utf8_lossy(&bytes);
                    let line = line.trim();
                    if !line.is_empty() {
                        log::info!(target: "mayra_orchestrator", "{line}");
                    }
                }
                CommandEvent::Error(err) => {
                    log::warn!(target: "mayra_orchestrator", "shell error: {err}");
                }
                CommandEvent::Terminated(payload) => {
                    handle_orchestrator_exit(app_w.clone(), state_w.clone(), generation, payload).await;
                    break;
                }
                _ => {}
            }
        }
    });

    app.emit("orchestrator-ready", payload.clone())
        .map_err(|e| format!("emit orchestrator-ready: {e}"))?;

    Ok(payload)
}

async fn handle_orchestrator_exit(
    app: AppHandle,
    state: SidecarState,
    generation: u64,
    payload: TerminatedPayload,
) {
    {
        let mut slot = state.lock().await;
        match slot.runtime.as_ref() {
            None => return,
            Some(rt) if rt.generation != generation => return,
            Some(_) => {
                slot.runtime.take();
            }
        }
    }

    let crashed = payload.code.map(|c| c != 0).unwrap_or(true) || payload.signal.is_some();

    if !crashed {
        return;
    }

    tokio::spawn(supervised_restart(app, state, payload));
}

async fn supervised_restart(app: AppHandle, state: SidecarState, last: TerminatedPayload) {
    const BACKOFF_SECS: [u64; 4] = [1, 2, 4, 8];

    for secs in BACKOFF_SECS {
        tokio::time::sleep(std::time::Duration::from_secs(secs)).await;
        {
            let slot = state.lock().await;
            if slot.runtime.is_some() {
                return;
            }
        }
        if launch_sidecar(&app, &state).await.is_ok() {
            return;
        }
    }

    let fail = OrchestratorFailedPayload {
        reason: "orchestrator exited and restart attempts exhausted".into(),
        exit_code: last.code,
        exit_signal: last.signal,
    };
    let _ = app.emit("orchestrator-failed", fail);
}

pub async fn stop_sidecar_inner(app: &AppHandle, state: &SidecarState) -> Result<(), String> {
    let runtime = { state.lock().await.runtime.take() };

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
