#!/usr/bin/env python3
"""
PStream Marketing Poster v3 — No fixed prices, emphasize affordability
"""

import qrcode
from PIL import Image, ImageDraw, ImageFont
import math, os

OUTPUT = "/home/z/my-project/download/pstream-marketing-poster.png"
SITE_URL = "https://pstream-eight-tawny.vercel.app/"

RED = (229, 9, 20)
DARK_BG = (10, 10, 10)
CARD_BG = (26, 26, 26)
WHITE = (255, 255, 255)
LIGHT_GRAY = (179, 179, 179)
MID_GRAY = (100, 100, 100)
SOFT_RED = (200, 5, 15)

W, H = 2480, 3508

def font(path, size):
    try: return ImageFont.truetype(path, size)
    except: return ImageFont.load_default()

FR = "/usr/share/fonts/truetype/english/calibri-regular.ttf"
FB = "/usr/share/fonts/truetype/english/calibri-bold.ttf"
FBI = "/usr/share/fonts/truetype/english/calibri-bold-italic.ttf"
DSB = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
DS = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"


def make_qr(url, size=600):
    qr = qrcode.QRCode(version=None, error_correction=qrcode.constants.ERROR_CORRECT_H, box_size=20, border=4)
    qr.add_data(url); qr.make(fit=True)
    return qr.make_image(fill_color=RED, back_color=WHITE).convert("RGB").resize((size, size), Image.LANCZOS)


def rrect(d, xy, r, fill=None, outline=None, width=1):
    x1,y1,x2,y2 = xy
    if fill:
        d.rectangle([x1+r,y1,x2-r,y2], fill=fill)
        d.rectangle([x1,y1+r,x2,y2-r], fill=fill)
        d.pieslice([x1,y1,x1+2*r,y1+2*r], 180,270, fill=fill)
        d.pieslice([x2-2*r,y1,x2,y1+2*r], 270,360, fill=fill)
        d.pieslice([x1,y2-2*r,x1+2*r,y2], 90,180, fill=fill)
        d.pieslice([x2-2*r,y2-2*r,x2,y2], 0,90, fill=fill)
    if outline:
        d.arc([x1,y1,x1+2*r,y1+2*r], 180,270, fill=outline, width=width)
        d.arc([x2-2*r,y1,x2,y1+2*r], 270,360, fill=outline, width=width)
        d.arc([x1,y2-2*r,x1+2*r,y2], 90,180, fill=outline, width=width)
        d.arc([x2-2*r,y2-2*r,x2,y2], 0,90, fill=outline, width=width)
        d.line([x1+r,y1,x2-r,y1], fill=outline, width=width)
        d.line([x1+r,y2,x2-r,y2], fill=outline, width=width)
        d.line([x1,y1+r,x1,y2-r], fill=outline, width=width)
        d.line([x2,y1+r,x2,y2-r], fill=outline, width=width)


def glow(img, cx, cy, rad, color, inten=50):
    g = Image.new("RGBA", img.size, (0,0,0,0))
    gd = ImageDraw.Draw(g)
    for i in range(inten, 0, -1):
        a = int(3*(inten-i)); r2 = rad + i*4
        gd.ellipse([cx-r2,cy-r2,cx+r2,cy+r2], fill=(*color, a))
    return Image.alpha_composite(img.convert("RGBA"), g).convert("RGB")


