//! Discover Chrome DevTools (CDP) endpoints on loopback (MAYRA_BUILD_CHECKLIST Phase 2).
//!
//! Hits each port's `/json/version` and `/json` with a short timeout, matching DevTools HTTP API.

use std::time::Duration;

use serde::{Deserialize, Serialize};

const TIMEOUT: Duration = Duration::from_millis(200);

/// One Chrome instance responding on a remote-debugging port.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChromeSession {
    pub port: u16,
    pub browser: String,
    pub user_agent: String,
    pub tabs: Vec<ChromeTab>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChromeTab {
    pub title: String,
    pub url: String,
    pub ws_url: String,
    pub target_id: String,
}

#[derive(Deserialize)]
struct VersionBody {
    #[serde(rename = "Browser", default)]
    browser: String,
    #[serde(rename = "User-Agent", default)]
    user_agent: String,
}

#[derive(Deserialize)]
struct TargetBody {
    id: String,
    #[serde(default)]
    title: String,
    #[serde(default)]
    url: String,
    #[serde(rename = "webSocketDebuggerUrl", default)]
    web_socket_debugger_url: String,
    #[serde(rename = "type", default)]
    target_type: String,
}

fn probe_client() -> Result<reqwest::Client, reqwest::Error> {
    reqwest::Client::builder()
        .connect_timeout(TIMEOUT)
        .timeout(TIMEOUT)
        .build()
}

/// Probes `http://127.0.0.1:<port>` for each port; returns only ports that speak the DevTools HTTP API.
pub async fn probe_chrome_ports(ports: Vec<u16>) -> Vec<ChromeSession> {
    let Ok(client) = probe_client() else {
        return Vec::new();
    };

    let mut out = Vec::new();
    for port in ports {
        if let Some(session) = probe_one(&client, port).await {
            out.push(session);
        }
    }
    out
}

async fn probe_one(client: &reqwest::Client, port: u16) -> Option<ChromeSession> {
    let base = format!("http://127.0.0.1:{port}");
    let version_url = format!("{base}/json/version");

    let v: VersionBody = client.get(&version_url).send().await.ok()?.json().await.ok()?;

    let list_url = format!("{base}/json");
    let targets: Vec<TargetBody> = match client.get(&list_url).send().await {
        Ok(r) => r.json().await.unwrap_or_default(),
        Err(_) => Vec::new(),
    };

    let tabs: Vec<ChromeTab> = targets
        .into_iter()
        .filter(|t| t.target_type == "page")
        .map(|t| ChromeTab {
            title: t.title,
            url: t.url,
            ws_url: t.web_socket_debugger_url,
            target_id: t.id,
        })
        .collect();

    Some(ChromeSession {
        port,
        browser: v.browser,
        user_agent: v.user_agent,
        tabs,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn probe_hits_version_and_json_on_loopback() {
        let mut server = mockito::Server::new_async().await;

        let _v = server
            .mock("GET", "/json/version")
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body(r#"{"Browser":"Chrome/9.9.9","User-Agent":"ProbeTest/1"}"#)
            .create();

        let _j = server
            .mock("GET", "/json")
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body(
                r#"[
  {
    "id": "A1",
    "title": "Hello",
    "url": "https://example.com/",
    "type": "page",
    "webSocketDebuggerUrl": "ws://127.0.0.1:59222/devtools/page/A1"
  },
  {
    "id": "svc",
    "title": "",
    "url": "",
    "type": "service_worker",
    "webSocketDebuggerUrl": "ws://127.0.0.1:59222/devtools/serviceworker"
  }
]"#,
            )
            .create();

        let port = server.socket_address().port();
        let sessions = probe_chrome_ports(vec![port]).await;
        assert_eq!(sessions.len(), 1);
        let s = &sessions[0];
        assert_eq!(s.port, port);
        assert_eq!(s.browser, "Chrome/9.9.9");
        assert_eq!(s.user_agent, "ProbeTest/1");
        assert_eq!(s.tabs.len(), 1);
        assert_eq!(s.tabs[0].title, "Hello");
        assert_eq!(s.tabs[0].url, "https://example.com/");
        assert_eq!(s.tabs[0].target_id, "A1");
        assert!(s.tabs[0].ws_url.contains("devtools/page"));
    }

    #[tokio::test]
    async fn skips_port_when_version_unavailable() {
        let mut server = mockito::Server::new_async().await;
        let port = server.socket_address().port();
        let _v = server
            .mock("GET", "/json/version")
            .with_status(404)
            .create();

        let sessions = probe_chrome_ports(vec![port]).await;
        assert!(sessions.is_empty());
    }
}
