"""Run the element-level comparison over every route and summarise: python cdiff_all.py [light|dark] [width] [member|admin] [-v]"""
import os, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cdiff
from playwright.sync_api import sync_playwright
MEMBER = ["/", "/cloud/overview", "/cloud/analytics", "/cloud/optimization", "/cloud/reservations", "/cloud/resources",
    "/azure", "/azure/az-acc-1", "/aws", "/aws/accounts", "/aws/account/aws-acc-1", "/gcp", "/gcp/accounts", "/gcp/account/gcp-acc-1",
    "/btp", "/btp/accounts", "/btp/account/btp-acc-1", "/budgets", "/smart-alerts", "/sap/systems", "/sap/databases", "/sap/jobs",
    "/sap/performance", "/sap/alerts", "/sap/transport-management", "/sap/security-notes", "/sap/btp-security", "/sap/configuration",
    "/alerts", "/ai-assistant", "/account", "/subscription", "/users", "/sync-logs", "/invoices", "/billing"]
ADMIN = ["/admin/dashboard", "/admin/organizations", "/admin/organizations/new", "/admin/organizations/org-acme",
         "/admin/billing", "/admin/billing/generate", "/admin/billing/customers"]
theme = next((a for a in sys.argv[1:] if a in ("light", "dark")), "light")
width = next((int(a) for a in sys.argv[1:] if a.isdigit()), 1440)
which = next((a for a in sys.argv[1:] if a in ("member", "admin")), "member")
verbose = "-v" in sys.argv
only = [a for a in sys.argv[1:] if a.startswith("/")]
routes = only or (ADMIN if which == "admin" else MEMBER)
if which == "admin": cdiff.CREDS = ("superadmin", "Maitsys@2026")
agg = {}
with sync_playwright() as p:
    for r in routes:
        a, n = cdiff.collect(p, cdiff.BASE, r, theme, width), cdiff.collect(p, cdiff.NEW, r, theme, width)
        bad = 0
        for x, y in zip(a, n):
            if x["path"] != y["path"]: bad += 1; break
            diffs = {k: (x["s"][k], y["s"][k]) for k in cdiff.PROPS if x["s"][k] != y["s"][k]}
            if x["rect"] != y["rect"]: diffs["rect"] = (x["rect"], y["rect"])
            if diffs:
                bad += 1
                key = (x["cls"] or x["tag"], tuple(sorted(diffs)))
                g = agg.setdefault(key, {"n": 0, "routes": set(), "ex": (x, y, diffs)}); g["n"] += 1; g["routes"].add(r)
        if len(a) != len(n): bad += abs(len(a) - len(n))
        print(f"{r:32} {'OK' if not bad else str(bad) + ' differing elements'}", flush=True)
print(f"\n{len(agg)} distinct difference groups")
for (cls, props), g in sorted(agg.items(), key=lambda kv: -kv[1]["n"])[: (60 if verbose else 15)]:
    x, y, diffs = g["ex"]
    print(f"- x{g['n']} in {len(g['routes'])} routes  class=\"{cls[:80]}\"  '{x['text']}'  e.g. {sorted(g['routes'])[0]}")
    for k, (u, v) in list(diffs.items())[:5]: print(f"     {k}: {u}  ->  {v}")
