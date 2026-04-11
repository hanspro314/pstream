#!/usr/bin/env python3
"""
Munowatch: Why does the re-signed token get 401 but original doesn't?
=====================================================================
The deep-dive showed re-signing the exact original payload produced matching
signatures. But a fresh token with different exp gets 401.

Hypothesis: The server might be checking the EXACT token string against a
database of issued tokens, NOT just the HMAC signature. Or the exp value
matters and expired tokens bypass a different code path.

Let's test systematically.
"""

import time, json, base64, sys
import requests

BASE_URL = "https://munoapi.com/api"
USER_ID = "82717"
USER_AGENT = "Android IOS v3.0"

KEY = "022778e418ad68ffda9aa4fab1892fff"

try:
    import jwt
    HAS_JWT = True
except ImportError:
    HAS_JWT = False

ORIGINAL_TOKEN = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
    "eyJ1c2VybmFtZSI6IkFuZHJvaWQgVFYiLCJhcHBuYW1lIjoiTXVub3dhdGNoIFRWIiwiaG9zdCI6"
    "Im11bm93YXRjaC5jbyIsImFwcHNlY3JldCI6IjAyMjc3OGU0MThhZDY4ZmZkYTlhYTRmYWIxODky"
    "ZmZmIiwiYWN0aXZhdGVkIjoiMSIsImV4cCI6MTcwNzM2ODQwMH0.unlPnEzptg6VFHs7WWm213bR"
    "HHNxYuAN2eZQvjtPKL0"
)

PASS = "\033[92m"; FAIL = "\033[91m"; WARN = "\033[93m"
BOLD = "\033[1m"; DIM = "\033[90m"; CYAN = "\033[96m"; RESET = "\033[0m"

def test_ep(ep, token, method="GET"):
    url = f"{BASE_URL}/{ep}"
    headers = {"Accept": "application/json", "User-Agent": USER_AGENT}
    if token:
        headers["X-Api-Key"] = token
        headers["Authorization"] = f"Bearer {token}"
    try:
        r = requests.get(url, headers=headers, timeout=15) if method == "GET" else requests.post(url, headers=headers, timeout=15)
        try:
            j = r.json()
        except:
            j = None
        return r.status_code, j
    except Exception as e:
        return 0, None

def manual_jwt_encode(payload_dict, key):
    """Manually encode JWT without PyJWT to ensure exact behavior."""
    import hmac, hashlib
    header = {"alg": "HS256", "typ": "JWT"}
    
    def b64encode(data):
        return base64.urlsafe_b64encode(json.dumps(data, separators=(',', ':')).encode()).rstrip(b'=').decode()
    
    h = b64encode(header)
    p = b64encode(payload_dict)
    
    signing_input = f"{h}.{p}".encode()
    signature = hmac.new(key.encode(), signing_input, hashlib.sha256).digest()
    s = base64.urlsafe_b64encode(signature).rstrip(b'=').decode()
    
    return f"{h}.{p}.{s}"

print(f"\n{BOLD}{CYAN}{'='*75}{RESET}")
print(f"{BOLD}{CYAN}  JWT ENCODING INVESTIGATION: Why fresh tokens get 401{RESET}")
print(f"{BOLD}{CYAN}{'='*75}{RESET}")

# ─── Step 1: Check if PyJWT and manual encoding produce same result ─────
print(f"\n{BOLD}Step 1: Compare PyJWT vs Manual JWT encoding{RESET}")

test_payload = {
    "username": "Android TV",
    "appname": "Munowatch TV", 
    "host": "munowatch.co",
    "appsecret": KEY,
    "activated": "1",
    "exp": 2091255639,
}

