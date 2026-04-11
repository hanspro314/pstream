#!/usr/bin/env python3
"""
Munowatch API Probe - Concurrent version for speed.
Tests ~250 endpoints with multiple auth methods using thread pool.
"""
import json, time, requests, sys
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

BASE = "https://munoapi.com/api"
SEC = "022778e418ad68ffda9aa4fab1892fff"
UID = "82717"
UA = "Android IOS v3.0"
TOK = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6IkFuZHJvaWQgVFYiLCJhcHBuYW1lIjoiTXVub3dhdGNoIFRWIiwiaG9zdCI6Im11bm93YXRjaC5jbyIsImFwcHNlY3JldCI6IjAyMjc3OGU0MThhZDY4ZmZkYTlhYTRmYWIxODkyZmZmIiwiYWN0aXZhdGVkIjoiMSIsImV4cCI6MTcwNzM2ODQwMH0.unlPnEzptg6VFHs7WWm213bRHHNxYuAN2eZQvjtPKL0"
OUT = "/home/z/my-project/api_probe_results.json"

def bh(): return {"Accept":"application/json","User-Agent":UA}

def do_req(args):
    """Single request worker. args = (url, method, headers, data, label, category)"""
    url, method, headers, data, label, cat = args
    try:
        r = requests.request(method, url, headers=headers or bh(), json=data, timeout=5, allow_redirects=False)
        bj = None
        try: bj = r.json()
        except: pass
        rh = {k:v for k,v in r.headers.items() if k.lower() in ("server","x-powered-by","content-type","allow","location","set-cookie")}
        return {"ep":url.split("/api/")[-1] if "/api/" in url else url,
                "url":url,"method":method,"label":label,"cat":cat,
                "status":r.status_code,"body":bj,"txt":r.text[:300],
                "headers":rh,"req_data":data,"ts":datetime.utcnow().isoformat()+"Z"}
    except Exception as e:
        return {"ep":url.split("/api/")[-1] if "/api/" in url else url,
                "url":url,"method":method,"label":label,"cat":cat,
                "status":0,"error":str(e)[:80],"ts":datetime.utcnow().isoformat()+"Z"}

# Build all request tuples
tasks = []

