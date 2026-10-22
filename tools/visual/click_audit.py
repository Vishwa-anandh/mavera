#!/usr/bin/env python3
"""Click audit harness for Mavera (Playwright, python, sync API).

Signs in through the Demo mode card (button "Owner" by default), starts every task from the DASHBOARD and
counts what a real user would do: mouse clicks, key presses and typed fields. Counting happens in the page
(trusted `mousedown` / `keydown` events only, so scripted `fill()` or `set_input_files()` cost nothing and
are therefore avoided or added back by hand), persisted in sessionStorage so it survives full page loads.

Metrics per task
  clicks        every real mouse press (including a click that only focuses a text field)
  focus_clicks  clicks that landed on a text field (they are the "focus" half of a field entry)
  selects       clicks that opened a custom <Select> (button[aria-haspopup=listbox]); included in clicks
  typed         printable characters typed
  fields        text fields typed into (a new target for typed characters = one field entry)
  nav_keys      non-printable key presses (Tab, Enter, Escape, arrows, chords such as Ctrl+K; modifiers alone are free)
  interactions  clicks - focus_clicks + fields + nav_keys   (a field entry costs 1, not click + typing)

Usage
  python tools/visual/click_audit.py                       # everything (tasks, pages, tabs, layout)
  python tools/visual/click_audit.py --only connect        # tasks whose id/group contains "connect"
  python tools/visual/click_audit.py --list                # list task ids
  python tools/visual/click_audit.py --skip-layout         # skip the 390/1440 overflow sweep
  python tools/visual/click_audit.py --json out.json --md out.md

Environment: BASE_URL (default http://localhost:5173). Needs `pip install playwright` + `playwright install chromium`.
Each task runs in a fresh browser context (the demo store lives in memory, so a reload signs you out).
The harness never edits the application; it only drives the running dev server.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import tempfile
import time
import traceback
from dataclasses import asdict, dataclass, field
from typing import Callable, Optional

from playwright.sync_api import Page, TimeoutError as PWTimeout, sync_playwright

BASE = os.environ.get("BASE_URL", "http://localhost:5173").rstrip("/")
STORE_KEY = "__mv_click_audit"
STEP_TIMEOUT = 6000

# --------------------------------------------------------------------------------------------------
# In-page counter
# --------------------------------------------------------------------------------------------------
INIT_JS = r"""
(() => {
  const K = '__mv_click_audit';
  const zero = () => ({clicks:0, focus_clicks:0, selects:0, typed:0, fields:0, nav_keys:0});
  let s; try { s = JSON.parse(sessionStorage.getItem(K)) || zero(); } catch (e) { s = zero(); }
  let lastTyped = null;
  const save = () => { try { sessionStorage.setItem(K, JSON.stringify(s)); } catch (e) {} };
  const TEXT = 'input:not([type=checkbox]):not([type=radio]):not([type=file]):not([type=button]):not([type=submit]):not([type=range]):not([type=date]), textarea, [contenteditable=true]';
  const MOD = new Set(['Shift','Control','Alt','Meta','AltGraph','CapsLock']);
  document.addEventListener('mousedown', (e) => {
    if (!e.isTrusted || e.button !== 0) return;
    s.clicks++;
    const t = e.target instanceof Element ? e.target : null;
    if (t && t.closest(TEXT)) s.focus_clicks++;
    if (t && t.closest('[aria-haspopup="listbox"]')) s.selects++;
    lastTyped = null; save();
  }, true);
  document.addEventListener('keydown', (e) => {
    if (!e.isTrusted || e.repeat || MOD.has(e.key)) return;
    const t = e.target instanceof Element ? e.target : null;
    const inText = !!(t && t.closest(TEXT));
    const printable = e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;
    if (printable && inText) {
      s.typed++;
      if (lastTyped !== t) { s.fields++; lastTyped = t; }
    } else { s.nav_keys++; lastTyped = null; }
    save();
  }, true);
  window.__mvAuditReset = () => { s = zero(); lastTyped = null; save(); };
  window.__mvAuditRead = () => ({...s});
})();
"""

# 1x1 PDF (a valid, tiny document) used for the invoice upload tasks.
DUMMY_PDF = b"""%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj
trailer<</Root 1 0 R>>
%%EOF
"""


def dummy_pdf(name: str = "azure-invoice-2026-09.pdf") -> str:
    path = os.path.join(tempfile.gettempdir(), name)
    with open(path, "wb") as fh:
        fh.write(DUMMY_PDF)
    return path


# --------------------------------------------------------------------------------------------------
# Task plumbing
# --------------------------------------------------------------------------------------------------
@dataclass
class Result:
    id: str
    group: str
    title: str
    status: str = "ok"            # ok | failed | manual
    clicks: int = 0
    focus_clicks: int = 0
    selects: int = 0
    typed: int = 0
    fields: int = 0
    nav_keys: int = 0
    interactions: int = 0
    steps: list = field(default_factory=list)
    note: str = ""
    code_count: str = ""          # code-based count when the task could not be automated
    seconds: float = 0.0
    start: str = "Dashboard (/)"


class Ctx:
    """Thin recorder around a page so every task documents its own path."""

    def __init__(self, page: Page):
        self.page = page
        self.steps: list[str] = []

    # counting ------------------------------------------------------------------------------------
    def reset(self):
        self.page.evaluate("window.__mvAuditReset()")
        self.steps = []

    def read(self) -> dict:
        return self.page.evaluate("window.__mvAuditRead()")

    # actions -------------------------------------------------------------------------------------
    def click(self, locator, desc: str, **kw):
        locator.first.click(timeout=STEP_TIMEOUT, **kw)
        self.steps.append(f"click {desc}")
        self.settle()

    def type(self, locator, text: str, desc: str, focus: bool = True):
        """Type like a user: click the field (the focus click), then press keys."""
        if focus:
            locator.first.click(timeout=STEP_TIMEOUT)
        self.page.keyboard.type(text, delay=0)
        self.steps.append(f"type {desc} ({len(text)} chars)")

    def type_here(self, text: str, desc: str):
        """Type into whatever has focus (an auto-focused field): no click."""
        self.page.wait_for_function("(() => { const a = document.activeElement; return !!a && /^(INPUT|TEXTAREA)$/.test(a.tagName); })()", timeout=STEP_TIMEOUT)
        self.page.keyboard.type(text, delay=0)
        self.steps.append(f"type {desc} ({len(text)} chars, field auto-focused)")

    def key(self, key: str, desc: str = ""):
        self.page.keyboard.press(key)
        self.steps.append(f"press {desc or key}")
        self.settle()

    def select(self, label: str, option: str, scope=None):
        """Open a custom <Select> by its visible label and pick an option (2 clicks)."""
        root = scope if scope is not None else self.page
        trigger = root.locator("label.mv-field").filter(has_text=re.compile(r"^\s*" + re.escape(label))).locator("button[aria-haspopup='listbox']")
        self.click(trigger, f"Select {label}")
        self.click(self.page.get_by_role("option", name=option, exact=True), f"option {option}")

    def settle(self, ms: int = 250):
        self.page.wait_for_timeout(ms)

    def see(self, locator, desc: str = "", timeout: int = STEP_TIMEOUT):
        locator.first.wait_for(state="visible", timeout=timeout)
        self.steps.append(f"see {desc}" if desc else "see result")

    def expect_path(self, pattern: str):
        self.page.wait_for_url(re.compile(pattern), timeout=STEP_TIMEOUT)

    def menu(self, group: str, item: str):
        """Header module menu: open the dropdown, click an item (2 clicks)."""
        hdr = self.page.locator("header")
        self.click(hdr.get_by_role("button", name=group, exact=True), f"header menu '{group}'")
        entry = self.page.get_by_role("menuitem", name=re.compile(r"^\s*" + re.escape(item).replace("/", r"\/")))
        self.click(entry, f"menu item '{item}'")
        self.page.wait_for_load_state("domcontentloaded")
        self.page.wait_for_timeout(350)


@dataclass
class Task:
    id: str
    group: str
    title: str
    fn: Callable[[Ctx], None]
    setup: Optional[Callable[[Ctx], None]] = None   # runs before the meter is reset (not counted)
    role: str = "Owner"
    code_count: str = ""
    note: str = ""
    start: str = "Dashboard (/)"


TASKS: list[Task] = []


def task(id: str, group: str, title: str, **kw):
    def deco(fn):
        TASKS.append(Task(id=id, group=group, title=title, fn=fn, **kw))
        return fn
    return deco


def login(page: Page, role: str):
    page.goto(BASE + "/login")
    page.get_by_role("button", name=re.compile(r"^" + re.escape(role))).first.click()
    page.wait_for_url(re.compile(r"/(admin/dashboard)?$"), timeout=10000)
    page.wait_for_timeout(1200)


def new_session(browser, role: str, viewport=(1440, 900)):
    ctx = browser.new_context(viewport={"width": viewport[0], "height": viewport[1]}, accept_downloads=True)
    # The first-run assistant animation is its own measured task; keep it out of every other one.
    ctx.add_init_script("try{localStorage.setItem('mavera.assistant.intro.dev-preview-user','seen');"
                        "localStorage.setItem('mavera.assistant.intro.demo-admin-user','seen')}catch(e){}")
    ctx.add_init_script(INIT_JS)
    page = ctx.new_page()
    page.set_default_timeout(STEP_TIMEOUT)
    login(page, role)
    return ctx, page


def spa_goto(page: Page, path: str):
    """Navigate inside the SPA without a reload (a reload signs the in-memory demo out)."""
    page.evaluate(
        """(p) => { history.pushState({}, '', p); window.dispatchEvent(new PopStateEvent('popstate')); }""",
        path,
    )
    page.wait_for_timeout(500)


SHOT_DIR: Optional[str] = None


def run_task(browser, t: Task) -> Result:
    res = Result(id=t.id, group=t.group, title=t.title, code_count=t.code_count, note=t.note, start=t.start)
    began = time.time()
    ctx = page = None
    c = None
    try:
        ctx, page = new_session(browser, t.role)
        c = Ctx(page)
        if t.setup:
            t.setup(c)
        c.reset()
        t.fn(c)
        m = c.read()
        res.steps = c.steps
        for k in ("clicks", "focus_clicks", "selects", "typed", "fields", "nav_keys"):
            setattr(res, k, m[k])
        res.interactions = m["clicks"] - m["focus_clicks"] + m["fields"] + m["nav_keys"]
    except Exception as exc:  # noqa: BLE001 - a failed task is a finding, not a crash
        res.status = "failed"
        if c is not None:
            res.steps = list(c.steps)
        res.note = (res.note + " | " if res.note else "") + f"{type(exc).__name__}: {str(exc).splitlines()[0][:220]}"
        try:
            if page and SHOT_DIR:
                os.makedirs(SHOT_DIR, exist_ok=True)
                page.screenshot(path=os.path.join(SHOT_DIR, t.id + ".png"))
        except Exception:
            pass
        try:
            if page:
                m = Ctx(page).read()
                for k in ("clicks", "focus_clicks", "selects", "typed", "fields", "nav_keys"):
                    setattr(res, k, m[k])
                res.interactions = m["clicks"] - m["focus_clicks"] + m["fields"] + m["nav_keys"]
        except Exception:
            pass
    finally:
        res.seconds = round(time.time() - began, 1)
        if ctx:
            ctx.close()
    return res


# --------------------------------------------------------------------------------------------------
# Reach every page through the menus
# --------------------------------------------------------------------------------------------------
# (route, id, menu group or None, item label, heading regex expected on arrival)
MENU_PAGES = [
    ("/", "dashboard", None, "Dashboard", r"pulse|good|dashboard"),
    ("/sap/systems", "sap-systems", "SAP Monitoring", "SAP Overview", r"SAP Overview"),
    ("/sap/databases", "sap-databases", "SAP Monitoring", "HANA/DB Monitoring", r"HANA"),
    ("/sap/performance", "sap-performance", "SAP Monitoring", "Performance", r"Performance"),
    ("/sap/jobs", "sap-jobs", "SAP Monitoring", "Jobs & Dumps", r"Jobs"),
    ("/sap/alerts", "sap-alerts", "SAP Monitoring", "Alerts & Escalations", r"Alerts"),
    ("/sap/transport-management", "sap-transport", "SAP Monitoring", "Transport Management", r"Transport"),
    ("/sap/security-notes", "sap-security-notes", "SAP Monitoring", "Security Notes", r"Security Notes"),
    ("/sap/btp-security", "sap-btp-security", "SAP Monitoring", "BTP Security Assessment", r"BTP Security"),
    ("/sap/configuration", "sap-configuration", "SAP Monitoring", "System Configuration", r"System Configuration"),
    ("/cloud/overview", "cloud-overview", "Cloud Cost", "Cost Overview", r"Cost Overview"),
    ("/cloud/analytics", "cloud-analytics", "Cloud Cost", "Cost Analytics", r"Cost Analytics"),
    ("/azure", "azure", "Cloud Cost", "Azure Subscriptions", r"Azure"),
    ("/aws", "aws", "Cloud Cost", "AWS", r"AWS"),
    ("/btp", "btp", "Cloud Cost", "SAP BTP", r"BTP"),
    ("/gcp", "gcp", "Cloud Cost", "Google Cloud", r"GCP|Google"),
    ("/cloud/optimization", "cloud-optimization", "Cloud Cost", "Savings & Optimization", r"Savings"),
    ("/cloud/reservations", "cloud-reservations", "Cloud Cost", "Reserved Instances", r"Reserved"),
    ("/cloud/resources", "cloud-resources", "Cloud Cost", "Resource Inventory", r"Resource Inventory"),
    ("/budgets", "budgets", "Cloud Cost", "Budgets & Alerts", r"Budgets"),
    ("/smart-alerts", "smart-alerts", "Cloud Cost", "Smart Alerts", r"Smart Alerts"),
    ("/billing", "billing", "Cloud Cost", "Billing", r"Billing"),
    ("/users", "users", "Administration", "User Management", r"User Management"),
    ("/audit-trail", "audit-trail", "Administration", "Audit Trail", r"Audit Trail"),
    ("/sync-logs", "sync-logs", "Administration", "Sync Logs", r"Sync"),
]


def make_reach(path, group, item, heading):
    def fn(c: Ctx):
        if group is None:
            # The dashboard is the start page: measure getting back to it from a deep page (1 click on the nav link).
            spa_goto(c.page, "/budgets")
            c.reset()
            c.click(c.page.locator("header").get_by_role("link", name="Dashboard", exact=True), "header link 'Dashboard'")
        else:
            c.menu(group, item)
        c.expect_path("^" + re.escape(BASE + path) + r"/?$")
        c.see(c.page.locator("main h1, main h2").filter(has_text=re.compile(heading, re.I)), f"heading {heading}")
    return fn


for _path, _id, _g, _item, _h in MENU_PAGES:
    TASKS.append(Task(
        id=f"reach.{_id}", group="reach-page", title=f"Reach {_item} ({_path}) via the menus",
        fn=make_reach(_path, _g, _item, _h),
        note="from /budgets" if _g is None else "",
    ))


@task("reach.invoices", "reach-page", "Reach /invoices via the Cloud Cost menu (menu entry exists for invoice-only orgs only)")
def _(c):
    hdr = c.page.locator("header")
    c.click(hdr.get_by_role("button", name="Cloud Cost", exact=True), "header menu 'Cloud Cost'")
    if c.page.get_by_role("menuitem", name=re.compile(r"^\s*Invoices")).count() == 0:
        raise AssertionError("'Invoices' is not in the Cloud Cost menu for the Owner demo account (isHybridOrg false); URL-only, 4 clicks via Cost Overview")
    c.click(c.page.get_by_role("menuitem", name=re.compile(r"^\s*Invoices")), "Invoices")


# Pages that are not in the menu: how many clicks does the nearest path take?
@task("reach.alerts", "reach-page", "Reach /alerts (not in the menu) from the dashboard")
def _(c):
    c.click(c.page.get_by_role("link", name=re.compile(r"All alerts|View all alerts|Manage Alerts")), "dashboard link to /alerts")
    c.expect_path(r"/alerts/?$")


@task("reach.ai-assistant", "reach-page", "Reach /ai-assistant (not in the menus or the dashboard)",
      code_count="Not in any menu; the floating widget is the intended entry, the page is URL-only (Ctrl+K does not index it)")
def _(c):
    c.key("Control+k", "Ctrl+K")
    c.type_here("assistant", "'assistant'")
    try:
        c.see(c.page.get_by_role("option", name=re.compile("AI Assistant", re.I)), "AI Assistant result", timeout=2500)
    except PWTimeout:
        raise AssertionError("Ctrl+K has no 'AI Assistant' page result; /ai-assistant is URL-only")
    # The first result is the palette's "Open assistant" action (opens the widget); the page itself is the second.
    c.key("ArrowDown", "ArrowDown to the 'AI Assistant' page result")
    c.key("Enter")
    c.expect_path(r"/ai-assistant/?$")


@task("reach.account", "reach-page", "Reach /account via the profile menu")
def _(c):
    c.click(c.page.get_by_role("button", name="Profile menu"), "Profile menu")
    c.click(c.page.get_by_role("menuitem", name=re.compile("^Account")), "Account")
    c.expect_path(r"/account/?$")


@task("reach.subscription", "reach-page", "Reach /subscription via the profile menu")
def _(c):
    c.click(c.page.get_by_role("button", name="Profile menu"), "Profile menu")
    c.click(c.page.get_by_role("menuitem", name=re.compile("^Subscription")), "Subscription")
    c.expect_path(r"/subscription/?$")


@task("reach.invoices-via-overview", "reach-page", "Reach /invoices when it is not in the menu (Cost Overview > Invoices summary > Upload more invoices)")
def _(c):
    c.menu("Cloud Cost", "Cost Overview")
    c.click(c.page.get_by_role("button", name="Invoices summary"), "'Invoices summary' toggle")
    c.click(c.page.get_by_role("link", name=re.compile("Upload more invoices|View all invoices|Upload invoices")), "link to Invoices")
    c.expect_path(r"/invoices/?$")


@task("reach.assistant-widget", "reach-page", "Open the floating assistant panel from any page")
def _(c):
    c.click(c.page.get_by_role("button", name="Open AI Assistant"), "assistant launcher")
    c.see(c.page.get_by_role("textbox", name="Ask the AI Assistant"), "composer")


# --------------------------------------------------------------------------------------------------
# Tabs / views reachable by #hash
# --------------------------------------------------------------------------------------------------
TAB_PAGES = [
    # (id, menu group, item, tab label regex, hash, tab list aria label substring)
    ("hana-storage", "SAP Monitoring", "HANA/DB Monitoring", "Services and disk", "#storage"),
    ("hana-backups", "SAP Monitoring", "HANA/DB Monitoring", "Backups", "#backups"),
    ("perf-jobs", "SAP Monitoring", "Performance", "Jobs and processes", "#jobs"),
    ("perf-analytics", "SAP Monitoring", "Performance", "Analytics", "#analytics"),
    ("jobs-dumps", "SAP Monitoring", "Jobs & Dumps", "Dumps", "#dumps"),
    ("sapalerts-settings", "SAP Monitoring", "Alerts & Escalations", "Settings", "#settings"),
    ("sapalerts-recipients", "SAP Monitoring", "Alerts & Escalations", "Recipients", "#recipients"),
    ("budgets-integrations", "Cloud Cost", "Budgets & Alerts", "Alert integrations", "#integrations"),
    ("smart-recipients", "Cloud Cost", "Smart Alerts", "Recipients", "#recipients"),
    ("smart-settings", "Cloud Cost", "Smart Alerts", "Settings", "#settings"),
    ("optimization-opportunities", "Cloud Cost", "Savings & Optimization", "Opportunities", "#opportunities"),
    ("users-roles", "Administration", "User Management", "Roles", "#roles"),
    ("users-permissions", "Administration", "User Management", "Permissions", "#permissions"),
]


def make_tab(group, item, tab, hash_):
    def fn(c: Ctx):
        c.menu(group, item)
        c.click(c.page.get_by_role("tab", name=re.compile(re.escape(tab), re.I)), f"tab '{tab}'")
        c.page.wait_for_function(f"location.hash === '{hash_}'", timeout=STEP_TIMEOUT)
    return fn


for _id, _g, _item, _tab, _hash in TAB_PAGES:
    TASKS.append(Task(id=f"tab.{_id}", group="reach-tab", title=f"Reach tab '{_tab}' on {_item} ({_hash})", fn=make_tab(_g, _item, _tab, _hash)))


@task("tab.subscription-plans", "reach-tab", "Reach tab 'Available plans' on /subscription (#plans)")
def _(c):
    c.click(c.page.get_by_role("button", name="Profile menu"), "Profile menu")
    c.click(c.page.get_by_role("menuitem", name=re.compile("^Subscription")), "Subscription")
    c.click(c.page.get_by_role("tab", name=re.compile("Available plans")), "tab 'Available plans'")
    c.page.wait_for_function("location.hash === '#plans'")


for _tab, _hash in (("Security", "#security"), ("Appearance", "#appearance"), ("Help", "#help")):
    def _mk(tab=_tab, hash_=_hash):
        def fn(c: Ctx):
            c.click(c.page.get_by_role("button", name="Profile menu"), "Profile menu")
            c.click(c.page.get_by_role("menuitem", name=re.compile("^Account")), "Account")
            c.click(c.page.get_by_role("tab", name=re.compile(tab)), f"tab '{tab}'")
            c.page.wait_for_function(f"location.hash === '{hash_}'")
        return fn
    TASKS.append(Task(id=f"tab.account-{_tab.lower()}", group="reach-tab", title=f"Reach tab '{_tab}' on /account ({_hash})", fn=_mk()))


# --------------------------------------------------------------------------------------------------
# Provider account detail + Executive / Operations / Technical views
# --------------------------------------------------------------------------------------------------
def open_account(c: Ctx, group_item: str, row_name: str, url_re: str):
    c.menu("Cloud Cost", group_item)
    c.click(c.page.get_by_role("button", name=re.compile(re.escape(row_name))), f"account row '{row_name}'")
    c.expect_path(url_re)


@task("account.azure", "account-detail", "Open an Azure account detail (/azure/:id)")
def _(c):
    open_account(c, "Azure Subscriptions", "Production Environment", r"/azure/az-acc-1/?$")
    c.see(c.page.locator("nav[aria-label='Cost view']"), "Cost view switcher")


@task("account.aws", "account-detail", "Open an AWS account detail (/aws/account/:id)")
def _(c):
    open_account(c, "AWS", "Production AWS", r"/aws/account/aws-acc-1/?$")
    c.see(c.page.locator("nav[aria-label='Cost view']"), "Cost view switcher")


@task("account.gcp", "account-detail", "Open a GCP project detail (/gcp/account/:id)")
def _(c):
    c.menu("Cloud Cost", "Google Cloud")
    c.click(c.page.locator("button.mv-account-row").first, "first project row")
    c.expect_path(r"/gcp/account/")
    c.see(c.page.locator("nav[aria-label='Cost view']"), "Cost view switcher")


@task("account.btp", "account-detail", "Open a BTP account detail (/btp/account/:id)")
def _(c):
    c.menu("Cloud Cost", "SAP BTP")
    c.click(c.page.locator("button.mv-account-row, .mv-account-row-body").first, "first BTP account row")
    c.expect_path(r"/btp/account/")
    c.see(c.page.locator("nav[aria-label='Cost view']"), "Cost view switcher")


def view_task(provider: str, group_item: str, row: str, view: str):
    def fn(c: Ctx):
        if provider == "azure":
            open_account(c, group_item, row, r"/azure/az-acc-1/?$")
        elif provider == "aws":
            open_account(c, group_item, row, r"/aws/account/aws-acc-1/?$")
        elif provider == "gcp":
            c.menu("Cloud Cost", group_item)
            c.click(c.page.locator("button.mv-account-row").first, "first project row")
        else:
            c.menu("Cloud Cost", group_item)
            c.click(c.page.locator("button.mv-account-row, .mv-account-row-body").first, "first BTP account row")
        c.click(c.page.locator("nav[aria-label='Cost view'] button", has_text=view), f"view '{view}'")
        c.see(c.page.locator(f"nav[aria-label='Cost view'] button[aria-current='page']", has_text=view), f"view '{view}' active")
    return fn


for _prov, _item, _row in (("azure", "Azure Subscriptions", "Production Environment"), ("aws", "AWS", "Production AWS"),
                           ("gcp", "Google Cloud", ""), ("btp", "SAP BTP", "")):
    for _view in ("Operations", "Technical"):
        TASKS.append(Task(id=f"view.{_prov}-{_view.lower()}", group="account-view", title=f"{_prov.upper()} account: switch to the {_view} view",
                          fn=view_task(_prov, _item, _row, _view)))


@task("view.btp-hierarchy", "account-view", "BTP account: switch to the Hierarchy view")
def _(c):
    view_task("btp", "SAP BTP", "", "Hierarchy")(c)


# --------------------------------------------------------------------------------------------------
# Cost
# --------------------------------------------------------------------------------------------------
@task("cost.period", "cost", "Cost Overview: change the spend period (6M to 3M)")
def _(c):
    c.menu("Cloud Cost", "Cost Overview")
    grp = c.page.get_by_role("group", name="Spend trend period")
    c.click(grp.get_by_role("button", name="Last 3 months"), "period 3M")
    c.see(grp.get_by_role("button", name="Last 3 months", pressed=True), "3M pressed")


@task("cost.export", "cost", "Cost Analytics: export a report (CSV)")
def _(c):
    c.menu("Cloud Cost", "Cost Analytics")
    with c.page.expect_download(timeout=STEP_TIMEOUT) as dl:
        c.click(c.page.get_by_role("button", name="Export report"), "Export report")
    assert dl.value.suggested_filename.endswith(".csv")


@task("cost.save-view", "cost", "Cost Analytics: save the current view")
def _(c):
    c.menu("Cloud Cost", "Cost Analytics")
    c.click(c.page.get_by_role("button", name="Save view"), "Save view")
    c.see(c.page.locator(".mv-toast").filter(has_text=re.compile("Saved view")), "toast")


@task("cost.connect-from-overview", "connect", "Cost Overview: 'Connect cloud account' wizard (Azure sample values)",
      note="This page's wizard has no provider picker and posts to the real API (no demo onSave); expect failure at Save in demo mode.")
def _(c):
    c.menu("Cloud Cost", "Cost Overview")
    c.click(c.page.get_by_role("button", name="Connect cloud account"), "Connect cloud account")
    fill_azure_wizard(c, "Overview Sub")


@task("optimization.act", "cost", "Savings & Optimization: open a recommendation and start review")
def _(c):
    c.menu("Cloud Cost", "Savings & Optimization")
    c.click(c.page.get_by_role("tab", name=re.compile("Opportunities")), "tab Opportunities")
    c.click(c.page.locator("table button.mv-link-button").first, "first opportunity title")
    # The floating assistant launcher sits on top of the drawer's right-hand primary button; click its visible left edge.
    c.click(c.page.get_by_role("button", name=re.compile("Start review|In review")), "Start review (launcher overlaps the button)", position={"x": 6, "y": 6})
    c.see(c.page.locator(".mv-toast").filter(has_text=re.compile("review", re.I)), "toast")


# --------------------------------------------------------------------------------------------------
# Budgets and alerts
# --------------------------------------------------------------------------------------------------
@task("budget.create", "governance", "Create a budget (name, amount, defaults for the rest)")
def _(c):
    c.menu("Cloud Cost", "Budgets & Alerts")
    form = c.page.locator("section[aria-label~='Create']").first
    c.type(c.page.get_by_label("Budget Name"), "Audit Q4", "Budget Name")
    c.type(c.page.get_by_label("Target Amount ($)"), "5000", "Target Amount")
    c.click(c.page.get_by_role("button", name="Add Budget"), "Add Budget")
    c.see(c.page.locator(".mv-toast").filter(has_text=re.compile("Budget created")), "toast 'Budget created'")


@task("budget.channel", "governance", "Add a notification channel (email)")
def _(c):
    c.menu("Cloud Cost", "Budgets & Alerts")
    c.click(c.page.get_by_role("tab", name=re.compile("Alert integrations")), "tab 'Alert integrations'")
    c.click(c.page.get_by_role("button", name=re.compile(r"Add (your first )?channel")), "Add channel")
    dlg = c.page.get_by_role("dialog", name="Add notification channel")
    c.type(dlg.get_by_label("Recipients"), "ops@maitsys.com", "Recipients")
    c.click(dlg.get_by_role("button", name="Add channel"), "Add channel (submit)")
    c.see(c.page.locator(".mv-toast").filter(has_text=re.compile("channel added", re.I)), "toast")


@task("alert.resolve", "alerts", "Smart Alerts: resolve a cloud alert from the list")
def _(c):
    c.menu("Cloud Cost", "Smart Alerts")
    c.click(c.page.get_by_role("button", name=re.compile(r"^Resolve ")), "Resolve (first row)")
    c.see(c.page.locator(".mv-toast").filter(has_text=re.compile("resolved", re.I)), "toast")


@task("alert.ignore", "alerts", "Smart Alerts: ignore an alert")
def _(c):
    c.menu("Cloud Cost", "Smart Alerts")
    c.click(c.page.get_by_role("button", name=re.compile(r"^Ignore ")), "Ignore (first row)")
    c.see(c.page.locator(".mv-toast").filter(has_text=re.compile("ignored", re.I)), "toast")


@task("alert.detail", "alerts", "Smart Alerts: open an alert's detail")
def _(c):
    c.menu("Cloud Cost", "Smart Alerts")
    c.click(c.page.get_by_role("button", name=re.compile(r"^View details")), "alert type link")
    c.see(c.page.get_by_role("dialog"), "detail drawer")


@task("alert.from-dashboard", "alerts", "Dashboard 'Needs attention': get to the alert that needs action and resolve it")
def _(c):
    c.click(c.page.locator("ul[aria-label='Items that need attention'] a[href='/smart-alerts']"), "Needs-attention row for the cost alerts")
    c.settle(600)
    c.click(c.page.get_by_role("button", name=re.compile(r"^Resolve ")), "Resolve (first row of the destination page)")


@task("alert.mark-all-read", "alerts", "Bell: mark all notifications read")
def _(c):
    c.click(c.page.get_by_role("button", name=re.compile(r"^Notifications")), "bell")
    c.click(c.page.get_by_role("button", name="Mark all as read"), "Mark all as read")
    c.see(c.page.get_by_role("button", name="Mark all as read", disabled=True), "button disabled (0 unread)")


@task("alert.sap-resolve", "alerts", "SAP Alerts: resolve an alert from the list")
def _(c):
    c.menu("SAP Monitoring", "Alerts & Escalations")
    c.click(c.page.get_by_role("button", name=re.compile(r"^Resolve ")), "Resolve (first row)")
    c.see(c.page.locator(".mv-toast").filter(has_text=re.compile("resolved", re.I)), "toast")


@task("alert.smart-recipient", "alerts", "Smart Alerts: add an alert recipient")
def _(c):
    c.menu("Cloud Cost", "Smart Alerts")
    c.click(c.page.get_by_role("tab", name="Recipients"), "tab Recipients")
    c.type(c.page.get_by_label("Email address").first, "new.recipient@maitsys.com", "Email address")
    c.click(c.page.get_by_role("button", name="Add", exact=True).first, "Add")
    c.see(c.page.locator(".mv-toast"), "toast")


# --------------------------------------------------------------------------------------------------
# Invoices
# --------------------------------------------------------------------------------------------------
def to_invoices(c: Ctx):
    """/invoices has no menu entry for any demo account; the shortest in-app path goes through Cost Overview."""
    c.menu("Cloud Cost", "Cost Overview")
    c.click(c.page.get_by_role("button", name="Invoices summary"), "'Invoices summary' toggle")
    c.click(c.page.get_by_role("link", name=re.compile("Upload more invoices|View all invoices|Upload invoices")), "link to Invoices")
    c.expect_path(r"/invoices/?$")


def upload_invoice_flow(c: Ctx):
    c.click(c.page.get_by_role("button", name="Upload Invoice").first, "Upload Invoice (header)")
    dlg = c.page.get_by_role("dialog", name=re.compile("Upload invoice", re.I))
    with c.page.expect_file_chooser(timeout=STEP_TIMEOUT) as fc:
        dlg.locator("input[type=file]").click(force=True)
    c.steps.append("click file input -> OS file picker")
    fc.value.set_files(dummy_pdf())
    c.settle(400)
    c.click(dlg.get_by_role("button", name="Upload Invoice"), "Upload Invoice (submit)")
    c.see(c.page.locator(".mv-toast").filter(has_text=re.compile("uploaded", re.I)), "toast 'uploaded'", timeout=9000)
    c.see(c.page.get_by_text(re.compile("Total Amount")), "analysis panel")


@task("invoice.upload", "invoices", "Upload an invoice (small dummy PDF) and see the analysis",
      note="Starts at /invoices (reached via Cost Overview; 3 extra clicks counted separately in reach.invoices-via-overview).",
      start="/invoices")
def _(c):
    to_invoices(c)
    c.reset()
    upload_invoice_flow(c)


@task("invoice.delete", "invoices", "Delete an invoice (select, trash, confirm)", start="/invoices")
def _(c):
    to_invoices(c)
    c.reset()
    c.click(c.page.locator("button[aria-pressed]").filter(has_text=re.compile(r"\$|INV|\.pdf|20\d\d", re.I)).first, "first invoice card")
    c.click(c.page.get_by_role("button", name="Delete invoice").first, "trash icon")
    c.click(c.page.get_by_role("alertdialog").get_by_role("button", name="Delete invoice"), "confirm Delete invoice")
    c.see(c.page.locator(".mv-toast").filter(has_text=re.compile("deleted", re.I)), "toast")


@task("invoice.pay", "invoices", "Billing: pay the newest Sent invoice")
def _(c):
    c.menu("Cloud Cost", "Billing")
    # The first invoice is auto-selected but is already Paid in the seed; the Sent one needs a click first.
    c.click(c.page.locator("button").filter(has_text=re.compile("Sent")).first, "the Sent invoice")
    c.click(c.page.get_by_role("button", name="Pay Now"), "Pay Now")


# --------------------------------------------------------------------------------------------------
# SAP
# --------------------------------------------------------------------------------------------------
@task("sap.notes-upload", "sap", "Security Notes: upload note numbers by typing (3 notes)")
def _(c):
    c.menu("SAP Monitoring", "Security Notes")
    c.click(c.page.get_by_role("button", name="Upload", exact=True), "Upload")
    dlg = c.page.get_by_role("dialog", name=re.compile("Upload security notes", re.I))
    c.type_here("3800001, 3800002, 3800003", "3 note numbers")
    c.click(dlg.get_by_role("button", name="Upload", exact=True), "Upload (submit)")
    c.see(c.page.locator(".mv-toast").filter(has_text=re.compile("added as Unknown", re.I)), "toast")


@task("sap.notes-upload-check", "sap", "Security Notes: upload 3 numbers AND resolve their status (Upload + Check Status)")
def _(c):
    c.menu("SAP Monitoring", "Security Notes")
    c.click(c.page.get_by_role("button", name="Upload", exact=True), "Upload")
    dlg = c.page.get_by_role("dialog", name=re.compile("Upload security notes", re.I))
    c.type_here("3800001, 3800002, 3800003", "3 note numbers")
    c.click(dlg.get_by_role("button", name="Upload", exact=True), "Upload (submit)")
    c.see(c.page.locator(".mv-toast").filter(has_text=re.compile("added as Unknown", re.I)), "toast")
    c.click(c.page.get_by_role("button", name=re.compile("^Check Status")), "Check Status")
    c.see(c.page.locator(".mv-toast").filter(has_text=re.compile(r"Checked \d+ note", re.I)), "toast 'Checked N notes'", timeout=9000)


@task("sap.notes-check", "sap", "Security Notes: run Check Status on the existing notes")
def _(c):
    c.menu("SAP Monitoring", "Security Notes")
    c.click(c.page.get_by_role("button", name=re.compile("^Check Status")), "Check Status")
    c.see(c.page.locator(".mv-toast").filter(has_text=re.compile(r"Checked \d+ note|No notes are waiting", re.I)), "toast", timeout=9000)


@task("sap.notes-delete", "sap", "Security Notes: delete a note (trash + confirm)")
def _(c):
    c.menu("SAP Monitoring", "Security Notes")
    c.click(c.page.get_by_role("button", name=re.compile(r"^Delete note")), "trash on first row")
    c.click(c.page.get_by_role("alertdialog").get_by_role("button", name="Delete note"), "confirm Delete note")
    c.see(c.page.locator(".mv-toast").filter(has_text=re.compile("deleted", re.I)), "toast")


def fill_destination(c: Ctx, name: str):
    dlg = c.page.get_by_role("dialog")
    c.type_here(name, "Environment Name")
    c.type(dlg.get_by_label("SID"), "PRD", "SID")
    c.type(dlg.get_by_label("Gateway URL"), "https://dev.maitsys.com", "Gateway URL")
    c.click(dlg.get_by_role("button", name="Add Destination"), "Add Destination (submit)")
    c.see(c.page.locator(".mv-toast").filter(has_text=re.compile("added", re.I)), "toast 'added'")


@task("sap.destination", "connect", "SAP: add a destination / system via System Configuration (name, SID, URL)")
def _(c):
    c.menu("SAP Monitoring", "System Configuration")
    c.click(c.page.get_by_role("button", name="Add Destination").first, "Add Destination")
    fill_destination(c, "Prod S4 Audit")


@task("sap.destination-from-quickaccess", "connect", "SAP: add a system starting from Dashboard Quick Access 'Add SAP System'",
      note="The link lands on /sap/systems, which has no add flow; the user must then go to System Configuration through the menu.")
def _(c):
    c.click(c.page.get_by_role("link", name=re.compile("Add SAP System")), "Quick Access 'Add SAP System'")
    c.settle(600)
    # What a user lands on: no add control. Take the menu path from here.
    c.menu("SAP Monitoring", "System Configuration")
    c.click(c.page.get_by_role("button", name="Add Destination").first, "Add Destination")
    fill_destination(c, "Prod S4 Audit")


@task("sap.jobs-filter", "sap", "Jobs & Dumps: filter by status (Running) and search")
def _(c):
    c.menu("SAP Monitoring", "Jobs & Dumps")
    c.click(c.page.get_by_role("button", name=re.compile(r"^Finished")), "chip Finished")
    c.type(c.page.get_by_label("Search jobs"), "SAP", "Search jobs")
    c.see(c.page.locator("table tbody tr").first, "rows")


@task("sap.hana-backup", "sap", "HANA: open backup details (Backups tab, select a marker)")
def _(c):
    c.menu("SAP Monitoring", "HANA/DB Monitoring")
    c.click(c.page.get_by_role("tab", name=re.compile("Backups")), "tab Backups")
    c.click(c.page.get_by_role("button", name=re.compile("View data")).first, "View data (keyboard-reachable detail path)")
    c.see(c.page.get_by_role("dialog"), "backup table dialog")
    c.note = "Detail also appears on marker hover (mouse only, markers are aria-hidden/tabindex -1)"


@task("sap.transport-import", "sap", "Transport: import all released requests")
def _(c):
    c.menu("SAP Monitoring", "Transport Management")
    c.click(c.page.get_by_label("Select all released requests"), "select all released")
    c.click(c.page.get_by_role("button", name=re.compile("^Import Selected")), "Import Selected")
    c.see(c.page.locator(".mv-toast").filter(has_text=re.compile("imported", re.I)), "toast")


@task("sap.overview-critical", "sap", "SAP Overview: open the critical system (HANA-PRD) for detail",
      code_count="Not possible: system rows are not clickable and there is no drill-in (0 ways, dead end)", note="No drill-in exists")
def _(c):
    c.menu("SAP Monitoring", "SAP Overview")
    row = c.page.get_by_role("row", name=re.compile("HANA-PRD"))
    c.click(row, "HANA-PRD row")
    c.expect_path(r"/sap/")  # stays on the page: asserts below fail if nothing opens
    c.see(c.page.get_by_role("dialog"), "a detail view")


@task("cost.resources-open", "cost", "Resource Inventory: open a resource's detail")
def _(c):
    c.menu("Cloud Cost", "Resource Inventory")
    c.click(c.page.locator("table button.mv-link-button").first, "first resource name")
    c.see(c.page.get_by_role("dialog"), "detail drawer")


@task("cost.resources-filter", "cost", "Resource Inventory: show only untagged resources (Tags filter)")
def _(c):
    c.menu("Cloud Cost", "Resource Inventory")
    c.click(c.page.locator("label.mv-field").filter(has_text="Tags").locator("button[aria-haspopup='listbox']"), "Select Tags")
    c.click(c.page.get_by_role("option").filter(has_text=re.compile("untagged", re.I)).first, "option 'Untagged'")


@task("cost.reservations-select", "cost", "Reserved Instances: pick a reservation to chart")
def _(c):
    c.menu("Cloud Cost", "Reserved Instances")
    c.click(c.page.locator("table button.mv-link-button").nth(1), "second reservation name")


# --------------------------------------------------------------------------------------------------
# Users / roles / audit
# --------------------------------------------------------------------------------------------------
@task("users.add", "users", "Add a user with a role (Analyst) and no extra access")
def _(c):
    c.menu("Administration", "User Management")
    c.click(c.page.get_by_role("button", name="Add user").first, "Add user")
    dlg = c.page.get_by_role("dialog", name="Add user")
    c.type_here("Audit Person", "Full name")
    c.type(dlg.get_by_label("Work email"), "audit.person@maitsys.com", "Work email")
    c.select("Role", "Analyst", scope=dlg)
    c.click(dlg.get_by_role("button", name="Add user", exact=True), "Add user (submit)")
    c.see(c.page.locator(".mv-toast").filter(has_text=re.compile("was added", re.I)), "toast")


@task("users.add-default-role", "users", "Add a user keeping the default role (Viewer): name + email + Enter")
def _(c):
    c.menu("Administration", "User Management")
    c.click(c.page.get_by_role("button", name="Add user").first, "Add user")
    c.type_here("Audit Person", "Full name")
    c.key("Tab", "Tab")
    c.type_here("audit.person@maitsys.com", "Work email")
    c.key("Enter", "Enter (submit)")
    c.see(c.page.locator(".mv-toast").filter(has_text=re.compile("was added", re.I)), "toast")


@task("users.change-role", "users", "Change a member's role (row Select)")
def _(c):
    c.menu("Administration", "User Management")
    sel = c.page.get_by_role("button", name=re.compile(r"^Role for ")).and_(c.page.locator(":not([disabled])")).first
    c.click(sel, "role Select in a row")
    c.click(c.page.get_by_role("option", name="Analyst", exact=True), "option Analyst")
    c.see(c.page.locator(".mv-toast").filter(has_text=re.compile("is now", re.I)), "toast")


def add_role(c: Ctx, name="Audit role"):
    c.click(c.page.get_by_role("tab", name=re.compile("Roles")), "tab Roles")
    c.click(c.page.get_by_role("button", name="Add role"), "Add role")
    c.type_here(name, "Role name")
    c.key("Enter", "Enter (submit)")
    c.see(c.page.locator(".mv-toast").filter(has_text=re.compile("was added", re.I)), "toast")


@task("users.add-role", "users", "Add a custom role (name only)")
def _(c):
    c.menu("Administration", "User Management")
    add_role(c)


@task("users.duplicate-role", "users", "Duplicate a role (row action)")
def _(c):
    c.menu("Administration", "User Management")
    c.click(c.page.get_by_role("tab", name=re.compile("Roles")), "tab Roles")
    c.click(c.page.get_by_role("button", name=re.compile("^Duplicate role ")), "Duplicate (first role)")
    c.see(c.page.locator(".mv-toast").filter(has_text=re.compile("duplicated", re.I)), "toast")


@task("users.edit-permissions", "users", "Edit a custom role's permissions: grant 'All' on one module and save",
      note="Setup (creating the custom role) is not counted; path starts at the dashboard and ends with Save changes.")
def _(c):
    c.menu("Administration", "User Management")
    add_role(c)        # lands on #permissions with the new role selected
    c.page.wait_for_function("location.hash === '#permissions'", timeout=STEP_TIMEOUT)
    # counted path from the dashboard: menu(2) + (role already selected after add) module + All + Save
    c.click(c.page.get_by_role("button", name=re.compile(r"^Grant all actions on")), "All on the first module")
    c.click(c.page.get_by_role("button", name="Save changes"), "Save changes")
    c.see(c.page.locator(".mv-toast").filter(has_text=re.compile("Permissions saved", re.I)), "toast")


@task("users.edit-permissions-existing", "users", "Edit permissions of an EXISTING custom role (tab, role Select, area/module, All, Save)")
def _(c):
    # setup (uncounted): create the role, then return to the dashboard
    c.menu("Administration", "User Management")
    add_role(c, "Existing custom")
    spa_goto(c.page, "/")
    c.page.wait_for_timeout(500)
    c.reset()
    c.menu("Administration", "User Management")
    c.click(c.page.get_by_role("tab", name="Permissions"), "tab Permissions")
    c.select("Role", "Existing custom (custom)")
    c.click(c.page.get_by_role("button", name=re.compile(r"^Grant all actions on")), "All on the first module")
    c.click(c.page.get_by_role("button", name="Save changes"), "Save changes")
    c.see(c.page.locator(".mv-toast").filter(has_text=re.compile("Permissions saved", re.I)), "toast")


@task("audit.open", "users", "Audit Trail: open an event")
def _(c):
    c.menu("Administration", "Audit Trail")
    c.click(c.page.get_by_role("button", name=re.compile(r"^View details")), "first event action")
    c.see(c.page.get_by_role("dialog"), "event drawer")


@task("synclogs.filter", "users", "Sync Logs: filter by status (Failed)")
def _(c):
    c.menu("Administration", "Sync Logs")
    c.click(c.page.get_by_role("button", name="Failed", exact=True), "status Failed")


@task("subscription.request-plan", "users", "Subscription: request a plan")
def _(c):
    c.click(c.page.get_by_role("button", name="Profile menu"), "Profile menu")
    c.click(c.page.get_by_role("menuitem", name=re.compile("^Subscription")), "Subscription")
    c.click(c.page.get_by_role("tab", name=re.compile("Available plans")), "tab Available plans")
    c.click(c.page.get_by_role("button", name=re.compile(r"^Choose plan")).first, "Choose plan")
    c.click(c.page.get_by_role("button", name="Send request"), "Send request")
    c.see(c.page.locator(".mv-toast"), "toast")


@task("account.theme", "users", "Account: switch to dark theme")
def _(c):
    c.click(c.page.get_by_role("button", name="Profile menu"), "Profile menu")
    c.click(c.page.get_by_role("menuitemcheckbox", name=re.compile("Dark")), "Dark appearance")


@task("auth.logout", "users", "Log out (profile menu, Log out, confirm)")
def _(c):
    c.click(c.page.get_by_role("button", name="Profile menu"), "Profile menu")
    c.click(c.page.get_by_role("menuitem", name="Log out"), "Log out")
    c.click(c.page.get_by_role("alertdialog").get_by_role("button", name="Log out"), "confirm Log out")
    c.expect_path(r"/login")


# --------------------------------------------------------------------------------------------------
# Connect flows (the owner's priority)
# --------------------------------------------------------------------------------------------------
AZ = dict(sub="11111111-2222-3333-4444-555555555555", tenant="aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", client="99999999-8888-7777-6666-555555555555")


def fill_azure_wizard(c: Ctx, name: str):
    dlg = c.page.get_by_role("dialog", name=re.compile("Connect Azure", re.I))
    c.type(dlg.get_by_label("Account name"), name, "Account name")
    c.type(dlg.get_by_label("Subscription ID"), AZ["sub"], "Subscription ID")
    c.type(dlg.get_by_label("Tenant ID"), AZ["tenant"], "Tenant ID")
    c.type(dlg.get_by_label("Client ID"), AZ["client"], "Client ID")
    c.type(dlg.get_by_label("Client secret"), "s3cr3t-value", "Client secret")
    c.click(dlg.get_by_role("button", name="Next"), "Next")
    c.click(dlg.get_by_role("button", name="Validate details"), "Validate details")
    c.click(dlg.get_by_role("button", name="Save account"), "Save account")
    c.see(dlg.get_by_text("Account connected"), "'Account connected'", timeout=9000)
    c.click(dlg.get_by_role("button", name="Done"), "Done")


@task("connect.azure", "connect", "Connect Azure (wizard): menu, Manage Accounts, Connect Account, 5 fields, Next, Validate, Save, Done")
def _(c):
    c.menu("Cloud Cost", "Azure Subscriptions")
    c.click(c.page.get_by_role("button", name="Manage Accounts"), "Manage Accounts")
    c.click(c.page.get_by_role("button", name="Connect Account"), "Connect Account")
    fill_azure_wizard(c, "Audit Azure")
    c.see(c.page.get_by_text("Audit Azure").first, "new account row")


@task("connect.azure-open", "connect", "Connect Azure then OPEN the new account", note="Known defect: the new Azure account cannot be opened (cost page only knows the fixtures).")
def _(c):
    c.menu("Cloud Cost", "Azure Subscriptions")
    c.click(c.page.get_by_role("button", name="Manage Accounts"), "Manage Accounts")
    c.click(c.page.get_by_role("button", name="Connect Account"), "Connect Account")
    fill_azure_wizard(c, "Audit Azure")
    c.click(c.page.get_by_role("button", name=re.compile("Audit Azure")), "open the new account")
    c.see(c.page.locator("nav[aria-label='Cost view']"), "cost view of the new account (fails: 'Account not found')", timeout=3000)


@task("connect.aws", "connect", "Connect AWS (wizard): menu, Manage Accounts, Connect Account, 3 fields, Next, Validate, Save, Done")
def _(c):
    c.menu("Cloud Cost", "AWS")
    c.click(c.page.get_by_role("button", name="Manage Accounts"), "Manage Accounts")
    c.click(c.page.get_by_role("button", name="Connect Account"), "Connect Account")
    dlg = c.page.get_by_role("dialog", name=re.compile("Connect AWS", re.I))
    c.type(dlg.get_by_label("Account name"), "Audit AWS", "Account name")
    c.type(dlg.get_by_label("Access key ID"), "AKIAIOSFODNN7EXAMPLE", "Access key ID")
    c.type(dlg.get_by_label("Secret access key"), "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY", "Secret access key")
    c.click(dlg.get_by_role("button", name="Next"), "Next")
    c.click(dlg.get_by_role("button", name="Validate details"), "Validate details")
    c.click(dlg.get_by_role("button", name="Save account"), "Save account")
    c.see(dlg.get_by_text("Account connected"), "'Account connected'", timeout=9000)
    c.click(dlg.get_by_role("button", name="Done"), "Done")
    c.see(c.page.get_by_text("Audit AWS").first, "new account row")


@task("connect.gcp", "connect", "Connect GCP (inline form): menu, Manage, 3 fields, Connect Project")
def _(c):
    c.menu("Cloud Cost", "Google Cloud")
    c.click(c.page.get_by_role("button", name="Manage", exact=True), "Manage")
    c.type(c.page.get_by_label("Display Name"), "Audit GCP", "Display Name")
    c.type(c.page.get_by_label("Project ID"), "audit-gcp-123456", "Project ID")
    c.type(c.page.get_by_label("Service Account JSON Key"), '{"client_email":"a@b.iam.gserviceaccount.com","private_key":"x"}', "Service Account JSON")
    c.click(c.page.get_by_role("button", name="Connect Project"), "Connect Project")
    c.see(c.page.get_by_text("GCP account added successfully"), "success notice")


@task("connect.btp", "connect", "Connect BTP (inline form): menu, Add Account, 5 fields, Connect Account")
def _(c):
    c.menu("Cloud Cost", "SAP BTP")
    c.click(c.page.get_by_role("button", name="Add Account"), "Add Account")
    c.type(c.page.get_by_label("Account Name"), "Audit BTP", "Account Name")
    c.type(c.page.get_by_label("Client ID", exact=True), "sb-audit", "Client ID")
    c.type(c.page.get_by_label("Client Secret", exact=True), "s", "Client Secret")
    c.type(c.page.get_by_label("Token URL", exact=True), "https://mavera.authentication.eu10.hana.ondemand.com", "Token URL")
    c.type(c.page.get_by_label("Reporting API Base URL"), "https://reporting.cf.eu10.hana.ondemand.com", "Reporting API Base URL")
    c.click(c.page.get_by_role("button", name="Connect Account"), "Connect Account")
    c.see(c.page.get_by_text("Audit BTP").first, "new account row (no success message exists)")


# --------------------------------------------------------------------------------------------------
# Assistant, tour, Ctrl+K
# --------------------------------------------------------------------------------------------------
@task("assistant.ask-chip", "assistant", "Ask the assistant a question via a suggestion chip")
def _(c):
    c.click(c.page.get_by_role("button", name="Open AI Assistant"), "assistant launcher")
    c.click(c.page.get_by_role("button", name="System health"), "suggestion chip 'System health'")
    c.see(c.page.locator("[aria-label='Mavera AI Assistant']").get_by_text(re.compile("health|system", re.I)).nth(1), "answer")


@task("assistant.ask-typed", "assistant", "Ask the assistant a typed question")
def _(c):
    c.click(c.page.get_by_role("button", name="Open AI Assistant"), "assistant launcher")
    box = c.page.locator("[aria-label='Mavera AI Assistant']").get_by_role("textbox", name="Ask the AI Assistant")
    c.type(box, "What is our cloud spend this month?", "question")
    c.key("Enter", "Enter (send)")
    c.see(c.page.locator("[aria-label='Mavera AI Assistant']").get_by_text(re.compile(r"\$|spend", re.I)).nth(1), "answer")


@task("assistant.tour", "assistant", "Start a guided tour of the page (first-time user: chip in the launcher panel)")
def _(c):
    c.click(c.page.get_by_role("button", name="Open AI Assistant"), "assistant launcher")
    c.click(c.page.locator("button.mv-chip--primary").first, "page chip ('Show me around the dashboard')")
    c.see(c.page.get_by_role("dialog").filter(has_text=re.compile("Step 1 of")), "tour card")


@task("assistant.tour-returning", "assistant", "Start a guided tour when the 'New here?' prompt is gone (launcher, Tour, pick)")
def _(c):
    c.click(c.page.get_by_role("button", name="Open AI Assistant"), "assistant launcher")
    c.click(c.page.get_by_role("button", name="Tour", exact=True), "Tour")
    picker = c.page.locator("[aria-label='Mavera AI Assistant']").get_by_role("button", name=re.compile("overview", re.I)).first
    c.click(picker, "pick '<Page> overview'")
    c.see(c.page.get_by_role("dialog").filter(has_text=re.compile("Step 1 of")), "tour card")


@task("search.ctrlk", "assistant", "Ctrl+K to reach a page (type 'budg', Enter)")
def _(c):
    c.key("Control+k", "Ctrl+K")
    c.type_here("budg", "'budg'")
    c.key("Enter")
    c.expect_path(r"/budgets/?$")


@task("search.ctrlk-action", "assistant", "Ctrl+K: run an ACTION ('connect azure') rather than open a page")
def _(c):
    c.key("Control+k", "Ctrl+K")
    c.type_here("connect azure", "'connect azure'")
    c.see(c.page.get_by_role("option").first, "first result")
    c.key("Enter")
    c.see(c.page.get_by_role("dialog", name=re.compile("Connect Azure|Connect", re.I)), "connect dialog (fails if Ctrl+K is page-only)", timeout=3000)


# --------------------------------------------------------------------------------------------------
# Command palette actions (Ctrl+K "Run" results). Absent at the pinned baseline commit: those tasks fail there and
# the failure is the finding; against a tree that has the palette they measure the shortened path.
# --------------------------------------------------------------------------------------------------
def palette(c: Ctx, query: str, expect_option: str):
    c.key("Control+k", "Ctrl+K")
    c.type_here(query, f"'{query}'")
    try:
        c.see(c.page.get_by_role("option", name=re.compile(expect_option, re.I)), f"palette result '{expect_option}'", timeout=2500)
    except PWTimeout:
        raise AssertionError(f"Ctrl+K has no action '{expect_option}' (page search only)")
    c.key("Enter", "Enter (run)")
    c.settle(700)


@task("palette.connect-azure", "palette", "Palette: Connect Azure (Ctrl+K, type, Enter, then the wizard)")
def _(c):
    palette(c, "connect azure", "Connect Azure")
    fill_azure_wizard(c, "Audit Azure")


@task("palette.connect-aws", "palette", "Palette: Connect AWS (Ctrl+K, type, Enter, then the wizard)")
def _(c):
    palette(c, "connect aws", "Connect AWS")
    dlg = c.page.get_by_role("dialog", name=re.compile("Connect AWS", re.I))
    c.type(dlg.get_by_label("Account name"), "Audit AWS", "Account name")
    c.type(dlg.get_by_label("Access key ID"), "AKIAIOSFODNN7EXAMPLE", "Access key ID")
    c.type(dlg.get_by_label("Secret access key"), "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY", "Secret access key")
    c.click(dlg.get_by_role("button", name="Next"), "Next")
    c.click(dlg.get_by_role("button", name="Validate details"), "Validate details")
    c.click(dlg.get_by_role("button", name="Save account"), "Save account")
    c.see(dlg.get_by_text("Account connected"), "'Account connected'", timeout=9000)
    c.click(dlg.get_by_role("button", name="Done"), "Done")


@task("palette.connect-gcp", "palette", "Palette: Connect Google Cloud project (inline form, first field focused)")
def _(c):
    palette(c, "connect google", "Connect Google Cloud")
    c.type_here("Audit GCP", "Display Name")
    c.type(c.page.get_by_label("Project ID"), "audit-gcp-123456", "Project ID")
    c.type(c.page.get_by_label("Service Account JSON Key"), '{"client_email":"a@b.iam.gserviceaccount.com","private_key":"x"}', "Service Account JSON")
    c.click(c.page.get_by_role("button", name="Connect Project"), "Connect Project")
    c.see(c.page.get_by_text("GCP account added successfully"), "success notice")


@task("palette.connect-btp", "palette", "Palette: Connect SAP BTP account (inline form, first field focused)")
def _(c):
    palette(c, "connect sap btp", "Connect SAP BTP")
    c.type_here("Audit BTP", "Account Name")
    c.type(c.page.get_by_label("Client ID", exact=True), "sb-audit", "Client ID")
    c.type(c.page.get_by_label("Client Secret", exact=True), "s", "Client Secret")
    c.type(c.page.get_by_label("Token URL", exact=True), "https://mavera.authentication.eu10.hana.ondemand.com", "Token URL")
    c.type(c.page.get_by_label("Reporting API Base URL"), "https://reporting.cf.eu10.hana.ondemand.com", "Reporting API Base URL")
    c.click(c.page.get_by_role("button", name="Connect Account"), "Connect Account")
    c.see(c.page.get_by_text("Audit BTP").first, "new account row")


@task("palette.connect-sap", "palette", "Palette: Connect SAP system (destination dialog opens, Environment Name focused)")
def _(c):
    palette(c, "connect sap system", "Connect SAP system")
    fill_destination(c, "Prod S4 Audit")


@task("palette.add-budget", "palette", "Palette: Add budget (opens Budgets with Budget Name focused)")
def _(c):
    palette(c, "add budget", "Add budget")
    c.type_here("Audit Q4", "Budget Name")
    c.type(c.page.get_by_label("Target Amount ($)"), "5000", "Target Amount")
    c.click(c.page.get_by_role("button", name="Add Budget"), "Add Budget")
    c.see(c.page.locator(".mv-toast").filter(has_text=re.compile("Budget created")), "toast 'Budget created'")


@task("palette.upload-invoice", "palette", "Palette: Upload invoice (opens the upload dialog on /invoices)")
def _(c):
    palette(c, "upload invoice", "Upload invoice")
    dlg = c.page.get_by_role("dialog", name=re.compile("Upload invoice", re.I))
    with c.page.expect_file_chooser(timeout=STEP_TIMEOUT) as fc:
        dlg.locator("input[type=file]").click(force=True)
    c.steps.append("click file input -> OS file picker")
    fc.value.set_files(dummy_pdf())
    c.settle(400)
    c.click(dlg.get_by_role("button", name="Upload Invoice"), "Upload Invoice (submit)")
    c.see(c.page.locator(".mv-toast").filter(has_text=re.compile("uploaded", re.I)), "toast 'uploaded'", timeout=9000)


@task("palette.add-user", "palette", "Palette: Add user (opens the dialog, Full name focused; default role)")
def _(c):
    palette(c, "add user", "Add user")
    c.type_here("Audit Person", "Full name")
    c.key("Tab", "Tab")
    c.type_here("audit.person@maitsys.com", "Work email")
    c.key("Enter", "Enter (submit)")
    c.see(c.page.locator(".mv-toast").filter(has_text=re.compile("was added", re.I)), "toast")


@task("palette.upload-notes", "palette", "Palette: Upload security notes (dialog opens with the textarea focused)")
def _(c):
    palette(c, "upload security notes", "Upload security notes")
    dlg = c.page.get_by_role("dialog", name=re.compile("Upload security notes", re.I))
    c.type_here("3800001, 3800002, 3800003", "3 note numbers")
    c.click(dlg.get_by_role("button", name="Upload", exact=True), "Upload (submit)")
    c.see(c.page.locator(".mv-toast").filter(has_text=re.compile("added as Unknown", re.I)), "toast")


# --------------------------------------------------------------------------------------------------
# Super admin and public pages (own sign-in role / unauthenticated)
# --------------------------------------------------------------------------------------------------
def sa_task(id, title, fn, note=""):
    TASKS.append(Task(id=id, group="super-admin", title=title, fn=fn, role="Super Admin", note=note, start="Admin dashboard (/admin/dashboard)"))


def _sa_nav(label, url_re):
    def fn(c):
        c.click(c.page.get_by_role("link", name=label, exact=True).first, f"nav '{label}'")
        c.expect_path(url_re)
    return fn


sa_task("sa.organizations", "Admin: reach Organizations", _sa_nav("Organizations", r"/admin/organizations/?$"))
sa_task("sa.billing", "Admin: reach Billing", _sa_nav("Billing", r"/admin/billing/?$"))


def _sa_new_org(c):
    c.click(c.page.get_by_role("link", name="Organizations", exact=True).first, "nav Organizations")
    c.click(c.page.get_by_role("link", name="New organization"), "New organization")
    c.expect_path(r"/admin/organizations/new")


def _sa_create_org(c):
    _sa_new_org(c)
    c.type_here("Audit Industries", "Organization name")
    c.click(c.page.get_by_label("Cloud Cost"), "module Cloud Cost")
    c.click(c.page.get_by_label("Microsoft Azure"), "provider Azure")
    c.click(c.page.get_by_role("button", name="Create organization"), "Create organization")
    c.expect_path(r"/admin/organizations/?$")


sa_task("sa.new-org", "Admin: open the new-organization form", _sa_new_org)
sa_task("sa.create-org", "Admin: create an organization (name, 1 module, 1 provider)", _sa_create_org)


def _sa_manage_org(c):
    c.click(c.page.get_by_role("link", name="Organizations", exact=True).first, "nav Organizations")
    c.click(c.page.get_by_role("link", name=re.compile("^Manage")).first, "Manage (first org)")
    c.expect_path(r"/admin/organizations/.+")


sa_task("sa.manage-org", "Admin: open an organization's settings", _sa_manage_org)


def _sa_new_invoice(c):
    c.click(c.page.get_by_role("link", name="New Invoice").or_(c.page.get_by_role("button", name="New Invoice")).first, "New Invoice (dashboard)")
    c.expect_path(r"/admin/billing/generate")


sa_task("sa.new-invoice", "Admin: open the invoice generator from the dashboard", _sa_new_invoice)


def _sa_send_invoice(c):
    _sa_new_invoice(c)
    c.click(c.page.get_by_role("button", name="Add Row"), "Add Row")
    c.type(c.page.get_by_placeholder("Item description"), "Cloud Cost Monitoring", "Item description")
    c.type(c.page.locator("input[type=number]").nth(1), "1200", "Unit price")
    c.click(c.page.get_by_role("button", name="Send Invoice").first, "Send Invoice")
    c.click(c.page.get_by_role("dialog").get_by_role("button", name="Send Invoice"), "confirm Send Invoice")
    c.see(c.page.get_by_role("dialog").filter(has_text="Invoice Sent"), "sent dialog", timeout=9000)
    c.click(c.page.get_by_role("button", name="Done"), "Done")


sa_task("sa.send-invoice", "Admin: create and send an invoice (1 line)", _sa_send_invoice)
sa_task("sa.customers", "Admin: reach Customers (Billing, Manage Customers)",
        lambda c: (c.click(c.page.get_by_role("link", name="Billing", exact=True).first, "nav Billing"),
                   c.click(c.page.get_by_role("link", name="Manage Customers").or_(c.page.get_by_role("button", name="Manage Customers")).first, "Manage Customers"),
                   c.expect_path(r"/admin/billing/customers")))


def pub_task(id, title, fn, note=""):
    TASKS.append(Task(id=id, group="public", title=title, fn=fn, role="__public__", note=note, start="/login"))


# --------------------------------------------------------------------------------------------------
# Layout sweep: overflow at 1440 and 390, keyboard path, deep links
# --------------------------------------------------------------------------------------------------
LAYOUT_ROUTES = [r[0] for r in MENU_PAGES if r[0] != "/"] + ["/", "/alerts", "/ai-assistant", "/account", "/subscription", "/invoices",
                    "/azure/az-acc-1", "/aws/accounts", "/aws/account/aws-acc-1", "/gcp/accounts", "/gcp/account/gcp-acc-1",
                    "/btp/accounts", "/btp/account/btp-acc-1"]

OVERFLOW_JS = r"""
() => {
  const de = document.documentElement;
  const se = document.scrollingElement || de;
  const pageOverflow = se.scrollWidth - window.innerWidth;     // > 0 means the page itself scrolls sideways
  const clipped = (el) => { for (let a = el.parentElement; a && a.tagName !== 'MAIN'; a = a.parentElement) { const o = getComputedStyle(a).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden') return true; } return false; };
  const inner = [];
  for (const el of document.querySelectorAll('main *')) {
    const cs = getComputedStyle(el);
    if ((cs.overflowX === 'auto' || cs.overflowX === 'scroll') && el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0)
      inner.push((el.className && String(el.className).split(' ')[0]) || el.tagName);
    else if ((cs.overflowY === 'auto' || cs.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 1 && el.clientHeight > 0 && el.tagName !== 'MAIN')
      inner.push('y:' + ((el.className && String(el.className).split(' ')[0]) || el.tagName));
  }
  const wide = [];
  const vw = de.clientWidth;
  for (const el of document.querySelectorAll('main *')) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.right > vw + 1 && !clipped(el) && !el.closest('[class*="mv-toast"]') && !el.closest('.mv-sr-only')) wide.push((el.className && String(el.className).split(' ')[0]) || el.tagName);
    if (wide.length > 5) break;
  }
  return {pageOverflow, inner: [...new Set(inner)].slice(0, 6), wide: [...new Set(wide)].slice(0, 6), title: (document.querySelector('main h1')||{}).textContent || ''};
}
"""

TABS_TO_PRESS_JS = r"""
() => { const a = document.activeElement; return !!(a && a.closest('main')); }
"""


def layout_sweep(browser) -> list[dict]:
    out = []
    for width, height in ((1440, 900), (390, 844)):
        ctx, page = new_session(browser, "Owner", (width, height))
        for route in LAYOUT_ROUTES:
            row = {"route": route, "width": width}
            try:
                spa_goto(page, route)
                page.wait_for_timeout(1100)
                data = page.evaluate(OVERFLOW_JS)
                row.update(data)
                # skeletons can still be showing; wait once more if the heading is missing
                if not data["title"]:
                    page.wait_for_timeout(900)
                    row.update(page.evaluate(OVERFLOW_JS))
            except Exception as exc:  # noqa: BLE001
                row["error"] = str(exc).splitlines()[0][:150]
            out.append(row)
        ctx.close()
    return out


PUBLIC_ROUTES = ["/login", "/register", "/company-signup", "/forgot-password", "/reset-password?token=demo", "/subscription-expired",
                 "/invoice-demo", "/invoice/not-a-token", "/no-such-page"]
ADMIN_ROUTES = ["/admin/dashboard", "/admin/organizations", "/admin/organizations/new", "/admin/billing", "/admin/billing/generate",
                "/admin/billing/customers"]


def extra_layout_sweep(browser) -> list[dict]:
    """Public pages (no sign-in) and the super-admin portal at 1440 and 390."""
    out = []
    for width, height in ((1440, 900), (390, 844)):
        ctx = browser.new_context(viewport={"width": width, "height": height})
        page = ctx.new_page()
        for route in PUBLIC_ROUTES:
            row = {"route": route.split("?")[0], "width": width}
            try:
                page.goto(BASE + route)
                page.wait_for_timeout(1000)
                row.update(page.evaluate(OVERFLOW_JS.replace("'main h1'", "'h1, h2'").replace("document.querySelectorAll('main *')", "document.querySelectorAll('body *')")))
            except Exception as exc:  # noqa: BLE001
                row["error"] = str(exc).splitlines()[0][:150]
            out.append(row)
        ctx.close()
        ctx, page = new_session(browser, "Super Admin", (width, height))
        for route in ADMIN_ROUTES:
            row = {"route": route, "width": width}
            try:
                spa_goto(page, route)
                page.wait_for_timeout(1100)
                row.update(page.evaluate(OVERFLOW_JS.replace("'main h1'", "'h1, h2'").replace("document.querySelectorAll('main *')", "document.querySelectorAll('body *')")))
            except Exception as exc:  # noqa: BLE001
                row["error"] = str(exc).splitlines()[0][:150]
            out.append(row)
        ctx.close()
    return out


def reset_focus_start(page: Page):
    """Put the sequential-focus starting point at the very top of the document (like a fresh page load)."""
    page.evaluate("""() => { window.scrollTo(0, 0); const b = document.body; b.setAttribute('tabindex', '-1'); b.focus(); b.removeAttribute('tabindex'); }""")


def keyboard_sweep(browser) -> list[dict]:
    """Tab presses from the top of the page until focus is inside <main>."""
    out = []
    ctx, page = new_session(browser, "Owner")
    for route in LAYOUT_ROUTES:
        row = {"route": route}
        try:
            spa_goto(page, route)
            page.wait_for_timeout(1000)
            reset_focus_start(page)
            n = 0
            while n < 60:
                page.keyboard.press("Tab")
                n += 1
                if page.evaluate(TABS_TO_PRESS_JS):
                    break
            row["tabs_to_main"] = n if n < 60 else None
            # With the skip link: Tab (focus the link) + Enter (activate) should land focus in <main>.
            reset_focus_start(page)
            page.keyboard.press("Tab")
            first = page.evaluate("(document.activeElement.innerText || '').trim()")
            page.keyboard.press("Enter")
            page.wait_for_timeout(150)
            row["skip_link"] = first or page.evaluate("document.activeElement.getAttribute('aria-label') || document.activeElement.className")
            row["skip_link_lands_in_main"] = page.evaluate("!!(document.activeElement && (document.activeElement.closest('main') || document.activeElement.id === 'main-content' || document.activeElement.tagName === 'MAIN'))"
                                                            " || location.hash.length > 1")
        except Exception as exc:  # noqa: BLE001
            row["error"] = str(exc).splitlines()[0][:150]
        out.append(row)
    ctx.close()
    return out


DEEP_LINKS = [
    ("/sap/databases#backups", "Backups"), ("/sap/databases#storage", "Services and disk"), ("/sap/performance#analytics", "Analytics"),
    ("/sap/jobs#dumps", "Dumps"), ("/sap/alerts#recipients", "Recipients"), ("/budgets#integrations", "Alert integrations"),
    ("/smart-alerts#settings", "Settings"), ("/cloud/optimization#opportunities", "Opportunities"), ("/users#permissions", "Permissions"),
    ("/subscription#plans", "Available plans"), ("/account#security", "Security"),
    ("/sap/jobs?status=Running", None), ("/azure/az-acc-1", None), ("/aws/account/aws-acc-1", None), ("/gcp/account/gcp-acc-1", None),
    ("/btp/account/btp-acc-1", None),
]


def deep_link_sweep(browser) -> list[dict]:
    out = []
    ctx, page = new_session(browser, "Owner")
    for url, tab in DEEP_LINKS:
        row = {"url": url, "ok": False}
        try:
            spa_goto(page, url)
            page.wait_for_timeout(1000)
            if tab:
                sel = page.get_by_role("tab", name=re.compile(re.escape(tab), re.I), selected=True)
                row["ok"] = sel.count() > 0
            elif "status=Running" in url:
                row["ok"] = page.get_by_role("button", name=re.compile(r"^Running")).first.get_attribute("aria-pressed") == "true"
            else:
                row["ok"] = page.locator("nav[aria-label='Cost view']").count() > 0
        except Exception as exc:  # noqa: BLE001
            row["error"] = str(exc).splitlines()[0][:150]
        out.append(row)
    ctx.close()
    return out


# --------------------------------------------------------------------------------------------------
# Public pages (unauthenticated): reach from /login and quick structure checks
# --------------------------------------------------------------------------------------------------
def public_sweep(browser) -> list[dict]:
    out = []

    def one(title, start, steps_fn):
        ctx = browser.new_context(viewport={"width": 1440, "height": 900})
        ctx.add_init_script(INIT_JS)
        page = ctx.new_page()
        page.set_default_timeout(STEP_TIMEOUT)
        row = {"title": title, "start": start}
        try:
            page.goto(BASE + start)
            page.wait_for_timeout(900)
            page.evaluate("window.__mvAuditReset()")
            c = Ctx(page)
            steps_fn(c)
            m = c.read()
            row.update(clicks=m["clicks"], nav_keys=m["nav_keys"], fields=m["fields"], typed=m["typed"], focus_clicks=m["focus_clicks"],
                       interactions=m["clicks"] - m["focus_clicks"] + m["fields"] + m["nav_keys"], steps=c.steps, status="ok")
        except Exception as exc:  # noqa: BLE001
            row.update(status="failed", note=str(exc).splitlines()[0][:200])
        ctx.close()
        out.append(row)

    one("Reach /company-signup from /login ('Register company')", "/login",
        lambda c: (c.click(c.page.get_by_role("link", name=re.compile("Register company")).first, "Register company"), c.expect_path(r"/company-signup")))
    one("Reach /invoice-demo from /login ('Try the invoice parser')", "/login",
        lambda c: (c.click(c.page.get_by_role("link", name=re.compile("invoice parser", re.I)), "Try the invoice parser"), c.expect_path(r"/invoice-demo")))

    def forgot(c):
        c.type_here("someone@maitsys.com", "Work email")
        c.key("Enter", "Enter (Continue)")
        c.click(c.page.get_by_role("link", name=re.compile("Forgot password", re.I)), "Forgot password?")
        c.expect_path(r"/forgot-password")
    one("Reach /forgot-password from /login", "/login", forgot)

    def register(c):
        c.click(c.page.get_by_role("link", name=re.compile("Register company")).first, "Register company")
        c.expect_path(r"/company-signup")
        links = c.page.get_by_role("link", name=re.compile(r"^(Register|Create account|Sign up)", re.I))
        c.steps.append(f"links to /register on /company-signup: {links.count()}")
        if links.count() == 0:
            raise AssertionError("no link to /register from /login or /company-signup")
        c.click(links, "link to /register")
        c.expect_path(r"/register")
    one("Reach /register from /login", "/login", register)

    def invoice_demo(c):
        c.click(c.page.get_by_role("link", name=re.compile("invoice parser", re.I)), "Try the invoice parser")
        with c.page.expect_file_chooser(timeout=STEP_TIMEOUT) as fc:
            c.page.locator("input[type=file]").click(force=True)
        c.steps.append("click file input -> OS file picker")
        fc.value.set_files(dummy_pdf("azure-demo-invoice.pdf"))
        c.click(c.page.get_by_role("button", name="Parse invoice"), "Parse invoice")
        c.see(c.page.get_by_role("button", name="Try another invoice"), "result", timeout=9000)
    one("Public invoice parser: parse an invoice from /login", "/login", invoice_demo)

    def company_signup(c):
        c.click(c.page.get_by_role("link", name=re.compile("Register company")).first, "Register company")
        c.click(c.page.get_by_role("button", name=re.compile(r"^Use", re.I)).first, "Use sample token")
        c.click(c.page.get_by_role("button", name="Validate license"), "Validate license")
        c.see(c.page.get_by_text(re.compile("License verified", re.I)), "license verified")
    one("Company signup: first two steps with the sample token", "/login", company_signup)
    return out


# --------------------------------------------------------------------------------------------------
# Reporting
# --------------------------------------------------------------------------------------------------
def fmt_row(r: Result) -> str:
    keys = f"{r.typed} typed / {r.nav_keys} keys"
    return f"| {r.id} | {r.title} | {r.status} | {r.clicks} | {r.selects} | {keys} | {r.fields} | **{r.interactions}** |"


def to_markdown(results: list[Result], extra: dict) -> str:
    lines = ["| Task id | Task | Status | Clicks | Selects opened | Keystrokes | Fields typed | Interactions |", "|---|---|---|---|---|---|---|---|"]
    lines += [fmt_row(r) for r in results]
    return "\n".join(lines)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--only", help="substring of task id or group to run")
    ap.add_argument("--list", action="store_true")
    ap.add_argument("--skip-layout", action="store_true", help="skip the overflow/keyboard/deep-link/public sweeps")
    ap.add_argument("--layout-only", action="store_true")
    ap.add_argument("--keyboard-only", action="store_true", help="only the Tab-stops / skip-link sweep")
    ap.add_argument("--extra-layout", action="store_true", help="only the public-page and super-admin 1440/390 sweep")
    ap.add_argument("--json", help="write full results to this file")
    ap.add_argument("--md", help="write the task table (markdown) to this file")
    ap.add_argument("--headed", action="store_true")
    ap.add_argument("--shots", help="directory for a screenshot of every failed task")
    args = ap.parse_args()
    global SHOT_DIR
    SHOT_DIR = args.shots

    if args.list:
        for t in TASKS:
            print(f"{t.id:36} {t.group:14} {t.title}")
        return 0

    selected = [t for t in TASKS if not args.only or args.only in t.id or args.only in t.group]
    results: list[Result] = []
    extra: dict = {}
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=not args.headed)
        if args.keyboard_only:
            extra["keyboard"] = keyboard_sweep(browser)
            print(json.dumps(extra["keyboard"])[:1500])
        if args.extra_layout:
            extra["layout_extra"] = extra_layout_sweep(browser)
            print(json.dumps(extra["layout_extra"])[:3000])
        if not args.layout_only and not args.extra_layout and not args.keyboard_only:
            for t in selected:
                if t.role == "__public__":
                    continue
                r = run_task(browser, t)
                results.append(r)
                flag = "OK " if r.status == "ok" else "ERR"
                print(f"[{flag}] {r.id:36} clicks={r.clicks:<3} sel={r.selects:<2} typed={r.typed:<3} keys={r.nav_keys:<2} fields={r.fields:<2} interactions={r.interactions:<3} {r.note[:90]}", flush=True)
        if not args.skip_layout and not args.only and not args.extra_layout and not args.keyboard_only:
            print("-- layout sweep (1440 / 390) --", flush=True)
            extra["layout"] = layout_sweep(browser)
            extra["layout_extra"] = extra_layout_sweep(browser)
            print("-- keyboard sweep --", flush=True)
            extra["keyboard"] = keyboard_sweep(browser)
            print("-- deep links --", flush=True)
            extra["deep_links"] = deep_link_sweep(browser)
            print("-- public pages --", flush=True)
            extra["public"] = public_sweep(browser)
            for k in ("layout", "keyboard", "deep_links", "public"):
                print(k, json.dumps(extra[k])[:2000])
        browser.close()

    if args.json:
        with open(args.json, "w", encoding="utf-8") as fh:
            json.dump({"base": BASE, "results": [asdict(r) for r in results], **extra}, fh, indent=1)
    if args.md:
        with open(args.md, "w", encoding="utf-8") as fh:
            fh.write(to_markdown(results, extra))
    failed = [r for r in results if r.status != "ok"]
    print(f"\n{len(results)} tasks, {len(failed)} failed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
