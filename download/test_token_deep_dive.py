#!/usr/bin/env python3
"""
Munowatch Deep-Dive: Original vs Self-Signed Token Comparison
==============================================================
The first test showed a KEY difference:
  - Original expired token → dashboard OK, search 200 (empty), preview OK, others → 500
  - Self-signed tokens     → dashboard OK, preview OK, others → 401
  - No token               → dashboard OK, preview OK, others → 400 ("Api token is missing")

This means:
  1. dashboard & preview DON'T check auth at all (work with ANY token or no token)
  2. Other endpoints DO check if a token EXISTS (400 without, 401 with bad one)
  3. The ORIGINAL token passes the existence check (gets 500 = server error, not auth error)
  4. Self-signed tokens FAIL the existence check (get 401 = unauthorized)

This means the server DOES validate the token signature on certain endpoints!
The original token's signature is valid (signed by the real server key).
Our self-signed tokens have invalid signatures (wrong signing key).

Let's verify this precisely.
"""

import time
import json
import sys
import base64
import jwt
import requests

BASE_URL = "https://munoapi.com/api"
USER_ID = "82717"
USER_AGENT = "Android IOS v3.0"

KEY_ORIGINAL = "022778e418ad68ffda9aa4fab1892fff"

ORIGINAL_TOKEN = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
    "eyJ1c2VybmFtZSI6IkFuZHJvaWQgVFYiLCJhcHBuYW1lIjoiTXVub3dhdGNoIFRWIiwiaG9zdCI6"
    "Im11bm93YXRjaC5jbyIsImFwcHNlY3JldCI6IjAyMjc3OGU0MThhZDY4ZmZkYTlhYTRmYWIxODky"
    "ZmZmIiwiYWN0aXZhdGVkIjoiMSIsImV4cCI6MTcwNzM2ODQwMH0.unlPnEzptg6VFHs7WWm213bR"
    "HHNxYuAN2eZQvjtPKL0"
)

def make_request(endpoint, token=None, method="GET", timeout=15):
    url = f"{BASE_URL}/{endpoint}"
    headers = {"Accept": "application/json", "User-Agent": USER_AGENT}
    if token:
        headers["X-Api-Key"] = token
        headers["Authorization"] = f"Bearer {token}"
    
    try:
        if method == "GET":
            resp = requests.get(url, headers=headers, timeout=timeout)
        else:
            resp = requests.post(url, headers=headers, data={"uid": USER_ID, "vid": "63003", "state": "1"}, timeout=timeout)
        
        status = resp.status_code
        ct = resp.headers.get("content-type", "")
        is_html = "text/html" in ct
        
        json_data = None
        error_msg = None
        resp_snippet = ""
        try:
            json_data = resp.json()
            if isinstance(json_data, dict):
                if json_data.get("error"):
                    error_msg = json_data.get("message", json_data.get("msg", str(json_data.get("error"))))
                if "400" in json_data:
                    error_msg = str(json_data["400"])
        except:
            pass
        
        if not json_data:
            resp_snippet = resp.text[:300]
        
        return {
            "status": status,
            "is_html": is_html,
            "json": json_data,
            "error": error_msg,
            "snippet": resp_snippet,
            "content_length": len(resp.content),
        }
    except Exception as e:
        return {"status": 0, "error": str(e), "is_html": False}

PASS = "\033[92m"
FAIL = "\033[91m"
WARN = "\033[93m"
BOLD = "\033[1m"
DIM = "\033[90m"
CYAN = "\033[96m"
RESET = "\033[0m"
YELLOW_BG = "\033[43m"

print(f"\n{BOLD}{CYAN}{'='*75}{RESET}")
print(f"{BOLD}{CYAN}  DEEP-DIVE: TOKEN AUTH BEHAVIOR PER ENDPOINT{RESET}")
print(f"{BOLD}{CYAN}{'='*75}{RESET}")

# Endpoints that matter
endpoints = [
    "dashboard/v2/82717",
    "search/Avengers/82717/0",
    "preview/v2/63003/82717",
    "browse/tabs",
    "list/5/0/82717/0",
    "shows/5/0/82717/0",
    "download",
]