def play_icon(d, cx, cy, s, c):
    d.polygon([(cx-s//3,cy-s//2),(cx-s//3,cy+s//2),(cx+s//2,cy)], fill=c)

def dl_icon(d, cx, cy, s, c):
    sw2 = max(3,s//8)
    d.rectangle([cx-sw2,cy-s//3,cx+sw2,cy+s//6], fill=c)
    d.polygon([(cx,cy+s//2),(cx-s//3,cy+s//8),(cx+s//3,cy+s//8)], fill=c)
    d.rectangle([cx-s//2,cy+s//2+2,cx+s//2,cy+s//2+2+sw2], fill=c)

def phone_icon(d, cx, cy, s, c):
    w2=int(s*0.55); x1,y1=cx-w2//2,cy-s//2; x2,y2=cx+w2//2,cy+s//2
    rrect(d,[x1,y1,x2,y2], 12, outline=c, width=4)
    rrect(d,[x1+6,y1+14,x2-6,y2-20], 4, fill=c)
    r=5; d.ellipse([cx-r,y2-14-r,cx+r,y2-14+r], outline=c, width=2)

def shilling_icon(d, cx, cy, s, c):
    """Draw a simple coin/money icon."""
    r = s//2
    d.ellipse([cx-r, cy-r, cx+r, cy+r], outline=c, width=3)
    d.ellipse([cx-r+3, cy-r+3, cx+r-3, cy+r-3], outline=c, width=2)
    # "U" for UGX
    fb = font(FB, s//2)
    ub = fb.getbbox("U")
    uw = ub[2]-ub[0]; uh = ub[3]-ub[1]
    d.text((cx-uw//2, cy-uh//2-s//8), "U", font=fb, fill=c)

def checkmark(d, cx, cy, s, c):
    r=s//2; d.ellipse([cx-r,cy-r,cx+r,cy+r], fill=c)
    lw=max(2,s//10)
    d.line([cx-s//4,cy,cx-s//10,cy+s//4], fill=WHITE, width=lw)
    d.line([cx-s//10,cy+s//4,cx+s//4,cy-s//5], fill=WHITE, width=lw)

def film_strip(d, x, y, w2, h2, c):
    for fy in range(y, y+h2, 40):
        d.rectangle([x, fy, x+w2, fy+30], fill=c)


def create():
    img = Image.new("RGB", (W,H), DARK_BG)
    d = ImageDraw.Draw(img)

    f_brand = font(FB, 280)
    f_tagline = font(FBI, 72)
    f_headline = font(FB, 90)
    f_body = font(FR, 56)
    f_body_b = font(FB, 56)
    f_small = font(FR, 44)
    f_small_b = font(FB, 44)
    f_tiny = font(FR, 38)
    f_big_quote = font(FBI, 64)
    f_price_b = font(FB, 100)
    f_url = font(FB, 62)
    f_dev = font(FBI, 52)
    f_foot = font(FR, 36)
    f_step_num = font(FB, 52)

    # ── Decorations ──
    film_strip(d, 0, 200, 18, 800, (30,30,30))
    film_strip(d, W-18, 400, 18, 600, (30,30,30))
    d.rectangle([0,0,W,14], fill=RED)
    img = glow(img, W//2, 300, 200, RED, 50)
    d = ImageDraw.Draw(img)

    # ═══ HERO ═══
    pcx, pcy, pr = 280, 340, 120
    d.ellipse([pcx-pr,pcy-pr,pcx+pr,pcy+pr], fill=SOFT_RED)
    d.ellipse([pcx-pr+4,pcy-pr+4,pcx+pr-4,pcy+pr-4], fill=RED)
    play_icon(d, pcx+14, pcy, 120, WHITE)

    bx, by = 560, 230
    d.text((bx+3,by+3), "PStream", font=f_brand, fill=(60,2,2))
    d.text((bx,by), "PStream", font=f_brand, fill=RED)
    bb = f_brand.getbbox("PStream"); bw = bb[2]-bb[0]
    d.rectangle([bx,by+290,bx+bw,by+300], fill=RED)
    d.text((bx+4,by+325), "Stream. Discover. Enjoy.", font=f_tagline, fill=LIGHT_GRAY)
    d.text((bx+4,by+425), "Uganda's #1 Student Streaming Platform", font=f_body_b, fill=WHITE)

    # ═══ FEATURES (3 cards) ═══
    fy = 860; cw3 = W//3; cp = 70
    feats = [
        ("play", "Unlimited Movies", "Thousands of movies & series\nin HD quality. Watch anywhere,\nanytime on campus."),
        ("dl", "Download & Watch", "Save your favorites — watch\noffline later. No data needed\nwhen you don't have it."),
        ("phone", "Mobile Friendly", "Built for your phone. Install\nas an app instantly. No\nPlay Store needed."),
    ]
    for i,(ic,t,desc) in enumerate(feats):
        cx = cw3*i + cw3//2; cws = cw3-cp*2; cxs = cw3*i+cp; ch = 380
        rrect(d,[cxs,fy,cxs+cws,fy+ch], 24, fill=CARD_BG, outline=(40,40,40), width=2)
        d.rectangle([cxs+30,fy,cxs+120,fy+4], fill=RED)
        icx,icy = cx, fy+90; ir = 55
        d.ellipse([icx-ir,icy-ir,icx+ir,icy+ir], outline=RED, width=3)
        d.ellipse([icx-ir+3,icy-ir+3,icx+ir-3,icy+ir-3], fill=(30,5,5))
        if ic=="play": play_icon(d,icx+8,icy,60,RED)
        elif ic=="dl": dl_icon(d,icx,icy,65,RED)
        elif ic=="phone": phone_icon(d,icx,icy,70,RED)
        tb=f_small_b.getbbox(t); tw=tb[2]-tb[0]
        d.text((cx-tw//2,fy+170), t, font=f_small_b, fill=WHITE)
        for j,ln in enumerate(desc.split("\n")):
            lb=f_tiny.getbbox(ln); lw=lb[2]-lb[0]
            d.text((cx-lw//2,fy+240+j*48), ln, font=f_tiny, fill=LIGHT_GRAY)

    # ═══ AFFORDABILITY SECTION (replaces pricing) ═══
    afy = 1400
    ahl = "Affordable for Every Student"
    ahb = f_headline.getbbox(ahl); ahw = ahb[2]-ahb[0]
    d.text(((W-ahw)//2, afy-110), ahl, font=f_headline, fill=WHITE)
    d.rectangle([(W-200)//2, afy-5, (W+200)//2, afy+3], fill=RED)

    # Big emphasis card — no prices, just affordability messaging
    acx = 200; acw = W-400; ach = 340
    rrect(d,[acx,afy+40,acx+acw,afy+40+ach], 28, fill=(30,8,8), outline=RED, width=3)

    # Shilling icon (left)
    shilling_icon(d, acx+140, afy+40+ach//2, 70, RED)

    # Main affordability message
    msg1 = "Plans starting at pocket-friendly rates"
    mb1 = f_body_b.getbbox(msg1); mw1 = mb1[2]-mb1[0]
    d.text((acx+240, afy+70), msg1, font=f_body_b, fill=WHITE)

    msg2 = "Prices vary — check the latest rates on the token page when you sign up."
    mb2 = f_tiny.getbbox(msg2); mw2 = mb2[2]-mb2[0]
    d.text((acx+240, afy+145), msg2, font=f_tiny, fill=LIGHT_GRAY)

    msg3 = "Flexible plans: Stream only, or Stream + Download."
    mb3 = f_tiny.getbbox(msg3)
    d.text((acx+240, afy+200), msg3, font=f_tiny, fill=LIGHT_GRAY)

    msg4 = "Pay via MTN MoMo — quick, easy, secure."
    mb4 = f_tiny.getbbox(msg4)
    d.text((acx+240, afy+255), msg4, font=f_tiny, fill=LIGHT_GRAY)

    # Two plan highlights (no prices)
    phy = afy + 420
    phw = (acw - 80) // 2
    phh = 180

    plan_cards = [
        ("STREAM", "Watch unlimited movies\n& series in HD quality"),
        ("STREAM + DOWNLOAD", "Everything in Stream, plus\nsave to watch offline"),
    ]
    for i, (pname, pdesc) in enumerate(plan_cards):
        px = acx + i*(phw+80)
        rrect(d,[px,phy,px+phw,phy+phh], 20, fill=CARD_BG, outline=(50,50,50), width=2)
        d.rectangle([px+20,phy,px+100,phy+4], fill=RED)
        d.text((px+30, phy+24), pname, font=f_small_b, fill=RED)
        for j, ln in enumerate(pdesc.split("\n")):
            d.text((px+30, phy+80+j*48), ln, font=f_tiny, fill=LIGHT_GRAY)

    # ═══ HOW TO START ═══
    hy = 2130
    ht = "How to Get Started"
    htb = f_headline.getbbox(ht); htw = htb[2]-htb[0]
    d.text(((W-htw)//2, hy), ht, font=f_headline, fill=WHITE)
    d.rectangle([(W-140)//2, hy+100, (W+140)//2, hy+106], fill=(40,40,40))

    steps = [
        ("1", "WhatsApp", "0742337382 to pay via\nMoMo & get your token"),
        ("2", "Visit", "Scan the QR code or go to\npstream-eight-tawny.vercel.app"),
        ("3", "Enter Token", "Type your access code &\nsee plans — start streaming!"),
    ]
    sy = hy+140; sw2=620; sg=80; tsw=sw2*3+sg*2; ssx=(W-tsw)//2
    for i,(n,t,desc) in enumerate(steps):
        sx=ssx+i*(sw2+sg)
        nr=40
        d.ellipse([sx,sy,sx+nr*2,sy+nr*2], fill=RED)
        d.ellipse([sx+4,sy+4,sx+nr*2-4,sy+nr*2-4], fill=SOFT_RED)
        d.ellipse([sx,sy,sx+nr*2,sy+nr*2], fill=RED)
        nb=f_step_num.getbbox(n); nw=nb[2]-nb[0]
        d.text((sx+nr-nw//2, sy+8), n, font=f_step_num, fill=WHITE)
        if i<2:
            ax=sx+sw2+10; ay=sy+nr
            d.line([ax,ay,ax+sg-20,ay], fill=RED, width=3)
            d.polygon([(ax+sg-20,ay-10),(ax+sg-20,ay+10),(ax+sg-8,ay)], fill=RED)
        d.text((sx+nr*2+24,sy+5), t, font=f_body_b, fill=WHITE)
        for j,ln in enumerate(desc.split("\n")):
            d.text((sx+nr*2+24,sy+72+j*50), ln, font=f_small, fill=LIGHT_GRAY)

    # ═══ QR CODE + URL ═══
    qy=2630; qs=440
    qi = make_qr(SITE_URL, qs)
    qcw=qs+80; qch=qs+80
    qcx=(W-qcw-600)//2
    rrect(d,[qcx+6,qy+6,qcx+qcw+6,qy+qch+6], 24, fill=(5,5,5))
    rrect(d,[qcx,qy,qcx+qcw,qy+qch], 24, fill=WHITE)
    img.paste(qi, (qcx+40,qy+40))

    sm="SCAN ME"; smb=f_small_b.getbbox(sm); smw=smb[2]-smb[0]
    d.text((qcx+(qcw-smw)//2, qy-50), sm, font=f_small_b, fill=RED)

    ux=qcx+qcw+80; uy=qy+30
    d.text((ux,uy), "Visit us at", font=f_body, fill=LIGHT_GRAY)
    d.text((ux,uy+70), "pstream-eight-tawny", font=f_url, fill=RED)
    d.text((ux,uy+140), ".vercel.app", font=f_url, fill=RED)
    d.text((ux,uy+250), "Or WhatsApp:", font=f_body, fill=LIGHT_GRAY)
    d.text((ux,uy+320), "0742337382", font=f_body_b, fill=WHITE)
    d.text((ux,uy+420), "Install as an app from your", font=f_tiny, fill=MID_GRAY)
    d.text((ux,uy+468), "browser — no Play Store needed!", font=f_tiny, fill=MID_GRAY)

    # ═══ FOOTER ═══
    d.rectangle([200,H-280,W-200,H-276], fill=(40,40,40))
    dt="Developed by"; db=f_small.getbbox(dt); dw=db[2]-db[0]
    d.text(((W-dw)//2, H-250), dt, font=f_small, fill=LIGHT_GRAY)
    hz="Hamcodz"; hzb=f_dev.getbbox(hz); hzw=hzb[2]-hzb[0]
    d.text(((W-hzw)//2+2, H-192), hz, font=f_dev, fill=(80,2,2))
    d.text(((W-hzw)//2, H-194), hz, font=f_dev, fill=RED)
    tag="PStream v2.5  |  Made in Uganda  |  For Students, By a Student"
    tb=f_foot.getbbox(tag); tw=tb[2]-tb[0]
    d.text(((W-tw)//2, H-110), tag, font=f_foot, fill=MID_GRAY)
    d.rectangle([0,H-14,W,H], fill=RED)

    # Corner accents
    for i in range(5):
        o=40+i*16
        d.line([W-o,40,W-40,40], fill=RED, width=2); d.line([W-40,o,W-40,40], fill=RED, width=2)
        d.line([40,H-40-o+40,40,H-40], fill=RED, width=2); d.line([40+i*16,H-40,40,H-40], fill=RED, width=2)

    return img


os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
p = create()
p.save(OUTPUT, "PNG", dpi=(300,300))
print(f"Saved: {OUTPUT}")
print(f"Size: {p.size[0]}x{p.size[1]} px | {os.path.getsize(OUTPUT)/1024:.0f} KB")
