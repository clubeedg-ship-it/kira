#!/usr/bin/env python3
"""OAuth Relay Proxy — routes MetaClaw through subscription auth.

Reads fresh OAuth tokens from credential files, forwards LLM requests
to the provider's API with the current bearer token. Exposes a standard
OpenAI-compatible endpoint.

Providers:
  - claude-* → Anthropic API (Claude Max OAuth)
  - gpt-*/o1-*/o3-* → OpenAI API (ChatGPT subscription)
  - qwen* → local vLLM (no auth)
  - fallback → OpenRouter (API key)
"""

import json
import os
import sys
from pathlib import Path

import aiohttp
from aiohttp import web

# --- Config ---
PORT = int(os.environ.get("RELAY_PORT", "30001"))

def _load_openrouter_key() -> str:
    """Load OpenRouter key from env or openclaw config."""
    key = os.environ.get("OPENROUTER_API_KEY", "")
    if key:
        return key
    try:
        cfg_path = Path.home() / ".openclaw" / "openclaw.json"
        if cfg_path.exists():
            c = json.loads(cfg_path.read_text())
            return c.get("models", {}).get("providers", {}).get("openrouter", {}).get("apiKey", "")
    except Exception:
        pass
    return ""


PROVIDERS = {
    "anthropic": {
        "credentials": Path.home() / ".claude" / ".credentials.json",
        "credential_path": ["claudeAiOauth", "accessToken"],
        "base_url": "https://api.anthropic.com",
        "prefixes": ["claude"],
        "auth_type": "bearer",
        "extra_headers": {"anthropic-version": "2023-06-01"},
    },
    "openai": {
        "credentials": Path.home() / ".openai" / "credentials.json",
        "credential_path": ["accessToken"],
        "base_url": "https://api.openai.com",
        "prefixes": ["gpt", "o1", "o3", "o4"],
        "auth_type": "bearer",
    },
    "local": {
        "base_url": "http://localhost:8000",
        "prefixes": ["qwen"],
        "auth_type": "none",
    },
    "openrouter": {
        "api_key": _load_openrouter_key(),
        "base_url": "https://openrouter.ai/api",
        "prefixes": [],  # fallback
        "auth_type": "api_key_direct",
    },
}


def read_token(provider_cfg: dict) -> str | None:
    """Read fresh token from credentials file."""
    cred_path = provider_cfg.get("credentials")
    if not cred_path or not cred_path.exists():
        return None
    try:
        data = json.loads(cred_path.read_text())
        for key in provider_cfg["credential_path"]:
            data = data[key]
        return data
    except (KeyError, json.JSONDecodeError, TypeError):
        return None


def get_auth_header(provider_cfg: dict) -> dict:
    """Build auth header for the provider."""
    auth_type = provider_cfg.get("auth_type", "none")
    if auth_type == "none":
        return {}
    if auth_type == "bearer":
        token = read_token(provider_cfg)
        if token:
            return {"Authorization": f"Bearer {token}"}
        return {}
    if auth_type == "api_key":
        key = os.environ.get(provider_cfg.get("api_key_env", ""), "")
        if key:
            return {"Authorization": f"Bearer {key}"}
        return {}
    if auth_type == "api_key_direct":
        key = provider_cfg.get("api_key", "")
        if key:
            return {"Authorization": f"Bearer {key}"}
        return {}
    return {}


def route_model(model: str) -> tuple[str, dict]:
    """Determine which provider handles this model. Returns (base_url, headers)."""
    model_lower = model.lower()
    for name, cfg in PROVIDERS.items():
        for prefix in cfg.get("prefixes", []):
            if model_lower.startswith(prefix):
                headers = get_auth_header(cfg)
                headers.update(cfg.get("extra_headers", {}))
                return cfg["base_url"], headers

    # Fallback to OpenRouter
    cfg = PROVIDERS["openrouter"]
    headers = get_auth_header(cfg)
    return cfg["base_url"], headers


async def proxy_request(request: web.Request) -> web.Response:
    """Proxy any /v1/* request to the appropriate provider."""
    try:
        body = await request.json()
    except json.JSONDecodeError:
        body = {}

    model = body.get("model", "")
    base_url, auth_headers = route_model(model)

    # Forward the request
    path = request.path  # e.g., /v1/chat/completions
    target_url = f"{base_url}{path}"

    headers = {
        "Content-Type": "application/json",
        **auth_headers,
    }

    async with aiohttp.ClientSession() as session:
        try:
            async with session.post(
                target_url,
                json=body,
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=300),
            ) as resp:
                # Check if streaming
                if body.get("stream"):
                    response = web.StreamResponse(
                        status=resp.status,
                        headers={"Content-Type": "text/event-stream"},
                    )
                    await response.prepare(request)
                    async for chunk in resp.content.iter_any():
                        await response.write(chunk)
                    await response.write_eof()
                    return response
                else:
                    result = await resp.text()
                    return web.Response(
                        status=resp.status,
                        text=result,
                        content_type="application/json",
                    )
        except Exception as e:
            return web.json_response(
                {"error": {"message": str(e), "type": "relay_error"}},
                status=502,
            )


async def list_models(request: web.Request) -> web.Response:
    """List available models from all providers."""
    models = [
        {"id": "claude-opus-4", "object": "model", "owned_by": "anthropic"},
        {"id": "claude-sonnet-4", "object": "model", "owned_by": "anthropic"},
        {"id": "gpt-4o", "object": "model", "owned_by": "openai"},
        {"id": "o3", "object": "model", "owned_by": "openai"},
        {"id": "qwen3-14b", "object": "model", "owned_by": "local"},
    ]
    return web.json_response({"object": "list", "data": models})


async def health(request: web.Request) -> web.Response:
    """Health check endpoint."""
    status = {}
    for name, cfg in PROVIDERS.items():
        if cfg.get("auth_type") == "none":
            status[name] = "ok (no auth)"
        elif cfg.get("auth_type") == "bearer":
            token = read_token(cfg) if "credentials" in cfg else None
            status[name] = "ok (token fresh)" if token else "no token"
        elif cfg.get("auth_type") in ("api_key", "api_key_direct"):
            key = cfg.get("api_key", "") or os.environ.get(cfg.get("api_key_env", ""), "")
            status[name] = "ok (key set)" if key else "no key"
    return web.json_response({"status": "healthy", "providers": status})


app = web.Application()
app.router.add_get("/health", health)
app.router.add_get("/v1/models", list_models)
app.router.add_post("/v1/chat/completions", proxy_request)
app.router.add_post("/v1/messages", proxy_request)  # Anthropic native format

if __name__ == "__main__":
    print(f"OAuth Relay starting on port {PORT}")
    web.run_app(app, port=PORT, print=lambda _: None)
    print(f"OAuth Relay running on http://localhost:{PORT}")
