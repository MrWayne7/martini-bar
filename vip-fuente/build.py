#!/usr/bin/env python3
"""Build del VIP de Martini Bar (motor de viaje 3D).
  dist/inline/index.html  -> un solo archivo (vista previa)
  dist/site/              -> index.html + img/ + js/  (va a TALAL/vip/ y se publica en /vip/)
  dist/test/              -> igual que site con fuentes locales (pruebas sin internet)
"""
from PIL import Image, ImageDraw, ImageFont, ImageOps, ImageFilter
import base64, io, json, os, re, shutil

ROOT = os.path.dirname(os.path.abspath(__file__))
UP = os.environ.get("FOTOS", os.path.join(ROOT, "fotos"))
DIST = os.path.join(ROOT, "dist")
SITE_URL = os.environ.get("SITE_URL", "https://martinibar.live/vip")
BASE = os.environ.get("BASE", "/vip/")

# key -> archivo en fotos/
SRC = {
    "gente": "foto-1.webp",     # gente bailando bajo neón
    "fach":  "foto-3.webp",     # la fachada con el letrero
    "pista": "foto-4.webp",     # la pista y la bola de espejos
    "trago": "foto-5.webp",     # trago en la mesa VIP
    "dj":    "hero-poster.jpg", # el DJ en la cabina
}

def fit(im, maxside):
    w, h = im.size
    if max(w, h) > maxside:
        s = maxside / max(w, h)
        im = im.resize((round(w * s), round(h * s)), Image.LANCZOS)
    return im

def webp_bytes(im, q, lossless=False):
    buf = io.BytesIO()
    im.save(buf, "WEBP", quality=q, method=6, lossless=lossless)
    return buf.getvalue()

def datauri(b, mime="image/webp"):
    return f"data:{mime};base64," + base64.b64encode(b).decode()

def logo_parts():
    """Logo blanco sobre negro -> recortado. Devuelve (rgba blanco sobre transparente, rgb sobre negro)."""
    im = Image.open(os.path.join(UP, "logo-blanco.png")).convert("L")
    bbox = im.point(lambda v: 255 if v > 40 else 0).getbbox()
    l, t, r, b = bbox; pad = int((r - l) * 0.06)
    im = im.crop((max(0, l - pad), max(0, t - pad), min(im.width, r + pad), min(im.height, b + pad)))
    alpha = im.point(lambda v: min(255, int(v * 1.15)))
    rgba = Image.new("RGBA", im.size, (242, 243, 238, 0)); rgba.putalpha(alpha)
    rgb = Image.merge("RGB", (im, im, im))
    return rgba, rgb

def make_og(photo, logo_rgba):
    W, H = 1200, 630
    og = Image.new("RGB", (W, H), (5, 4, 5))
    ph = photo.copy(); pw = 560
    s = max(pw / ph.width, H / ph.height)
    ph = ph.resize((round(ph.width * s), round(ph.height * s)), Image.LANCZOS)
    x0 = (ph.width - pw) // 2; y0 = (ph.height - H) // 2
    ph = ph.crop((x0, y0, x0 + pw, y0 + H))
    grad = Image.linear_gradient("L").rotate(90).resize((pw, H))
    og.paste(ph, (W - pw, 0), ImageOps.invert(grad).point(lambda v: min(255, v * 2)))
    d = ImageDraw.Draw(og)
    glow = Image.new("RGB", (W, H), (0, 0, 0)); gd = ImageDraw.Draw(glow)
    gd.ellipse((40, 120, 600, 560), fill=(120, 10, 34)); glow = glow.filter(ImageFilter.GaussianBlur(90))
    og.paste(glow, (0, 0), Image.new("L", (W, H), 90))
    lg = logo_rgba.copy(); lg.thumbnail((380, 380))
    og.paste(lg, (90, 70), lg)
    d = ImageDraw.Draw(og)
    bric = os.path.join(ROOT, "fonts", "Bricolage.ttf")
    try:
        f1 = ImageFont.truetype(bric, 64); f2 = ImageFont.truetype(bric, 26)
        try:
            f1.set_variation_by_axes([96, 100, 800]); f2.set_variation_by_axes([14, 100, 500])
        except Exception:
            pass
    except Exception:
        f1 = f2 = ImageFont.load_default()
    d.text((96, 470), "VIP", font=f1, fill=(216, 180, 106))
    d.text((98, 548), "Mesas desde $100  ·  El Vigía, Mérida", font=f2, fill=(220, 220, 214))
    return og