# === ALL ENDPOINTS ===
ENDPOINTS = [
    # Auth
    "login","register","signup","signin","auth","authenticate",
    "auth/login","auth/register","auth/signup","auth/signin","auth/authenticate",
    "user/login","user/register","user/signup","user/signin","user/auth",
    "account/login","account/auth","member/login","member/auth",
    "v1/login","v2/login","v1/auth","v2/auth","v3/auth","v4/auth",
    "munowatch/login","munowatch/auth","muno/login","muno/auth",
    "tv/login","tv/auth","android/login","android/auth","sign-in","log-in",
    # Token
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
    "robots.txt","sitemap.xml",
    # Content
    "categories","category","genre","genres","tags","popular","trending","latest","new","recent","top",
    "browse","explore","discover","featured","recommend","recommended",
    "movies","series","episodes","videos","video","media",
    "shows","shows-all","shows/all","all","home",
    "trending/movies","trending/series","popular/movies","popular/series",
    "latest/movies","latest/series","top/movies","top/series",
    "new/movies","new/series","recent/movies","recent/series",
    "list","lists","search","query","find","random","calendar","ratings","reviews",
    "collections","playlist","favorites","favourites","watchlist","history","continue",
    # Media
    "download","stream","play","embed","source","link","resolve",
    "download/url","stream/url","play/url","media/url","video/url",
    "resolve/url","resolve/link","player","player/embed",
    "m3u8","hls","mpd","dash","subtitle","subtitles","thumbnail","thumbnails",
    # Known
    "search","browse","list","shows","preview",
    "dashboard/v2","dashboard/v2/82717","dashboard/82717",
    "preview/63003","preview/63003/82717","preview/v2/63003/82717",
    "search/Avengers/82717/0","browse/tabs","browse/all",
    "list/5/0/82717/0","shows/5/0/82717/0","episodes/range/63003/action/1",
    # License
    "key","license","activate","device","subscribe",
    "key/activate","key/verify","key/validate","license/activate","license/verify",
    "activate/device","activate/app","device/register","device/activate","device/auth",
    "subscribe","subscription","subscription/activate","plan","plans","pricing","trial","premium","vip",
    "otp","otp/verify","otp/send",
    # Hidden/misc
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

# Phase 1: GET no-auth on all
for ep in ENDPOINTS:
    url = f"{BASE}/{ep}" if ep else BASE
    tasks.append((url, "GET", bh(), None, "GET no-auth", "sweep"))

# Phase 2: Auth header variations
AUTH_HEADERS = [
    ("X-API-Key:secret", {**bh(), "X-API-Key": SEC}),
    ("Bearer:secret", {**bh(), "Authorization": f"Bearer {SEC}"}),
    ("X-App-Secret", {**bh(), "X-App-Secret": SEC}),
    ("JWT", {**bh(), "X-API-Key": TOK, "Authorization": f"Bearer {TOK}"}),
]

# We'll apply auth headers to all endpoints (parallel is fast)
for aname, ah in AUTH_HEADERS:
    for ep in ENDPOINTS:
        url = f"{BASE}/{ep}" if ep else BASE
        tasks.append((url, "GET", ah, None, f"GET {aname}", "auth_var"))

# Phase 3: POST payloads on auth endpoints
AUTH_EPS = ["login","register","signup","signin","auth","authenticate",
    "auth/login","user/login","token","apikey","api-key","key",
    "activate","app/auth","device/register","device/auth","license",
    "session","credential","oauth/token"]

POST_PAYLOADS = [
    {"appname":"Munowatch TV","appsecret":SEC,"host":"munowatch.co","username":"Android TV"},
    {"user_id":UID,"appsecret":SEC,"host":"munowatch.co"},
    {"api_key":SEC,"host":"munowatch.co"},
    {"key":SEC,"appname":"Munowatch TV"},
    {"secret":SEC,"host":"munowatch.co"},
    {"username":"Android TV","password":SEC},
    {"grant_type":"client_credentials","client_secret":SEC,"client_id":"munowatch"},
]

for ep in AUTH_EPS:
    for pl in POST_PAYLOADS:
        url = f"{BASE}/{ep}"
        pk = list(pl.keys())[0]
        tasks.append((url, "POST", bh(), pl, f"POST {pk}", "auth_post"))

# Phase 4: Query param auth
QP_EPS = ["dashboard","dashboard/82717","search","browse","list","shows","preview",
    "preview/63003","categories","popular","trending","latest","movies",
    "user","profile","me","config","info","status","search/Avengers"]
QPARAMS = [("?key=",SEC),("?api_key=",SEC),("?token=",SEC),("?secret=",SEC),
           ("?appsecret=",SEC),("?apikey=",SEC),("?access_key=",SEC)]

for ep in QP_EPS:
    for pn, pv in QPARAMS:
        url = f"{BASE}/{ep}{pn}{pv}"
        tasks.append((url, "GET", bh(), None, f"QP {pn}", "query_param"))

# Phase 5: Alternative URLs
ALTS = [
    "https://munoapi.com","https://munoapi.com/api/","https://munoapi.com/api/v1",
    "https://munoapi.com/api/v2","https://munoapi.com/api/v3",
    "https://munowatch.co/api","https://munowatch.co/api/dashboard",
    "https://api.munowatch.co","https://api.munowatch.co/api",
    "https://hamcodz.duckdns.org/api","https://hamcodz.duckdns.org",
    f"{BASE}?key={SEC}",f"{BASE}?api_key={SEC}",f"{BASE}?secret={SEC}",
]
for url in ALTS:
    tasks.append((url, "GET", bh(), None, "alt_url", "alt_url"))

# Phase 6: OPTIONS on key endpoints
for ep in ["","dashboard","search","login","token","auth","user","browse","preview","categories","info"]:
    url = f"{BASE}/{ep}" if ep else BASE
    tasks.append((url, "OPTIONS", bh(), None, "OPTIONS", "preflight"))
    tasks.append((url, "HEAD", bh(), None, "HEAD", "preflight"))

# Phase 7: POST on all endpoints (quick sweep)
for ep in ENDPOINTS:
    url = f"{BASE}/{ep}" if ep else BASE
    tasks.append((url, "POST", bh(), {"appsecret":SEC,"appname":"Munowatch TV"}, "POST sweep", "post_sweep"))

# Execute all concurrently
print(f"\n{'='*65}")
print(f" MUNOWATCH API PROBE — {len(tasks)} requests (concurrent)")
print(f"{'='*65}\n")
t0 = time.time()

results = []
with ThreadPoolExecutor(max_workers=20) as pool:
    futures = {pool.submit(do_req, t): t for t in tasks}
    done = 0
    for future in as_completed(futures):
        done += 1
        r = future.result()
        results.append(r)
        if done % 100 == 0:
            print(f"  Progress: {done}/{len(tasks)} ({done*100//len(tasks)}%)")

elapsed = time.time() - t0
print(f"  Completed {len(results)}/{len(tasks)} in {elapsed:.1f}s")

# Analyze
print(f"\n{'='*65}")
print(f" ANALYZING RESULTS")
print(f"{'='*65}\n")

sd = {}
for r in results:
    sc = str(r.get("status", 0))
    sd[sc] = sd.get(sc, 0) + 1

print(f"  Status distribution:")
for sc, cnt in sorted(sd.items(), key=lambda x: int(x[0]) if x[0].isdigit() else 999):
    bar = "█" * min(cnt, 40)
    print(f"    {sc:>5}: {cnt:>5}  {bar}")

# Find interesting
interesting = []
for r in results:
    s = r.get("status", 0)
    bj = r.get("body")
    if s == 200 and bj and isinstance(bj, dict):
        jstr = json.dumps(bj).lower()
        tok = any(w in jstr for w in ("token","api_key","jwt","eyj","bearer","secret"))
        con = any(k in bj for k in ("dashboard","banner","search","results","preview","data","movies","videos","shows","categories"))
        dat = len(bj) > 0 and "400" not in bj and "401" not in bj and "403" not in bj and "404" not in bj and "405" not in bj and "error" not in bj
        if tok or con or dat:
            reason = "TOKEN/KEY" if tok else "CONTENT" if con else "DATA"
            interesting.append((r, reason))

print(f"\n  Interesting 200 responses: {len(interesting)}")
for r, reason in interesting:
    ep = r.get("ep", "?")
    label = r.get("label", "")
    bj = r.get("body", {})
    snippet = json.dumps(bj)[:180]
    print(f"    {reason:<12} {r['method']:<5} /{ep:<40} [{label}]")
    print(f"                {snippet}")
    print()

# Non-404 endpoints
discovered = sorted(set(r["ep"] for r in results if r.get("status", 0) not in (0, 404)))
print(f"\n  Non-404 endpoints ({len(discovered)}):")
for ep in discovered:
    print(f"    • /{ep}")

# Server info
servers = set()
powereds = set()
for r in results:
    h = r.get("headers", {})
    if h.get("server"): servers.add(h["server"])
    if h.get("x-powered-by"): powereds.add(h["x-powered-by"])
print(f"\n  Server: {list(servers)}")
print(f"  X-Powered-By: {list(powereds)}")

# Save
summary = {
    "target": BASE,
    "timestamp": datetime.utcnow().isoformat() + "Z",
    "elapsed": round(elapsed, 1),
    "total_requests": len(results),
    "unique_endpoints": len(ENDPOINTS),
    "status_distribution": sd,
    "useful_200_count": len(interesting),
    "server_info": {"server": list(servers), "x_powered_by": list(powereds)},
    "interesting": [
        {"ep": r["ep"], "url": r["url"], "method": r["method"], "label": r["label"],
         "reason": reason, "body_keys": list(r["body"].keys())[:10] if isinstance(r.get("body"), dict) else [],
         "body_preview": json.dumps(r["body"])[:500]}
        for r, reason in interesting
    ],
    "discovered_endpoints": discovered,
}

with open(OUT, "w") as f:
    json.dump({"summary": summary, "results": results}, f, indent=2, default=str, ensure_ascii=False)

print(f"\n  Saved to: {OUT}")
print(f"\n{'='*65}")
