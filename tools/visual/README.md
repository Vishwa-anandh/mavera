# Visual regression tools for the Tailwind migration

Both scripts compare the **working tree** (dev server on :5173) against a **baseline checkout** of the last
known-good commit (dev server on :5174). A migration step is "done" when both report nothing.

Setup (once): `git worktree add ../mavera-base <commit>`, junction/symlink `node_modules` into it, copy `.env`,
then `npx vite --port 5174 --strictPort` inside it. Requires Python 3 with `playwright` and `pillow`.

- `vdiff.py [light|dark] [member|admin]`: full-page screenshots of every route at 1440 and 390 px, pixel-compared.
- `cdiff.py <route> [light|dark] [width]`: element-by-element computed-style comparison of one route. Use it to find
  *which* element and *which* CSS property changed when `vdiff.py` flags a route.

Set `BASE_URL` / `NEW_URL` to override the two origins. Set `AUTH=admin` for super-admin routes.
