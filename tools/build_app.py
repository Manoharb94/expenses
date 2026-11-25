#!/usr/bin/env python3
"""Copies the web app into the Android app's www folder as the on-phone version (no website, no server).

Usage:  python3 tools/build_app.py [path/to/gharwise-app]
Run tools/build.py first so the script fingerprints and Hindi strings are up to date.
"""
import os, re, shutil, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APP = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.join(os.path.dirname(ROOT), "gharwise-app")
WWW = os.path.join(APP, "www")

COPY_DIRS = ["js", "ocr", "vendor"]
COPY_FILES = ["manifest.json", "privacy.html", "logo.svg", "icon.png", "icon-192.png", "icon-maskable.png",
              "apple-touch-icon.png", "favicon-32.png"]

def main():
    if not os.path.isdir(os.path.join(APP, "android")):
        sys.exit("Can't find the gharwise-app folder at " + APP)
    # safety: only build the on-phone bundle from, and into, the local-mode branches
    for repo in (ROOT, APP):
        try:
            br = subprocess.check_output(["git", "-C", repo, "rev-parse", "--abbrev-ref", "HEAD"], text=True).strip()
        except Exception:
            br = "?"
        if br != "local-mode":
            sys.exit("Stopped: %s is on branch '%s'. Switch both repos to local-mode first." % (repo, br))
    if os.path.isdir(WWW):
        shutil.rmtree(WWW)
    os.makedirs(WWW)
    for d in COPY_DIRS:
        shutil.copytree(os.path.join(ROOT, d), os.path.join(WWW, d))
    for f in COPY_FILES:
        src = os.path.join(ROOT, f)
        if os.path.exists(src):
            shutil.copy2(src, os.path.join(WWW, f))
    # the flag that turns the on-phone version on
    with open(os.path.join(WWW, "js", "local-flag.js"), "w") as fh:
        fh.write("window.GW_LOCAL_BUILD=1;\n")
    html = open(os.path.join(ROOT, "app.html"), encoding="utf-8").read()
    html = re.sub(r'(<script src="js/core\.js)', '<script src="js/local-flag.js"></script>\n\\1', html, count=1)
    if "local-flag.js" not in html:
        sys.exit("Could not add local-flag.js to the page")
    html = re.sub(r'<link[^>]+supabase\.co[^>]*>\s*', '', html)
    # nothing should be loaded from the internet
    for u in re.findall(r'(?:src|href)="(https?://[^"]+)"', html):
        if "fonts.googleapis" in u or "fonts.gstatic" in u:
            continue
        print("  note: the page still links to", u)
    with open(os.path.join(WWW, "index.html"), "w", encoding="utf-8") as fh:
        fh.write(html)
    # privacy page for the on-phone version
    pv = os.path.join(WWW, "privacy.html")
    if os.path.exists(pv):
        t = open(pv, encoding="utf-8").read()
        note = ('<div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;padding:12px 14px;margin:12px 0;line-height:1.5">'
                '<b>Gharwise app (on-phone version)</b><br>'
                '&bull; Your payments, budgets, bank SMS and bill photos are kept <b>only on your phone</b> and in the folder you choose. They are never stored on our server.<br>'
                '&bull; Our server keeps: your <b>mobile number</b> (to log in with an SMS code), and <b>usage counts</b>: when you last opened the app, the app version, which features are switched on, and how many payments you have (a count, no amounts or payees).<br>'
                '&bull; <b>Family sharing</b> is end-to-end encrypted: each phone encrypts payments with your family key before sending. Our server passes on data it cannot read.<br>'
                '&bull; <b>Email tracking</b> (optional): a script in your own Gmail encrypts bank emails before sending. Our server holds the scrambled text until your phone collects it, then deletes it.<br>'
                'The rest of this page describes the website version.</div>')
        t = re.sub(r'(<body[^>]*>)', r'\1' + note, t, count=1)
        open(pv, "w", encoding="utf-8").write(t)
    size = 0
    for dp, _, fs in os.walk(WWW):
        for f in fs:
            size += os.path.getsize(os.path.join(dp, f))
    print("Copied the on-phone app to", WWW, "(%.1f MB)" % (size / 1048576))
    try:
        sha = subprocess.check_output(["git", "-C", ROOT, "rev-parse", "--short", "HEAD"], text=True).strip()
        open(os.path.join(WWW, "build.txt"), "w").write("web " + sha + "\n")
    except Exception:
        pass

if __name__ == "__main__":
    main()
