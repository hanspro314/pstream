#!/usr/bin/env python3
"""Phase A: GET sweep + auth header variations on discovered endpoints"""
import json, time, requests
from datetime import datetime

BASE_URL = "https://munoapi.com/api"
APPSECRET = "022778e418ad68ffda9aa4fab1892fff"
USER_ID = "82717"
UA = "Android IOS v3.0"
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6IkFuZHJvaWQgVFYiLCJhcHBuYW1lIjoiTXVub3dhdGNoIFRWIiwiaG9zdCI6Im11bm93YXRjaC5jbyIsImFwcHNlY3JldCI6IjAyMjc3OGU0MThhZDY4ZmZkYTlhYTRmYWIxODkyZmZmIiwiYWN0aXZhdGVkIjoiMSIsImV4cCI6MTcwNzM2ODQwMH0.unlPnEzptg6VFHs7WWm213bRHHNxYuAN2eZQvjtPKL0"

G="\033[92m";R="\033[91m";Y="\033[93m";B="\033[1m";D="\033[90m";C="\033[96m";X="\033[0m"

def bh(): return {"Accept":"application/json","User-Agent":UA}
def req(m,u,h=None,d=None,t=4):
    try:
        r=requests.request(m,u,headers=h or bh(),json=d,timeout=t,allow_redirects=False)
        bj=None
        try:bj=r.json()
        except:pass
        return r.status_code,bj,r.text[:400],dict(r.headers)
    except: return 0,None,"ERR",{}

