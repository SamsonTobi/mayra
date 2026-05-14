//! Environment variables passed to the orchestrator sidecar (spec §2.4 §5).

use base64::{engine::general_purpose::STANDARD, Engine as _};
use serde_json::{Map, Value};

/// Provider slugs probed in the OS keychain (`mayra` / `provider:{slug}`).
pub const PROVIDER_SLUGS: &[&str] = &[
    "anthropic", "cloudflare", "gemini", "grok", "openai",
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
        map.insert("grok".to_string(), Value::String("sk-test".into()));
        let bytes = serde_json::to_vec(&Value::Object(map)).unwrap();
        let b64 = STANDARD.encode(bytes);
        let raw = STANDARD.decode(b64).unwrap();
        let v: Value = serde_json::from_slice(&raw).unwrap();
        assert_eq!(v["grok"], "sk-test");
    }
}
