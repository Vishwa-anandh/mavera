"""Replace legacy mv-* class tokens with Tailwind utilities across src/**/*.tsx (tests excluded).

usage: python codemod.py map.json [--dry]
map.json: {"mv-muted": "text-[0.8125rem] text-ink-muted", ...}. Selector uses (".mv-x", "'.mv-x'") are left alone.
"""
import re, sys, json, glob, os
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
mapping = json.load(open(sys.argv[1], encoding="utf-8"))
dry = "--dry" in sys.argv
pat = re.compile(r"(?<![\w.\-#\[])(" + "|".join(sorted(map(re.escape, mapping), key=len, reverse=True)) + r")(?![\w\-])")
total = 0
for f in glob.glob("src/**/*.tsx", recursive=True):
    if f.endswith(".test.tsx"): continue
    raw = open(f, encoding="utf-8", newline="").read()
    new, n = pat.subn(lambda m: mapping[m.group(1)], raw)
    if n:
        # collapse accidental double spaces inside class strings created by empty mappings
        new = re.sub(r'className="([^"]*)"', lambda m: 'className="' + " ".join(m.group(1).split()) + '"', new)
        total += n
        if not dry: open(f, "w", encoding="utf-8", newline="").write(new)
        print(f"{n:4} {f.replace(chr(92), '/')}")
print("total", total)
