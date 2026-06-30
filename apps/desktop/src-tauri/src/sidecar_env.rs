//! Environment variables passed to the orchestrator sidecar (spec §2.4 §5).

use base64::{engine::general_purpose::STANDARD, Engine as _};
use serde_json::{Map, Value};
use tauri::Manager;

/// Provider slugs probed in the OS keychain (`mayra` / `provider:{slug}`).
pub const PROVIDER_SLUGS: &[&str] = &[
    "anthropic", "cloudflare", "gemini", "groq", "openai",
];

/// Builds `(MAYRA_*, value)` pairs for `Command::envs`. Omits unset optional secrets.
pub fn sidecar_env_pairs() -> Result<Vec<(String, String)>, String> {
    let mut out = Vec::new();
    out.push((
        "MAYRA_TAURI_ORIGIN".to_string(),
        "tauri://localhost".to_string(),
    ));

    if let Some(b64) = provider_keys_base64()? {
        out.push(("MAYRA_PROVIDER_KEYS_BASE64".to_string(), b64));
    }

    if let Some(v) = read_keyring_optional("supabase_url")? {
        out.push(("MAYRA_SUPABASE_URL".to_string(), v));
    }
    if let Some(v) = read_keyring_optional("supabase_publishable_key")? {
        out.push(("MAYRA_SUPABASE_PUBLISHABLE_KEY".to_string(), v));
    }
    if let Some(v) = read_keyring_optional("supabase_secret_key")? {
        out.push(("MAYRA_SUPABASE_SECRET_KEY".to_string(), v));
    }

    Ok(out)
}

/// Resolve the bundled agent-browser native binary path.
///
/// In dev mode (`cargo tauri dev`), the binary lives in `src-tauri/binaries/`.
/// In production, it is extracted to the app's resource directory.
/// Tauri uses the pattern `<name>-<target_triple>[.exe]`.
pub fn agent_browser_binary_path(app: &tauri::AppHandle) -> Result<String, String> {
    let name = "agent-browser";
    let triple = std::env::var("TAURI_ENV_TARGET_TRIPLE")
        .or_else(|_| std::env::var("TARGET"))
        .unwrap_or_else(|_| {
            if cfg!(target_os = "windows") {
                if cfg!(target_arch = "aarch64") {
                    "aarch64-pc-windows-msvc".into()
                } else {
                    "x86_64-pc-windows-msvc".into()
                }
            } else if cfg!(target_os = "macos") {
                if cfg!(target_arch = "aarch64") {
                    "aarch64-apple-darwin".into()
                } else {
                    "x86_64-apple-darwin".into()
                }
            } else {
                "x86_64-unknown-linux-gnu".into()
            }
        });
    let exe_suffix = if cfg!(windows) { ".exe" } else { "" };
    let filename = format!("{name}-{triple}{exe_suffix}");

    // Try the resource directory first (production path).
    if let Ok(resource_dir) = app.path().resource_dir() {
        let prod_path = resource_dir.join("binaries").join(&filename);
        if prod_path.is_file() {
            log::info!("agent-browser binary resolved (prod): {}", prod_path.display());
            return Ok(prod_path.to_string_lossy().into_owned());
        }
    }

    // Fall back to the project binaries directory (dev path).
    let dev_path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("binaries")
        .join(&filename);
    if dev_path.is_file() {
        log::info!("agent-browser binary resolved (dev): {}", dev_path.display());
        return Ok(dev_path.to_string_lossy().into_owned());
    }

    // Last resort: check PATH (global npm install).
    #[cfg(windows)]
    {
        if let Ok(path) = std::process::Command::new("where")
            .arg("agent-browser.cmd")
            .output()
        {
            let stdout = String::from_utf8_lossy(&path.stdout);
            if let Some(line) = stdout.lines().next() {
                let cmd_path = std::path::Path::new(line.trim());
                if cmd_path.extension().map(|e| e == "cmd").unwrap_or(false) {
                    let native = cmd_path.parent().map(|p| {
                        let arch = if std::env::consts::ARCH == "aarch64" {
                            "arm64"
                        } else {
                            "x64"
                        };
                        p.join("node_modules")
                            .join("agent-browser")
                            .join("bin")
                            .join(format!("agent-browser-win32-{arch}.exe"))
                    });
                    if let Some(ref p) = native {
                        if p.is_file() {
                            log::info!("agent-browser binary resolved (npm): {}", p.display());
                            return Ok(p.to_string_lossy().into_owned());
                        }
                    }
                }
                if cmd_path.is_file() {
                    return Ok(cmd_path.to_string_lossy().into_owned());
                }
            }
        }
    }

    // Not found anywhere.
    log::warn!("agent-browser binary not found; falling back to PATH lookup in Python");
    Ok("agent-browser".into())
}

fn read_keyring_optional(attribute: &str) -> Result<Option<String>, String> {
    let entry = keyring::Entry::new("mayra", attribute).map_err(|e| e.to_string())?;
    match entry.get_password() {
        Ok(s) if !s.is_empty() => Ok(Some(s)),
        _ => Ok(None),
    }
}

/// JSON map of configured providers (`slug -> secret`).
pub fn provider_key_map() -> Result<Map<String, Value>, String> {
    let mut map = Map::new();
    for slug in PROVIDER_SLUGS {
        let entry = keyring::Entry::new("mayra", &format!("provider:{slug}"))
            .map_err(|e| e.to_string())?;
        if let Ok(pw) = entry.get_password() {
            if !pw.is_empty() {
                map.insert((*slug).to_string(), Value::String(pw));
            }
        }
    }
    Ok(map)
}

/// JSON map of configured providers (`slug -> secret`), standard-base64 encoded for `MAYRA_PROVIDER_KEYS_BASE64`.
pub fn provider_keys_base64() -> Result<Option<String>, String> {
    let map = provider_key_map()?;
    if map.is_empty() {
        return Ok(None);
    }
    let bytes = serde_json::to_vec(&Value::Object(map)).map_err(|e| e.to_string())?;
    Ok(Some(STANDARD.encode(bytes)))
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Keyring mocks are per-`Entry` (no cross-entry persistence); validate encoding separately.
    #[test]
    fn provider_keys_base64_encodes_map_roundtrip() {
        let mut map = Map::new();
        map.insert("groq".to_string(), Value::String("sk-test".into()));
        let bytes = serde_json::to_vec(&Value::Object(map)).unwrap();
        let b64 = STANDARD.encode(bytes);
        let raw = STANDARD.decode(b64).unwrap();
        let v: Value = serde_json::from_slice(&raw).unwrap();
        assert_eq!(v["groq"], "sk-test");
    }
}