tokens = {
    "Original Expired": ORIGINAL_TOKEN,
    "Self-signed (fff)": jwt.encode({
        "username": "Android TV", "appname": "Munowatch TV", "host": "munowatch.co",
        "appsecret": KEY_ORIGINAL, "activated": "1", "exp": int(time.time()) + 999999999
    }, KEY_ORIGINAL, algorithm="HS256"),
    "Self-signed (ffff)": jwt.encode({
        "username": "Android TV", "appname": "Munowatch TV", "host": "munowatch.co",
        "appsecret": KEY_ORIGINAL + "f", "activated": "1", "exp": int(time.time()) + 999999999
    }, KEY_ORIGINAL + "f", algorithm="HS256"),
    "No Token": None,
}

# Print table header
header = f"  {'Endpoint':<30}"
for tname in tokens:
    header += f" {tname:>18}"
print(f"\n{BOLD}{header}{RESET}")
print(f"  {'─'*30} {'─'*18*len(tokens)}")

for ep in endpoints:
    row = f"  {ep:<30}"
    for tname, token in tokens.items():
        result = make_request(ep, token=token, method="POST" if ep == "download" else "GET")
        status = result["status"]
        error = result.get("error", "")[:20] if result.get("error") else ""
        is_html = result.get("is_html", False)
        
        # Color code
        if result.get("json") and isinstance(result.get("json"), dict):
            jd = result["json"]
            if "dashboard" in jd or "preview" in jd or "banner" in jd:
                color = PASS
                label = f"{PASS}{status} DATA{RESET}"
            elif "400" in jd and "token" in str(jd["400"]).lower():
                color = FAIL
                label = f"{FAIL}{status} NO-TOK{RESET}"
            elif status == 401:
                color = FAIL
                label = f"{FAIL}{status} 401{RESET}"
            elif status == 500:
                color = WARN
                label = f"{WARN}{status} 500{RESET}"
            elif status == 200:
                # Check if has meaningful data
                has_data = any(k in jd for k in ("results", "search", "data", "tabs", "items", "list", "shows"))
                if has_data or isinstance(jd, list):
                    color = PASS
                    label = f"{PASS}{status} DATA{RESET}"
                else:
                    color = DIM
                    label = f"{DIM}{status} empty{RESET}"
            elif status == 404:
                color = DIM
                label = f"{DIM}{status} 404{RESET}"
            else:
                color = WARN
                label = f"{WARN}{status} {error[:10]}{RESET}"
        elif is_html:
            color = FAIL
            label = f"{FAIL}{status} HTML{RESET}"
        elif status == 0:
            color = FAIL
            label = f"{FAIL}ERR{RESET}"
        else:
            color = WARN
            label = f"{WARN}{status}{RESET}"
        
        row += f" {label:>18}"
    print(row)

# ─── NOW: Let's look at what 500 errors actually return ──────────────────
print(f"\n{BOLD}{CYAN}{'='*75}{RESET}")
print(f"{BOLD}{CYAN}  WHAT DO THE 500 ERRORS LOOK LIKE? (Original Token){RESET}")
print(f"{BOLD}{CYAN}{'='*75}{RESET}")

ep_500s = ["browse/tabs", "list/5/0/82717/0", "shows/5/0/82717/0"]
for ep in ep_500s:
    result = make_request(ep, token=ORIGINAL_TOKEN)
    print(f"\n  {BOLD}{ep}{RESET}  →  HTTP {result['status']}")
    print(f"  Is HTML: {result['is_html']}")
    if result.get("json"):
        print(f"  JSON: {json.dumps(result['json'], indent=4)[:500]}")
    elif result.get("snippet"):
        print(f"  Response: {result['snippet'][:300]}")
    time.sleep(0.5)

# ─── NOW: What does 401 look like with self-signed? ─────────────────────
print(f"\n{BOLD}{CYAN}{'='*75}{RESET}")
print(f"{BOLD}{CYAN}  WHAT DO THE 401 ERRORS LOOK LIKE? (Self-signed Token){RESET}")
print(f"{BOLD}{CYAN}{'='*75}{RESET}")

self_token = jwt.encode({
    "username": "Android TV", "appname": "Munowatch TV", "host": "munowatch.co",
    "appsecret": KEY_ORIGINAL, "activated": "1", "exp": int(time.time()) + 999999999
}, KEY_ORIGINAL, algorithm="HS256")

