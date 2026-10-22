"""Brand-new organisation walk-through: signs in as new@mavera.local ("New organisation") and checks every
signed-in page, then connects one Azure account through the existing form and checks the data appears.

How to run (the dev server for the working tree must be up: `npx vite --port 5173`):

    python tools/visual/new_org_check.py                       # all pages at 1440 and 390, light theme
    python tools/visual/new_org_check.py --themes light dark    # add the dark theme
    python tools/visual/new_org_check.py --shots out/dir        # write screenshots there (default: tools/visual/out/new_org)
    BASE_URL=http://localhost:5173 python tools/visual/new_org_check.py

Git Bash on Windows: prefix MSYS_NO_PATHCONV=1 if you pass a path starting with a slash.

What it asserts, per signed-in route in src/app/router/route-manifest.ts (read from the manifest, so new routes are
picked up), at 1440 px and 390 px:
  - no console errors and no uncaught page errors
  - no "NaN" or "undefined" text
  - no horizontal overflow of the page
  - pages whose data comes from a connection show a visible next-step action while nothing is connected
Then it connects an Azure subscription (Account name, Subscription/Tenant/Client ID, secret -> Next -> Validate -> Save)
and checks the dashboard, Cost Overview, Cost Analytics, Optimization, Resources, Budgets and the Azure pages now show
data, under the account's name, labelled "Sample data" where the figures could be taken for live.

The demo session lives in memory, so pages are visited by client-side navigation (history API), never a reload.
Exit status is 1 when any check fails.
"""
import argparse
import os
import re
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / "src" / "app" / "router" / "route-manifest.ts"
BASE = os.environ.get("BASE_URL", "http://localhost:5173")
ACCOUNT = {
    "name": "Contoso Production",
    "subscription": "11111111-2222-4333-8444-555555555555",
    "tenant": "66666666-7777-4888-9999-000000000000",
    "client": "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
    "secret": "not-a-real-secret",
}
# Pages whose data comes from a connection: while nothing is connected each must offer a visible next step.
NEEDS_NEXT_STEP = {
    "dashboard", "cost-overview", "azure", "aws", "gcp", "btp", "budgets", "smart-alerts", "sap-systems", "sap-databases", "sap-jobs",
    "sap-performance", "sap-alerts", "sap-transport", "sap-security-notes", "sap-btp-security", "sap-configuration", "alerts",
    "invoices", "sync-logs", "audit-trail", "cloud-analytics", "cloud-optimization", "cloud-reservations", "cloud-resources",
}
# Nested routes the manifest covers with a wildcard.
EXTRA_PATHS = {"aws": ["/aws/accounts"], "gcp": ["/gcp/accounts"], "btp": ["/btp/accounts"]}
BAD_TEXT = re.compile(r"\bNaN\b|\bundefined\b")
ACTION_JS = """() => {
  const visible = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
  const sel = '.mv-empty button, .mv-empty a, .mv-empty-inline button, .mv-empty-inline a, .mv-module-card-action, main .mv-primary-button, main a.mv-primary-button, [role=status] button';
  const hit = [...document.querySelectorAll(sel)].filter(visible);
  return hit.map((el) => (el.textContent || '').trim()).filter(Boolean).slice(0, 4);
}"""


def read_routes():
    """(id, path) of every signed-in app page in the manifest, with params and wildcards resolved."""
    text = MANIFEST.read_text(encoding="utf-8")
    paths = dict(re.findall(r"^\s{2}(\w+): '([^']+)',", text[text.index("export const appPaths"):], re.M))
    routes = []
    for rid, key in re.findall(r"\{ id: '([^']+)', path: appPaths\.(\w+), access: member, layout: 'app'", text):
        path = paths[key]
        if ":" in path:
            continue  # needs an account: checked after connecting
        routes.append((rid, path.replace("/*", "")))
        routes.extend((rid, extra) for extra in EXTRA_PATHS.get(rid, []))
    return routes


class Report:
    def __init__(self):
        self.failures, self.notes = [], []

    def fail(self, where, what):
        self.failures.append(f"{where}: {what}")
        print(f"  FAIL {where}: {what}")

    def note(self, text):
        self.notes.append(text)


