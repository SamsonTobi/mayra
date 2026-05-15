//! Spawn and supervise the FastAPI orchestrator sidecar (spec §2.4).

use serde::Serialize;
use std::path::PathBuf;
use std::process::Stdio;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_shell::process::{CommandChild, CommandEvent, TerminatedPayload};
use tauri_plugin_shell::ShellExt;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command as TokioCommand;
use tokio::sync::Mutex;

use crate::sidecar_env;

/// Packaged sidecar (`mayra-orchestrator`) or dev (`node scripts/dev-orchestrator.mjs`).
pub enum SidecarChild {
    Bundled(CommandChild),
    Dev(Arc<Mutex<Option<tokio::process::Child>>>),
}

pub struct SidecarRuntime {
    pub generation: u64,
    pub port: u16,
    pub token: String,
    pub child: SidecarChild,
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

/// Phase 1 dev: when `MAYRA_SKIP_SIDECAR=1`, emit a synthetic handshake so the UI reaches onboarding
/// without a packaged `mayra-orchestrator` binary (`port=0` means no orchestrator yet).
pub fn maybe_emit_dev_skip_sidecar_ready(app: &AppHandle) {
    if std::env::var("MAYRA_SKIP_SIDECAR").unwrap_or_default() != "1" {
        return;
    }
    let handle = app.clone();
    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(std::time::Duration::from_millis(80)).await;
        let payload = SidecarReadyPayload {
            port: 0,
            token: String::new(),
        };
        let _ = handle.emit("orchestrator-ready", payload);
    });
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

async fn spawn_dev_node_orchestrator(
    port: u16,
    token: &str,
    data_dir: &std::path::Path,
    env_pairs: &[(String, String)],
) -> Result<Arc<Mutex<Option<tokio::process::Child>>>, String> {
    let repo = std::env::var("MAYRA_REPO_ROOT").map_err(|_| {
        "MAYRA_REPO_ROOT is required when using dev orchestrator fallback".to_string()
    })?;
    let script = PathBuf::from(&repo)
        .join("scripts")
        .join("dev-orchestrator.mjs");
    if !script.is_file() {
        return Err(format!("dev orchestrator script missing: {}", script.display()));
    }

    let mut cmd = TokioCommand::new("node");
    cmd.arg(&script);
    cmd.env("MAYRA_PORT", port.to_string());
    cmd.env("MAYRA_TOKEN", token);
    cmd.env("MAYRA_DATA_DIR", data_dir.to_string_lossy().to_string());
    for (k, v) in env_pairs {
        cmd.env(k, v);
    }
    cmd.stdin(Stdio::null());
    cmd.stdout(Stdio::piped());
    cmd.stderr(Stdio::piped());

    let mut child = cmd.spawn().map_err(|e| format!("spawn dev orchestrator: {e}"))?;
    let stdout = child.stdout.take().ok_or("dev orchestrator stdout")?;
    let stderr = child.stderr.take().ok_or("dev orchestrator stderr")?;
    tokio::spawn(forward_lines(BufReader::new(stdout), "stdout"));
    tokio::spawn(forward_lines(BufReader::new(stderr), "stderr"));
    Ok(Arc::new(Mutex::new(Some(child))))
}

async fn forward_lines<R: AsyncBufReadExt + Unpin>(mut r: R, label: &'static str) {
    let mut line = String::new();
    loop {
        line.clear();
        match r.read_line(&mut line).await {
            Ok(0) => break,
            Ok(_) => {
                let t = line.trim();
                if !t.is_empty() {
                    log::info!(target: "mayra_orchestrator", "[{label}] {t}");
                }
            }
            Err(_) => break,
        }
    }
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

    let port_arg = format!("--port={port}");
    let token_arg = format!("--token={token}");
    let data_arg = format!("--data-dir={}", data_dir.display());

    let dev_orchestrator = std::env::var("MAYRA_ORCHESTRATOR_DEV").unwrap_or_default() == "1"
        || std::env::var("MAYRA_SKIP_SIDECAR").unwrap_or_default() == "1";

    let (child, mut rx_opt) = if dev_orchestrator {
        let holder = spawn_dev_node_orchestrator(port, &token, &data_dir, &env_pairs).await?;
        (SidecarChild::Dev(holder), None)
    } else {
        let (rx, ch) = app
            .shell()
            .sidecar("mayra-orchestrator")
            .map_err(|e| format!("mayra-orchestrator sidecar: {e}"))?
            .envs(env_pairs.clone())
            .args([&port_arg, &token_arg, &data_arg])
            .spawn()
            .map_err(|e| format!("mayra-orchestrator sidecar: {e}"))?;
        (SidecarChild::Bundled(ch), Some(rx))
    };

    let dev_holder_watcher = match &child {
        SidecarChild::Dev(h) => Some(Arc::clone(h)),
        _ => None,
    };

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
        cleanup_unhealthy(child, &mut rx_opt).await;
        return Err(
            "orchestrator did not become healthy at /healthz (binary missing or wrong triple?)".into(),
        );
    }

    let generation = {
        let mut slot = state.lock().await;
        if slot.runtime.is_some() {
            cleanup_unhealthy(child, &mut rx_opt).await;
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
    if let Some(mut rx) = rx_opt {
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
                    CommandEvent::Terminated(terminated) => {
                        handle_orchestrator_exit(
                            app_w.clone(),
                            state_w.clone(),
                            generation,
                            terminated,
                        )
                        .await;
                        break;
                    }
                    _ => {}
                }
            }
        });
    } else if let Some(holder_w) = dev_holder_watcher {
        tokio::spawn(async move {
            let status = {
                let mut g = holder_w.lock().await;
                match g.as_mut() {
                    Some(ch) => ch.wait().await.ok(),
                    None => None,
                }
            };
            if let Some(st) = status {
                handle_orchestrator_exit(
                    app_w,
                    state_w,
                    generation,
                    TerminatedPayload {
                        code: st.code(),
                        signal: None,
                    },
                )
                .await;
            }
        });
    }

    app.emit("orchestrator-ready", payload.clone())
        .map_err(|e| format!("emit orchestrator-ready: {e}"))?;

    Ok(payload)
}

async fn cleanup_unhealthy(
    child: SidecarChild,
    rx_opt: &mut Option<tauri::async_runtime::Receiver<CommandEvent>>,
) {
    match child {
        SidecarChild::Bundled(ch) => {
            let _ = ch.kill();
            if let Some(rx) = rx_opt.take() {
                tokio::spawn(async move {
                    let mut r = rx;
                    while r.recv().await.is_some() {}
                });
            }
        }
        SidecarChild::Dev(h) => {
            if let Some(mut c) = h.lock().await.take() {
                let _ = c.kill().await;
            }
        }
    }
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

    std::thread::spawn(move || {
        tauri::async_runtime::block_on(supervised_restart(app, state, payload));
    });
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

    if let Some(rt) = runtime {
        let client = reqwest::Client::new();
        let _ = client
            .post(format!("http://127.0.0.1:{}/v1/shutdown", rt.port))
            .header("Authorization", format!("Bearer {}", rt.token))
            .send()
            .await;
        tokio::time::sleep(std::time::Duration::from_secs(2)).await;
        match rt.child {
            SidecarChild::Bundled(ch) => {
                let _ = ch.kill();
            }
            SidecarChild::Dev(h) => {
                if let Some(mut c) = h.lock().await.take() {
                    let _ = c.kill().await;
                }
            }
        }
    }

    let _ = app;
    Ok(())
}
