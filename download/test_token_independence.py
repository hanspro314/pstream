#!/usr/bin/env python3
"""
Munowatch Token Independence Test Suite
========================================
Tests whether self-signed JWT tokens work with the Munowatch API.
Determines if we can go independent of the server's token issuance.

Tests:
  1. Original expired token (baseline)
  2. Self-signed token with correct key (3 f's: ...1892fff)
  3. Self-signed token with user's key (4 f's: ...1892ffff)
  4. Self-signed token with completely wrong key
  5. Self-signed token with modified payload claims
  6. Token with no appsecret claim
  7. Token with different username
  8. No token at all (anonymous)

For each token, we test against all known API endpoints.
"""

import time
import json
import sys
import base64
import jwt  # pip install PyJWT

try:
    import requests
except ImportError:
    print("ERROR: pip install requests")
    sys.exit(1)

# ─── Configuration ────────────────────────────────────────────────────────────

BASE_URL = "https://munoapi.com/api"
USER_ID = "82717"

# Key variations to test
KEY_ORIGINAL = "022778e418ad68ffda9aa4fab1892fff"   # from the JWT payload (3 f's)
KEY_USER = "022778e418ad68ffda9aa4fab1892ffff"       # user's version (4 f's - typo?)
KEY_WRONG = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"       # completely wrong

# The original expired token from the source code
ORIGINAL_TOKEN = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
    "eyJ1c2VybmFtZSI6IkFuZHJvaWQgVFYiLCJhcHBuYW1lIjoiTXVub3dhdGNoIFRWIiwiaG9zdCI6"
    "Im11bm93YXRjaC5jbyIsImFwcHNlY3JldCI6IjAyMjc3OGU0MThhZDY4ZmZkYTlhYTRmYWIxODky"
    "ZmZmIiwiYWN0aXZhdGVkIjoiMSIsImV4cCI6MTcwNzM2ODQwMH0.unlPnEzptg6VFHs7WWm213bR"
    "HHNxYuAN2eZQvjtPKL0"
)

USER_AGENT = "Android IOS v3.0"

# API endpoints to test (name, method, endpoint_pattern)
ENDPOINTS = [
    ("dashboard",    "GET",  f"dashboard/v2/{USER_ID}"),
    ("search",       "GET",  f"search/Avengers/{USER_ID}/0"),
    ("preview",      "GET",  f"preview/v2/63003/{USER_ID}"),     # a known VID
    ("browse_tabs",  "GET",  "browse/tabs"),
    ("list_action",  "GET",  f"list/5/0/{USER_ID}/0"),           # action category
    ("shows",        "GET",  f"shows/5/0/{USER_ID}/0"),
    ("episodes",     "GET",  "episodes/range/17976/SCODE/10"),   # sample values
    ("download",     "POST", "download"),
]


# ─── Token Generators ─────────────────────────────────────────────────────────

def make_token(key, payload_overrides=None, exp_seconds=None):
    """Generate a JWT token with the given key and payload overrides."""
    if exp_seconds is None:
        exp_seconds = 10 * 365 * 24 * 3600  # 10 years

    payload = {
        "username": "Android TV",
        "appname": "Munowatch TV",
        "host": "munowatch.co",
        "appsecret": key,
        "activated": "1",
        "exp": int(time.time()) + exp_seconds,
    }
    if payload_overrides:
        payload.update(payload_overrides)

    return jwt.encode(payload, key, algorithm="HS256")


def make_expired_token(key):
    """Generate an already-expired token."""
    return make_token(key, exp_seconds=-3600)


# ─── API Tester ───────────────────────────────────────────────────────────────

