# Mavera click audit

Phase 1 of the onboarding and click-reduction plan. Measured 2026-10-22 with `tools/visual/click_audit.py`.

| | |
|---|---|
| Baseline measured | git commit `9a087dc` (HEAD), archived with `git archive` and served on :5175 so the numbers stay reproducible |
| Live working tree | http://localhost:5173 at the same time, 114 files modified by concurrent work (command palette actions, provider account stores, assistant widget); where a live number differs it is shown as `baseline / now live` |
| Browser | Chromium headless 1440 x 900 (390 x 844 for the responsive sweep), signed in through the Demo mode card (button Owner) |
| Harness | `python tools/visual/click_audit.py` (see section 9), one fresh browser context per task, every task starts on the Dashboard |

**What is counted.** An in-page listener counts only trusted events, so scripted `fill()` costs nothing and a real user cannot be under-counted:

- **Clicks**: mouse presses. A click that only focuses a text field is the first half of typing into it, so it is not added a second time.
- **Fields**: text fields typed into (one entry = focus + typing, counted once). **Keys**: non-printable key presses (Tab, Enter, Escape, arrows, chords such as Ctrl+K).
- **Interactions** = clicks (excluding field-focus clicks) + fields + keys. This is the number the checklist compares with the 3-interaction target. Typed characters are listed separately because they cannot be removed by layout alone.
- An opened `Select` costs 2 interactions (open + option). File pickers cost the click that opens them; picking the file in the OS dialog is not counted.

## 1. Connect flows (the owner's priority)

Each row starts on the Dashboard and ends with the account saved, using format-valid sample values (Azure UUIDs and a secret, `AKIA` + 16 characters and a 40-character secret, a service-account JSON, BTP URLs). Success is asserted in the page (confirmation text or the new row).

| Flow | Interactions | Breakdown | Typed chars | Clicks that are pure overhead | Success feedback | Defects found while measuring |
|---|---|---|---|---|---|---|
| Connect Azure | **13** | 8 clicks + 5 fields (menu 2, Manage Accounts, Connect Account, Next, Validate details, Save account, Done) | 131 | 4 (Manage Accounts, Validate details screen, Done, and the Next/Save split) | wizard step 'Account connected' | At baseline the new account cannot be opened (measured: the cost page only knows fixture accounts, 'Account not found'); the live tree opens it. The overview never lists it and the account is lost when the manager unmounts (code) |
| Connect AWS | **11** | 8 clicks + 3 fields (same four-step wizard, 3 fields) | 69 | 4 | wizard step 'Account connected' | Region is hard-coded to us-east-1 (not asked); overview row shows a dash for spend |
| Connect GCP | **7** | 4 clicks + 3 fields (menu 2, Manage, 3 fields, Connect Project; inline form, no wizard) | 89 | 1 (Manage) | inline notice for 4 seconds (not a toast) | Different UX from Azure/AWS; the pasted JSON is validated then discarded; 'Project ID' retyped although the JSON already contains it |
| Connect BTP | **9** | 4 clicks + 5 fields (menu 2, Add Account, 5 fields, Connect Account; inline form) | 113 | 1 | none (form clears, row appears) | Region saved as `reporting` (first host label of the URL) instead of `eu10`; 5 required fields, none with an example for Client ID/Secret |
| Add SAP destination (menu path) | **7** | 4 clicks + 3 fields (menu 2, Add Destination, 3 fields, submit) | 39 | 0 | toast 'added, ready to connect' | No test-connection step: 'Ready To Connect' is a label, the password is collected and thrown away, the destination switcher never lists the new system |
| Add SAP system from Dashboard Quick Access | **8 / now 5** | the Quick Access 'Add SAP System' link opens SAP Overview, which has no add control, so the user must start again from the menu | 39 | 2 (wrong landing + re-navigation) | same toast | At baseline the link points at `/sap/systems` instead of `/sap/configuration`; the live tree sends it to System Configuration |
| Cost Overview 'Connect cloud account' | **11 (did not complete) / now 12** | menu 2, Connect cloud account, 5 Azure fields, Next, Validate, Save | 132 | 3 | fails in demo mode | This page mounts the wizard without the demo `onSave`, so Save posts to a real API and errors; no provider picker (Azure only) |

What a 'new organisation' user faces today: five different connect UIs (wizard, two inline forms, destination dialog, Cost Overview wizard), none reachable from the Dashboard, none with a 'use sample values' path, and the two wizard providers spend 4 clicks on screens that carry no input.

## 2. Headlines

- Every menu page is 2 clicks from the Dashboard (measured for 31 destinations); account detail pages are 3, a tab is 3, a non-default view is 4.
- Three signed-in pages are not in the menu for any demo account: `/invoices` (4 clicks via Cost Overview > Invoices summary > link), `/alerts` (1 click from a Dashboard link, never from the menus) and `/ai-assistant` (Ctrl+K, type, arrow, Enter = 4; the widget is the intended entry).
- The expensive tasks are the connect flows (7 to 13 interactions), add user with a role (8), editing permissions of an existing custom role (7) and security-notes upload plus status check (6).
- Several pages are dead ends for the primary job: SAP Overview (no drill-in from a critical system), BTP Security (empty tables, dead Refresh, no data path), `/alerts` (static three-row table with no actions), Reserved Instances (read-only).
- Every page puts 9 header controls (logo, Dashboard, 3 menus, search, bell, help, profile) before the content. A 'Skip to content' link exists and works, so the keyboard cost is 2 keys, but nothing tells a sighted keyboard user.
- The command palette (built in the working tree, not at the baseline commit) shortens the connect launch from 4 clicks to 3 interactions and removes the hidden-page detour for invoice upload (7 to 5), but does not touch the form overhead inside the Azure and AWS wizards (section 6).
- No page keeps its state in the URL except hash tabs: spend period, Executive/Operations/Technical, alert filters and connect progress reset on every visit.

## 3. Measured tasks

Interactions from the Dashboard. 'Breakdown' is clicks + fields + keys. Where the working tree already differs from the baseline, the live number follows `/ now`.

