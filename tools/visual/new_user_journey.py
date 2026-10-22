#!/usr/bin/env python3
"""New-user onboarding journey for Mavera (Playwright, python, sync API).

Signs in as new@mavera.local ("New organisation" on the Demo mode card) and walks the whole getting-started path
with the same trusted-click counting as click_audit.py (real mouse presses, typed fields and key presses; a
scripted fill() costs nothing, so nothing here uses it):

  1  checklist card "Guide me" -> connect Azure with sample credentials (live coach)
  2  connect AWS      through the assistant ("Help me connect AWS")
  3  connect Google   through the assistant ("Help me connect Google Cloud")
  4  connect SAP BTP  through the assistant ("Help me connect SAP BTP")
  5  connect SAP      through the assistant ("Help me connect SAP")
  6  create a budget          (checklist card button, suggested limit)
  7  add alert recipients     (checklist card button, your own address is already in the list)
  8  invite a teammate        (checklist card button, one email, default role)
  9  take the tour            (checklist card button, Next to the end)
 10  verification: dashboard, Cost Overview, Alerts and the assistant show data (counted separately; it is
     looking, not onboarding)

Every step reports interactions = clicks (not counting the click that only focuses a text field) + text fields
typed into + non-printable keys, the same number click_audit.py reports. The total covers steps 1-9.

Usage (the dev server for the working tree must be up: `npx vite --port 5173`):
    python tools/visual/new_user_journey.py                                  # 1440 and 390, light and dark
    python tools/visual/new_user_journey.py --widths 1440 --themes light     # one combination
    python tools/visual/new_user_journey.py --shots out/dir --json out.json  # screenshots and results
    BASE_URL=http://localhost:5173 python tools/visual/new_user_journey.py

Git Bash on Windows: prefix MSYS_NO_PATHCONV=1 if you pass a path that starts with a slash.
Exit status is 1 when any step or check fails. The harness never edits the application.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import asdict, dataclass, field
from pathlib import Path

from playwright.sync_api import Page, sync_playwright

from click_audit import BASE, INIT_JS, STEP_TIMEOUT, Ctx, spa_goto

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parents[2]
KEYS = ("clicks", "focus_clicks", "selects", "typed", "fields", "nav_keys")
ONBOARDING_STEPS = 9  # steps 1-9 add up to the journey total; step 10 is verification


@dataclass
class StepResult:
    id: str
    title: str
    status: str = "ok"          # ok | failed
    clicks: int = 0
    fields: int = 0
    keys: int = 0
    typed: int = 0
    interactions: int = 0
    steps: list = field(default_factory=list)
    note: str = ""


def interactions_of(m: dict) -> int:
    return m["clicks"] - m["focus_clicks"] + m["fields"] + m["nav_keys"]


class Journey:
    def __init__(self, page: Page, width: int, theme: str, shots: Path):
        self.page, self.width, self.theme, self.shots = page, width, theme, shots
        self.c = Ctx(page)
        self.results: list[StepResult] = []
        self.checks: list[dict] = []
        self.errors: list[str] = []
        self.tag = f"{theme}-{width}"
        self.mobile = width < 768

    # measuring -----------------------------------------------------------------------------------
    def shot(self, name: str):
        try:
            self.page.screenshot(path=str(self.shots / f"journey-{self.tag}-{name}.png"))
        except Exception as exc:  # noqa: BLE001 - a missing screenshot must not fail the walk
            print(f"    (screenshot {name} failed: {exc})")

    def step(self, sid: str, title: str, fn):
        before = self.c.read()
        self.c.steps = []
        res = StepResult(id=sid, title=title)
        try:
            fn()
        except Exception as exc:  # noqa: BLE001 - a failed step is a finding, not a crash
            res.status = "failed"
            res.note = f"{type(exc).__name__}: {str(exc).splitlines()[0][:230]}"
            self.shot(f"FAILED-{sid}")
        after = self.c.read()
        d = {k: after[k] - before[k] for k in KEYS}
        res.clicks = d["clicks"] - d["focus_clicks"]
        res.fields, res.keys, res.typed = d["fields"], d["nav_keys"], d["typed"]
        res.interactions = interactions_of(d)
        res.steps = list(self.c.steps)
        self.results.append(res)
        flag = "OK " if res.status == "ok" else "ERR"
        print(f"  [{flag}] {sid:14} {res.interactions:>2} interactions ({res.clicks} clicks + {res.fields} fields + {res.keys} keys, {res.typed} chars)  {title}{'  -> ' + res.note if res.note else ''}", flush=True)
        return res

    def check(self, name: str, ok: bool, detail: str = ""):
        self.checks.append({"name": name, "ok": bool(ok), "detail": detail})
        print(f"    {'pass' if ok else 'FAIL'}  {name}{('  (' + detail + ')') if detail else ''}", flush=True)

    # helpers -------------------------------------------------------------------------------------
    def card(self) -> str:
        loc = self.page.locator(".mv-tour-card")
        return loc.first.inner_text().replace("\n", " | ") if loc.count() else ""

    def progress(self) -> str:
        loc = self.page.locator("section.mv-onboarding p[aria-live]")
        return loc.first.inner_text() if loc.count() else "(card hidden)"

    def to_dashboard(self):
        """The Dashboard from any page: the header link at desktop width, menu button + link in the mobile drawer."""
        c, page = self.c, self.page
        link = page.locator("header").get_by_role("link", name="Dashboard", exact=True)
        if not link.first.is_visible():
            c.click(page.get_by_role("button", name="Open navigation menu"), "Open navigation menu")
            link = page.get_by_role("link", name="Dashboard", exact=True)
        c.click(link, "Dashboard")
        page.wait_for_url(re.compile(r"/$"), timeout=STEP_TIMEOUT)
        page.locator("section.mv-onboarding, h1").first.wait_for(state="visible", timeout=STEP_TIMEOUT)
        page.wait_for_timeout(300)

    def checklist(self):
        return self.page.locator("section.mv-onboarding")

    def finish_coach(self, label: str):
        """The coach's closing note: its Done button is a real click, so it is counted."""
        c, page = self.c, self.page
        done = page.locator(".mv-tour-card").get_by_role("button", name="Done")
        done.first.wait_for(state="visible", timeout=STEP_TIMEOUT + 4000)
        c.steps.append(f"see coach note: {label}")
        c.click(done, "coach 'Done'")

    def use_sample_and_connect(self, label: str):
        """Coach steps 3 and 4: the form is open; Use sample credentials, then Connect, then the closing Done."""
        c, page = self.c, self.page
        dlg = page.locator("[data-tour=connect-dialog]")
        dlg.wait_for(state="visible", timeout=STEP_TIMEOUT)
        c.see(page.locator(".mv-tour-card").get_by_text("Do this: click Use sample credentials"), "coach: click Use sample credentials")
        c.click(page.locator("[data-tour=use-sample-credentials]"), "Use sample credentials")
        c.see(page.locator(".mv-tour-card").get_by_text("Do this: click Connect"), "coach: click Connect")
        c.click(page.locator("[data-tour=connect-submit]"), "Connect")
        self.finish_coach(label)

    def assistant_connect(self, phrase: str, label: str, expect_title: str):
        """Open the assistant, type the request, Enter; the coach opens the form (and the provider picker is skipped)."""
        c, page = self.c, self.page
        c.click(page.get_by_role("button", name="Open AI Assistant"), "assistant launcher")
        box = page.locator("[aria-label='Mavera AI Assistant']").get_by_role("textbox", name="Ask the AI Assistant")
        c.type(box, phrase, f"'{phrase}'")
        c.key("Enter", "Enter (send)")
        page.locator("[data-tour=connect-dialog]").wait_for(state="visible", timeout=STEP_TIMEOUT + 3000)
        c.see(page.locator("[data-tour=connect-dialog]").get_by_role("heading", name=re.compile(expect_title, re.I)), f"dialog '{expect_title}'")
        if self.page.locator("[data-tour^='connect-provider-']").count():
            raise AssertionError(f"the connect dialog opened on its provider picker instead of on {label}")
        self.shot(f"{label.lower().replace(' ', '-')}-form")
        self.use_sample_and_connect(label)

    # steps ---------------------------------------------------------------------------------------
    def s1_azure(self):
        c, page = self.c, self.page
        self.shot("0-dashboard-new")
        row = self.checklist().get_by_role("listitem").filter(has_text="Connect a cloud account")
        c.click(row.get_by_role("button", name="Guide me"), "checklist: Connect a cloud account > Guide me")
        page.locator("[data-tour=connect-dialog]").wait_for(state="visible", timeout=STEP_TIMEOUT)
        self.shot("1-azure-coach-form")
        self.use_sample_and_connect("Azure")
        page.wait_for_url(re.compile(r"/azure/"), timeout=STEP_TIMEOUT)
        c.see(page.get_by_text(re.compile("Sample data", re.I)), "account page labelled Sample data")
        self.shot("2-azure-connected")

    def s2_aws(self):
        self.assistant_connect("Help me connect AWS", "AWS", "AWS")
        self.page.wait_for_url(re.compile(r"/aws/"), timeout=STEP_TIMEOUT)
        self.shot("3-aws-connected")

    def s3_gcp(self):
        self.assistant_connect("Help me connect Google Cloud", "Google Cloud", "Google Cloud")
        self.page.wait_for_url(re.compile(r"/gcp/"), timeout=STEP_TIMEOUT)

    def s4_btp(self):
        self.assistant_connect("Help me connect SAP BTP", "SAP BTP", "BTP")
        self.page.wait_for_url(re.compile(r"/btp/"), timeout=STEP_TIMEOUT)

    def s5_sap(self):
        self.assistant_connect("Help me connect SAP", "SAP system", "SAP")
        self.page.wait_for_url(re.compile(r"/sap/"), timeout=STEP_TIMEOUT)
        self.shot("4-sap-connected")

    def checklist_button(self, row_text: str, button: str):
        self.to_dashboard()
        row = self.checklist().get_by_role("listitem").filter(has_text=row_text)
        self.c.click(row.get_by_role("button", name=button, exact=True), f"checklist: {row_text} > {button}")

    def s6_budget(self):
        c, page = self.c, self.page
        self.checklist_button("Create a budget", "Create budget")
        page.locator("[data-tour=budget-name]").wait_for(state="visible", timeout=STEP_TIMEOUT)
        # Mavera proposes the name; the limit comes from the suggestion button under the field.
        c.click(page.get_by_role("button", name=re.compile(r"^Use \$[\d,]+")), "Use the suggested limit")
        self.shot("5-budget-form")
        c.click(page.locator("[data-tour=budget-submit]"), "Add Budget")
        c.see(page.locator(".mv-toast").filter(has_text=re.compile("Budget created", re.I)), "toast 'Budget created'")

    def s7_recipients(self):
        c, page = self.c, self.page
        self.checklist_button("Add alert recipients", "Add recipients")
        page.locator("[data-tour=channel-recipients]").wait_for(state="visible", timeout=STEP_TIMEOUT)
        self.shot("6-recipients-dialog")
        c.click(page.locator("[data-tour=channel-submit]"), "Add channel (your own address is already listed)")
        c.see(page.locator(".mv-toast").filter(has_text=re.compile("channel added", re.I)), "toast 'channel added'")

    def s8_teammate(self):
        c, page = self.c, self.page
        self.checklist_button("Invite a teammate", "Invite")
        email = page.locator("[data-tour=add-user-email]")
        email.wait_for(state="visible", timeout=STEP_TIMEOUT)
        c.type_here("alex.morgan@northwind.example", "work email (field is auto-focused)")
        self.shot("7-invite-dialog")
        c.click(page.locator("[data-tour=add-user-submit]"), "Add user")
        c.see(page.locator(".mv-toast").filter(has_text=re.compile("was added", re.I)), "toast 'was added'")

    def s9_tour(self):
        c, page = self.c, self.page
        self.to_dashboard()
        row = self.checklist().get_by_role("listitem").filter(has_text="Take the guided tour")
        c.click(row.get_by_role("button", name="Start tour"), "checklist: Take the guided tour > Start tour")
        card = page.locator(".mv-tour-card")
        card.wait_for(state="visible", timeout=STEP_TIMEOUT)
        self.shot("8-tour-step1")
        count = 0
        while count < 20:
            nxt = card.get_by_role("button", name=re.compile(r"^Next"))
            if nxt.count() == 0:
                break
            c.click(nxt, f"Next (tour step {count + 1})")
            count += 1
        c.click(card.get_by_role("button", name="Finish tour"), "Finish tour")
        c.steps.append(f"tour length: {count + 1} cards")

    def s10_verify(self):
        """Look, do not onboard: pages are opened by client-side navigation (a reload would sign the demo out)."""
        c, page = self.c, self.page
        body = lambda: page.evaluate("document.body.innerText")  # noqa: E731

        spa_goto(page, "/")
        page.wait_for_timeout(1000)
        text = body()
        self.check("dashboard: no 'No cloud account connected yet'", "No cloud account connected yet" not in text)
        self.check("dashboard: no 'No SAP system connected yet'", "No SAP system connected yet" not in text)
        self.check("dashboard: checklist gone after 6 of 6", page.locator("section.mv-onboarding").count() == 0, self.progress())
        spend = re.search(r"Current spend\s*\n?\s*\$([\d,]+(?:\.\d+)?)", text)
        self.check("dashboard: current spend is above $0", bool(spend) and float(spend.group(1).replace(",", "")) > 0, spend.group(0).replace("\n", " ") if spend else "not found")
        page.evaluate("window.scrollTo(0, 0)")
        self.shot("9-dashboard-after")

        spa_goto(page, "/cloud/overview")
        page.wait_for_timeout(1300)
        text = body()
        self.check("Cost Overview: shows Total Spend and providers", "Total Spend" in text and "No cloud account connected yet" not in text)
        for prov in ("Azure", "AWS", "Google Cloud|GCP", "BTP"):
            self.check(f"Cost Overview mentions {prov.split(chr(124))[0]}", bool(re.search(prov, text)))
        self.shot("10-cost-overview")

        spa_goto(page, "/alerts")
        page.wait_for_timeout(1000)
        rows = page.locator("main table tbody tr, main [role=row]").count()
        self.check("Alerts: has rows or alert cards", rows > 1 or page.locator("main li, main article").count() > 0, f"{rows} table rows")
        self.shot("11-alerts")

        c.click(page.get_by_role("button", name="Open AI Assistant"), "assistant launcher (verification)")
        c.click(page.locator("[aria-label='Mavera AI Assistant']").get_by_role("button", name="What is our cloud spend this month?"), "chip 'What is our cloud spend this month?'")
        page.wait_for_timeout(1500)
        panel = page.locator("[aria-label='Mavera AI Assistant']").inner_text()
        self.check("assistant: answers the spend question with a dollar figure", bool(re.search(r"\$[\d,]{3,}", panel)))
        self.shot("12-assistant-answer")
        c.click(page.get_by_role("button", name=re.compile("Close AI Assistant")).first, "close assistant (verification)")

    def run(self):
        plan = [
            ("1-azure", "Checklist 'Guide me' -> connect Azure with sample credentials", self.s1_azure),
            ("2-aws", "Assistant 'Help me connect AWS' -> sample credentials -> Connect", self.s2_aws),
            ("3-gcp", "Assistant 'Help me connect Google Cloud'", self.s3_gcp),
            ("4-btp", "Assistant 'Help me connect SAP BTP'", self.s4_btp),
            ("5-sap", "Assistant 'Help me connect SAP'", self.s5_sap),
            ("6-budget", "Create a budget (checklist, suggested limit, Add Budget)", self.s6_budget),
            ("7-recipients", "Add alert recipients (checklist, Add channel)", self.s7_recipients),
            ("8-teammate", "Invite a teammate (checklist, one email, default role)", self.s8_teammate),
            ("9-tour", "Take the tour (checklist, Next to the end)", self.s9_tour),
        ]
        for sid, title, fn in plan:
            res = self.step(sid, title, fn)
            if res.status == "failed":
                # Keep going where the next step does not depend on this one; the dashboard checks tell what is missing.
                pass
        self.step("10-verify", "Verification: dashboard, Cost Overview, Alerts, assistant show data (not part of the total)", self.s10_verify)


