//! Start Chrome / Edge with `--remote-debugging-port` (Windows install paths).

use std::path::Path;
use std::process::{Command, Stdio};

use tauri::AppHandle;
use tauri::Manager;

#[cfg(windows)]
const CHROME_EXE: &str = r"C:\Program Files\Google\Chrome\Application\chrome.exe";

#[cfg(windows)]
const EDGE_CANDIDATES: &[&str] = &[
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
];

/// `browser`: `chrome` | `edge`. Uses a Mayra-owned profile dir so a normal Chromium session does not block the debug port.
pub fn launch_chromium_remote_debug(app: &AppHandle, browser: &str, port: u16) -> Result<(), String> {
    if !(1024..=65535).contains(&port) {
        return Err("port must be 1024–65535".into());
    }
    #[cfg(not(windows))]
    {
        let _ = (app, browser, port);
        return Err("launch_chromium_remote_debug is only wired for Windows paths in this build".into());
    }

    #[cfg(windows)]
    {
        let base = app
            .path()
            .app_local_data_dir()
            .map_err(|e| e.to_string())?
            .join("chromium-debug")
            .join(browser);
        std::fs::create_dir_all(&base).map_err(|e| e.to_string())?;
        let user_data_dir = base;
        let user_data = format!("--user-data-dir={}", user_data_dir.display());

        let (exe, label) = match browser {
            "chrome" => {
                if !Path::new(CHROME_EXE).is_file() {
                    return Err(format!("Chrome not found at {CHROME_EXE} (adjust PATH or install)"));
                }
                (CHROME_EXE, "Chrome")
            }
            "edge" => {
                let mut found = None;
                for p in EDGE_CANDIDATES {
                    if Path::new(p).is_file() {
                        found = Some(*p);
                        break;
                    }
                }
                let exe = found.ok_or_else(|| {
                    "Microsoft Edge not found under Program Files (x86) or Program Files.".to_string()
                })?;
                (exe, "Edge")
            }
            _ => return Err("browser must be \"chrome\" or \"edge\"".into()),
        };

        let port_arg = format!("--remote-debugging-port={port}");
        let addr_arg = "--remote-debugging-address=127.0.0.1".to_string();
        let mut cmd = Command::new(exe);
        cmd.arg(&port_arg)
            .arg(&addr_arg)
            .arg(&user_data)
            .arg("--no-first-run")
            .arg("--no-default-browser-check")
            .arg("--disable-features=ChromeWhatsNewUI")
            .arg("--disable-session-crashed-bubble")
            .arg("about:blank")
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null());

        let child = cmd
            .spawn()
            .map_err(|e| format!("failed to start {label}: {e}"))?;
        log::info!(
            "started {label} remote debugging on port {port} (pid {}, user-data-dir={})",
            child.id(),
            user_data_dir.display()
        );
        Ok(())
    }
}
