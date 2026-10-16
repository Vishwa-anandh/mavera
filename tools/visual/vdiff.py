"""Visual regression: screenshot every route on the base app (:5174) and the working app (:5173), diff them."""
import sys, os, io
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.sync_api import sync_playwright
from PIL import Image, ImageChops

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = HERE + "/vdiff"
os.makedirs(OUT, exist_ok=True)
MEMBER = [
    "/", "/cloud/overview", "/cloud/analytics", "/cloud/optimization", "/cloud/reservations", "/cloud/resources",
    "/azure", "/azure/az-acc-1", "/aws", "/aws/accounts", "/aws/account/aws-acc-1",
    "/gcp", "/gcp/accounts", "/gcp/account/gcp-acc-1", "/btp", "/btp/accounts", "/btp/account/btp-acc-1",
    "/budgets", "/smart-alerts", "/sap/systems", "/sap/databases", "/sap/jobs", "/sap/performance", "/sap/alerts",
    "/sap/transport-management", "/sap/security-notes", "/sap/btp-security", "/sap/configuration",
    "/alerts", "/ai-assistant", "/account", "/subscription", "/users", "/sync-logs", "/invoices", "/billing",
]
ADMIN = ["/admin/dashboard", "/admin/organizations", "/admin/organizations/new", "/admin/organizations/org-acme",
         "/admin/billing", "/admin/billing/generate", "/admin/billing/customers"]
FREEZE = "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}"

def shoot(pw, base, creds, routes, width, height, theme):
    b = pw.chromium.launch()
    ctx = b.new_context(viewport={"width": width, "height": height}, reduced_motion="reduce")
    pg = ctx.new_page()
    pg.goto(f"{base}/login")
    pg.fill("input", creds[0]); pg.get_by_role("button", name="Continue").click()
    pg.wait_for_selector("input[type=password]"); pg.fill("input[type=password]", creds[1]); pg.keyboard.press("Enter")
    pg.wait_for_timeout(2500)
    pg.evaluate("t => document.documentElement.setAttribute('data-theme', t)", theme)
    out = {}
    for r in routes:
        pg.evaluate("r => { history.pushState({}, '', r); dispatchEvent(new PopStateEvent('popstate')); }", r)
        try: pg.wait_for_selector('[aria-busy="true"]', state="detached", timeout=8000)
        except Exception: pass
        pg.wait_for_timeout(900)
        pg.add_style_tag(content=FREEZE)
        out[r] = Image.open(io.BytesIO(pg.screenshot(full_page=True))).convert("RGB")
    b.close()
    return out

def compare(a, b):
    if a.size != b.size:
        return 1.0, None
    diff = ImageChops.difference(a, b).convert("L").point(lambda v: 255 if v > 24 else 0)
    n = sum(1 for v in diff.getdata() if v)
    return n / (a.size[0] * a.size[1]), diff

if __name__ == "__main__":
    widths = [(1440, 900), (390, 800)]
    theme = sys.argv[1] if len(sys.argv) > 1 else "light"
    only = sys.argv[2] if len(sys.argv) > 2 else None
    bad = 0
    with sync_playwright() as p:
        for (w, h) in widths:
            for label, routes, creds in (("member", MEMBER, ("demo@mavera.local", "Mavera@2026")), ("admin", ADMIN, ("superadmin", "Maitsys@2026"))):
                if only and only != label: continue
                base = shoot(p, "http://localhost:5174", creds, routes, w, h, theme)
                new = shoot(p, os.environ.get("NEW_URL", "http://localhost:5173"), creds, routes, w, h, theme)
                for r in routes:
                    ratio, diff = compare(base[r], new[r])
                    name = ("root" if r == "/" else r.strip("/").replace("/", "_"))
                    if ratio > 0.0004:
                        bad += 1
                        new[r].save(f"{OUT}/{theme}_{w}_{name}_new.png"); base[r].save(f"{OUT}/{theme}_{w}_{name}_base.png")
                        if diff: diff.save(f"{OUT}/{theme}_{w}_{name}_diff.png")
                        print(f"DIFF {theme} {w} {r}: {ratio:.4%} {'(size changed %s -> %s)' % (base[r].size, new[r].size) if base[r].size != new[r].size else ''}")
                print(f"{label} {w}: {len(routes)} routes compared")
    print("flagged:", bad)