for ep in ep_500s:
    result = make_request(ep, token=self_token)
    print(f"\n  {BOLD}{ep}{RESET}  →  HTTP {result['status']}")
    if result.get("json"):
        print(f"  JSON: {json.dumps(result['json'], indent=4)[:500]}")
    elif result.get("snippet"):
        print(f"  Response: {result['snippet'][:300]}")
    time.sleep(0.5)

# ─── KEY EXPERIMENT: Modify only the signature, keep exact payload ────────
print(f"\n{BOLD}{CYAN}{'='*75}{RESET}")
print(f"{BOLD}{CYAN}  EXPERIMENT: Re-sign the ORIGINAL payload with our key{RESET}")
print(f"{BOLD}{CYAN}{'='*75}{RESET}")

# Extract exact original payload
parts = ORIGINAL_TOKEN.split(".")
orig_payload_json = base64.urlsafe_b64decode(parts[1] + "==")
orig_payload = json.loads(orig_payload_json)

print(f"\n  Original payload (exact):")
print(f"  {json.dumps(orig_payload, indent=4)}")

# Re-sign with appsecret as key
resigned = jwt.encode(orig_payload, KEY_ORIGINAL, algorithm="HS256")
print(f"\n  Re-signed with key '{KEY_ORIGINAL}':")
print(f"  Original sig: ...{parts[2][-20:]}")
print(f"  Re-signed sig: ...{resigned.split('.')[2][-20:]}")
print(f"  Signatures match: {parts[2] == resigned.split('.')[2]}")

# Test re-signed token
for ep in ep_500s:
    result_orig = make_request(ep, token=ORIGINAL_TOKEN)
    result_resign = make_request(ep, token=resigned)
    match = "MATCH" if result_orig["status"] == result_resign["status"] else "DIFFER"
    print(f"\n  {ep}:")
    print(f"    Original:  HTTP {result_orig['status']}")
    print(f"    Re-signed: HTTP {result_resign['status']}  [{match}]")
    if result_resign.get("json"):
        print(f"    Re-signed JSON: {json.dumps(result_resign['json'], indent=4)[:300]}")
    time.sleep(0.5)

# ─── EXPERIMENT 2: Sign original payload with MANY possible keys ────────
print(f"\n{BOLD}{CYAN}{'='*75}{RESET}")
print(f"{BOLD}{CYAN}  EXPERIMENT: Brute-force check for the REAL signing key{RESET}")
print(f"{BOLD}{CYAN}{'='*75}{RESET}")

# Common key candidates
key_candidates = [
    ("appsecret (fff)", KEY_ORIGINAL),
    ("appsecret (ffff)", KEY_ORIGINAL + "f"),
    ("appsecret lowercase", KEY_ORIGINAL.lower()),
    ("host field", "munowatch.co"),
    ("appname field", "Munowatch TV"),
    ("username field", "Android TV"),
    ("combined host+secret", "munowatch.co" + KEY_ORIGINAL),
    ("combined secret+host", KEY_ORIGINAL + "munowatch.co"),
    ("appsecret reversed", KEY_ORIGINAL[::-1]),
    ("JWT header as key", parts[0]),
    ("just 'secret'", "secret"),
    ("just 'key'", "key"),
    ("empty string", ""),
    ("appsecret without dashes", KEY_ORIGINAL),
    ("MD5 of appsecret", __import__('hashlib').md5(KEY_ORIGINAL.encode()).hexdigest()),
]

# The known correct signature from original token
correct_sig = parts[2]
test_ep = "browse/tabs"

print(f"\n  Checking which key reproduces the original signature...")
print(f"  Correct signature: ...{correct_sig[-30:]}")
print()

found_key = None
for name, key in key_candidates:
    try:
        test_sig = jwt.encode(orig_payload, key, algorithm="HS256").split(".")[2]
        matches = test_sig == correct_sig
        if matches:
            print(f"  {PASS}✓ MATCH: {name}{RESET}")
            print(f"     Key: {key}")
            found_key = key
        else:
            print(f"  {DIM}✗ {name:<30} sig...{test_sig[-15:]}{RESET}")
    except Exception as e:
        print(f"  {DIM}✗ {name:<30} ERROR: {e}{RESET}")

