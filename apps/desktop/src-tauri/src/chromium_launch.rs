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

const LANDING_HTML: &str = r#"<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mayra Workspace</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: #0c0c0e;
            color: #fafafa;
            margin: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
        }
        .container {
            max-width: 480px;
            padding: 40px;
            border: 1px solid #1f1f23;
            border-radius: 12px;
            background-color: #111113;
        }
        .header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 24px;
        }
        .logo {
            width: 32px;
            height: 32px;
            background-color: #ffffff;
            color: #0c0c0e;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 18px;
        }
        .status {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            font-size: 13px;
            color: #a1a1aa;
            background-color: #18181b;
            padding: 4px 10px;
            border-radius: 100px;
            border: 1px solid #1f1f23;
        }
        .status-dot {
            width: 8px;
            height: 8px;
            background-color: #10b981;
            border-radius: 50%;
        }
        h1 {
            font-size: 22px;
            font-weight: 600;
            margin: 0 0 12px 0;
            color: #fafafa;
        }
        p {
            font-size: 14px;
            line-height: 1.6;
            color: #a1a1aa;
            margin: 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">M</div>
            <div class="status">
                <span class="status-dot"></span>
                Connected
            </div>
        </div>
        <h1>Mayra Workspace</h1>
        <p>This browser window is connected to Mayra, your personal web agent. Mayra will use this workspace to browse pages, interact with elements, and assist with tasks.</p>
    </div>
</body>
</html>"#;

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
        let debug_base = app
            .path()
            .app_local_data_dir()
            .map_err(|e| e.to_string())?
            .join("chromium-debug");
        let user_data_dir = debug_base.join(browser);
        std::fs::create_dir_all(&user_data_dir).map_err(|e| e.to_string())?;
        let user_data = format!("--user-data-dir={}", user_data_dir.display());

        let landing_path = debug_base.join("landing.html");
        std::fs::write(&landing_path, LANDING_HTML).map_err(|e| e.to_string())?;
        let landing_url = format!("file:///{}", landing_path.to_string_lossy().replace('\\', "/"));

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
            .arg("--hide-crash-restore-bubble")
            .arg("--noerrdialogs")
            .arg(&landing_url)
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