def direct_connect_probe(pw, shots: Path) -> dict:
    """The shortest connect from a brand-new dashboard: the checklist's own Connect button (no coach), sample credentials, Connect."""
    browser = pw.chromium.launch()
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    ctx.add_init_script(INIT_JS)
    page = ctx.new_page()
    page.set_default_timeout(STEP_TIMEOUT)
    page.goto(BASE + "/login", wait_until="domcontentloaded", timeout=45000)
    page.get_by_role("region", name="Demo mode").get_by_role("button", name=re.compile("^New organisation")).click()
    page.wait_for_url(lambda url: not url.rstrip("/").endswith("/login"), timeout=15000)
    page.wait_for_timeout(1500)
    if "/setup" in page.url:
        page.get_by_role("button", name="Skip for now").click(timeout=15000)
        page.wait_for_url(lambda url: "/setup" not in url, timeout=15000)
        page.wait_for_timeout(1200)
    page.evaluate("window.__mvAuditReset()")
    c = Ctx(page)
    row = page.locator("section.mv-onboarding").get_by_role("listitem").filter(has_text="Connect a cloud account")
    c.click(row.get_by_role("button", name="Connect", exact=True), "checklist: Connect a cloud account > Connect")
    c.click(page.locator("[data-tour=use-sample-credentials]"), "Use sample credentials")
    c.click(page.locator("[data-tour=connect-submit]"), "Connect")
    page.locator("[data-tour=connect-dialog]").wait_for(state="detached", timeout=10000)
    m = c.read()
    result = {"interactions": interactions_of(m), "clicks": m["clicks"], "ok": "/azure/" in page.url, "url": page.url}
    print(f"  direct connect from the checklist (no coach): {result['interactions']} interactions, landed on {page.url}", flush=True)
    browser.close()
    return result