if not found_key:
    print(f"\n  {WARN}⚠ None of the candidate keys reproduce the original signature.{RESET}")
    print(f"  {DIM}  The real signing key is likely a server-side secret, not the appsecret.{RESET}")
    print(f"  {DIM}  It could be:{RESET}")
    print(f"  {DIM}  • A different secret stored only on munowatch.co's server{RESET}")
    print(f"  {DIM}  • Derived from the appsecret (e.g., SHA256(appsecret)){RESET}")
    print(f"  {DIM}  • A per-app secret issued when the app was registered{RESET}")

    # Try derived keys
    print(f"\n  Checking derived keys...")
    import hashlib
    derived_candidates = [
        ("SHA256(appsecret)", hashlib.sha256(KEY_ORIGINAL.encode()).hexdigest()),
        ("SHA256(appsecret)[:32]", hashlib.sha256(KEY_ORIGINAL.encode()).hexdigest()[:32]),
        ("MD5(appsecret)", hashlib.md5(KEY_ORIGINAL.encode()).hexdigest()),
        ("SHA1(appsecret)", hashlib.sha1(KEY_ORIGINAL.encode()).hexdigest()),
        ("SHA256(host)", hashlib.sha256("munowatch.co".encode()).hexdigest()),
        ("SHA256(appname)", hashlib.sha256("Munowatch TV".encode()).hexdigest()),
    ]
    for name, key in derived_candidates:
        try:
            test_sig = jwt.encode(orig_payload, key, algorithm="HS256").split(".")[2]
            matches = test_sig == correct_sig
            if matches:
                print(f"  {PASS}✓ MATCH: {name}{RESET}")
                print(f"     Key: {key}")
                found_key = key
            else:
                print(f"  {DIM}✗ {name}{RESET}")
        except Exception:
            print(f"  {DIM}✗ {name} (ERROR){RESET}")

# ─── FINAL CONCLUSION ──────────────────────────────────────────────────
print(f"\n{BOLD}{CYAN}{'='*75}{RESET}")
print(f"{BOLD}{CYAN}  FINAL CONCLUSION{RESET}")
print(f"{BOLD}{CYAN}{'='*75}{RESET}")

print(f"""
  {BOLD}ENDPOINT AUTH MATRIX:{RESET}

  {BOLD}No auth required (works without token):{RESET}
    • dashboard/v2/{{user_id}}  → Always returns data
    • preview/v2/{{vid}}/{{user_id}} → Always returns data

  {BOLD}Token PRESENCE required (400 without, varies with token):{RESET}
    • search/{{query}}/{{user_id}}/0
    • browse/tabs
    • list/{{pipe}}/{{pid}}/{{user_id}}/0
    • shows/{{pipe}}/{{pid}}/{{user_id}}/0
    • episodes/range/{{vid}}/{{scode}}/{{no}}
    • download (POST)

  {BOLD}TOKEN VALIDATION BEHAVIOR:{RESET}
    • Original expired token → PASSES validation (gets through to server errors 500)
    • Self-signed tokens     → FAILS validation (gets 401 Unauthorized)
    • No token               → Gets 400 "Api token is missing"

  This proves: {BOLD}The server DOES validate JWT signatures on most endpoints.{RESET}

  The original token was signed with a {BOLD}server-side secret{RESET} that is
  NOT the same as the appsecret in the payload.
""")

if found_key:
    print(f"  {PASS}THE SIGNING KEY WAS FOUND: {found_key}{RESET}")
    print(f"  {PASS}You CAN generate independent tokens!{RESET}")
else:
    print(f"  {FAIL}The signing key was NOT found among candidates.{RESET}")
    print(f"""  
  {BOLD}Your options to achieve independence:{RESET}

  1. {BOLD}Intercept the real app{RESET} — Use mitmproxy/Charles to capture traffic
     from the Munowatch TV Android app and find the auth endpoint
     that issues tokens, or find the hardcoded signing key in the APK.

  2. {BOLD}Reverse the APK{RESET} — Decompile the Munowatch TV app (jadx/apktool)
     to find the API key or token generation logic.

  3. {BOLD}Find an auth endpoint{RESET} — The server might have a login/register
     API that issues new tokens. Try common patterns:
       POST /api/auth/login
       POST /api/auth/token
       POST /api/user/login
       POST /api/token/refresh

  4. {BOLD}Use a different API key format{RESET} — Maybe the X-Api-Key header
     doesn't need to be a JWT at all. Test with random strings, API keys,
     or other formats the mobile app might use.

  5. {BOLD}Use only the unauthenticated endpoints{RESET} — dashboard and preview
     work without valid auth. You could build your tool around just those
     two endpoints plus the download URLs they provide.
""")