| Task | Group | Interactions | Breakdown | Typed chars | Status | Note |
|---|---|---|---|---|---|---|
| Open an Azure account detail (/azure/:id) | account-detail | **3** | 3 clicks | 0 | ok |  |
| Open an AWS account detail (/aws/account/:id) | account-detail | **3** | 3 clicks | 0 | ok |  |
| Open a GCP project detail (/gcp/account/:id) | account-detail | **3** | 3 clicks | 0 | ok |  |
| Open a BTP account detail (/btp/account/:id) | account-detail | **3** | 3 clicks | 0 | ok |  |
| AZURE account: switch to the Operations view | account-view | **4** | 4 clicks | 0 | ok |  |
| AZURE account: switch to the Technical view | account-view | **4** | 4 clicks | 0 | ok |  |
| AWS account: switch to the Operations view | account-view | **4** | 4 clicks | 0 | ok |  |
| AWS account: switch to the Technical view | account-view | **4** | 4 clicks | 0 | ok |  |
| GCP account: switch to the Operations view | account-view | **4** | 4 clicks | 0 | ok |  |
| GCP account: switch to the Technical view | account-view | **4** | 4 clicks | 0 | ok |  |
| BTP account: switch to the Operations view | account-view | **4** | 4 clicks | 0 | ok |  |
| BTP account: switch to the Technical view | account-view | **4** | 4 clicks | 0 | ok |  |
| BTP account: switch to the Hierarchy view | account-view | **4** | 4 clicks | 0 | ok |  |
| Cost Overview: change the spend period (6M to 3M) | cost | **3** | 3 clicks | 0 | ok |  |
| Cost Analytics: export a report (CSV) | cost | **3** | 3 clicks | 0 | ok |  |
| Cost Analytics: save the current view | cost | **3** | 3 clicks | 0 | ok |  |
| Cost Overview: 'Connect cloud account' wizard (Azure sample values) | connect | **11 (did not complete) / now 12** | 6 clicks + 5 fields | 132 | failed | This page's wizard has no provider picker and posts to the real API (no demo onSave); expect failure at Save in demo mode. / TimeoutError: Locator.wait_for: Timeout 9000m |
| Savings & Optimization: open a recommendation and start review | cost | **5** | 5 clicks | 0 | ok |  |
| Create a budget (name, amount, defaults for the rest) | governance | **5** | 3 clicks + 2 fields | 12 | ok |  |
| Add a notification channel (email) | governance | **6** | 5 clicks + 1 field | 15 | ok |  |
| Smart Alerts: resolve a cloud alert from the list | alerts | **3** | 3 clicks | 0 | ok |  |
| Smart Alerts: ignore an alert | alerts | **3** | 3 clicks | 0 | ok |  |
| Smart Alerts: open an alert's detail | alerts | **3** | 3 clicks | 0 | ok |  |
| Dashboard 'Needs attention': get to the alert that needs action and resolve it | alerts | **2** | 2 clicks | 0 | ok |  |
| Bell: mark all notifications read | alerts | **2** | 2 clicks | 0 | ok |  |
| SAP Alerts: resolve an alert from the list | alerts | **3** | 3 clicks | 0 | ok |  |
| Smart Alerts: add an alert recipient | alerts | **5** | 4 clicks + 1 field | 25 | ok |  |
| Upload an invoice (small dummy PDF) and see the analysis | invoices | **3** | 3 clicks | 0 | ok | Starts at /invoices (reached via Cost Overview; 3 extra clicks counted separately in reach.invoices-via-overview). |
| Delete an invoice (select, trash, confirm) | invoices | **3** | 3 clicks | 0 | ok |  |
| Billing: pay the newest Sent invoice | invoices | **4** | 4 clicks | 0 | ok |  |
| Security Notes: upload note numbers by typing (3 notes) | sap | **5** | 4 clicks + 1 field | 25 | ok |  |
| Security Notes: upload 3 numbers AND resolve their status (Upload + Check Status) | sap | **6** | 5 clicks + 1 field | 25 | ok |  |
| Security Notes: run Check Status on the existing notes | sap | **3** | 3 clicks | 0 | ok |  |
| Security Notes: delete a note (trash + confirm) | sap | **4** | 4 clicks | 0 | ok |  |
| SAP: add a destination / system via System Configuration (name, SID, URL) | connect | **7** | 4 clicks + 3 fields | 39 | ok |  |
| SAP: add a system starting from Dashboard Quick Access 'Add SAP System' | connect | **8 / now 5** | 5 clicks + 3 fields | 39 | ok | The link lands on /sap/systems, which has no add flow; the user must then go to System Configuration through the menu. |
| Jobs & Dumps: filter by status (Running) and search | sap | **4** | 3 clicks + 1 field | 3 | ok |  |
| HANA: open backup details (Backups tab, select a marker) | sap | **4** | 4 clicks | 0 | ok |  |
| Transport: import all released requests | sap | **4** | 4 clicks | 0 | ok |  |
| SAP Overview: open the critical system (HANA-PRD) for detail | sap | **3 (did not complete)** | 3 clicks | 0 | failed | No drill-in exists / TimeoutError: Locator.wait_for: Timeout 6000ms exceeded. |
| Add a user with a role (Analyst) and no extra access | users | **8** | 6 clicks + 2 fields | 36 | ok |  |
| Add a user keeping the default role (Viewer): name + email + Enter | users | **7** | 3 clicks + 2 fields + 2 keys | 36 | ok |  |
| Change a member's role (row Select) | users | **4** | 4 clicks | 0 | ok |  |
| Add a custom role (name only) | users | **6** | 4 clicks + 1 field + 1 key | 10 | ok |  |
| Duplicate a role (row action) | users | **4** | 4 clicks | 0 | ok |  |
| Edit a custom role's permissions: grant 'All' on one module and save | users | **8** | 6 clicks + 1 field + 1 key | 10 | ok | Setup (creating the custom role) is not counted; path starts at the dashboard and ends with Save changes. |
| Edit permissions of an EXISTING custom role (tab, role Select, area/module, All, Save) | users | **7** | 7 clicks | 0 | ok |  |
| Audit Trail: open an event | users | **3** | 3 clicks | 0 | ok |  |
| Sync Logs: filter by status (Failed) | users | **3** | 3 clicks | 0 | ok |  |
| Subscription: request a plan | users | **5** | 5 clicks | 0 | ok |  |
| Account: switch to dark theme | users | **2** | 2 clicks | 0 | ok |  |
| Log out (profile menu, Log out, confirm) | users | **3** | 3 clicks | 0 | ok |  |
| Connect Azure (wizard): menu, Manage Accounts, Connect Account, 5 fields, Next, Validate, Save, Done | connect | **13** | 8 clicks + 5 fields | 131 | ok |  |
| Connect Azure then OPEN the new account | connect | **14 (did not complete) / now 14** | 9 clicks + 5 fields | 131 | failed | Known defect: the new Azure account cannot be opened (cost page only knows the fixtures). / TimeoutError: Locator.wait_for: Timeout 3000ms exceeded. |
| Connect AWS (wizard): menu, Manage Accounts, Connect Account, 3 fields, Next, Validate, Save, Done | connect | **11** | 8 clicks + 3 fields | 69 | ok |  |
| Connect GCP (inline form): menu, Manage, 3 fields, Connect Project | connect | **7** | 4 clicks + 3 fields | 89 | ok |  |
| Connect BTP (inline form): menu, Add Account, 5 fields, Connect Account | connect | **9** | 4 clicks + 5 fields | 113 | ok |  |
| Ask the assistant a question via a suggestion chip | assistant | **2** | 2 clicks | 0 | ok |  |
| Ask the assistant a typed question | assistant | **3** | 1 click + 1 field + 1 key | 35 | ok |  |
| Start a guided tour of the page (first-time user: chip in the launcher panel) | assistant | **2** | 2 clicks | 0 | ok |  |
| Start a guided tour when the 'New here?' prompt is gone (launcher, Tour, pick) | assistant | **3** | 3 clicks | 0 | ok |  |
| Ctrl+K to reach a page (type 'budg', Enter) | assistant | **3** | 0 clicks + 1 field + 2 keys | 4 | ok |  |
| Ctrl+K: run an ACTION ('connect azure') rather than open a page | assistant | **2 (did not complete) / now 3** | 0 clicks + 1 field + 1 key | 13 | failed | TimeoutError: Locator.wait_for: Timeout 6000ms exceeded. |
| Admin: reach Organizations | super-admin | **1** | 1 click | 0 | ok |  |
| Admin: reach Billing | super-admin | **1** | 1 click | 0 | ok |  |
| Admin: open the new-organization form | super-admin | **2** | 2 clicks | 0 | ok |  |
| Admin: create an organization (name, 1 module, 1 provider) | super-admin | **6** | 5 clicks + 1 field | 16 | ok |  |
| Admin: open an organization's settings | super-admin | **2** | 2 clicks | 0 | ok |  |
| Admin: open the invoice generator from the dashboard | super-admin | **1** | 1 click | 0 | ok |  |
| Admin: create and send an invoice (1 line) | super-admin | **7** | 5 clicks + 2 fields | 25 | ok |  |
| Admin: reach Customers (Billing, Manage Customers) | super-admin | **2** | 2 clicks | 0 | ok |  |
| Resource Inventory: open a resource's detail | cost | **3** | 3 clicks | 0 | ok |  |
| Resource Inventory: show only untagged resources (Tags filter) | cost | **4** | 4 clicks | 0 | ok |  |
| Reserved Instances: pick a reservation to chart | cost | **3** | 3 clicks | 0 | ok |  |
| Palette: Connect Azure (Ctrl+K, type, Enter, then the wizard) | palette | **not available / now 12** | 0 clicks + 1 field + 1 key | 13 | failed | AssertionError: Ctrl+K has no action 'Connect Azure' (page search only) |
| Palette: Connect AWS (Ctrl+K, type, Enter, then the wizard) | palette | **not available / now 10** | 0 clicks + 1 field + 1 key | 11 | failed | AssertionError: Ctrl+K has no action 'Connect AWS' (page search only) |
| Palette: Connect Google Cloud project (inline form, first field focused) | palette | **not available / now 7** | 0 clicks + 1 field + 1 key | 14 | failed | AssertionError: Ctrl+K has no action 'Connect Google Cloud' (page search only) |
| Palette: Connect SAP BTP account (inline form, first field focused) | palette | **not available / now 9** | 0 clicks + 1 field + 1 key | 15 | failed | AssertionError: Ctrl+K has no action 'Connect SAP BTP' (page search only) |
| Palette: Connect SAP system (destination dialog opens, Environment Name focused) | palette | **not available / now 7** | 0 clicks + 1 field + 1 key | 18 | failed | AssertionError: Ctrl+K has no action 'Connect SAP system' (page search only) |
| Palette: Add budget (opens Budgets with Budget Name focused) | palette | **not available / now 6** | 0 clicks + 1 field + 1 key | 10 | failed | AssertionError: Ctrl+K has no action 'Add budget' (page search only) |
| Palette: Upload invoice (opens the upload dialog on /invoices) | palette | **not available / now 5** | 0 clicks + 1 field + 1 key | 14 | failed | AssertionError: Ctrl+K has no action 'Upload invoice' (page search only) |
| Palette: Add user (opens the dialog, Full name focused; default role) | palette | **not available / now 7** | 0 clicks + 1 field + 1 key | 8 | failed | AssertionError: Ctrl+K has no action 'Add user' (page search only) |
| Palette: Upload security notes (dialog opens with the textarea focused) | palette | **not available / now 5** | 0 clicks + 1 field + 1 key | 21 | failed | AssertionError: Ctrl+K has no action 'Upload security notes' (page search only) |

## 4. Reaching every page

