#!/usr/bin/env python3
"""Fast parallel API auth probe"""
import time, json, requests
from concurrent.futures import ThreadPoolExecutor, as_completed

BASE = "https://munoapi.com/api"
UA = "Android IOS v3.0"
TOK = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6IkFuZHJvaWQgVFYiLCJhcHBuYW1lIjoiTXVub3dhdGNoIFRWIiwiaG9zdCI6Im11bm93YXRjaC5jbyIsImFwcHNlY3JldCI6IjAyMjc3OGU0MThhZDY4ZmZkYTlhYTRmYWIxODkyZmZmIiwiYWN0aXZhdGVkIjoiMSIsImV4cCI6MTcwNzM2ODQwMH0.unlPnEzptg6VFHs7WWm213bRHHNxYuAN2eZQvjtPKL0"
KEY = "022778e418ad68ffda9aa4fab1892fff"
UID = "82717"

G="\033[92m";R="\033[91m";Y="\033[93m";B="\033[1m";D="\033[90m";C="\033[96m";X="\033[0m"

def p(ep, method="GET", token=None, data=None):
    url = f"{BASE}/{ep}" if not ep.startswith("http") else ep
    h = {"Accept":"application/json","User-Agent":UA}
    if token: h["X-Api-Key"]=token; h["Authorization"]=f"Bearer {token}"
    try:
        r = requests.request(method, url, headers=h, json=data, timeout=5)
        j = r.json() if "json" in r.headers.get("content-type","") else None
        return r.status_code, j, r.text[:100] if not j else ""
    except: return 0, None, ""

endpoints = [
    "login","auth/login","user/login","signin","signup","register","auth/register","user/register",
    "token","auth/token","api/token","token/generate","token/create","token/new","token/refresh","token/renew",
    "apikey","api/key","api/generate","key/generate","app/register","app/create","developer/register",
    "auth","authenticate","verify","auth/verify","activate","app/activate","app/auth",
    "status","health","ping","info","","docs",
    "v1/auth","v2/auth","v3/auth","v1/token","v2/token","v3/token",
    "tv/auth","tv/token","tv/login","device/register","user/me","admin","apps",
]

payloads = [
    {"appname":"Munowatch TV","appsecret":KEY,"host":"munowatch.co"},
    {"username":"Android TV","appsecret":KEY},
    {"host":"munowatch.co","appsecret":KEY},
]

jobs = []
# GET probes
for ep in endpoints:
    jobs.append(("GET", ep, None, None))
# POST probes with appsecret payload
for ep in endpoints:
    jobs.append(("POST", ep, None, {"appname":"Munowatch TV","appsecret":KEY,"host":"munowatch.co"}))

print(f"\n{B}{C}PROBING {len(jobs)} REQUESTS IN PARALLEL (20 threads){X}\n")

hits = []
with ThreadPoolExecutor(max_workers=20) as ex:
    futs = {}
    for method, ep, tok, data in jobs:
        f = ex.submit(p, ep, method, tok, data)
        futs[f] = (method, ep)
    
    for f in as_completed(futs):
        method, ep = futs[f]
        s, j, txt = f.result()
        if s in (0, 404): continue
        
        interesting = False; detail = ""
        if s == 200 and j and isinstance(j, dict):
            jstr = json.dumps(j).lower()
            if any(w in jstr for w in ("token","api_key","jwt","eyj","success")):
                interesting = True; detail = f"DATA: {json.dumps(j)[:120]}"
            elif any(w in jstr for w in ("dashboard","banner","data","search")):
                interesting = True; detail = f"keys: {list(j.keys())[:5]}"
        elif s in (401, 403):
            interesting = True; detail = "PROTECTED"
        elif s >= 500 and j and isinstance(j, dict):
            exc = j.get("exception",[])
            if isinstance(exc,list) and exc: detail = f"LEAK: {exc[0].get('message','')[:60]}"; interesting = True
        
        if interesting:
            hits.append({"ep":ep,"method":method,"status":s,"body":j,"detail":detail})
            icon = f"{R}{B}HIT{X}" if "TOKEN" in detail or "SUCCESS" in detail.upper() else f"{Y} *{X}"
            print(f"  {icon} {method:<5} /{ep:<35} → {s}  {detail}")

print(f"\n{B}Hits: {len(hits)}{X}")
with open("/home/z/my-project/download/phase1_results.json","w") as f:
    json.dump(hits, f, indent=2, default=str)
