"""Element-by-element computed-style comparison of one route between the baseline and the working tree."""
import os, sys, json
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.sync_api import sync_playwright

BASE = os.environ.get("BASE_URL", "http://localhost:5174")
NEW = os.environ.get("NEW_URL", "http://localhost:5173")
CREDS = ("superadmin", "Maitsys@2026") if os.environ.get("AUTH") == "admin" else ("demo@mavera.local", "Mavera@2026")
PROPS = ["display", "position", "marginTop", "marginRight", "marginBottom", "marginLeft", "paddingTop", "paddingRight",
         "paddingBottom", "paddingLeft", "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth",
         "borderTopStyle", "borderTopColor", "borderRightColor", "borderBottomColor", "borderLeftColor",
         "borderTopLeftRadius", "borderTopRightRadius", "borderBottomLeftRadius", "borderBottomRightRadius",
         "backgroundColor", "backgroundImage", "boxShadow", "color", "fontFamily", "fontSize", "fontWeight", "lineHeight",
         "letterSpacing", "textAlign", "textTransform", "textDecorationLine", "whiteSpace", "overflowX", "overflowY",
         "opacity", "gap", "gridTemplateColumns", "flexDirection", "flexWrap", "flexGrow", "flexShrink", "alignItems",
         "justifyContent", "zIndex", "transform", "cursor", "verticalAlign", "textOverflow", "minHeight", "minWidth",
         "maxWidth", "outlineStyle"]
JS = """(props) => {
  const out = [];
  const root = document.querySelector('#root');
  const walk = (el, path) => {
    if (['SCRIPT','STYLE','NOSCRIPT'].includes(el.tagName)) return;
    const cs = getComputedStyle(el), r = el.getBoundingClientRect(), rec = {path, tag: el.tagName.toLowerCase(),
      cls: (el.getAttribute('class')||'').toString().slice(0,90), text: (el.children.length? '' : (el.textContent||'').trim().slice(0,30)),
      rect: [Math.round(r.x*10)/10, Math.round(r.y*10)/10, Math.round(r.width*10)/10, Math.round(r.height*10)/10], s: {}};
    for (const p of props) rec.s[p] = cs[p];
    out.push(rec);
    [...el.children].forEach((c,i) => walk(c, path + '>' + c.tagName.toLowerCase() + i));
  };
  walk(root, 'root');
  return out;
}"""
FREEZE = "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}"

def collect(pw, base, route, theme, width):
    b = pw.chromium.launch()
    pg = b.new_context(viewport={"width": width, "height": 900}, reduced_motion="reduce").new_page()
    pg.goto(base + "/login"); pg.fill("input", CREDS[0]); pg.get_by_role("button", name="Continue").click()
    pg.wait_for_selector("input[type=password]"); pg.fill("input[type=password]", CREDS[1]); pg.keyboard.press("Enter")
    pg.wait_for_timeout(2500)
    pg.evaluate("t => document.documentElement.setAttribute('data-theme', t)", theme)
    pg.evaluate("r => { history.pushState({}, '', r); dispatchEvent(new PopStateEvent('popstate')); }", route)
    try: pg.wait_for_selector('[aria-busy="true"]', state="detached", timeout=8000)
    except Exception: pass
    pg.wait_for_timeout(1000); pg.add_style_tag(content=FREEZE)
    data = pg.evaluate(JS, PROPS); b.close(); return data

if __name__ == "__main__":
    route = sys.argv[1] if len(sys.argv) > 1 else "/"
    theme = sys.argv[2] if len(sys.argv) > 2 else "light"
    width = int(sys.argv[3]) if len(sys.argv) > 3 else 1440
    with sync_playwright() as p:
        a, n = collect(p, BASE, route, theme, width), collect(p, NEW, route, theme, width)
    if len(a) != len(n):
        print(f"DOM size differs: baseline {len(a)} elements, new {len(n)}; comparing the common prefix")
    groups = {}
    for x, y in zip(a, n):
        if x["path"] != y["path"]:
            print("STRUCTURE differs at", x["path"], "vs", y["path"]); break
        diffs = {k: (x["s"][k], y["s"][k]) for k in PROPS if x["s"][k] != y["s"][k]}
        if x["rect"] != y["rect"]: diffs["rect"] = (x["rect"], y["rect"])
        if diffs:
            key = (x["tag"], x["cls"], tuple(sorted(diffs)))
            g = groups.setdefault(key, {"n": 0, "ex": (x, y, diffs)}); g["n"] += 1
    print(f"{route} [{theme} {width}px]: {sum(g['n'] for g in groups.values())} differing elements in {len(groups)} groups")
    for (tag, cls, _), g in sorted(groups.items(), key=lambda kv: -kv[1]["n"])[:25]:
        x, y, diffs = g["ex"]
        print(f"- x{g['n']} <{tag} class=\"{cls}\"> '{x['text']}'")
        for k, (u, v) in list(diffs.items())[:6]: print(f"     {k}: {u}  ->  {v}")