| Destination | Path | Interactions |
|---|---|---|
| Dashboard (/) | click header link 'Dashboard' | 1 |
| SAP Overview (/sap/systems) | click header menu 'SAP Monitoring'; click menu item 'SAP Overview' | 2 |
| HANA/DB Monitoring (/sap/databases) | click header menu 'SAP Monitoring'; click menu item 'HANA/DB Monitoring' | 2 |
| Performance (/sap/performance) | click header menu 'SAP Monitoring'; click menu item 'Performance' | 2 |
| Jobs & Dumps (/sap/jobs) | click header menu 'SAP Monitoring'; click menu item 'Jobs & Dumps' | 2 |
| Alerts & Escalations (/sap/alerts) | click header menu 'SAP Monitoring'; click menu item 'Alerts & Escalations' | 2 |
| Transport Management (/sap/transport-management) | click header menu 'SAP Monitoring'; click menu item 'Transport Management' | 2 |
| Security Notes (/sap/security-notes) | click header menu 'SAP Monitoring'; click menu item 'Security Notes' | 2 |
| BTP Security Assessment (/sap/btp-security) | click header menu 'SAP Monitoring'; click menu item 'BTP Security Assessment' | 2 |
| System Configuration (/sap/configuration) | click header menu 'SAP Monitoring'; click menu item 'System Configuration' | 2 |
| Cost Overview (/cloud/overview) | click header menu 'Cloud Cost'; click menu item 'Cost Overview' | 2 |
| Cost Analytics (/cloud/analytics) | click header menu 'Cloud Cost'; click menu item 'Cost Analytics' | 2 |
| Azure Subscriptions (/azure) | click header menu 'Cloud Cost'; click menu item 'Azure Subscriptions' | 2 |
| AWS (/aws) | click header menu 'Cloud Cost'; click menu item 'AWS' | 2 |
| SAP BTP (/btp) | click header menu 'Cloud Cost'; click menu item 'SAP BTP' | 2 |
| Google Cloud (/gcp) | click header menu 'Cloud Cost'; click menu item 'Google Cloud' | 2 |
| Savings & Optimization (/cloud/optimization) | click header menu 'Cloud Cost'; click menu item 'Savings & Optimization' | 2 |
| Reserved Instances (/cloud/reservations) | click header menu 'Cloud Cost'; click menu item 'Reserved Instances' | 2 |
| Resource Inventory (/cloud/resources) | click header menu 'Cloud Cost'; click menu item 'Resource Inventory' | 2 |
| Budgets & Alerts (/budgets) | click header menu 'Cloud Cost'; click menu item 'Budgets & Alerts' | 2 |
| Smart Alerts (/smart-alerts) | click header menu 'Cloud Cost'; click menu item 'Smart Alerts' | 2 |
| Billing (/billing) | click header menu 'Cloud Cost'; click menu item 'Billing' | 2 |
| User Management (/users) | click header menu 'Administration'; click menu item 'User Management' | 2 |
| Audit Trail (/audit-trail) | click header menu 'Administration'; click menu item 'Audit Trail' | 2 |
| Sync Logs (/sync-logs) | click header menu 'Administration'; click menu item 'Sync Logs' | 2 |
| /invoices via the Cloud Cost menu (menu entry exists for invoice-only orgs only) | no menu entry for any demo account (needs an invoice-only or hybrid organisation) | not reachable by menu; see the Cost Overview detour below |
| /alerts (not in the menu) from the dashboard | click dashboard link to /alerts | 1 |
| /ai-assistant (not in the menus or the dashboard) | press Ctrl+K; type 'assistant' (9 chars, field auto-focused); press ArrowDown to the 'AI Assistant' page result; press Enter | 4 |
| /account via the profile menu | click Profile menu; click Account | 2 |
| /subscription via the profile menu | click Profile menu; click Subscription | 2 |
| /invoices when it is not in the menu (Cost Overview > Invoices summary > Upload more invoices) | click header menu 'Cloud Cost'; click menu item 'Cost Overview'; click 'Invoices summary' toggle; click link to Invoices | 4 |
| Open the floating assistant panel from any page | click assistant launcher | 1 |

Tabs and views reachable by hash or switcher:

