import fs from "node:fs";
import path from "node:path";

/*
 * Architecture boundaries for Mavera, following the Maitsys standard in rule.md and the same
 * layout and checks as Consultant Pulse (src/app, src/features, src/shared, src/data-access,
 * src/demo). Run with `npm run check:architecture`; `npm run verify` runs it before the build.
 */
const repositoryRoot = path.resolve(process.cwd());
const sourceRoot = path.join(repositoryRoot, "src");
const violations = [];
const fail = (message) => violations.push(message);

function walk(directory, output = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(absolute, output);
    else if (entry.isFile()) output.push(absolute);
  }
  return output;
}

const relative = (file) => path.relative(repositoryRoot, file).replaceAll("\\", "/");
const sourceFiles = walk(sourceRoot).map(relative);
const codeFiles = sourceFiles.filter((file) => /\.(?:ts|tsx)$/.test(file));
const cssFiles = sourceFiles.filter((file) => file.endsWith(".css"));
const isTest = (file) => /\.test\.(?:ts|tsx)$/.test(file) || file.startsWith("src/test/");
const read = (file) => fs.readFileSync(path.join(repositoryRoot, file), "utf8");

/* Comments are not code: strip block comments and whole-line `//` comments before pattern checks. */
/**
 * Removes // and block comments but leaves string literals alone, so a route such as
 * '/aws/*' isn't mistaken for the start of a comment (which used to swallow everything up to
 * the next comment close, hiding route entries from the checks below).
 */
const stripComments = (text) => {
  let out = "";
  let quote = null;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];
    if (quote) {
      out += ch;
      if (ch === "\\") { out += next ?? ""; i += 1; }
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === "`") { quote = ch; out += ch; continue; }
    if (ch === "/" && next === "*") {
      const end = text.indexOf("*/", i + 2);
      const comment = text.slice(i, end === -1 ? text.length : end + 2);
      out += comment.replace(/[^\n]/g, "");
      i = end === -1 ? text.length : end + 1;
      continue;
    }
    if (ch === "/" && next === "/") {
      while (i < text.length && text[i] !== "\n") i += 1;
      out += "\n";
      continue;
    }
    out += ch;
  }
  return out;
};

/* ---- Folder layout ------------------------------------------------------------------------ */
const allowedTopLevel = new Set(["app", "features", "shared", "data-access", "demo", "styles", "assets", "test"]);
const allowedRootFiles = new Set(["src/main.tsx", "src/vite-env.d.ts"]);
for (const file of sourceFiles) {
  const segments = file.split("/");
  if (segments.length === 2) {
    if (!allowedRootFiles.has(file)) fail(`${file}: application code must belong to app, features, shared, data-access, or demo`);
  } else if (!allowedTopLevel.has(segments[1])) {
    fail(`${file}: src/${segments[1]} is not a recognised top-level folder`);
  }
}

/* ---- Styling ------------------------------------------------------------------------------ */
const allowedCssFiles = new Set(["src/styles/app.css", "src/styles/fonts.css", "src/styles/tailwind.css"]);
for (const file of cssFiles) {
  if (!allowedCssFiles.has(file)) fail(`${file}: global CSS lives only in src/styles (app.css, fonts.css)`);
}
if (fs.existsSync(path.join(sourceRoot, "styles", "app.css"))) {
  const appCss = read("src/styles/app.css");
  if (!/\[data-theme="dark"\]/.test(appCss)) fail("src/styles/app.css: the dark theme token block is missing");
  if (!/@media\s*\(prefers-reduced-motion:\s*reduce\)/.test(appCss)) fail("src/styles/app.css: reduced-motion handling is missing");
  if (!/:focus-visible/.test(appCss)) fail("src/styles/app.css: keyboard focus styles are missing");
}

