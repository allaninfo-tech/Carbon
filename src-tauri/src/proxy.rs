use axum::{
    body::Bytes,
    extract::{Request, State as AxumState},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    routing::post,
    Router,
};
use reqwest::Client;
use serde_json::Value;
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tokio::sync::Mutex;
use tauri_plugin_store::StoreExt;

#[derive(Clone)]
pub struct ProxyState {
    pub client: Client,
    pub app_handle: AppHandle,
    pub pool_index: Arc<Mutex<usize>>,
}

// Very basic struct for a key
#[derive(Clone)]
pub struct ApiKey {
    pub provider: String,
    pub key: String,
    pub url: String,
}

pub async fn start_proxy(app_handle: AppHandle) {
    let state = ProxyState {
        client: Client::new(),
        app_handle,
        pool_index: Arc::new(Mutex::new(0)),
    };

    let app = Router::new()
        .route("/v1/messages", post(handle_messages))
        // Catch-all for other anthropic routes if tracked
        .fallback(handle_fallback)
        .with_state(state);

    // Run on 14201
    let listener = tokio::net::TcpListener::bind("127.0.0.1:14201").await.unwrap();
    
    tokio::spawn(async move {
        axum::serve(listener, app).await.unwrap();
    });
}

fn get_keys_from_store(app_handle: &AppHandle) -> Vec<ApiKey> {
    // Attempt to load keys from store
    // For MVP, if store doesn't have it, return an empty vec or default
    let store = app_handle.store("settings.json");
    if let Ok(store) = store {
        let keys_val = store.get("api_keys");
        if let Some(Value::Array(arr)) = keys_val {
            let mut keys = Vec::new();
            for item in arr {
                if let (Some(provider), Some(key), Some(url)) = (
                    item.get("provider").and_then(|v| v.as_str()),
                    item.get("key").and_then(|v| v.as_str()),
                    item.get("url").and_then(|v| v.as_str()),
                ) {
                    keys.push(ApiKey {
                        provider: provider.to_string(),
                        key: key.to_string(),
                        url: url.to_string(),
                    });
                }
            }
            if !keys.is_empty() {
                return keys;
            }
        }
    }
    
    // Fallback default structure
    vec![
        ApiKey {
            provider: "openrouter".into(),
            key: std::env::var("OPENROUTER_API_KEY").unwrap_or_default(),
            url: "https://openrouter.ai/api/v1/messages".into()
        }
    ]
}

async fn handle_messages(
    AxumState(state): AxumState<ProxyState>,
    headers: HeaderMap,
    body: Bytes,
) -> impl IntoResponse {
    let keys = get_keys_from_store(&state.app_handle);
    if keys.is_empty() || keys[0].key.is_empty() {
        return (StatusCode::UNAUTHORIZED, "No API keys configured").into_response();
    }

    // Token counting
    if let Ok(json_body) = serde_json::from_slice::<Value>(&body) {
        if let Some(messages) = json_body.get("messages") {
            let content = messages.to_string();
            let bpe = tiktoken_rs::cl100k_base().unwrap();
            let tokens = bpe.encode_with_special_tokens(&content).len();
            
            // Emit context token count to frontend
            let _ = state.app_handle.emit("context-tokens", tokens);

            if tokens > 100_000 { // 85% of 128k
                let _ = state.app_handle.emit("context-compact", ());
            }
        }
    }

    let mut attempts = 0;
    let max_attempts = keys.len();

    while attempts < max_attempts {
        let current_index = {
            let lock = state.pool_index.lock().await;
            *lock
        };
        let active_key = &keys[current_index % keys.len()];
        
        let mut req_builder = state.client.post(&active_key.url)
            .body(body.clone());
        
        // Forward essential headers
        for (name, value) in headers.iter() {
            let name_str = name.as_str().to_lowercase();
            if name_str != "host" && name_str != "authorization" {
                req_builder = req_builder.header(name, value);
            }
        }
        
        // Inject auth
        req_builder = req_builder.header("Authorization", format!("Bearer {}", active_key.key));
        
        // Execute request
        match req_builder.send().await {
            Ok(response) => {
                let status = response.status();
                let is_error_status = status.is_server_error() || status == StatusCode::TOO_MANY_REQUESTS;
                
                let resp_bytes = response.bytes().await.unwrap_or_default();
                let is_json_error = if let Ok(json) = serde_json::from_slice::<Value>(&resp_bytes) {
                    json.get("error").is_some()
                } else {
                    false
                };

                if is_error_status || is_json_error {
                    // Circuit breaker / Rotation
                    let new_index = (current_index + 1) % keys.len();
                    {
                        let mut lock = state.pool_index.lock().await;
                        *lock = new_index;
                    }
                    let next_key = &keys[new_index];
                    let _ = state.app_handle.emit("pty-out", format!("\r\n\x1b[33m⚠ Pool switch: {} rate limited \u{2192} rotating to {}\x1b[0m\r\n", active_key.provider, next_key.provider).replace('\n', "\r\n"));
                    
                    attempts += 1;
                    continue;
                }

                // Success
                return (status, resp_bytes).into_response();
            }
            Err(_) => {
                // Network failure
                let new_index = (current_index + 1) % keys.len();
                {
                    let mut lock = state.pool_index.lock().await;
                    *lock = new_index;
                }
                attempts += 1;
                continue;
            }
        }
    }

    (StatusCode::BAD_GATEWAY, "All proxy pool keys exhausted or failed").into_response()
}

async fn handle_fallback(
    AxumState(_state): AxumState<ProxyState>,
    req: Request<axum::body::Body>,
) -> impl IntoResponse {
    // Just a basic fallback that returns 404 for unhandled routes
    (StatusCode::NOT_FOUND, format!("Route {} not handled by local proxy", req.uri().path())).into_response()
}