def main():
    if os.path.exists(DIST):
        shutil.rmtree(DIST)
    for d in ("inline", "site/img", "site/js", "test/img", "test/js", "test/fonts"):
        os.makedirs(os.path.join(DIST, d))

    big_inline, big_site, tex_inline, tex_site = {}, {}, {}, {}
    for key, fn in SRC.items():
        im = Image.open(os.path.join(UP, fn)).convert("RGB")
        big = fit(im, 1400); b = webp_bytes(big, 78)
        big_inline[key] = datauri(b); big_site[key] = f"img/{key}.webp"
        t = fit(im, 768); tb = webp_bytes(t, 72); a = round(t.width / t.height, 4)
        tex_inline[key] = {"u": datauri(tb), "a": a}; tex_site[key] = {"u": f"img/t-{key}.webp", "a": a}
        for v in ("site", "test"):
            open(os.path.join(DIST, v, "img", f"{key}.webp"), "wb").write(b)
            open(os.path.join(DIST, v, "img", f"t-{key}.webp"), "wb").write(tb)
        print(f"{key:5} big {len(b)//1024:4} KB  tex {len(tb)//1024:3} KB  {big.size}")

    rgba, rgb = logo_parts()
    nav = fit(rgba, 160); nb = webp_bytes(nav, 90)
    sg = fit(rgb, 900); sb = webp_bytes(sg, 85); a = round(sg.width / sg.height, 4)
    big_inline["logo"] = datauri(nb); big_site["logo"] = "img/logo.webp"
    tex_inline["logo"] = {"u": datauri(sb), "a": a}; tex_site["logo"] = {"u": "img/t-logo.webp", "a": a}
    for v in ("site", "test"):
        open(os.path.join(DIST, v, "img", "logo.webp"), "wb").write(nb)
        open(os.path.join(DIST, v, "img", "t-logo.webp"), "wb").write(sb)
    print(f"logo  nav {len(nb)//1024} KB  sign {len(sb)//1024} KB  {sg.size}")

    og = make_og(Image.open(os.path.join(UP, SRC["pista"])).convert("RGB"), rgba)
    for v in ("site", "test"):
        og.save(os.path.join(DIST, v, "img", "og.jpg"), "JPEG", quality=86, optimize=True, progressive=True)

    parts = [open(os.path.join(ROOT, "src", f), encoding="utf-8").read() for f in ("head.js", "sky.js", "tail.js")]
    js = "".join(parts)
    open(os.path.join(ROOT, "main.js"), "w", encoding="utf-8").write(js)
    tpl = open(os.path.join(ROOT, "template.html"), encoding="utf-8").read()
    css = open(os.path.join(ROOT, "styles.css"), encoding="utf-8").read()

    cdn = "https://cdnjs.cloudflare.com/ajax/libs"
    libs_cdn = {"three": f"{cdn}/three.js/r128/three.min.js", "gsap": f"{cdn}/gsap/3.12.5/gsap.min.js",
                "st": f"{cdn}/gsap/3.12.5/ScrollTrigger.min.js", "lenis": "https://cdn.jsdelivr.net/npm/lenis@1.1.13/dist/lenis.min.js"}
    libs_local = {"three": "js/three.min.js", "gsap": "js/gsap.min.js", "st": "js/ScrollTrigger.min.js", "lenis": "js/lenis.min.js"}
    fonts_google = ('<link rel="preconnect" href="https://fonts.googleapis.com">\n'
                    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
                    '<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,700;12..96,800&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet">')
    fonts_local = ('<style>@font-face{font-family:"Bricolage Grotesque";src:url("fonts/Bricolage.ttf");font-weight:200 800;}'
                   '@font-face{font-family:"Instrument Serif";src:url("fonts/InstrumentSerif.ttf");font-style:normal;}'
                   '@font-face{font-family:"Instrument Serif";src:url("fonts/InstrumentSerif-Italic.ttf");font-style:italic;}</style>')
    og_meta = (f'<link rel="canonical" href="{SITE_URL}/">\n'
               f'<meta property="og:url" content="{SITE_URL}/">\n'
               f'<meta property="og:image" content="{SITE_URL}/img/og.jpg">\n'
               '<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n'
               '<meta name="twitter:card" content="summary_large_image">\n'
               f'<meta name="twitter:image" content="{SITE_URL}/img/og.jpg">')

    def render(big, tex, libs, fonts, og, base):
        out = tpl.replace("/*__CSS__*/", css)
        j = js.replace("__TEXMAP__", json.dumps(tex)).replace("__LIBS__", json.dumps(libs))
        pre = "\n".join(f'<link rel="preload" as="script" href="{libs[k]}">' for k in ("three", "gsap"))
        if base:
            pre = f'<base href="{base}">\n' + pre
        out = out.replace("<!--__PRELOAD__-->", pre)
        out = out.replace("/*__MAIN_JS__*/", j)
        out = out.replace("<!--__FONTS__-->", fonts).replace("<!--__OG__-->", og)
        for k, v in big.items():
            out = out.replace(f"__I_{k}__", v)
        left = sorted(set(re.findall(r"__[A-Z]+_?[A-Za-z0-9]*__", out)))
        if left:
            print("!! tokens sin reemplazar:", left)
        return out

    open(os.path.join(DIST, "inline", "index.html"), "w", encoding="utf-8").write(render(big_inline, tex_inline, libs_cdn, fonts_google, "", ""))
    open(os.path.join(DIST, "site", "index.html"), "w", encoding="utf-8").write(render(big_site, tex_site, libs_local, fonts_google, og_meta, BASE))
    open(os.path.join(DIST, "test", "index.html"), "w", encoding="utf-8").write(render(big_site, tex_site, libs_local, fonts_local, og_meta, ""))

    for v in ("site", "test"):
        for f in ("three.min.js", "gsap.min.js", "ScrollTrigger.min.js", "lenis.min.js"):
            shutil.copy(os.path.join(ROOT, "vendor", f), os.path.join(DIST, v, "js", f))
    for f in ("Bricolage.ttf", "InstrumentSerif.ttf", "InstrumentSerif-Italic.ttf"):
        shutil.copy(os.path.join(ROOT, "fonts", f), os.path.join(DIST, "test", "fonts", f))

    for v in ("inline", "site"):
        p = os.path.join(DIST, v, "index.html")
        print(v, "index.html", os.path.getsize(p) // 1024, "KB")
    tot = sum(os.path.getsize(os.path.join(dp, f)) for dp, _, fs in os.walk(os.path.join(DIST, "site")) for f in fs)
    print("site total", tot // 1024, "KB")

if __name__ == "__main__":
    main()