/* ---- Import graph ------------------------------------------------------------------------- */
const IMPORT = /\b(import|export)(\s+type)?(\s*(?:\{[^}]*\}|\*\s+as\s+\w+|[\w$]+(?:\s*,\s*\{[^}]*\})?)?\s*from)?\s*(['"])(\.{1,2}(?:\/[^'"]*)?)\4/g;
const DYNAMIC_IMPORT = /\bimport\s*\(\s*(['"])(\.{1,2}\/[^'"]*)\1\s*\)/g;

function resolveImport(importer, specifier) {
  const base = path.resolve(path.dirname(path.join(repositoryRoot, importer)), specifier.split("?")[0]);
  const candidates = [base, `${base}.ts`, `${base}.tsx`, `${base}.css`, path.join(base, "index.ts"), path.join(base, "index.tsx")];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return relative(candidate);
  }
  return null;
}

function areaOf(file) {
  const feature = file.match(/^src\/features\/([^/]+)\//);
  if (feature) return { kind: "feature", name: feature[1], key: `features/${feature[1]}` };
  const top = file.split("/")[1];
  return { kind: top, name: top, key: top };
}

function importsOf(file) {
  const text = stripComments(read(file));
  const found = [];
  for (const match of text.matchAll(IMPORT)) {
    const [, , typeKeyword, clause, , specifier] = match;
    const named = clause ? clause.match(/\{([^}]*)\}/) : null;
    const everyNamedIsType = named ? named[1].split(",").map((part) => part.trim()).filter(Boolean).every((part) => part.startsWith("type ")) : false;
    // `import "./x.css"` has no clause; `export const x = "./y"` never matches (needs from/import keyword form)
    if (!clause && match[1] === "export") continue;
    found.push({ specifier, typeOnly: Boolean(typeKeyword) || everyNamedIsType });
  }
  for (const match of text.matchAll(DYNAMIC_IMPORT)) found.push({ specifier: match[2], typeOnly: false });
  return found;
}

const baselinePath = path.join(repositoryRoot, "tools", "architecture-baseline.json");
const baseline = fs.existsSync(baselinePath) ? JSON.parse(fs.readFileSync(baselinePath, "utf8")) : { demoImports: [] };
const demoImportBaseline = new Set(baseline.demoImports);
const actualDemoImporters = new Set();
const featureEdges = new Map(); // feature key -> Set(feature key), value-level imports only

for (const file of codeFiles) {
  const me = areaOf(file);
  const content = stripComments(read(file));
  const test = isTest(file);

  if (!test && /\bfetch\s*\(/.test(content) && !file.startsWith("src/data-access/rest/")) fail(`${file}: direct fetch is only allowed in src/data-access/rest`);
  if (!test && /from\s+["']axios["']/.test(content) && !file.startsWith("src/data-access/rest/")) fail(`${file}: axios may only be imported in src/data-access/rest`);
  if (/import\.meta\.env\b/.test(content) && file !== "src/app/config/environment.ts" && !file.endsWith(".d.ts")) fail(`${file}: runtime environment access must go through app/config/environment`);

  for (const { specifier, typeOnly } of importsOf(file)) {
    const target = resolveImport(file, specifier);
    if (!target) continue;
    const them = areaOf(target);
    if (me.key === them.key) continue;

    // data-access is entered only through its index.ts (tests may mock internals by path).
    if (them.kind === "data-access" && me.kind !== "data-access" && target !== "src/data-access/index.ts" && !test) {
      fail(`${file}: imports ${specifier}; use the data-access index.ts, not its internals`);
    }
    // shared is product-neutral: it must not know about app, features, data access or demo data.
    if (me.kind === "shared" && ["app", "feature", "data-access", "demo"].includes(them.kind) && !test) {
      fail(`${file}: shared code must not depend on ${them.kind === "feature" ? "feature" : them.kind} code (${specifier})`);
    }
    // A feature is reached only through its public index.ts — from other features, app and demo alike.
    if (them.kind === "feature" && target !== `src/features/${them.name}/index.ts` && (me.kind === "feature" || me.kind === "app" || me.kind === "demo") && !test) {
      fail(`${file}: imports ${specifier}; use the ${them.name} feature's index.ts`);
    }
    // Demo fixtures conform to feature types but must not execute feature code.
    if (me.kind === "demo" && them.kind === "feature" && !typeOnly && !test) fail(`${file}: demo may only import types from features (use import type)`);
    // Seeded data is imported by features only through the recorded baseline (ratchet: it may only shrink).
    if (them.kind === "demo" && (me.kind === "feature" || me.kind === "app") && !test) actualDemoImporters.add(file);
    // Pure helper files shared by demo and features live in shared/domain; app may not be imported by features.
    if (me.kind === "feature" && them.kind === "app" && target !== "src/app/config/environment.ts") fail(`${file}: features must not import from app (${specifier})`);

    if (me.kind === "feature" && them.kind === "feature" && !typeOnly && !test) {
      const edges = featureEdges.get(me.key) ?? new Set();
      featureEdges.set(me.key, edges);
      edges.add(them.key);
    }
  }
}

for (const file of actualDemoImporters) {
  if (!demoImportBaseline.has(file)) fail(`${file}: imports demo fixtures; add a repository in src/data-access instead (see docs/adr/0002-removable-demo-source.md)`);
}
for (const file of demoImportBaseline) {
  if (!actualDemoImporters.has(file)) fail(`tools/architecture-baseline.json: ${file} no longer imports demo fixtures; remove it from the baseline`);
}

/* ---- Feature cycles ----------------------------------------------------------------------- */
{
  let counter = 0;
  const stack = [];
  const onStack = new Set();
  const index = new Map();
  const low = new Map();
  const visit = (node) => {
    index.set(node, counter);
    low.set(node, counter++);
    stack.push(node);
    onStack.add(node);
    for (const next of featureEdges.get(node) ?? []) {
      if (!index.has(next)) {
        visit(next);
        low.set(node, Math.min(low.get(node), low.get(next)));
      } else if (onStack.has(next)) low.set(node, Math.min(low.get(node), index.get(next)));
    }
    if (low.get(node) === index.get(node)) {
      const component = [];
      let member;
      do {
        member = stack.pop();
        onStack.delete(member);
        component.push(member);
      } while (member !== node);
      if (component.length > 1) fail(`circular dependency between features: ${component.sort().join(" <-> ")}`);
    }
  };
  for (const node of featureEdges.keys()) if (!index.has(node)) visit(node);
}

/* ---- Feature entrypoints ------------------------------------------------------------------ */
const featureRoot = path.join(sourceRoot, "features");
for (const entry of fs.readdirSync(featureRoot, { withFileTypes: true })) {
  if (entry.isDirectory() && !fs.existsSync(path.join(featureRoot, entry.name, "index.ts"))) fail(`src/features/${entry.name}: missing public index.ts`);
}

/* ---- Route manifest ----------------------------------------------------------------------- */
const manifestFile = "src/app/router/route-manifest.ts";
const routesFile = "src/app/router/AppRoutes.tsx";
const manifestSource = stripComments(read(manifestFile));
const routesSource = stripComments(read(routesFile));
const manifestPaths = [...manifestSource.matchAll(/path:\s*appPaths\.(\w+)/g)].map((match) => match[1]);
const duplicatePaths = manifestPaths.filter((key, position) => manifestPaths.indexOf(key) !== position);
if (duplicatePaths.length) fail(`${manifestFile}: duplicate route entries ${[...new Set(duplicatePaths)].join(", ")}`);
const manifestIds = [...manifestSource.matchAll(/\bid:\s*'([^']+)'/g)].map((match) => match[1]);
const duplicateIds = manifestIds.filter((id, position) => manifestIds.indexOf(id) !== position);
if (duplicateIds.length) fail(`${manifestFile}: duplicate route ids ${[...new Set(duplicateIds)].join(", ")}`);
if (/<Route\s+path=["']/.test(routesSource)) fail(`${routesFile}: route paths must come from route-manifest.ts`);
const appPathsBlock = manifestSource.match(/export const appPaths = \{([\s\S]*?)\} as const;/);
if (appPathsBlock) {
  const declared = [...appPathsBlock[1].matchAll(/^\s*(\w+):/gm)].map((match) => match[1]);
  for (const key of declared) {
    if (!manifestPaths.includes(key)) fail(`${manifestFile}: appPaths.${key} has no route manifest entry`);
  }
}

if (violations.length) {
  console.error("Architecture check failed:\n" + violations.map((item) => `- ${item}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Architecture check passed (${codeFiles.length} TypeScript files, ${manifestPaths.length} registered route definitions, ${actualDemoImporters.size} baselined demo imports).`);
}