| Tab or view | Interactions | Hash |
|---|---|---|
| Reach tab 'Services and disk' on HANA/DB Monitoring (#storage) | 3 | |
| Reach tab 'Backups' on HANA/DB Monitoring (#backups) | 3 | |
| Reach tab 'Jobs and processes' on Performance (#jobs) | 3 | |
| Reach tab 'Analytics' on Performance (#analytics) | 3 | |
| Reach tab 'Dumps' on Jobs & Dumps (#dumps) | 3 | |
| Reach tab 'Settings' on Alerts & Escalations (#settings) | 3 | |
| Reach tab 'Recipients' on Alerts & Escalations (#recipients) | 3 | |
| Reach tab 'Alert integrations' on Budgets & Alerts (#integrations) | 3 | |
| Reach tab 'Recipients' on Smart Alerts (#recipients) | 3 | |
| Reach tab 'Settings' on Smart Alerts (#settings) | 3 | |
| Reach tab 'Opportunities' on Savings & Optimization (#opportunities) | 3 | |
| Reach tab 'Roles' on User Management (#roles) | 3 | |
| Reach tab 'Permissions' on User Management (#permissions) | 3 | |
| Reach tab 'Available plans' on /subscription (#plans) | 3 | |
| Reach tab 'Security' on /account (#security) | 3 | |
| Reach tab 'Appearance' on /account (#appearance) | 3 | |
| Reach tab 'Help' on /account (#help) | 3 | |

## 5. Per-route checklist

Each cell is `pass` or `fail` followed by the measured number or the code evidence. **Reach** counts interactions from the Dashboard (a menu page is 2). **Primary task** counts interactions on the page itself: the measured total from the Dashboard minus the interactions spent reaching it (2 for menu pages, 3 for account detail pages), against a target of 3 or fewer. **Empty state**, **keyboard** and **shared components** come from reading the page and its section components. **Deep links** were exercised in the browser (a hash or path loaded straight into the right tab or view) and the rest is from code. **Responsive** was measured at 1440 and 390 px: a page that scrolls sideways or has content wider than the viewport fails; a table that scrolls inside its own wrapper is noted (the owner rule is no inner scrollbars, listed as a cross-cutting finding) but does not fail this column. 'n/a' means the page has no empty state to speak of or no demo data path exists.

Keyboard column quotes the measured Tab presses: every signed-in page has the same header, so the first Tab lands on the 'Skip to content' link (which works), then 9 header controls, then the page.

### 5.1 Dashboard and cloud cost

| Route | Reach in <=2 clicks? | Primary task in <=3 interactions? | Empty state with a next action? | Deep-linkable? | Keyboard path? | Responsive (no overflow 390/1440)? | Shared components (no duplicates)? |
|---|---|---|---|---|---|---|---|
| `/` Dashboard | pass: **1** (Dashboard link from any page) | pass: act on a cost alert from 'Needs attention' (row, Resolve): **2** | fail: 'Nothing needs attention right now.' is plain text; with zero accounts the KPIs show a dash and nothing says how to connect | pass: no page state to link (Time range, Environment, System are remembered per session but filter nothing) | pass: Needs-attention rows are real links; KPI cards are not focusable [11 Tab presses to the first control in the page] | pass | pass: SearchField, ModuleCard, SapSystemsPanel reused. Defect: the search box and 3 Selects are decorative (their state is never read) |
| `/cloud/overview` Cost Overview | pass: **2** | pass: change the spend period: **1** | fail: no cloud access shows 'Connect your first cloud account' with no button; other cards give text only | fail: period (default 6M) and the Cloud/Invoices toggle are plain state: not in the URL, not remembered | pass: real buttons and links; but 6 plain `<a href>` links reload the whole app and wipe in-memory demo state [11 Tab presses to the first control in the page] | pass | fail: 6 hard `<a href>` instead of `Link`; its Connect wizard is mounted without the demo onSave; hand-written KPI shells |
| `/cloud/analytics` Cost Analytics | pass: **2** | pass: export a report: **1** | fail: 'No service data for this scope.' is text only | fail: scope, range, group live in sessionStorage; saved views in localStorage (max 6, no delete); none in the URL | fail: the line chart has no keyboard or data-table alternative; breakdown rows open only through the name button [11 Tab presses to the first control in the page] | pass: inner scroller(s) 1440: y:mv-table-wrap | fail: own `div.mv-filter-bar` (not FilterBar), saved-view chips are bare `button.mv-chip` (not FilterChips) |
| `/cloud/optimization` Savings & Optimization | pass: **2** (#opportunities tab: 3) | pass: open a recommendation and start review: **3** | fail: 'No opportunities match these filters.' has no Clear filters button | pass: #overview and #opportunities load the right tab (measured); filters only in sessionStorage | pass: TabBar arrows, drawer Escape and focus return. Defect: the floating assistant launcher covers the drawer's 'Start review' button, which had to be clicked at its left edge [11 Tab presses to the first control in the page] | pass: inner scroller(s) 390: mv-table-wrap | fail: own filter bar div, no FilterChips; assigning an owner needs a drawer per row (no bulk) |
| `/cloud/reservations` Reserved Instances | pass: **2** | pass: pick a reservation to chart: **1** | fail: 'No reservations or savings plans for this provider.' text only | fail: provider and selected reservation are sessionStorage only | fail: the utilisation line chart has no data-table alternative [11 Tab presses to the first control in the page] | pass | fail: own table, no ClickableRow; read-only page (no export or renew action) |
| `/cloud/resources` Resource Inventory | pass: **2** | pass: open a resource: **1** | pass: 'No resources match these filters.' with a Clear filters button | fail: all six filters in sessionStorage; drawer not in the URL | pass: name button opens the drawer; focus returns on close [11 Tab presses to the first control in the page] | pass: inner scroller(s) 1440: y:mv-table-wrap | pass: FilterBar, SearchField, DetailDrawer, CopyButton (renders every row, no Pagination, vertical inner scroller at 1440) |
| `/budgets` Budgets & Alerts | pass: **2** (#integrations tab: 3) | pass: create a budget (name, amount, defaults): **3** | pass: 'Add your first channel' button; the budget list says 'No Budgets Found' beside the create form | pass: #budgets and #integrations (measured); the create draft survives a tab switch | fail: delete budget and remove channel use ConfirmProvider (no Escape, no focus move, no trap); the Add channel dialog opens focused on 'Close' [11 Tab presses to the first control in the page] | pass | pass: TabBar, useHashTab, ConfirmProvider, useModalOverlay dialog |
| `/smart-alerts` Smart Alerts | pass: **2** (#recipients and #settings tabs: 3) | pass: resolve an alert from the list: **1** | pass: 'Show active alerts' button when filtered; 'All clear' otherwise | fail: tabs by hash (measured) but status/type filters and the open drawer are not in the URL or remembered | pass: every action is a real button with a row-specific aria-label [11 Tab presses to the first control in the page] | pass | fail: status and type are SegmentedToggle without counts (FilterChips fit), own `div.mv-cost-alert-filters`, no ClickableRow |
| `/alerts` Alerts (in no menu) | pass: **1** (only via a Dashboard link) | fail: no task is possible: static 3-row table, no resolve/ignore/open, no link to the owning module | fail: 'No active alerts.' text only | n/a: no state | fail: no focusable control inside the page [no focusable control in the page] | pass: inner scroller(s) 390: mv-table-wrap | fail: hand-written table; its data is a fixture separate from Smart Alerts, SAP Alerts and the bell |
| `/invoices` Invoices (menu entry hidden for every demo account) | fail: **4** (Cost Overview, Invoices summary toggle, link). It is not in the Cloud Cost menu: that needs an invoice-only or hybrid organisation | pass: upload an invoice and see the analysis: **3** | pass: 'Upload Invoice' button (the wording 'No invoices yet' also shows for an empty provider filter) | fail: selected invoice and page are local state | fail: UploadModal has no Escape, no focus trap, no autofocus; a backdrop click closes it mid-parse [11 Tab presses to the first control in the page] | pass | fail: hand-written modal (not useModalOverlay), `div.mv-empty`, KPI articles, invoice cards |
| `/billing` Billing | pass: **2** | pass: pay the unpaid invoice (select it, Pay Now): **2** | fail: 'No invoices yet' with no action | fail: selected invoice is local state | pass: list items are buttons; Pay Now is one click with no confirmation (risk, not a keyboard gap) [11 Tab presses to the first control in the page] | pass: inner scroller(s) 390: mv-table-wrap | fail: hand-written invoice list and empty states; only PageHeader is shared |
| `/ai-assistant` AI Assistant (page) | fail: **4** (Ctrl+K, type, ArrowDown past the 'Open assistant' action, Enter); in no menu | pass: ask a question: 3 on the page (composer, type, Enter), 2 with a suggestion chip; measured in the floating widget: 3 typed, 2 with a chip | pass: intro line and suggestion chips | n/a: the conversation is not persisted | pass: form submit on Enter; the widget composer is not auto-focused [11 Tab presses to the first control in the page] | pass | fail: the page and the floating widget each implement a conversation with the same input label and separate state |

### 5.2 Cloud providers

| Route | Reach in <=2 clicks? | Primary task in <=3 interactions? | Empty state with a next action? | Deep-linkable? | Keyboard path? | Responsive (no overflow 390/1440)? | Shared components (no duplicates)? |
|---|---|---|---|---|---|---|---|
| `/azure` Azure overview and account manager | pass: **2** | fail: connect an Azure account: **11** | fail: zero accounts: the manager shows only 'Connect Account' with no 'no accounts' message; the overview never has an empty state | fail: overview vs manager is a local switch; `/azure` is the only URL for both | fail: the wizard has no Escape, trap or autofocus and no `<form>` (Enter does nothing); header dropdowns have no Escape or arrows [11 Tab presses to the first control in the page] | pass: inner scroller(s) 390: mv-table-wrap | fail: no SearchField, FilterBar, TabBar, EmptyState or StatusTag; the account-manager markup is copied across Azure, AWS and BTP |
| `/azure/:accountId` Azure account (Executive, Operations, Technical) | pass: **3** (menu, list, row; fixed 3) | pass: switch to Operations or Technical: **1** | fail: 'Account not found' + Back; empty panels are text only ('No data available yet.') | fail: `/azure/az-acc-1` loads (measured) but the view and the month are not in the URL or remembered | fail: the view switcher is a `nav` of buttons with aria-current, no tab roles or arrows; the month dropdown has no Escape [11 Tab presses to the first control in the page] | pass | fail: own `mv-cost-tabs` (4 copies), own dropdown + useOutsideClose (4 copies), Sparkline re-implemented, formatCurrency declared in ~15 files |
| `/aws` AWS overview | pass: **2** | pass: open an account: **1** | fail: zero accounts renders an empty table and '0 AWS environments' with no action | pass: its own URL | pass: ClickableRow + RowOpenButton (whole row, Enter) [11 Tab presses to the first control in the page] | pass: inner scroller(s) 390: mv-table-wrap | fail: Sparkline re-implemented; static Tag Coverage and Status columns |
| `/aws/accounts` AWS account manager | fail: **3** (menu 2 + Manage Accounts) | fail: connect an AWS account: **9** | fail: zero accounts: only the notice and Connect Account | pass: its own URL | fail: same wizard gaps as Azure [11 Tab presses to the first control in the page] | pass | fail: duplicate of the Azure manager and wizard |
| `/aws/account/:id` AWS account | pass: **3** (fixed 3) | pass: switch view: **1** | fail: 'Account not found' + Back | fail: view and month not in the URL | fail: cost-view buttons without tab roles [11 Tab presses to the first control in the page] | pass | fail: copy of the Azure cost-page shell |
| `/gcp` GCP overview | pass: **2** | pass: open a project: **1** | pass: 'No GCP projects connected' + 'Connect GCP Project' (the only provider with a real zero state) | pass: its own URL | pass: project rows are real buttons [11 Tab presses to the first control in the page] | pass | fail: no ClickableRow or table; hand-written account rows |
| `/gcp/accounts` GCP account manager | fail: **3** (menu 2 + Manage) | fail: connect a GCP project: **5** | pass: the connect form is always on the page | pass: its own URL | pass: a real `<form>`: Enter submits; field errors are inline [11 Tab presses to the first control in the page] | pass | fail: a third connect UI (inline) unlike Azure/AWS; the assistant flow-guide targets (`Rename`, `Delete`, `Connect Account`) do not exist here |
| `/gcp/account/:id` GCP project | pass: **3** (fixed 3) | pass: switch view: **1** | fail: 'Project not found' + Back | fail: view not in the URL; no month picker | fail: cost-view buttons without tab roles [11 Tab presses to the first control in the page] | pass | fail: own 5-KPI row and tables instead of CloudSpendSummary, ServiceBreakdownList, DailyCostHistory, CostByRegion |
| `/btp` SAP BTP overview | pass: **2** | pass: open an account: **1** | pass: 'No BTP accounts added yet' + 'Add your first account' (the rest of the page still shows fixture data) | pass: its own URL | pass: account rows are buttons [11 Tab presses to the first control in the page] | pass: inner scroller(s) 390: mv-table-wrap | fail: 'Manage' and 'Add Account' go to the same page; hand-written rows |
| `/btp/accounts` BTP account manager | fail: **3** (menu 2 + Add Account) | fail: connect a BTP account: **7** | fail: zero accounts: the form only; at the 3-account limit the form is hidden (the demo seeds 2, so one add is possible) | pass: its own URL | pass: a real `<form>`; validation is a single role=alert [11 Tab presses to the first control in the page] | pass | fail: third connect UI; no success message |
| `/btp/account/:id` BTP account (Executive, Operations, Hierarchy, Technical) | pass: **3** (fixed 3) | pass: switch view: **1** | fail: 'Account not found'; the 'CIS_Central not configured' notice has no link to fix it | fail: view and hierarchy drill-down are local state (the browser Back button does not step out of the drill-down) | fail: cost-view buttons without tab roles [11 Tab presses to the first control in the page] | pass | fail: own tabs and dropdowns as the other cost pages |
| `/btp/account/:id/subaccount/:sid/service-instances` BTP service instances | fail: 4 or more (account, Hierarchy tab, subaccount, link) or the URL | fail: no task: the Refresh button has no handler although the hint says 'click Refresh' | fail: 'Service Manager not configured' and 'No instances found' without an action | pass: full URL (a direct load leaves the Back button with no history) | fail: the Back button calls `navigate(-1)` | not swept (sub-account route not in the sweep) | fail: dead Refresh; hand-written table |

### 5.3 SAP monitoring

| Route | Reach in <=2 clicks? | Primary task in <=3 interactions? | Empty state with a next action? | Deep-linkable? | Keyboard path? | Responsive (no overflow 390/1440)? | Shared components (no duplicates)? |
|---|---|---|---|---|---|---|---|
| `/sap/systems` SAP Overview | pass: **2** | fail: open the critical system for detail: **not possible** (measured: clicking the HANA-PRD row opens nothing; rows are not clickable and there is no drill-in) | fail: an empty system list renders an empty tbody, no state, no action | pass: its own URL (`/sap/health` redirects here) | fail: the system table and severity bars are not interactive, so a keyboard user can reach only 'View all' and 'Open Jobs & Dumps' [11 Tab presses to the first control in the page] | pass: inner scroller(s) 390: mv-table-wrap | fail: condition pills are hand-written (not FilterChips, not clickable); table rows are not ClickableRow |
| `/sap/databases` HANA/DB Monitoring | pass: **2** (#backups tab: 3) | pass: open backup details (Backups tab, View data): **2** | fail: panels render empty lanes or lists with no message | pass: #vitals, #storage, #backups (measured) | fail: backup markers are aria-hidden with tabindex -1 (hover-only); the keyboard path is the 'View data' table; Refresh gives no feedback [11 Tab presses to the first control in the page] | pass | fail: SAP-local SegmentedSwitch (a copy of SegmentedToggle) and three copies of the View data dialog |
| `/sap/performance` Performance | pass: **2** | pass: filter jobs by status from here: **1** (chip link to `/sap/jobs?status=...`, code count) | fail: bare text ('No locks held', 'No memory pools reported') | pass: #health, #jobs, #analytics (measured) | pass: TabBar arrows; chips are real links [11 Tab presses to the first control in the page] | pass: inner scroller(s) 390: mv-table-wrap | fail: SegmentedSwitch and ChartDataDialog duplicates |
| `/sap/jobs` Jobs & Dumps | pass: **2** (#dumps tab: 3) | pass: filter by status and search: **2** | pass: 'Clear filters' when nothing matches (the dumps tab EmptyState has no action) | fail: #jobs and #dumps work (measured) and `?status=` is read once, but chip and search are never written back to the URL | pass: search, chips (aria-pressed), job-name buttons; Escape closes the drawer [11 Tab presses to the first control in the page] | pass: inner scroller(s) 1440: y:mv-table-wrap; 390: mv-table-wrap | pass: SearchField, FilterBar, FilterChips, TabBar, DetailDrawer (a vertical inner scroller on the table at 1440) |
| `/sap/alerts` Alerts & Escalations | pass: **2** (#settings, #recipients tabs: 3) | pass: resolve an alert: **1** | pass: 'Show active alerts' button | fail: tabs by hash; source, status and type filters are local state | pass: row actions are labelled buttons [11 Tab presses to the first control in the page] | pass | fail: hand-written `mv-filter-bar` with two Selects (no FilterBar, FilterChips or SearchField); Reopen is reachable only after switching the Status filter |
| `/sap/transport-management` Transport Management | pass: **2** | pass: import all released requests (select all, Import Selected): **2** | fail: 'No transports found.' with no Clear filters | fail: search, status and selection are local | pass: native checkboxes; the status toggle needs a Tab per option (no arrows) [11 Tab presses to the first control in the page] | pass | fail: status filter is a SegmentedToggle where Jobs uses FilterChips; import has no confirmation |
| `/sap/security-notes` Security Notes | pass: **2** | fail: upload note numbers AND resolve their status (Upload + Check Status): **4** | pass: 'Upload notes' button when no notes are tracked | fail: priority/status/download filters remembered in sessionStorage (search is not); nothing in the URL | fail: the delete confirm (ConfirmProvider) has no Escape or focus handling; the upload dialog itself is fine (autofocus, Escape, trap) [11 Tab presses to the first control in the page] | pass | fail: status counts are KPI cards, not FilterChips; Upload and Check Status are two manual steps (upload alone: 3) |
| `/sap/btp-security` BTP Security Assessment | pass: **2** | fail: nothing works: the tables are empty by design, Refresh has no handler, search and the status filter filter nothing | fail: a 'No Users Found' row with no guidance (for example connect a BTP destination) | fail: the tab choice resets on reload | fail: hand-written tab buttons: no roles, no arrows, no hash [11 Tab presses to the first control in the page] | pass: inner scroller(s) 390: mv-table-wrap | fail: hand tabs (not TabBar), own filter bar, imports `src/demo` directly (architecture ratchet) |
| `/sap/configuration` System Configuration | pass: **2** | fail: add a destination (name, SID, URL): **5** | pass: 'Add Destination' button in the empty state | fail: dialog and search are local state | pass: dialog autofocus, Escape, Tab trap, Enter submits [11 Tab presses to the first control in the page] | pass | fail: empty block is `mv-empty-inline` (not EmptyState); no test-connection; DestinationSwitcher is hard-coded and ignores destinations |

### 5.4 Administration and account

| Route | Reach in <=2 clicks? | Primary task in <=3 interactions? | Empty state with a next action? | Deep-linkable? | Keyboard path? | Responsive (no overflow 390/1440)? | Shared components (no duplicates)? |
|---|---|---|---|---|---|---|---|
| `/users` User Management | pass: **2** (#roles, #permissions tabs: 3) | fail: add a user (default role): **5** | pass: 'Add user' button in the empty member state | fail: tabs by hash (measured); the selected role in Permissions, the search and the unsaved permission draft are not (the draft is silently dropped on a tab switch) | pass: dialogs: autofocus, Escape, trap, Enter submits; the role Select is keyboard-operable [11 Tab presses to the first control in the page] | pass: inner scroller(s) 390: mv-table-wrap | fail: own switch Toggle and StatusBadge; rows are not ClickableRow and a member has no detail view |
| `/audit-trail` Audit Trail | pass: **2** | pass: open an event: **1** | pass: 'Clear filters' (the heading always names the actor filter even when another filter caused it) | fail: filters, page and the open event are local | fail: the actor `radiogroup` has no arrow-key handling; the row is not clickable, only the action text [11 Tab presses to the first control in the page] | pass | fail: hand-written actor radiogroup (not SegmentedToggle or FilterChips); no ClickableRow |
| `/sync-logs` Sync Logs | pass: **2** | pass: filter by status: **1** | pass: 'Clear filters' | fail: filters are local | fail: toolbar buttons expose no pressed state (no aria-pressed) [11 Tab presses to the first control in the page] | pass: inner scroller(s) 390: mv-table-wrap | fail: hand-written toolbar (no FilterBar, FilterChips or SearchField); imports `src/demo` directly |
| `/subscription` Subscription (profile menu) | pass: **2** | pass: request a plan: **3** | n/a: read-only page that always has data | pass: #plan and #plans (measured) | pass: dialog autofocus and Escape; Enter in the textarea adds a newline [11 Tab presses to the first control in the page] | pass | pass: TabBar, PageHeader; inline-styled rows |
| `/account` Account (profile menu) | pass: **2** (#security, #appearance, #help tabs: 3) | pass: switch theme: 2 from anywhere through the profile menu (measured: 2); 2 on the page (Appearance tab, option) | n/a | pass: #profile, #security, #appearance, #help (measured for #security) | fail: Theme and Density are hand-written radiogroups with no arrow keys [11 Tab presses to the first control in the page] | pass | fail: hand radiogroups; the Help tab holds one link; Density duplicates the Pagination footer toggle |

### 5.5 Super admin portal (signed in as Super Admin)

Reach counts are from `/admin/dashboard`, the landing page.

| Route | Reach in <=2 clicks? | Primary task in <=3 interactions? | Empty state with a next action? | Deep-linkable? | Keyboard path? | Responsive (no overflow 390/1440)? | Shared components (no duplicates)? |
|---|---|---|---|---|---|---|---|
| `/admin/dashboard` Admin dashboard | pass: 0 (landing page) | pass: start a new invoice: **1** | fail: 'No invoices yet.' text only | pass: its own URL | pass: skip link and NavLinks; the menu drawer below 992 px has no focus trap | pass: inner scroller(s) 390: mv-table-wrap | fail: hand tables; 'daysLeft' hard-codes today as 2026-09-27 |
| `/admin/organizations` Organizations | pass: **1** | pass: open an organization (Manage): **1** | fail: an empty list renders nothing | pass: its own URL | pass: Manage is a link per row; the rows themselves are not clickable | pass | fail: no SearchField, FilterBar, ClickableRow or Pagination |
| `/admin/organizations/new` New organization | pass: **2** | fail: create an organization (name, module, provider, Create): **4** | n/a: a form | pass: its own URL | fail: not a `<form>`: Enter does not save | pass | fail: hand-written sections; no duplicate-name check |
| `/admin/organizations/:orgId` Organization settings | pass: **2** | pass: save changes: 1 click (code count; the dirty guard is on Cancel only) | n/a: 'Organization not found' + link back | pass: direct URL | fail: no Enter-to-save; no guard on browser Back when dirty | not swept (needs an organization id) | fail: own Section panels |
| `/admin/billing` Billing (Invoices, Payment Terms) | pass: **1** | pass: new invoice: **1** (header button, code count) | fail: 'No invoices found' without a clear-filters action | fail: the Invoices/Payment Terms switch is local state | fail: invoice rows are `<tr onClick>` only (mouse-only); the tab pair has no ARIA | pass: inner scroller(s) 390: mv-table-wrap | fail: own search input (not SearchField), own segmented pair (not TabBar) |
| `/admin/billing/generate` Invoice generator | pass: 1 from the dashboard button, 2 from Billing | fail: create and send an invoice (1 line): **6** | n/a | pass: its own URL | fail: two confirmation modals without Escape or focus trap; `window.prompt` for a column label | pass: inner scroller(s) 390: mv-table-wrap | fail: own modals and `window.prompt` |
| `/admin/billing/customers` Customers | pass: **2** | pass: add a customer: 3 interactions (name, email, Add; code count) | fail: no empty state | pass: its own URL | pass: a real form | pass | fail: the list is page-local and does not feed the invoice generator; delete has no confirm |

### 5.6 Public pages

| Route | Reach in <=2 clicks? | Primary task in <=3 interactions? | Empty state with a next action? | Deep-linkable? | Keyboard path? | Responsive (no overflow 390/1440)? | Shared components (no duplicates)? |
|---|---|---|---|---|---|---|---|
| `/login` Sign in (out of scope; demo card measured) | pass: 0 (entry) | pass: demo sign-in: **1** click on a Demo mode card button (it starts every task here); password sign-in untouched | n/a | pass: `?error=` banners | pass: autofocused email, Enter continues | pass | pass: PasswordField; Demo mode card is its own markup |
| `/register` Register (invitation) | fail: no inbound link from /login or /company-signup (measured: none found); URL only | fail: 5 steps; code count: email, code, 4 detail fields, 4 access boxes and 5 buttons, none is a `<form>` so Enter never submits | n/a | pass: its own URL | fail: not forms; no autofocus; errors in one alert with no focus move | pass | fail: hand-rolled strength text instead of PasswordStrengthMeter; overlaps /company-signup |
| `/company-signup` Company sign-up | pass: **1** | pass: first two steps (Use sample token, Validate license): **2**; the full flow is about 7 clicks + 4 entries (code count) | n/a | pass: its own URL (step state is not linkable) | pass: real forms; focus moves to the step heading; the first error is focused | pass | pass: PasswordStrengthMeter, Select, stepper |
| `/forgot-password` Forgot password | fail: **3** (needs an e-mail typed on /login first) | pass: email + submit: 2 (code count) | n/a | pass: its own URL | pass: a real form; no autofocus; the e-mail is not carried over from /login | pass | pass |
| `/reset-password` Reset password | n/a: only from the e-mailed link | pass: 2 password fields + submit: 3 (code count) | pass: a missing token shows 'Request a new link' | pass: `?token=` | pass: a real form; no strength meter | pass | pass |
| `/subscription-expired` Subscription expired | n/a: forced redirect | pass: 1 click 'Sign out and use another account'; no in-app plan request here | n/a | pass: its own URL | pass: buttons and links | pass | fail: its own hard-coded PLANS list differs from the Subscription page's |
| `/invoice-demo` Public invoice parser | pass: **1** | pass: parse an invoice: **3** from /login (link, file, Parse invoice) = 2 on the page | n/a | pass: its own URL | pass: fieldset radios, focus management on the result | pass | fail: bespoke `mv-idemo-*` markup and a drop zone that /invoices (the signed-in upload) lacks |
| `/invoice/:token` Public invoice (e-mail link) | n/a: only from the invoice e-mail | pass: pay: 1 click, no confirmation | fail: 'Invoice not found' without an action | pass: token URL | pass: buttons and links | pass | fail: hard-coded light colours |
| `*` 404 page | n/a | pass: Back to dashboard: 1 | pass: 'Back to dashboard' | n/a | pass: a link | pass | fail: hand-written empty markup, not EmptyState |

Redirects: `/admin/login` to `/login`; `/invoice-builder` to `/admin/billing/generate`; `/recommendations` to `/cloud/optimization` (a hash is lost); `/reports` to `/cloud/analytics`; `/sap/health` to `/sap/systems`; `/sap/dumps` to `/sap/jobs#dumps`.

## 6. Command palette (already built in the working tree)

Ctrl+K now runs actions as well as opening pages. The baseline commit only searches pages (the harness confirms it: `Ctrl+K has no action 'Connect Azure'`). Measured on the live tree, each palette flow starts on the Dashboard and ends with the thing saved. Typing the query is one field entry, so Ctrl+K + query + Enter = 3 interactions (and 1 chord + N characters + 1 key on the keyboard), against 4 menu clicks to reach the Azure connect dialog.

| Flow | Baseline (menu path) interactions | Palette interactions | Change | What the palette saves |
|---|---|---|---|---|
| Connect Azure | 13 | 12 (mouse clicks: 4) | -1 | reaches the connect dialog in 3 instead of 4 (Cloud Cost, Azure, Manage Accounts, Connect Account); the wizard's own 9 are unchanged |
| Connect AWS | 11 | 10 (mouse clicks: 4) | -1 | same: 3 instead of 4 to reach the dialog |
| Connect Google Cloud | 7 | 7 (mouse clicks: 1) | +0 | lands on the form with Display Name focused (no Manage click, no focus click) |
| Connect SAP BTP | 9 | 9 (mouse clicks: 1) | +0 | lands on the form with Account Name focused |
| Connect SAP system | 7 | 7 (mouse clicks: 1) | +0 | opens the destination dialog directly, name focused |
| Add budget | 5 | 6 (mouse clicks: 1) | +1 | no saving: Ctrl+K + query + Enter (3) costs more than the 2-click menu; the win is keyboard-only operation with the name field focused |
| Upload invoice | 7 (4 to reach /invoices + 3) | 5 (mouse clicks: 2) | -2 | removes the hidden-page detour (the largest single saving) |
| Add user (default role) | 7 | 7 (mouse clicks: 0) | +0 | zero mouse clicks end to end |
| Upload security notes | 5 | 5 (mouse clicks: 1) | +0 | dialog opens with the textarea focused; zero mouse clicks except Upload |

Reading: the palette removes navigation, not form overhead. It cuts the connect launch from 4 clicks to 3 interactions and makes every flow operable with the keyboard, but the Azure and AWS wizards still spend 4 clicks on screens with no input (Next, Validate details, Save account, Done). That is why section 8 still ranks the connect flows first.

Other improvements already visible on the live tree (measured with the same harness, section 3 has the full rows): Dashboard Quick Access 'Add SAP System' now opens System Configuration; Cost Overview's 'Connect cloud account' wizard now completes; a newly connected Azure account can now be opened.

| Task | Baseline | Live tree |
|---|---|---|
| Add SAP system from Quick Access | 8 | 5 |
| Cost Overview: Connect cloud account | 11 (did not complete) | 12 |
| Connect Azure, then open the new account | 14 (did not complete) | 14 |
| Ctrl+K 'connect azure' opens the dialog | 2 (did not complete) | 3 |

## 7. Page inventory (sections, tabs, dialogs, components)

From reading each page and its section components. 'Shared' = components from `src/shared/ui`; 'hand-written' = markup that duplicates one of them.

| Page | Sections | Tabs (hash) | Dialogs, drawers | Shared used | Hand-written duplicates |
|---|---|---|---|---|---|
| Dashboard `/` | Pulse header and greeting; DashboardToolbar (search, Time range, Environment, System, Refresh); module cards; sidebar (subscription, Quick Access, support); 6 KPI glance cards; Needs attention (max 6); SAP health table; Cloud cost by provider donut. | no tabs | donut View data dialog | SearchField, ModuleCard, SapSystemsPanel, Select | KPI cards, glance strip; search and Selects do nothing |
| Cost Overview | Header with Cloud/Invoices toggle, Refresh, Connect cloud account; 4 KPIs; Cost at a glance (trend with period toggle, AI insights, MSP savings); spend by provider, share, movers; invoice strip; recent alerts; footer totals. | no tabs (view toggle is state) | ConnectCloudAccountWizard; View data dialogs | SegmentedToggle, EmptyState, InsightList, PageHeader | 6 `<a href>` links, KPI shells |
| Cost Analytics | Header (Save view, Export report); scope filter bar (Providers, Range, Group by, saved views); KPIs; monthly line chart; breakdown table + bar list + selection card. | none | none | PageHeader, Select, BarList | filter bar, saved-view chips |
| Savings & Optimization | Provider Select; TabBar Savings overview (#overview) / Opportunities (#opportunities): KPIs, trend + category donut, top recommendations, MSP table; filters, table, saving-by-type. | #overview, #opportunities | opportunity drawer (Owner, dismiss reason, Start review); category drawer | TabBar, DetailDrawer, SegmentedToggle, Select, EmptyState, BarList | filter bar |
| Reserved Instances | Provider Select; KPIs; reservations table; utilisation chart; commitment recommendations. | none | none | PageHeader, Select | table, chart without data table |
| Resource Inventory | Export CSV; KPIs; FilterBar (search + 5 Selects + Clear); table. | none | resource drawer | FilterBar, SearchField, DetailDrawer, CopyButton, Select | none |
| Budgets & Alerts | TabBar Budgets (#budgets: create form + list) / Alert integrations (#integrations: channel list). | #budgets, #integrations | AddChannelDialog; confirms for delete budget and remove channel | TabBar, ConfirmProvider, useModalOverlay, Select | `div.mv-empty` |
| Smart Alerts | TabBar Alerts / Recipients / Settings; Alerts: summary line, Mark All Read, Refresh, KPIs, filters (status, type, provider), table with Pagination. | #alerts, #recipients, #settings | alert detail drawer | TabBar, DetailDrawer, Pagination, SegmentedToggle, Select | filter container |
| Alerts `/alerts` | Header and one static table of 3 rows. | none | none | PageHeader | table |
| Invoices | Header (Refresh, Upload Invoice); 6 KPIs; split panel: provider toggle with counts + invoice cards + Pagination; analysis panel. | none | UploadModal; delete confirm | SegmentedToggle, Select, Pagination, ConfirmProvider | modal, cards, KPIs, empty markup |
| Billing | Split panel: your invoices; invoice detail with Pay Now. | none | none | PageHeader | list, empty states |
| AI Assistant page | Header; conversation with suggestion chips; composer. | none | none | PageHeader | conversation duplicates the widget |
| Azure overview / manager | Overview: heading, Refresh Data, Manage Accounts, KPIs, Environments table, trend, top services. Manager: account list (rename, details, delete), limit badge, Connect Account. | local view switch (dashboard/accounts) | connect wizard (4 steps); details dialog; delete confirm | ClickableRow, RowOpenButton, ConfirmProvider, SpendTrendChart | wizard, dialogs, Sparkline |
| Azure / AWS / GCP / BTP account | Header (Back, switch account, month, AI Insights, Sync); cost-view nav (Executive, Operations, Technical; BTP adds Hierarchy); CloudSpendSummary; per-view panels. | view switcher (state, not hash) | View data dialogs; BTP hierarchy drill-down | CloudSpendSummary, ServiceBreakdownList, ServiceCategorySummary, DailyCostHistory, CostByRegion, SegmentedToggle, DetailGroup | cost tabs, dropdowns, tables (x4) |
| AWS / GCP / BTP overview and managers | AWS mirrors Azure (overview, manager, wizard). GCP: overview, manager with inline form. BTP: overview, manager with inline 5-field form, service-instances table. | none | AWS wizard; GCP and BTP none | ClickableRow (AWS), ConfirmProvider | rows, forms |
| SAP Overview | Destination switcher; 4 KPIs; load chart + condition donut; Needs attention + unread by severity; systems table. | none | View data dialogs | PageHeader, BarSeriesChart, DonutChart, InsightList, BarList | condition pills, table |
| HANA/DB Monitoring | Host panel (Refresh, SyncStatus); 4 KPIs; TabBar Vitals / Services and disk / Backups. | #vitals, #storage, #backups | View data dialog (3 copies) | TabBar, useHashTab, InsightList | SegmentedSwitch, dialogs |
| Performance | Status panel; 8 KPIs; TabBar System health / Jobs and processes / Analytics. | #health, #jobs, #analytics | View data dialog | TabBar, useHashTab | SegmentedSwitch, dialog |
| Jobs & Dumps | TabBar Background jobs / Short dumps; FilterBar with SearchField and FilterChips; table with Show more. | #jobs, #dumps | job drawer; dump drawer | TabBar, FilterBar, SearchField, FilterChips, DetailDrawer, EmptyState, CopyButton | inline empty block |
| Alerts & Escalations (SAP) | TabBar Alerts / Settings / Recipients; source toggle, KPIs, filter bar, table with Pagination; settings forms; recipient form. | #alerts, #settings, #recipients | none | TabBar, SegmentedToggle, Select, Pagination | filter bar |
| Transport Management | KPIs; import route form; filter bar (status toggle, search, Import Selected, Export); table; activity log; import queue. | none | ActivityLogDrawer | FilterBar, SearchField, SegmentedToggle, Pagination, DetailDrawer | none |
| Security Notes | Header (History, Check Status, Upload); 6 KPI cards; FilterBar with 3 Selects; table with Pagination. | none | UploadNotesDialog; NotesHistoryDrawer; delete confirm | SearchField, FilterBar, Select, Pagination, DetailDrawer, ConfirmProvider | upload modal shell |
| BTP Security | Header Refresh (dead); tab strip Users / Role Collections / Roles; search and status filter; empty tables. | state only | none | SearchField, Select | tab strip, filter bar |
| System Configuration | Add Destination; status line + search; destination cards (Connect/Disconnect, edit, remove). | none | DestinationDialog (add and edit); remove confirm | SearchField, Select, SegmentedToggle, PasswordField, ConfirmProvider | cards, empty block |
| User Management | Header (search, Add user); seat summary; TabBar Members / Roles / Permissions; AddUserDialog; RoleDialog; RoleDetailsDrawer; PermissionExplorer with unsaved-changes bar. | #members, #roles, #permissions | AddUserDialog; RoleDialog; role drawer; 3 confirms | SearchField, TabBar, EmptyState, Pagination, Select, DetailDrawer, ConfirmProvider | Toggle, StatusBadge, rows |
| Audit Trail | Header (Export CSV, Manual re-sync); FilterBar (search, actor radiogroup, module Select, date range); day-grouped timeline; Pagination. | none | AuditEventDrawer | FilterBar, SearchField, Select, Pagination, DetailDrawer | actor radiogroup |
| Sync Logs | Header Refresh; Status and Provider toolbar; table; Pagination. | none | log drawer | Pagination, DetailDrawer, EmptyState | toolbar, no search |
| Subscription | TabBar Your plan / Available plans. | #plan, #plans | PlanRequestDialog | TabBar, PageHeader | rows |
| Account | TabBar Profile / Security / Appearance / Help; change-password form. | #profile, #security, #appearance, #help | none | TabBar, PasswordField | theme and density radiogroups |
| Super admin: dashboard, organizations, editor, billing, generator, customers | Overview with two ModuleCards and two tables; organizations table and form with sticky action bar; billing split panel with Invoices / Payment Terms; invoice generator with live preview; customers form and list. | Invoices/Payment Terms (state) | send-invoice and sent modals; discard confirm | ModuleCard, PageHeader, Select, ConfirmProvider | tables, search, modals, window.prompt |

### Shared component adoption

| Shared component | Used by | Hand-written copies instead |
|---|---|---|
| SearchField | Dashboard, Resources, Jobs, Transport, Security Notes, Configuration, Users, Audit, BTP Security | Admin Billing own search input; Sync Logs, Smart Alerts, Alerts, Cost Analytics, Optimization, providers have none |
| FilterBar | Resources, Jobs, Transport, Security Notes, Audit | `mv-filter-bar` divs in Cost Analytics, Optimization, SAP Alerts, BTP Security; `mv-cost-alert-filters` in Smart Alerts; Sync Logs toolbar |
| FilterChips | Jobs only | Smart Alerts status/type (SegmentedToggle without counts), SAP Alerts (Selects), Transport status, Audit actor radiogroup, Sync Logs buttons, saved views in Cost Analytics, SAP condition pills |
| TabBar + useHashTab | Budgets, Smart Alerts, Optimization, HANA, Performance, Jobs, SAP Alerts, Users, Subscription, Account | 4 provider cost-view navs, BTP Security strip, Admin Billing pair, notification drawer All/Unread, Cost Overview Cloud/Invoices (SegmentedToggle) |
| ClickableRow / RowOpenButton | Azure and AWS overview tables | Every other row-opening table (Smart Alerts, Audit, Sync Logs, roles, invoices, systems, jobs, resources); Admin Billing rows are `tr onClick` only |
| EmptyState | Cost Overview, Jobs dumps, Users, Audit, Sync Logs, Invoices summary | `mv-empty`, `mv-empty-inline`, plain `<p>` on about 20 pages (see section 5) |
| useModalOverlay (Escape, trap, focus return) | Add user, role, plan request, destination, upload notes, add channel, search, bell, DetailDrawer | ConfirmProvider (every confirm), wizard, invoice UploadModal, SendInvoice and SentEmail modals, 3 chart View data dialogs, super-admin nav drawer |
| SegmentedToggle | Cost Overview, Daily cost history, Invoices, SAP alerts source, Transport, Smart Alerts | SAP SegmentedSwitch, Account Theme/Density radios, Audit actor group |
| ChartDataDialog (View data) | Daily cost history, Cost by region, BarSeriesChart, BarLineChart | DonutChart, SpendTrendChart, CumulativeSpendChart, SAP ChartDataDialog, HanaVitalsChart, Azure ReservationUtilizationChart |

## 8. Ranked friction list (top 25)

Ranked by measured interactions weighted by how often the task is done and by the owner's priority (new organisations connecting accounts first). 'Before' is the measured baseline from the Dashboard; 'After' is the target for the change named; files are the ones to touch. Palette numbers are from section 6.

| # | Task | Before (measured) | Change that reduces it | After target | Files |
|---|---|---|---|---|---|
| 1 | Connect Azure | 13 (8 clicks + 5 fields; palette 12) | One shared ConnectAccountDialog: opened from the Dashboard, empty states and Ctrl+K; 'Use sample credentials' fills valid values; fold Validate into Connect and close on success (no Done); open the new account | 3 with sample values (launch, Use sample, Connect); 7 with real values (launch + 5 fields + Connect) | features/cloud/components/ConnectCloudAccountWizard.tsx; features/azure/pages/AzureAccountManager.tsx, AzureOverallDashboard.tsx, AzureRoot.tsx; features/dashboard/pages/HomePage.tsx; app/layouts/pageSearch.ts |
| 2 | Connect AWS | 11 (8 clicks + 3 fields; palette 10) | Same dialog; ask Region as a default Select; sample = AKIAIOSFODNN7EXAMPLE pair | 3 with sample; 5 with real values | features/cloud/components/ConnectCloudAccountWizard.tsx; features/aws/pages/AwsAccountManager.tsx, model/AwsAccountContext.tsx |
| 3 | Connect SAP BTP | 9 (4 clicks + 5 fields; palette 9) | Same dialog; auto-derive the Reporting URL from the Token URL; success toast; fix the saved region (`reporting` instead of `eu10`) | 3 with sample; 6 with real values | features/btp/pages/BtpAccountManager.tsx, model/BtpAccountContext.tsx |
| 4 | Connect Google Cloud | 7 (4 clicks + 3 fields; palette 7) | Same dialog; paste the service-account JSON and derive Display Name and Project ID from it (1 field instead of 3) | 3 with sample; 3 with a pasted key | features/gcp/pages/GcpAccountManager.tsx, model/GcpAccountContext.tsx |
| 5 | Add SAP system / destination | 7 via the menu; Quick Access 8 at baseline (5 live); palette 7 | Dialog with a 'Use sample destination' button and a real test-connection state; SID defaults from the URL host; make the destination switcher read the destinations list | 3 with sample | features/sap/components/DestinationDialog.tsx, pages/SystemConfigurationPage.tsx, components/DestinationSwitcher.tsx; features/dashboard/components/DashboardSidebar.tsx |
| 6 | Upload an invoice (reach + upload) | 7 (reach 4 + upload 3); palette 5 | Put Invoices in the Cloud Cost menu for every org that has the module; palette 'Upload invoice' opens the file chooser; accept a dropped file anywhere on the page; detect the provider from the file name | 3 (menu 2, file chooser, auto-submit) | app/router/navConfig.ts; features/invoices/pages/InvoicesPage.tsx; app/layouts/pageSearch.ts |
| 7 | Delete an invoice (reach + delete) | 7 (reach 4 + delete 3) | Menu entry (above) and a row trash action with an Undo toast in place of the confirm dialog | 3 (menu 2 + trash, undo toast) | features/invoices/pages/InvoicesPage.tsx; shared/ui/ConfirmProvider.tsx |
| 8 | Edit permissions of an existing custom role | 7 (7 clicks) | Role row and drawer 'Edit permissions' open the matrix with that role selected and its first area open; remember the last tab; keep the draft when switching tabs | 4 (menu 2, row action, switch + Save) | features/users/pages/UserManagementPage.tsx; features/access/components (PermissionExplorer) |
| 9 | Add a user with a chosen role | 8 (6 clicks + 2 fields); default role 7; palette 7 | Role chips in the dialog (remember the last role), pre-tick provider access from the role, add-another | 5 with a chosen role; 4 default | features/users/components (AddUserDialog) |
| 10 | Security notes: upload then resolve status | 6 (5 clicks + 1 field); upload only 5; palette upload 5 | Run Check Status automatically after Upload (checkbox, on by default); bulk delete | 3 on the page (Upload, numbers, Upload; Check Status runs by itself) | features/sap/pages/SecurityNotesPage.tsx, components (UploadNotesDialog), model |
| 11 | Add a custom role and give it permissions | 8 (6 clicks + 1 field + 1 key) | 'Start from' defaults to a copy of the Analyst role; the role dialog saves and opens the matrix on the right module | 5 | features/users/pages/UserManagementPage.tsx; features/users/components (RoleDialog) |
| 12 | Pay an invoice | 4 (4 clicks) | Pre-select the first unpaid invoice; show Pay Now on the list row | 3 (menu 2 + Pay Now) | features/billing/pages/BillingPage.tsx, components |
| 13 | Add a notification channel | 6 (5 clicks + 1 field) | Default recipient = signed-in user's e-mail; Add channel in the page header on both tabs | 4 | features/budgets/pages/BudgetsPage.tsx, components/AddChannelDialog.tsx |
| 14 | Create a budget | 5 (3 clicks + 2 fields); palette 6 | Suggest a name and a limit from the spend trend; submit with Enter; one entry point (Cost Overview 'create one' link is a hard reload) | 4 (menu 2, amount, Enter) | features/budgets/pages/BudgetsPage.tsx; features/cloud/pages/CostOverviewPage.tsx |
| 15 | Open a provider account detail | 3 | Single connected account opens directly from the menu item; 'last viewed account' tile on the Dashboard | 2 (1 from the Dashboard tile) | features/azure/pages/AzureRoot.tsx (and AWS, GCP, BTP roots); features/dashboard/pages/HomePage.tsx |
| 16 | Switch to Operations or Technical view | 4 | Shared CostViewTabs on TabBar + useHashTab (+ remembered per account) replaces 4 copied navs | 3 the first time, 0 extra afterwards | features/azure/pages/AzureCostPage.tsx, aws/pages/AwsCostPage.tsx, gcp/pages/GcpCostPage.tsx, btp/pages/BtpCostPage.tsx; shared/ui/TabBar.tsx |
| 17 | Start a guided tour | first time 2; returning 3 | Visible 'Tour' button in every page header and a palette 'Take the tour' action | 1 | features/assistant/components/GuidedTour.tsx, AssistantWidget.tsx; app/layouts/pageSearch.ts |
| 18 | Resolve a cost alert from the Dashboard | 2 (lands on the list, not the alert) | Resolve and Ignore inline on 'Needs attention' rows; unify the five unconnected alert sources | 1 | features/dashboard/pages/HomePage.tsx, model/useDashboardData.ts; data-access/repositories/smartAlertsRepository.ts |
| 19 | Change the spend period on Cost Overview | 3 | Remember the period (useRememberedState) and put it in the URL | 3 the first time, 2 afterwards (menu only) | features/cloud/pages/CostOverviewPage.tsx |
| 20 | Reach /alerts, /invoices, /ai-assistant | /alerts 1 (Dashboard link only), /invoices 4, /ai-assistant 4 | Add the three to their natural menus (Alerts under Cloud Cost > Governance, Invoices, AI Assistant) and to the palette results | 2 each | app/router/navConfig.ts, route-manifest.ts; app/layouts/pageSearch.ts |
| 21 | Open the critical system from SAP Overview | not possible (dead end) | Make system rows ClickableRow: open the HANA page for that system or a detail drawer; pills become FilterChips | 3 (menu 2 + row) | features/sap/pages/SapOverviewPage.tsx, components/SapSystemsPanel.tsx |
| 22 | Open HANA backup details | 4 | Remember the HANA tab; make backup markers keyboard-focusable buttons that open the detail | 3 (menu 2 + marker) when #backups is remembered | features/sap/pages/HanaMonitoringPage.tsx, components (HanaBackupTimeline) |
| 23 | Delete a security note | 4 (4 clicks) | Row trash with an Undo toast instead of a confirm; bulk select + delete | 3 | features/sap/pages/SecurityNotesPage.tsx; shared/ui/SelectionBar.tsx |
| 24 | Request a plan | 5 | Show plans on the same tab as the current plan; Request plan from the profile menu | 4 | features/subscription/pages/SubscriptionPage.tsx |
| 25 | Forgot password and other public-page reach | /forgot-password 3; /register has no inbound link | Link /register from /company-signup and /login help text (sign-in flow itself is out of scope, so only add the register link on /company-signup) | 2 | features/auth/pages/CompanySignupPage.tsx, RegisterPage.tsx |

Cross-cutting fixes that remove friction on many pages at once (not counted as separate rows above):

- Make ConfirmProvider and every hand-written modal use `useModalOverlay`: Escape, focus trap and focus return are missing on all confirms, the invoice upload modal, the connect wizard, the invoice-send modals and 4 chart dialogs (`shared/ui/ConfirmProvider.tsx`, `ConnectCloudAccountWizard.tsx`, `InvoicesPage.tsx`, `BarSeriesChart`, `DonutChart`, `SpendTrendChart`).
- Replace the 6 plain `<a href>` links on Cost Overview with `Link`: today each one reloads the app and wipes the in-memory demo state (`features/cloud/pages/CostOverviewPage.tsx`).
- Move the floating assistant launcher out of the way of drawer footers: it covers the primary button of the Optimization drawer (and any right-aligned drawer action); measured, the click had to be placed on the button's left edge.
- Inner scrollbars: 3 tables scroll vertically inside a wrapper at 1440 (Jobs, Cost Analytics, Resource Inventory) and 12 scroll horizontally at 390 (SAP Overview, Performance, Jobs, BTP Security, Azure, AWS, BTP, Optimization, Billing, Users, Sync Logs, Alerts); the owner rule is no inner scrollbars (a stacked or card layout below the breakpoint, no max-height on the wrapper).
- Remove or wire the controls that look interactive but do nothing: SAP BTP Security (dead Refresh, empty tables), BTP service-instances Refresh, the Dashboard search box and its 3 Selects, `/alerts` (features/sap/pages/BtpSecurityPage.tsx, features/btp/pages/BtpServiceInstancesPage.tsx, features/dashboard/components/DashboardToolbar.tsx).
- Persist state in the URL: add the filter/period/view keys to `useHashTab`-style hooks so a link restores them (Cost Overview, Smart Alerts, SAP Alerts, Jobs chips, Audit, provider views).

## 9. Not automated, caveats, and how to rerun

- **Reach counts include no scrolling or waiting.** Menus open on click (hover never opens them), so 2 is the true minimum.
- **Picking a file in the OS dialog is not counted** (Playwright sets the file); the click that opens the picker is. A real user adds a few seconds, not a click.
- **Demo data limits.** Zero-account states cannot be reached with the six demo accounts (all have connected accounts), so empty-state verdicts are from code. The new empty-organisation account in the plan does not exist yet.
- **Estimated, not measured**: register steps, company-signup full flow, Reset password, super-admin organisation settings save, customer add, theme change on the page, composer typing on `/ai-assistant`, the Performance chip link. Each is labelled 'code count' in section 5.
- **Defects taken from code reading** and not re-verified in the browser: BTP region saved as `reporting`, AWS region hard-coded, GCP flow-guide targets that do not exist, the demo store lost when leaving `/aws`, `/gcp`, `/btp`. The Azure 'cannot open the new account' defect was measured (task `connect.azure-open`).
- **The Cost Overview wizard** did not finish saving at baseline (still 'Saving...' after 2.5 s: it posts to a real API); on the live tree it completes.
- **Moving target.** The baseline is commit `9a087dc`, served from a `git archive` copy so it is reproducible. The live tree differed from it by 114 modified files while this audit ran (command palette actions, provider account stores, assistant widget), so a handful of live numbers changed between my own two live runs; the table in section 3 shows the baseline and, after `/ now`, the live value from the last run.
- **Sign-in is untouched.** The harness uses the Demo mode card button for every session (1 click, not counted).

Rerun: from `D:\mavera` with the dev server on :5173, `python tools/visual/click_audit.py --json audit.json --md audit.md` (about 25 minutes for everything). Useful flags: `--only <id or group>` (for example `--only connect`, `--only palette`), `--list`, `--skip-layout`, `--layout-only`, `--keyboard-only`, `--extra-layout`, `--shots <dir>` (screenshot of each failed task), `--headed`. `BASE_URL` points it at another origin (for example a `git archive` copy of a commit served on another port, which is how the baseline here was pinned).
