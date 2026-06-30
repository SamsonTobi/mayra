//! Mayra desktop Rust library: IPC commands, sidecar runtime, and pure helpers.

pub mod chrome_probe;
pub mod chromium_launch;
pub mod commands;
pub mod sidecar;
pub mod sidecar_env;

use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use base64::Engine as _;
use rand::rngs::OsRng;
use rand::RngCore;

/// Binds `127.0.0.1:0`, reads the assigned port, then drops the listener so the port is released.
pub fn pick_unused_loopback_port() -> std::io::Result<u16> {
    let listener = std::net::TcpListener::bind(("127.0.0.1", 0))?;
    let port = listener.local_addr()?.port();
    drop(listener);
    Ok(port)
}

/// 48 random bytes, encoded as URL-safe base64 without padding (spec §2.4).
pub fn generate_sidecar_token() -> String {
    let mut bytes = [0u8; 48];
    OsRng.fill_bytes(&mut bytes);
    URL_SAFE_NO_PAD.encode(bytes)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn picks_an_unused_loopback_port_and_releases_it() -> std::io::Result<()> {
        let port = pick_unused_loopback_port()?;
        assert!(port > 0);
        let listener = std::net::TcpListener::bind(("127.0.0.1", port))?;
        drop(listener);
        Ok(())
    }

    #[test]
    fn generates_token_of_length_48_url_safe() {
        let token = generate_sidecar_token();
        let decoded = URL_SAFE_NO_PAD
            .decode(token.as_bytes())
            .expect("token must be URL-safe base64 without padding");
        assert_eq!(decoded.len(), 48);
        assert!(
            token.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_'),
            "token must be URL-safe without requiring padding"
        );
    }
}

#[cfg(test)]
mod keyring_tests {
    use keyring::mock;
    use keyring::Entry;

    #[test]
    fn roundtrip_device_id_via_keyring() -> keyring::Result<()> {
        keyring::set_default_credential_builder(mock::default_credential_builder());
        let entry = Entry::new("mayra", "device_id")?;
        let _ = entry.delete_credential();
        entry.set_password("device-roundtrip-test-id")?;
        assert_eq!(entry.get_password()?, "device-roundtrip-test-id");
        Ok(())
    }
}

#[cfg(test)]
mod capability_tests {
    use regex::Regex;
    use serde_json::Value;

    /// Mirrors `capabilities/sidecar.json` shape from spec §2.2 (validators exercised in tests).
    const SIDECAR_CAPABILITY: &str = r#"{
      "identifier": "sidecar",
      "windows": ["main"],
      "permissions": [
        {
          "identifier": "shell:allow-execute",
          "allow": [
            {
              "name": "binaries/mayra-orchestrator",
              "sidecar": true,
              "args": [
                { "validator": "^--port=\\d{4,5}$" },
                { "validator": "^--token=[A-Za-z0-9_-]{32,128}$" },
                { "validator": "^--data-dir=.{1,500}$" }
              ]
            },
            {
              "name": "binaries/agent-browser",
              "sidecar": true
            }
          ]
        }
      ]
    }"#;

    #[test]
    fn disallows_unregistered_sidecar_argument() {
        let doc: Value = serde_json::from_str(SIDECAR_CAPABILITY).expect("valid fixture JSON");
        let validators: Vec<&str> = doc["permissions"][0]["allow"][0]["args"]
            .as_array()
            .expect("args array")
            .iter()
            .map(|a| {
                a["validator"]
                    .as_str()
                    .expect("validator must be a string")
            })
            .collect();
        assert_eq!(validators.len(), 3);
        let regexes: Vec<Regex> = validators
            .iter()
            .map(|s| Regex::new(s).expect("validators must compile"))
            .collect();

        let legitimate = [
            "--port=8765",
            "--token=abcdefghijklmnopqrstuvwxyz0123456789_-ABCD",
            "--data-dir=C:\\Mayra\\data",
        ];
        for (re, arg) in regexes.iter().zip(legitimate.iter()) {
            assert!(
                re.is_match(arg),
                "{arg:?} should match {}",
                re.as_str()
            );
        }

        let malicious = "--evil=yes";
        assert!(
            !regexes.iter().any(|re| re.is_match(malicious)),
            "unregistered args must not match sidecar validators"
        );
    }
}