def test_endpoint(name, method, endpoint, token=None, timeout=15):
    """Test a single endpoint and return the result."""
    url = f"{BASE_URL}/{endpoint}"
    headers = {
        "Accept": "application/json",
        "User-Agent": USER_AGENT,
    }
    if token:
        headers["X-Api-Key"] = token
        headers["Authorization"] = f"Bearer {token}"

    try:
        if method == "GET":
            resp = requests.get(url, headers=headers, timeout=timeout)
        else:
            resp = requests.post(url, headers=headers, data={
                "uid": USER_ID, "vid": "63003", "state": "1"
            }, timeout=timeout)

        status = resp.status_code
        content_type = resp.headers.get("content-type", "")

        # Analyze response
        is_html = "text/html" in content_type
        has_json = False
        json_data = None
        error_msg = None
        has_data = False

        try:
            json_data = resp.json()
            has_json = True
            if isinstance(json_data, dict):
                if json_data.get("error"):
                    error_msg = json_data.get("message", json_data.get("msg", str(json_data.get("error"))))
                if "400" in json_data:
                    error_msg = f"Auth error: {json_data['400']}"
                # Check if response actually contains meaningful data
                for key in ("dashboard", "banner", "results", "search", "data", "preview", "tabs"):
                    if key in json_data:
                        has_data = True
                        break
                if isinstance(json_data, list) and len(json_data) > 0:
                    has_data = True
        except Exception:
            pass

        return {
            "status": status,
            "is_html": is_html,
            "has_json": has_json,
            "has_data": has_data,
            "error_msg": error_msg,
            "json_data": json_data,
            "content_length": len(resp.content),
        }

    except requests.exceptions.Timeout:
        return {"status": 0, "error_msg": "TIMEOUT", "has_json": False, "has_data": False, "is_html": False}
    except requests.exceptions.ConnectionError:
        return {"status": 0, "error_msg": "CONNECTION_ERROR", "has_json": False, "has_data": False, "is_html": False}
    except Exception as e:
        return {"status": 0, "error_msg": str(e), "has_json": False, "has_data": False, "is_html": False}


def run_test_suite(token_name, token):
    """Run all endpoints against a given token."""
    results = {}
    for name, method, endpoint in ENDPOINTS:
        result = test_endpoint(name, method, endpoint, token=token)
        results[name] = result
    return results


# ─── Display Helpers ──────────────────────────────────────────────────────────

PASS = "\033[92m"
FAIL = "\033[91m"
WARN = "\033[93m"
DIM = "\033[90m"
BOLD = "\033[1m"
RESET = "\033[0m"
CYAN = "\033[96m"

def print_header(text):
    print(f"\n{BOLD}{CYAN}{'='*70}{RESET}")
    print(f"{BOLD}{CYAN}  {text}{RESET}")
    print(f"{BOLD}{CYAN}{'='*70}{RESET}")

def print_sub(text):
    print(f"\n{BOLD}{WARN}── {text} ──{RESET}")

def print_result(endpoint, result):
    status = result.get("status", 0)
    has_data = result.get("has_data", False)
    error_msg = result.get("error_msg", "")

    if has_data:
        icon = f"{PASS}OK{RESET}"
    elif status == 200:
        icon = f"{WARN}200 (no data){RESET}"
    elif status == 0:
        icon = f"{FAIL}{error_msg}{RESET}"
    elif status == 401:
        icon = f"{FAIL}401 UNAUTHORIZED{RESET}"
    elif status == 403:
        icon = f"{FAIL}403 FORBIDDEN{RESET}"
    elif status == 429:
        icon = f"{WARN}429 RATE LIMITED{RESET}"
    elif status >= 500:
        icon = f"{FAIL}{status} SERVER ERR{RESET}"
    else:
        icon = f"{WARN}{status}{RESET}"

    detail = ""
    if error_msg and not has_data:
        detail = f"  |  {error_msg[:60]}"
    if result.get("is_html"):
        detail += "  |  HTML response (not JSON)"

    print(f"  {icon:>22}  {endpoint:<20}  HTTP {status}{detail}")


# ─── Main Test Runner ─────────────────────────────────────────────────────────