if HAS_JWT:
    pyjwt_token = jwt.encode(test_payload, KEY, algorithm="HS256")
    manual_token = manual_jwt_encode(test_payload, KEY)
    
    print(f"  PyJWT:  ...{pyjwt_token[-30:]}")
    print(f"  Manual: ...{manual_token[-30:]}")
    print(f"  Match:  {PASS}YES{RESET}" if pyjwt_token == manual_token else f"  Match:  {FAIL}NO{RESET}")
    
    # Also check the original token
    orig_payload = {
        "username": "Android TV",
        "appname": "Munowatch TV",
        "host": "munowatch.co",
        "appsecret": KEY,
        "activated": "1",
        "exp": 1707368400,
    }
    
    pyjwt_orig = jwt.encode(orig_payload, KEY, algorithm="HS256")
    manual_orig = manual_jwt_encode(orig_payload, KEY)
    
    print(f"\n  Original token (expired) comparison:")
    print(f"  Server:  ...{ORIGINAL_TOKEN.split('.')[2][-30:]}")
    print(f"  PyJWT:   ...{pyjwt_orig.split('.')[2][-30:]}")
    print(f"  Manual:  ...{manual_orig.split('.')[2][-30:]}")
    print(f"  PyJWT matches server:  {PASS}YES{RESET}" if pyjwt_orig.split('.')[2] == ORIGINAL_TOKEN.split('.')[2] else f"  PyJWT matches server:  {FAIL}NO{RESET}")
    
    # Check the full token
    print(f"  Full token matches:    {PASS}YES{RESET}" if pyjwt_orig == ORIGINAL_TOKEN else f"  Full token matches:    {FAIL}NO{RESET}")
    
    if pyjwt_orig != ORIGINAL_TOKEN:
        # Show the difference character by character
        p_parts = pyjwt_orig.split(".")
        o_parts = ORIGINAL_TOKEN.split(".")
        print(f"\n  Payload comparison:")
        print(f"    PyJWT:   {p_parts[1]}")
        print(f"    Server:  {o_parts[1]}")
        print(f"    Match:   {p_parts[1] == o_parts[1]}")
        
        # Check encoding differences
        print(f"\n  Signature comparison:")
        print(f"    PyJWT:   {p_parts[2]}")
        print(f"    Server:  {o_parts[2]}")
        print(f"    Match:   {p_parts[2] == o_parts[2]}")

# ─── Step 2: Test the EXACT original token byte-for-byte ────────────────
print(f"\n{BOLD}Step 2: Test with EXACT original token{RESET}")

# The ORIGINAL token should still work (it worked in previous tests)
s_orig, j_orig = test_ep("search/Avengers/82717/0", ORIGINAL_TOKEN)
print(f"  Original expired token on search: HTTP {s_orig}", end="")
if j_orig and isinstance(j_orig, dict):
    if "401" in j_orig:
        print(f" → {FAIL}401{RESET}")
    elif "400" in j_orig:
        print(f" → {WARN}400: {j_orig['400']}{RESET}")
    else:
        keys = list(j_orig.keys())
        print(f" → keys: {keys}")

time.sleep(0.5)

# ─── Step 3: Test tokens with different exp values ──────────────────────
print(f"\n{BOLD}Step 3: Test tokens with different exp values{RESET}")

exp_tests = [
    ("Original exp (1707368400)", 1707368400),
    ("exp = now (current)", int(time.time())),
    ("exp = now + 1 hour", int(time.time()) + 3600),
    ("exp = now + 10 years", int(time.time()) + (10*365*24*3600)),
    ("exp = now + 100 years", int(time.time()) + (100*365*24*3600)),
    ("exp = 9999999999 (max)", 9999999999),
    ("exp = 0 (epoch)", 0),
    ("exp = 1", 1),
    ("No exp field", None),
]

