#!/usr/bin/env python3
"""Configure le site une fois le nom de domaine connu.

Usage :
  python3 scripts/configure.py --domain https://www.mon-domaine.cm
  python3 scripts/configure.py --domain https://www.mon-domaine.cm --contact contact@mon-domaine.cm --privacy privacy@mon-domaine.cm

Ce que fait le script :
  - remplace le domaine factice dans sitemap.xml et robots.txt ;
  - transforme les URL relatives (canonical, og:image, twitter:image, JSON-LD) en URL absolues ;
  - ajoute og:url ;
  - remplace les adresses e-mail de contact si demandé.
Le script peut être relancé : il ne modifie que ce qui doit l'être.
"""
import argparse, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
PLACEHOLDER = "https://votre-domaine.example"

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--domain", required=True, help="ex. https://www.mon-domaine.cm (sans / final)")
    ap.add_argument("--contact", help="adresse e-mail de contact (remplace contact@adma.cm)")
    ap.add_argument("--privacy", help="adresse e-mail données personnelles (remplace privacy@adma.cm)")
    a = ap.parse_args()
    dom = a.domain.rstrip("/")

    for name in ("sitemap.xml", "robots.txt"):
        p = ROOT / name
        p.write_text(p.read_text(encoding="utf-8").replace(PLACEHOLDER, dom), encoding="utf-8")

    for p in ROOT.glob("*.html"):
        t = p.read_text(encoding="utf-8")
        page = "" if p.name == "index.html" else p.name
        # canonical
        t = re.sub(r'<link rel="canonical" href="[^"]*">', f'<link rel="canonical" href="{dom}/{page}">', t)
        # og:image / twitter:image
        t = re.sub(r'(<meta (?:property="og:image"|name="twitter:image") content=")(?!https?://)([^"]+)(")', lambda m: f'{m.group(1)}{dom}/{m.group(2)}{m.group(3)}', t)
        # og:url
        t = re.sub(r'\s*<meta property="og:url" content="[^"]*">', '', t)
        t = t.replace('<meta property="og:type" content="website">', f'<meta property="og:type" content="website">\n  <meta property="og:url" content="{dom}/{page}">')
        # JSON-LD relatifs
        t = re.sub(r'("logo": ")(?!https?://)([^"]+)(")', lambda m: f'{m.group(1)}{dom}/{m.group(2)}{m.group(3)}', t)
        t = re.sub(r'("item": ")\./(")', lambda m: f'{m.group(1)}{dom}/{m.group(2)}', t)
        t = re.sub(r'("item": ")(?!https?://)([a-z\-]+\.html)(")', lambda m: f'{m.group(1)}{dom}/{m.group(2)}{m.group(3)}', t)
        if a.contact: t = t.replace("contact@adma.cm", a.contact)
        if a.privacy: t = t.replace("privacy@adma.cm", a.privacy)
        p.write_text(t, encoding="utf-8")
    print("Site configuré pour", dom)

if __name__ == "__main__":
    main()