def sign_in(pw, width, theme):
    browser = pw.chromium.launch()
    context = browser.new_context(viewport={"width": width, "height": 900}, reduced_motion="reduce", color_scheme=theme)
    context.add_init_script(f"localStorage.setItem('mavera.theme', '{theme}')")
    page = context.new_page()
    errors = []
    page.on("console", lambda m: errors.append(f"console {m.type}: {m.text}") if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
    page.goto(BASE + "/login")
    card = page.get_by_role("region", name="Demo mode")
    card.get_by_role("button", name=re.compile("^New organisation")).click()
    page.wait_for_url(lambda url: not url.endswith("/login"), timeout=15000)
    page.wait_for_selector("main, [role=main], .mv-app-main", timeout=15000)
    return browser, page, errors


def go(page, route):
    page.evaluate("r => { history.pushState({}, '', r); dispatchEvent(new PopStateEvent('popstate')); }", route)
    try:
        page.wait_for_selector('[aria-busy="true"]', state="detached", timeout=8000)
    except Exception:
        pass
    page.wait_for_timeout(900)


def check_page(page, errors, report, label, route, shots, tag, need_action=False, shot=False):
    errors.clear()
    go(page, route)
    where = f"{label} {route} @{tag}"
    text = page.evaluate("document.body.innerText")
    if BAD_TEXT.search(text):
        report.fail(where, f"shows {BAD_TEXT.search(text).group(0)!r}")
    overflow = page.evaluate("[document.documentElement.scrollWidth, window.innerWidth]")
    if overflow[0] > overflow[1] + 1:
        report.fail(where, f"horizontal overflow ({overflow[0]} > {overflow[1]})")
    for error in errors:
        report.fail(where, error)
    actions = page.evaluate(ACTION_JS)
    # A page's code is fetched on first visit (slow on a cold dev server): give the empty state time to appear.
    for _ in range(12 if need_action else 0):
        if actions:
            break
        page.wait_for_timeout(500)
        actions = page.evaluate(ACTION_JS)
    if need_action and not actions:
        report.fail(where, "no visible next-step action while nothing is connected")
    if shot:
        safe = re.sub(r"[^a-z0-9]+", "-", f"{label}{route}".lower()).strip("-")
        page.screenshot(path=str(shots / f"{safe}-{tag}.png"), full_page=True)
    return actions


def connect_azure(page, errors, report):
    errors.clear()
    go(page, "/azure?open=connect")
    dialog = page.get_by_role("dialog", name="Connect Azure account")
    dialog.wait_for(timeout=8000)
    dialog.get_by_label("Account name").fill(ACCOUNT["name"])
    dialog.get_by_label("Subscription ID").fill(ACCOUNT["subscription"])
    dialog.get_by_label("Tenant ID").fill(ACCOUNT["tenant"])
    dialog.get_by_label("Client ID").fill(ACCOUNT["client"])
    dialog.get_by_label("Client secret").fill(ACCOUNT["secret"])
    dialog.get_by_role("button", name="Next").click()
    dialog.get_by_role("button", name="Validate details").click()
    dialog.get_by_role("button", name="Save account").click()
    dialog.get_by_text("Account connected").wait_for(timeout=8000)
    dialog.get_by_role("button", name="Done").click()
    for error in errors:
        report.fail("connect Azure", error)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--themes", nargs="+", default=["light"], choices=["light", "dark"])
    parser.add_argument("--widths", nargs="+", type=int, default=[1440, 390])
    parser.add_argument("--shots", default=str(ROOT / "tools" / "visual" / "out" / "new_org"))
    args = parser.parse_args()
    shots = Path(args.shots)
    shots.mkdir(parents=True, exist_ok=True)
    report = Report()
    routes = read_routes()
    print(f"{len(routes)} signed-in routes from the manifest; widths {args.widths}; themes {args.themes}")
    key_pages = {"/", "/cloud/overview", "/sap/systems", "/azure", "/budgets"}

    with sync_playwright() as pw:
        for theme in args.themes:
            for width in args.widths:
                tag = f"{theme}-{width}-empty"
                print(f"\n== nothing connected, {tag}")
                browser, page, errors = sign_in(pw, width, theme)
                for rid, route in routes:
                    actions = check_page(page, errors, report, rid, route, shots, tag, need_action=rid in NEEDS_NEXT_STEP, shot=route in key_pages)
                    print(f"  ok   {route:34} actions: {actions[:2]}")
                # A route with a parameter that names an account nobody connected.
                check_page(page, errors, report, "azure-account", "/azure/az-acc-1", shots, tag)
                browser.close()

        # Connect one Azure account through the existing form, then check the data is there.
        for theme in args.themes:
            for width in args.widths:
                tag = f"{theme}-{width}-connected"
                print(f"\n== after connecting Azure, {tag}")
                browser, page, errors = sign_in(pw, width, theme)
                connect_azure(page, errors, report)

                def has(where, route, expected, absent=()):
                    check_page(page, errors, report, where, route, shots, tag, shot=True)
                    body = page.evaluate("document.body.innerText")
                    for needle in expected:
                        if needle not in body:
                            report.fail(f"{where} {route} @{tag}", f"expected text not found: {needle!r}")
                    for needle in absent:
                        if needle in body:
                            report.fail(f"{where} {route} @{tag}", f"still shows: {needle!r}")
                    print(f"  ok   {route}")

                has("dashboard", "/", ["$"], absent=["No cloud account connected yet", "Connect your first account\n"])
                has("cost-overview", "/cloud/overview", ["Total Spend (Month-to-Date)", "Azure"], absent=["Connect your first cloud account"])
                has("azure-overview", "/azure", [ACCOUNT["name"], "Sample data"], absent=["No Azure subscriptions connected yet"])
                has("azure-account", "/azure/az-acc-1", [ACCOUNT["name"], "Sample data"], absent=["Account not found"])
                has("cloud-analytics", "/cloud/analytics", ["Azure"], absent=["No cloud account connected yet"])
                has("cloud-optimization", "/cloud/optimization", [], absent=["No cloud account connected yet"])
                has("cloud-resources", "/cloud/resources", ["Azure"], absent=["No cloud account connected yet"])
                has("smart-alerts", "/smart-alerts", ["Azure"], absent=["No cloud account connected yet"])
                has("budgets", "/budgets", [], absent=[])
                has("sync-logs", "/sync-logs", [ACCOUNT["name"]], absent=["No syncs yet"])
                has("sap-systems (still nothing connected)", "/sap/systems", ["No SAP system connected yet"])
                browser.close()

    print("\n" + "=" * 60)
    if report.failures:
        print(f"{len(report.failures)} failure(s):")
        for failure in report.failures:
            print(" -", failure)
        sys.exit(1)
    print("All new-organisation checks passed.")


if __name__ == "__main__":
    main()