for name, exp_val in exp_tests:
    payload = {
        "username": "Android TV",
        "appname": "Munowatch TV",
        "host": "munowatch.co",
        "appsecret": KEY,
        "activated": "1",
    }
    if exp_val is not None:
        payload["exp"] = exp_val
    
    token = manual_jwt_encode(payload, KEY)
    s, j = test_ep("search/Avengers/82717/0", token)
    
    status_str = f"HTTP {s}"
    if s == 401:
        status_str = f"{FAIL}HTTP 401 REJECTED{RESET}"
    elif s == 200:
        has_data = j and isinstance(j, dict) and ("search" in j or "results" in j)
        status_str = f"{PASS}HTTP 200 DATA{RESET}" if has_data else f"{WARN}HTTP 200 empty{RESET}"
    elif s == 500:
        status_str = f"{WARN}HTTP 500 server err{RESET}"
    elif "400" in str(j):
        status_str = f"{FAIL}HTTP {s} 400 err{RESET}"
    
    print(f"  {name:<30} → {status_str}")
    time.sleep(0.5)

# ─── Step 4: Maybe server checks if token is in a whitelist/database? ───
print(f"\n{BOLD}Step 4: Does the server check token against a database?{RESET}")

# If the server has the original token in a DB, only that EXACT token works
# Let's test slight modifications

# Modify one character in the original token
mod_tokens = {
    "Original (exact)": ORIGINAL_TOKEN,
    "Original + 1 char at end": ORIGINAL_TOKEN + "a",
    "Original - 1 char at end": ORIGINAL_TOKEN[:-1],
    "Original payload, new sig": f"{ORIGINAL_TOKEN.rsplit('.',1)[0]}.FAKE_SIGNATURE_HERE",
}

# Compute with original header + payload but using our key
parts = ORIGINAL_TOKEN.split(".")
mod_tokens["Original header+payload, our sig"] = f"{parts[0]}.{parts[1]}.{manual_jwt_encode(json.loads(base64.urlsafe_b64decode(parts[1]+'==')), KEY).split('.')[2]}"

for name, token in mod_tokens.items():
    s, j = test_ep("search/Avengers/82717/0", token)
    
    if s == 401:
        result = f"{FAIL}401 REJECTED{RESET}"
    elif s == 200:
        has_data = j and isinstance(j, dict) and any(k in j for k in ("search","results","dashboard"))
        result = f"{PASS}200 OK{RESET}" if has_data else f"{WARN}200 empty{RESET}"
    elif s == 400:
        result = f"{FAIL}400: {str(j)[:40] if j else ''}{RESET}"
    elif s == 500:
        result = f"{WARN}500 server{RESET}"
    else:
        result = f"{DIM}HTTP {s}{RESET}"
    
    print(f"  {name:<42} → {result}")
    time.sleep(0.5)

# ─── Step 5: Check if X-Api-Key vs Authorization matters ────────────────
print(f"\n{BOLD}Step 5: Which header does the server actually check?{RESET}")

header_tests = {
    "Both headers (current)": {"X-Api-Key": ORIGINAL_TOKEN, "Authorization": f"Bearer {ORIGINAL_TOKEN}"},
    "Only X-Api-Key": {"X-Api-Key": ORIGINAL_TOKEN},
    "Only Authorization": {"Authorization": f"Bearer {ORIGINAL_TOKEN}"},
    "X-Api-Key only (fresh token)": {"X-Api-Key": manual_jwt_encode({
        "username": "Android TV", "appname": "Munowatch TV", "host": "munowatch.co",
        "appsecret": KEY, "activated": "1", "exp": int(time.time()) + 999999999
    }, KEY)},
}

for name, hdrs in header_tests:
    hdrs["Accept"] = "application/json"
    hdrs["User-Agent"] = USER_AGENT
    url = f"{BASE_URL}/search/Avengers/{USER_ID}/0"
    try:
        r = requests.get(url, headers=hdrs, timeout=15)
        j = r.json()
        if "401" in j:
            result = f"{FAIL}401{RESET}"
        elif "400" in j:
            result = f"{FAIL}400{RESET}"
        elif r.status_code == 200:
            result = f"{PASS}200{RESET}"
        else:
            result = f"WARN {r.status_code}"
    except Exception as e:
        result = f"{FAIL}ERR{RESET}"
    print(f"  {name:<42} → {result}")
    time.sleep(0.5)

print(f"\n{BOLD}{CYAN}{'='*75}{RESET}")