def main():
    print_header("MUNOWATCH TOKEN INDEPENDENCE TEST SUITE")
    print(f"\n  Base URL: {BASE_URL}")
    print(f"  User ID:  {USER_ID}")
    print(f"  Time:     {time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())}")

    # ─── Token Matrix ──────────────────────────────────────────────────────
    tokens = {}

    # 1. Original expired token
    tokens["1. Original Expired Token"] = ORIGINAL_TOKEN

    # 2. Self-signed with correct key (3 f's)
    tokens["2. Self-signed (correct key: ...fff)"] = make_token(KEY_ORIGINAL)

    # 3. Self-signed with user's key (4 f's - typo)
    tokens["3. Self-signed (user key: ...ffff)"] = make_token(KEY_USER)

    # 4. Self-signed with wrong key
    tokens["4. Self-signed (wrong key)"] = make_token(KEY_WRONG)

    # 5. Expired self-signed token
    tokens["5. Expired self-signed"] = make_expired_token(KEY_ORIGINAL)

    # 6. Token with no appsecret in payload
    payload_no_secret = {
        "username": "Android TV",
        "appname": "Munowatch TV",
        "host": "munowatch.co",
        "activated": "1",
        "exp": int(time.time()) + (10 * 365 * 24 * 3600),
    }
    tokens["6. No appsecret in payload"] = jwt.encode(payload_no_secret, KEY_ORIGINAL, algorithm="HS256")

    # 7. Token with different username
    tokens["7. Different username (iPhone)"] = make_token(KEY_ORIGINAL, {
        "username": "iPhone App",
    })

    # 8. Token with modified activated flag
    tokens["8. activated=0"] = make_token(KEY_ORIGINAL, {"activated": "0"})

    # 9. Token with very short expiry (1 hour)
    tokens["9. Short expiry (1 hour)"] = make_token(KEY_ORIGINAL, exp_seconds=3600)

    # 10. No token at all
    tokens["10. No token (anonymous)"] = None

    # Print all tokens we're testing
    print(f"\n{BOLD}Testing {len(tokens)} token variants across {len(ENDPOINTS)} endpoints:{RESET}")
    print(f"  Total API calls: {len(tokens) * len(ENDPOINTS)}")

    # ─── Run Tests ─────────────────────────────────────────────────────────
    all_results = {}
    for token_name, token in tokens.items():
        print_header(token_name)
        if token:
            # Decode and show payload
            try:
                parts = token.split(".")
                decoded = base64.urlsafe_b64decode(parts[1] + "==")
                payload = json.loads(decoded)
                print(f"  Payload: {json.dumps(payload, indent=2)}")
                if token_name.startswith("1"):
                    exp = payload.get("exp", 0)
                    from datetime import datetime
                    exp_dt = datetime.utcfromtimestamp(exp)
                    expired = "EXPIRED" if exp < time.time() else "VALID"
                    print(f"  Expiry:  {exp_dt} UTC  [{expired}]")
            except Exception as e:
                print(f"  (could not decode: {e})")
        else:
            print(f"  (no token - anonymous request)")

        results = run_test_suite(token_name, token)
        all_results[token_name] = results

        for ep_name, ep_result in results.items():
            print_result(ep_name, ep_result)

        # Small delay to be nice to the server
        time.sleep(1)

    # ─── Analysis Summary ─────────────────────────────────────────────────
    print_header("ANALYSIS SUMMARY")

    # Compare which tokens work vs which don't
    working_tokens = {}
    failing_tokens = {}

    for token_name, results in all_results.items():
        successes = sum(1 for r in results.values() if r.get("has_data"))
        total = len(results)
        if successes > 0:
            working_tokens[token_name] = f"{successes}/{total} endpoints returned data"
        else:
            failing_tokens[token_name] = f"0/{total} endpoints returned data"

    print(f"\n{BOLD}{PASS}TOKENS THAT WORK:{RESET}")
    for name, detail in working_tokens.items():
        print(f"  {PASS}✓{RESET} {name}")
        print(f"      {detail}")

    if failing_tokens:
        print(f"\n{BOLD}{FAIL}TOKENS THAT FAIL:{RESET}")
        for name, detail in failing_tokens.items():
            print(f"  {FAIL}✗{RESET} {name}")
            print(f"      {detail}")

    # ─── Signature Validation Test ────────────────────────────────────────
    print_header("SIGNATURE VALIDATION ANALYSIS")

    # If correct key works but wrong key doesn't → server validates signature
    correct_key_works = "2. Self-signed (correct key: ...fff)" in working_tokens
    wrong_key_works = "4. Self-signed (wrong key)" in working_tokens
    expired_works = "5. Expired self-signed" in working_tokens
    no_token_works = "10. No token (anonymous)" in working_tokens

    print(f"\n  Correct-key token works:      {'YES' if correct_key_works else 'NO'}")
    print(f"  Wrong-key token works:        {'YES' if wrong_key_works else 'NO'}")
    print(f"  Expired token works:          {'YES' if expired_works else 'NO'}")
    print(f"  No token (anonymous) works:   {'YES' if no_token_works else 'NO'}")

    print(f"\n{BOLD}CONCLUSIONS:{RESET}")

    if no_token_works:
        print(f"  {WARN}⚠ API DOES NOT REQUIRE AUTH AT ALL{RESET}")
        print(f"  {DIM}  → Token is irrelevant, server doesn't check it{RESET}")
        print(f"  {DIM}  → Risk: Server could start enforcing at any time{RESET}")
        indep_level = "FULLY INDEPENDENT (no auth needed)"
    elif correct_key_works and not wrong_key_works:
        print(f"  {PASS}✓ Server validates JWT HMAC signature{RESET}")
        print(f"  {PASS}✓ Correct signing key: {KEY_ORIGINAL}{RESET}")
        print(f"  {DIM}  → You CAN self-sign tokens independently{RESET}")
        indep_level = "INDEPENDENT (can self-sign with correct key)"
    elif correct_key_works and wrong_key_works:
        print(f"  {WARN}⚠ Server does NOT validate JWT signature{RESET}")
        print(f"  {DIM}  → Any token (even garbage) is accepted{RESET}")
        print(f"  {DIM}  → Server likely only checks payload claims{RESET}")
        indep_level = "INDEPENDENT (signature not validated)"
    elif not correct_key_works:
        print(f"  {FAIL}✗ Self-signed tokens do NOT work{RESET}")
        print(f"  {DIM}  → Server rejects our signing key{RESET}")
        print(f"  {DIM}  → Either the signing key is different, or the server{RESET}")
        print(f"  {DIM}    validates against a server-side secret{RESET}")
        indep_level = "NOT INDEPENDENT (need server-issued tokens)"
    else:
        indep_level = "UNKNOWN (inconclusive results)"

    if expired_works:
        print(f"\n  {WARN}⚠ Server does NOT enforce token expiry{RESET}")
        print(f"  {DIM}  → Original expired token still works = no expiry check{RESET}")

    print(f"\n{BOLD}{CYAN}  INDEPENDENCE LEVEL: {indep_level}{RESET}")

    # ─── Endpoint-specific analysis ───────────────────────────────────────
    print_header("ENDPOINT-SPECIFIC AUTH ANALYSIS")

    best_token_name = list(working_tokens.keys())[0] if working_tokens else "None"
    best_results = all_results.get(best_token_name, {})

    print(f"\n  Using best working token: {best_token_name}")
    print()
    for ep_name, result in best_results.items():
        status = result.get("status", 0)
        has_data = result.get("has_data", False)
        if has_data:
            print(f"  {PASS}  {ep_name:<20} → AUTH NEEDED, WORKS with token")
        elif status == 200:
            print(f"  {WARN}  {ep_name:<20} → 200 but no data (auth ok, empty result)")
        elif status == 401:
            print(f"  {FAIL}  {ep_name:<20} → REQUIRES AUTH, TOKEN REJECTED")
        elif status == 403:
            print(f"  {FAIL}  {ep_name:<20} → FORBIDDEN")
        elif status >= 500:
            print(f"  {WARN}  {ep_name:<20} → Server error ({status}) - inconclusive")
        else:
            print(f"  {DIM}  {ep_name:<20} → HTTP {status} ({result.get('error_msg', '')[:30]})")

    # ─── Final Verdict ────────────────────────────────────────────────────
    print_header("FINAL VERDICT & RECOMMENDATIONS")

    if no_token_works:
        print(f"""
  {WARN}The API currently does NOT enforce authentication.{RESET}
  This means you technically don't need a token at all.
  However, this is likely because:
    • The API is in early/relaxed mode
    • They haven't implemented auth enforcement yet
    • They may enable it at any time

  {BOLD}Recommendation:{RESET}
    • Keep the original token as fallback
    • Build a config system for easy token swapping
    • Implement a health check that tests auth periodically
    • Be ready for when they DO enforce auth
""")
    elif correct_key_works:
        print(f"""
  {PASS}You CAN generate your own tokens independently!{RESET}
  The correct signing key is: {BOLD}{KEY_ORIGINAL}{RESET}

  {BOLD}Recommendation:{RESET}
    • Build a token generator into your tool
    • Generate fresh tokens on startup
    • Use long expiry (10+ years) or auto-refresh
    • Store the key securely (not in source code)
    • The appsecret in the payload MUST match the signing key
""")
    else:
        print(f"""
  {FAIL}You CANNOT self-sign tokens with the current approach.{RESET}
  The server likely uses a different signing secret than the appsecret value.

  {BOLD}Possible next steps:{RESET}
    • Reverse-engineer the Munowatch mobile app to find the real signing key
    • Intercept app traffic (mitmproxy) to capture server-issued tokens
    • Check if there's a login/auth endpoint that issues tokens
    • Look at the Munowatch TV app's APK for hardcoded secrets
    • The appsecret in the JWT payload may NOT be the HMAC signing key
""")

    print(f"  {DIM}Test completed at: {time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())}{RESET}")
    print()


if __name__ == "__main__":
    main()