ENDPOINTS = [
    "login","register","signup","signin","auth","authenticate",
    "auth/login","auth/register","auth/signup","auth/signin","auth/authenticate",
    "user/login","user/register","user/signup","user/signin","user/auth",
    "account/login","account/auth","member/login","member/auth",
    "v1/login","v2/login","v1/auth","v2/auth","v3/auth",
    "munowatch/login","munowatch/auth","muno/login","muno/auth",
    "tv/login","tv/auth","android/login","android/auth","sign-in","log-in",
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
    "user","users","profile","account","me",
    "user/me","user/profile","user/info","user/details","user/data",
    "account/me","account/profile","account/info","account/details",
    "profile/info","profile/me","member","member/me","member/info","whoami","myself","self","identity",
    "admin","admin/login","admin/user","admin/users","admin/dashboard","staff","moderator",
    "dashboard-data","stats","config","settings","info","status","health","ping","version",
    "dashboard","dashboard/info","dashboard/stats",
    "system/info","system/status","system/config","system/health",
    "api/info","api/status","api/config","api/version",
    "server/info","server/status","app/info","app/config","app/status","app/version",
    "meta","metadata","about","uptime","ready","live","check","test",
    "environment","env","debug","docs","swagger","openapi","api-docs",
    "schema","graphql","playground","help","support","contact","changelog",
    "categories","category","genre","genres","tags","popular","trending","latest","new","recent","top",
    "browse","explore","discover","featured","recommend","recommended",
    "movies","series","episodes","videos","video","media",
    "shows","shows-all","shows/all","all","home",
    "trending/movies","trending/series","popular/movies","popular/series",
    "latest/movies","latest/series","top/movies","top/series",
    "list","lists","search","query","find","random","calendar","ratings","reviews",
    "collections","playlist","favorites","favourites","watchlist","history","continue",
    "download","stream","play","embed","source","link","resolve",
    "player","player/embed","m3u8","hls","mpd","dash","subtitle","subtitles","thumbnail","thumbnails",
    "search","browse","list","shows","preview",
    "dashboard/v2","dashboard/v2/82717","preview/63003","preview/63003/82717","preview/v2/63003/82717",
    "search/Avengers/82717/0","browse/tabs","list/5/0/82717/0","shows/5/0/82717/0",
    "key","license","activate","device","subscribe",
    "key/activate","key/verify","key/validate","license/activate","license/verify",
    "activate/device","activate/app","device/register","device/activate","device/auth",
    "subscribe","subscription","subscription/activate","plan","plans","pricing","trial","premium","vip",
    "otp","otp/verify","otp/send",
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

results = []

print(f"\n{B}{C}{'='*70}{X}")
print(f"{B}{C} PHASE A: GET sweep + auth headers{X}")
print(f"{B}{C}{'='*70}{X}\n")

# GET sweep
for ep in ENDPOINTS:
    url = f"{BASE_URL}/{ep}" if ep else BASE_URL
    s,bj,txt,rh = req("GET",url)
    results.append({"ep":ep,"url":url,"method":"GET","label":"GET no-auth","cat":"sweep",
        "status":s,"body":bj,"txt":txt[:400],
        "rh":{k:v for k,v in rh.items() if k.lower() in ("server","x-powered-by","content-type","allow","location")},
        "ts":datetime.utcnow().isoformat()+"Z"})

    if s not in (0,404):
        jstr = json.dumps(bj).lower() if bj else txt.lower()
        has_tok = any(w in jstr for w in ("token","api_key","jwt","eyj","bearer","secret"))
        has_con = bj and isinstance(bj,dict) and any(k in bj for k in ("dashboard","banner","search","results","preview","data","movies","videos","shows","categories"))
        has_keys = bj and isinstance(bj,dict) and len(bj)>0 and not any(k in bj for k in ("400","401","403","404","500"))
        if s==200 and has_tok: print(f"  {R}{B}TOKEN{X} /{ep:<40} → 200  {json.dumps(bj)[:150]}")
        elif s==200 and has_con: print(f"  {G}DATA{X}  /{ep:<40} → 200  keys: {list(bj.keys())[:6]}")
        elif s==200 and has_keys: print(f"  {Y}*{X}    /{ep:<40} → 200  keys: {list(bj.keys())[:6]}")
        elif s==200: print(f"  {D}200{X}   /{ep:<40} → 200")
        elif s in (401,403): print(f"  {Y}{s}{X}   /{ep:<40} → {s}  {json.dumps(bj)[:60] if bj else ''}")
        elif s==405: print(f"  {Y}405{X}   /{ep:<40}")
        elif s>=500:
            exc = bj.get("exception",[]) if bj and isinstance(bj,dict) else []
            if isinstance(exc,list) and exc: print(f"  {R}{s}{X}   /{ep:<40} → LEAK: {json.dumps(exc[0])[:80]}")
            else: print(f"  {D}{s}{X}   /{ep:<40}")
        else: print(f"  {D}{s}{X}   /{ep:<40}")
    time.sleep(0.02)

# Auth header variations on live endpoints
live = list(dict.fromkeys(r["ep"] for r in results if r["status"] not in (0,404)))
print(f"\n{B}Auth headers on {len(live)} live endpoints:{X}\n")

for auth_name, ah in [
    ("X-API-Key:secret",{**bh(),"X-API-Key":APPSECRET}),
    ("Bearer:secret",{**bh(),"Authorization":f"Bearer {APPSECRET}"}),
    ("X-App-Secret",{**bh(),"X-App-Secret":APPSECRET}),
    ("JWT_token",{**bh(),"X-API-Key":TOKEN,"Authorization":f"Bearer {TOKEN}"}),
]:
    for ep in live:
        url = f"{BASE_URL}/{ep}" if ep else BASE_URL
        s,bj,txt,rh = req("GET",url,h=ah)
        results.append({"ep":ep,"url":url,"method":"GET","label":f"GET {auth_name}","cat":"auth_var",
            "status":s,"body":bj,"txt":txt[:400],
            "ch":auth_name,"rh":{k:v for k,v in rh.items() if k.lower() in ("content-type",)},
            "ts":datetime.utcnow().isoformat()+"Z"})
        if s==200 and bj and isinstance(bj,dict):
            jstr=json.dumps(bj).lower()
            if any(w in jstr for w in ("dashboard","banner","search","results","preview","data","movies","videos","shows","categories","token","api_key","jwt")):
                print(f"  {R}{B}HIT{X} {auth_name:<18} /{ep:<35} → 200  {json.dumps(bj)[:150]}")
        time.sleep(0.02)

with open("/home/z/my-project/download/probe_phaseA.json","w") as f:
    json.dump(results,f,default=str)
print(f"\n  Saved probe_phaseA.json ({len(results)} results)")