def run_one(pw, width: int, theme: str, shots: Path) -> dict:
    browser = pw.chromium.launch()
    ctx = browser.new_context(viewport={"width": width, "height": 900 if width >= 768 else 844}, color_scheme=theme, accept_downloads=True)
    ctx.add_init_script(f"try{{localStorage.setItem('mavera.theme','{theme}')}}catch(e){{}}")
    ctx.add_init_script(INIT_JS)
    page = ctx.new_page()
    page.set_default_timeout(STEP_TIMEOUT)
    errors: list[str] = []
    page.on("console", lambda m: errors.append(f"console {m.type}: {m.text[:200]}") if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(f"pageerror: {str(e)[:200]}"))
    page.goto(BASE + "/login", wait_until="domcontentloaded", timeout=45000)
    page.get_by_role("region", name="Demo mode").get_by_role("button", name=re.compile("^New organisation")).click()
    page.wait_for_url(lambda url: not url.rstrip("/").endswith("/login"), timeout=15000)
    page.locator("main").first.wait_for(timeout=15000)
    page.wait_for_timeout(2500)  # the redirect to /setup happens just after the landing page mounts
    setup_note = ""
    if "/setup" in page.url:
        # A new organisation's owner is sent to the guided setup wizard once after the first sign-in. The journey
        # measures the checklist path, so the wizard is left with "Skip for now" (1 click, reported, not counted).
        page.get_by_role("button", name="Skip for now").click(timeout=15000)
        page.wait_for_url(lambda url: "/setup" not in url, timeout=15000)
        page.wait_for_timeout(1200)
        setup_note = "redirected to /setup after sign-in; left with 'Skip for now' (1 click, not counted)"
        print(f"  {setup_note}", flush=True)
    page.evaluate("window.__mvAuditReset()")  # the sign-in click is the demo card, not part of onboarding

    j = Journey(page, width, theme, shots)
    print(f"\n== new-user journey, {theme} {width}px ==", flush=True)
    j.run()
    onboarding = [r for r in j.results if r.id != "10-verify"]
    total = sum(r.interactions for r in onboarding)
    clicks = sum(r.clicks for r in onboarding)
    fields = sum(r.fields for r in onboarding)
    keys = sum(r.keys for r in onboarding)
    typed = sum(r.typed for r in onboarding)
    failed = [r.id for r in j.results if r.status != "ok"] + [c["name"] for c in j.checks if not c["ok"]]
    print(f"  TOTAL onboarding (steps 1-9): {total} interactions = {clicks} clicks + {fields} fields + {keys} keys ({typed} typed characters)"
          f"; console/page errors: {len(errors)}; failures: {len(failed)}", flush=True)
    for e in errors[:8]:
        print("   ", e)
    browser.close()
    return {
        "width": width, "theme": theme, "total": total, "clicks": clicks, "fields": fields, "keys": keys, "typed": typed,
        "steps": [asdict(r) for r in j.results], "checks": j.checks, "errors": errors, "failed": failed, "setup_note": setup_note,
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--widths", nargs="+", type=int, default=[1440, 390])
    ap.add_argument("--themes", nargs="+", default=["light", "dark"], choices=["light", "dark"])
    ap.add_argument("--shots", default=str(ROOT / "tools" / "visual" / "out" / "journey"))
    ap.add_argument("--json", help="write the results to this file")
    args = ap.parse_args()
    shots = Path(args.shots)
    shots.mkdir(parents=True, exist_ok=True)
    runs = []
    with sync_playwright() as pw:
        for theme in args.themes:
            for width in args.widths:
                runs.append(run_one(pw, width, theme, shots))
        print("\n== shortest connect (new organisation, 1440 px) ==", flush=True)
        direct = direct_connect_probe(pw, shots)
    if args.json:
        Path(args.json).write_text(json.dumps({"base": BASE, "runs": runs, "direct_connect": direct}, indent=1), encoding="utf-8")
    print("\nSummary")
    for r in runs:
        print(f"  {r['theme']:5} {r['width']:>4}px  total {r['total']:>3} interactions ({r['clicks']} clicks + {r['fields']} fields + {r['keys']} keys)  failures: {len(r['failed'])} {r['failed'] if r['failed'] else ''}")
    print(f"  checklist Connect + sample credentials + Connect (no coach): {direct['interactions']} interactions")
    return 1 if any(r["failed"] for r in runs) or not direct["ok"] else 0


if __name__ == "__main__":
    sys.exit(main())
