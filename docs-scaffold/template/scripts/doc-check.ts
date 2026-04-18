#!/usr/bin/env bun
/**
 * doc-check.ts — verifies docs coherence with the code.
 *
 * Covers three doc surfaces in this monorepo:
 *   A. Root router   -- AGENTS.md at repo root
 *   B. Cross-cutting -- docs/agent/*.md
 *   C. App-local     -- apps/<app>/AGENTS.md and packages/<pkg>/AGENTS.md
 *
 * Runs in two modes. Default mode is the per-PR CI gate: fast, low-noise,
 * only flags concrete drift that's almost certainly a real doc bug. Drift
 * mode (--drift) is the weekly staleness scan: broader, noisier, used to
 * surface "you added a symbol but didn't mention it" hints in a tracking
 * issue, not to gate PRs.
 *
 * Default mode checks:
 *   1. Router — every `docs/agent/<name>.md` referenced in AGENTS.md exists.
 *   2. Front-matter — every doc has last_verified (YYYY-MM-DD) and
 *      non-empty dependent_paths (except `_*.md` rollup docs).
 *   3. dependent_paths existence — every entry exists on disk.
 *   4. Inline backticked paths in prose exist.
 *   5. App-local scope -- each apps/<app>/AGENTS.md may only claim
 *      dependent_paths inside its own directory or packages/. Keeps
 *      ownership tidy so agents don't find conflicting truth about the
 *      same code.
 *   6. Orphan check -- every apps/*\/AGENTS.md and packages/*\/AGENTS.md
 *      must be linked from the root AGENTS.md router.
 *
 * PR mode (--pr-base=<sha>) adds:
 *   7. last_verified enforcement -- if any file in a doc's dependent_paths
 *      changed between base and HEAD, the doc itself must also be in the
 *      diff with a bumped last_verified date. Closes the "changed the code
 *      but forgot to re-read the doc" accuracy gap.
 *
 * Drift mode (--drift) adds:
 *   8. For each .ts file in dependent_paths, extract exported symbols and
 *      warn if any aren't mentioned in the doc's prose. Noisy on purpose.
 *      Filters out Drizzle-internal patterns (*Relations, table exports
 *      already covered by the table name).
 *
 * Usage:
 *   bun run scripts/doc-check.ts                         # local: router + paths + front-matter + scope
 *   bun run scripts/doc-check.ts --pr-base=origin/main   # PR CI: add last_verified-bump enforcement
 *   bun run scripts/doc-check.ts --drift                 # add symbol drift (for weekly cron)
 *   bun run scripts/doc-check.ts --json                  # machine-readable JSON
 */

import { readdir, readFile } from "node:fs/promises";
import { existsSync, statSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { parseArgs } from "node:util";
import { execSync } from "node:child_process";

const REPO_ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");

interface Finding {
  severity: "error" | "warn";
  file: string;
  message: string;
}

const findings: Finding[] = [];

function err(file: string, message: string) {
  findings.push({ severity: "error", file, message });
}

function warn(file: string, message: string) {
  findings.push({ severity: "warn", file, message });
}

/**
 * Parse the simple YAML-style front-matter between `---` delimiters at the
 * top of a markdown file. Returns an object with string[] for list values.
 */
function parseFrontMatter(content: string): Record<string, string | string[]> {
  const match = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return {};

  const fm: Record<string, string | string[]> = {};
  let currentKey: string | null = null;
  let currentList: string[] | null = null;

  for (const line of match[1]!.split("\n")) {
    if (!line.trim()) continue;

    const listItem = line.match(/^\s+-\s*(.+)$/);
    if (listItem && currentKey && currentList) {
      currentList.push(listItem[1]!.trim());
      continue;
    }

    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (kv) {
      currentKey = kv[1]!;
      const val = kv[2]!.trim();
      if (val === "") {
        currentList = [];
        fm[currentKey] = currentList;
      } else {
        fm[currentKey] = val;
        currentList = null;
      }
    }
  }
  return fm;
}

/** Conservative inline-path extraction from prose. Only backticked paths. */
function extractInlinePaths(content: string): string[] {
  const paths = new Set<string>();
  const backtickMatches = content.matchAll(
    /`((?:apps|packages|migrations|scripts|docs|\.github)\/[A-Za-z0-9_./-]+)`/g
  );
  for (const m of backtickMatches) {
    const raw = m[1]!;
    const cleaned = raw.replace(/:[0-9]+(?::[0-9]+)?$/, "").replace(/\/\*+$/, "");
    paths.add(cleaned);
  }
  return [...paths];
}

/** Check whether a path exists. */
function pathExists(p: string): boolean {
  return existsSync(join(REPO_ROOT, p));
}

/**
 * Extract markdown links [text](target) from prose. Filters out external
 * URLs and anchor-only links; returns the relative path portion so callers
 * can resolve it against the source doc's directory.
 */
function extractMarkdownLinks(content: string): Array<{ text: string; target: string }> {
  const out: Array<{ text: string; target: string }> = [];
  // Non-greedy on [..] to avoid matching across multiple links.
  // Skip images (![text](...)).
  const re = /(?<!\!)\[([^\]]+)\]\(([^)]+)\)/g;
  for (const m of content.matchAll(re)) {
    const text = m[1]!;
    let target = m[2]!.trim();
    // Strip optional "title" after whitespace: [x](path "title")
    target = target.split(/\s+/)[0]!;
    // Strip #anchor for existence check — file must exist, anchor just lives in it
    const hashIdx = target.indexOf("#");
    if (hashIdx === 0) continue; // anchor-only, no file to check
    if (hashIdx > 0) target = target.slice(0, hashIdx);
    // Skip absolute URLs and non-file schemes
    if (/^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
    // Skip mailto already handled above; skip empty
    if (!target) continue;
    out.push({ text, target });
  }
  return out;
}

/**
 * Validate markdown links inside a doc. Relative paths resolve against the
 * doc's own directory; repo-absolute paths resolve against REPO_ROOT.
 */
function checkMarkdownLinks(relDocPath: string, content: string) {
  const docDir = relDocPath.includes("/")
    ? relDocPath.slice(0, relDocPath.lastIndexOf("/"))
    : "";
  for (const { text, target } of extractMarkdownLinks(content)) {
    // Normalize: if target starts with "/", treat as repo-relative.
    let resolved: string;
    if (target.startsWith("/")) {
      resolved = target.slice(1);
    } else {
      resolved = docDir ? `${docDir}/${target}` : target;
      // Normalize .. and .
      const parts: string[] = [];
      for (const p of resolved.split("/")) {
        if (p === "" || p === ".") continue;
        if (p === "..") parts.pop();
        else parts.push(p);
      }
      resolved = parts.join("/");
    }
    if (!pathExists(resolved)) {
      warn(
        relDocPath,
        `broken markdown link: [${text}](${target}) — resolves to ${resolved} (does not exist)`
      );
    }
  }
}

/**
 * Extract exported top-level symbols from a TypeScript file.
 *
 * Cheap regex pass — we're not building a TS AST. Catches the common
 * patterns our codebase uses: `export function foo`, `export const foo`,
 * `export class Foo`, `export type Foo`, `export interface Foo`,
 * `export enum Foo`, and drizzle `export const orgs = pgTable(...)`.
 *
 * Private / non-exported symbols are ignored — docs should only track
 * the public surface area.
 */
/**
 * Symbol names we treat as noise in drift checks. Drizzle-internal patterns,
 * enum definitions that are obvious from the table name, etc.
 */
function isNoiseSymbol(sym: string): boolean {
  // Drizzle relations — always internal implementation detail
  if (sym.endsWith("Relations")) return true;
  // Env interface — documented implicitly via env var docs
  if (sym === "Env") return true;
  // Drizzle enums — usually obvious from schema file name
  if (sym.endsWith("Enum")) return true;
  // Drizzle DB type helpers — internal
  if (sym === "DrizzleDb") return true;
  // Type-only aliases for internal generics
  if (/^[A-Z][a-zA-Z]*(Params|Result|Context|Handler|Counts)$/.test(sym)) return true;
  return false;
}

function extractExportedSymbols(content: string): string[] {
  const symbols = new Set<string>();
  const patterns = [
    /^export\s+(?:async\s+)?function\s+(\w+)/gm,
    /^export\s+class\s+(\w+)/gm,
    /^export\s+(?:abstract\s+)?interface\s+(\w+)/gm,
    /^export\s+type\s+(\w+)/gm,
    /^export\s+enum\s+(\w+)/gm,
    /^export\s+const\s+(\w+)/gm,
  ];
  for (const re of patterns) {
    for (const m of content.matchAll(re)) {
      symbols.add(m[1]!);
    }
  }
  return [...symbols];
}

/** Recursively walk a directory collecting .ts files (skipping node_modules, tests). */
async function walkTsFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  const entries = await readdir(dir).catch(() => []);
  for (const entry of entries) {
    if (entry === "node_modules" || entry === "dist" || entry === ".turbo") continue;
    const abs = join(dir, entry);
    const s = statSync(abs);
    if (s.isDirectory()) {
      out.push(...(await walkTsFiles(abs)));
    } else if (
      entry.endsWith(".ts") &&
      !entry.endsWith(".test.ts") &&
      !entry.endsWith(".d.ts")
    ) {
      out.push(abs);
    }
  }
  return out;
}

/** Check 1: Router links in AGENTS.md must point at existing docs. */
async function checkRouter() {
  const agentsPath = join(REPO_ROOT, "AGENTS.md");
  if (!existsSync(agentsPath)) {
    err("AGENTS.md", "AGENTS.md does not exist at repo root");
    return;
  }
  const content = await readFile(agentsPath, "utf8");
  const matches = content.matchAll(/\(docs\/agent\/([a-zA-Z0-9_-]+\.md)\)/g);
  const seen = new Set<string>();
  for (const m of matches) {
    const filename = m[1]!;
    if (seen.has(filename)) continue;
    seen.add(filename);
    const target = `docs/agent/${filename}`;
    if (!pathExists(target)) {
      err("AGENTS.md", `router references missing doc: ${target}`);
    }
  }
  // Also check generic markdown links in the router itself
  checkMarkdownLinks("AGENTS.md", content);
}

/** Checks 2-5: per-doc front-matter + path + symbol drift. */
async function checkAgentDocs(opts: { symbolDrift: boolean }) {
  const agentDir = join(REPO_ROOT, "docs/agent");
  if (!existsSync(agentDir)) return;

  const entries = await readdir(agentDir);
  for (const entry of entries) {
    if (!entry.endsWith(".md")) continue;
    const relPath = `docs/agent/${entry}`;
    const content = await readFile(join(agentDir, entry), "utf8");
    const fm = parseFrontMatter(content);

    // last_verified: required, YYYY-MM-DD
    const verified = fm.last_verified;
    if (!verified || Array.isArray(verified)) {
      warn(relPath, `missing or invalid last_verified in front-matter`);
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(verified)) {
      warn(relPath, `last_verified not YYYY-MM-DD: ${verified}`);
    }

    // dependent_paths: each entry must exist on disk.
    // Files starting with _ (like _TIMELINE.md) are exempt — they're roll-ups
    // with no single source dependency.
    const deps = fm.dependent_paths;
    const isRollup = entry.startsWith("_");
    if (!isRollup) {
      if (!Array.isArray(deps) || deps.length === 0) {
        warn(
          relPath,
          `missing dependent_paths in front-matter (required for non-rollup docs)`
        );
      } else {
        for (const dep of deps) {
          if (!pathExists(dep)) {
            err(relPath, `dependent_paths entry does not exist: ${dep}`);
          }
        }
      }
    }

    // Inline backticked paths in prose must exist.
    for (const p of extractInlinePaths(content)) {
      if (!pathExists(p)) {
        warn(relPath, `backticked path does not exist: ${p}`);
      }
    }

    // Markdown link integrity
    checkMarkdownLinks(relPath, content);

    // Symbol drift (opt-in): warn if a .ts file in dependent_paths exports
    // symbols not mentioned in the doc. Filters Drizzle-internal noise
    // (*Relations, enums paired with their main table) so the signal is
    // "you added a new public API but didn't mention it" not "every schema
    // detail isn't enumerated."
    if (opts.symbolDrift && Array.isArray(deps)) {
      for (const dep of deps) {
        const abs = join(REPO_ROOT, dep);
        if (!existsSync(abs)) continue;

        let files: string[] = [];
        const s = statSync(abs);
        if (s.isFile() && dep.endsWith(".ts") && !dep.endsWith(".test.ts")) {
          files = [abs];
        } else if (s.isDirectory()) {
          files = await walkTsFiles(abs);
        }

        for (const file of files) {
          const src = await readFile(file, "utf8");
          const symbols = extractExportedSymbols(src);
          const missing = symbols
            .filter((sym) => !isNoiseSymbol(sym))
            .filter((sym) => !new RegExp(`\\b${sym}\\b`).test(content));
          if (missing.length > 0) {
            const fileRel = relative(REPO_ROOT, file);
            warn(
              relPath,
              `drift — ${fileRel} exports [${missing
                .slice(0, 5)
                .join(", ")}${missing.length > 5 ? ", ..." : ""}] not referenced (${missing.length} total)`
            );
          }
        }
      }
    }
  }
}

/**
 * README policy warning. When an app has both README.md and AGENTS.md,
 * the README should stay short and human-facing (install, quickstart,
 * pointer to AGENTS.md). Long READMEs alongside AGENTS.md create two
 * competing sources of truth — the canonical AGENTS.md drifts from the
 * README over time. This is a soft signal (warn, not error).
 */
const README_LINE_THRESHOLD = 80;
function checkReadmePolicy(appDir: string) {
  const readme = join(REPO_ROOT, appDir, "README.md");
  const agents = join(REPO_ROOT, appDir, "AGENTS.md");
  if (!existsSync(readme) || !existsSync(agents)) return;
  let lineCount = 0;
  try {
    const content = readFileSync(readme, "utf8");
    lineCount = content.split("\n").length;
  } catch {
    return;
  }
  if (lineCount > README_LINE_THRESHOLD) {
    warn(
      `${appDir}/README.md`,
      `README is ${lineCount} lines and AGENTS.md exists — trim README to a human-onboarding pointer (${README_LINE_THRESHOLD}-line soft cap), keep canonical info in AGENTS.md.`
    );
  }
}

/**
 * Check 6 + 7: scan apps/<app>/AGENTS.md and packages/<pkg>/AGENTS.md.
 *
 * For each app-local AGENTS.md:
 *   - Validate front-matter (same rules as docs/agent/)
 *   - Require dependent_paths to be scoped within that app or packages/
 *   - Require the file to be referenced from the root AGENTS.md router
 *   - Soft-warn if co-located README.md is over the size threshold
 */
async function checkAppDocs(opts: { symbolDrift: boolean; rootAgentsContent: string }) {
  for (const root of ["apps", "packages"]) {
    const rootDir = join(REPO_ROOT, root);
    if (!existsSync(rootDir)) continue;
    const apps = await readdir(rootDir).catch(() => []);

    for (const app of apps) {
      const absAgents = join(rootDir, app, "AGENTS.md");
      if (!existsSync(absAgents)) continue;
      const relPath = `${root}/${app}/AGENTS.md`;
      const content = await readFile(absAgents, "utf8");
      const fm = parseFrontMatter(content);

      // last_verified: required
      const verified = fm.last_verified;
      if (!verified || Array.isArray(verified)) {
        err(relPath, `missing last_verified in front-matter`);
      } else if (!/^\d{4}-\d{2}-\d{2}$/.test(verified)) {
        warn(relPath, `last_verified not YYYY-MM-DD: ${verified}`);
      }

      // dependent_paths: required + scope-checked
      const deps = fm.dependent_paths;
      if (!Array.isArray(deps) || deps.length === 0) {
        err(relPath, `missing dependent_paths in front-matter`);
      } else {
        const ownPrefix = `${root}/${app}/`;
        const ownExact = `${root}/${app}`;
        for (const dep of deps) {
          if (!pathExists(dep)) {
            err(relPath, `dependent_paths entry does not exist: ${dep}`);
          }
          const inOwnApp = dep === ownExact || dep.startsWith(ownPrefix);
          const inPackages = dep.startsWith("packages/");
          if (!inOwnApp && !inPackages) {
            err(
              relPath,
              `dependent_paths outside scope: "${dep}" (apps may only claim paths under "${ownPrefix}" or "packages/")`
            );
          }
        }
      }

      // Inline backticked paths must exist
      for (const p of extractInlinePaths(content)) {
        if (!pathExists(p)) {
          warn(relPath, `backticked path does not exist: ${p}`);
        }
      }

      // Markdown link integrity
      checkMarkdownLinks(relPath, content);

      // Orphan check — root router must link this file
      if (!rootAgentsContent.includes(relPath)) {
        err(
          relPath,
          `not referenced from root AGENTS.md router — add a row pointing at \`${relPath}\``
        );
      }

      // README co-location policy (soft warn)
      checkReadmePolicy(`${root}/${app}`);

      // Symbol drift (opt-in)
      if (opts.symbolDrift && Array.isArray(deps)) {
        for (const dep of deps) {
          const abs = join(REPO_ROOT, dep);
          if (!existsSync(abs)) continue;

          let files: string[] = [];
          const s = statSync(abs);
          if (s.isFile() && dep.endsWith(".ts") && !dep.endsWith(".test.ts")) {
            files = [abs];
          } else if (s.isDirectory()) {
            files = await walkTsFiles(abs);
          }

          for (const file of files) {
            const src = await readFile(file, "utf8");
            const symbols = extractExportedSymbols(src);
            const missing = symbols
              .filter((sym) => !isNoiseSymbol(sym))
              .filter((sym) => !new RegExp(`\\b${sym}\\b`).test(content));
            if (missing.length > 0) {
              const fileRel = relative(REPO_ROOT, file);
              warn(
                relPath,
                `drift — ${fileRel} exports [${missing
                  .slice(0, 5)
                  .join(", ")}${missing.length > 5 ? ", ..." : ""}] not referenced (${missing.length} total)`
              );
            }
          }
        }
      }
    }
  }
}

/**
 * PR-mode check (invoked with --pr-base=<sha>): enforce that any PR which
 * touches a file listed in some doc's dependent_paths also re-verifies that
 * doc. Closes the "author changed the code but forgot to re-read the doc"
 * accuracy gap — the most common source of doc rot.
 *
 * Rule: for every canonical doc (cross-cutting + app-local), if any
 * dependent_path changed between base and HEAD, then:
 *   - the doc itself must be in the diff, AND
 *   - its last_verified must be today (UTC) or later. "Today" makes the
 *     check friendly to same-day multi-PR flow — you can't accidentally
 *     skip re-reading, but you also don't have to bump an already-
 *     verified-today doc to a fake future date.
 *
 * Rollup docs (_TIMELINE.md etc.) are exempt — they have no dependent_paths.
 */
async function checkLastVerifiedBump(baseRef: string) {
  // All canonical doc paths this repo gates, in the order the checks above used.
  const docPaths: string[] = [];

  for (const f of await readdir(join(REPO_ROOT, "docs/agent")).catch(() => [])) {
    if (!f.endsWith(".md") || f.startsWith("_")) continue;
    docPaths.push(`docs/agent/${f}`);
  }
  for (const root of ["apps", "packages"]) {
    for (const d of await readdir(join(REPO_ROOT, root)).catch(() => [])) {
      const p = `${root}/${d}/AGENTS.md`;
      if (existsSync(join(REPO_ROOT, p))) docPaths.push(p);
    }
  }

  // Files changed in this PR
  let changedFiles: Set<string>;
  try {
    const out = execSync(`git diff --name-only ${baseRef}...HEAD`, {
      cwd: REPO_ROOT,
      encoding: "utf8",
    });
    changedFiles = new Set(out.split("\n").filter(Boolean));
  } catch (e) {
    warn(
      "AGENTS.md",
      `could not compute diff vs ${baseRef}: ${(e as Error).message}. Skipping last_verified check.`
    );
    return;
  }

  // Did any file under path p (file or directory) change?
  const depTouched = (depPath: string): boolean => {
    if (changedFiles.has(depPath)) return true;
    // Directory dep — any changed file under it
    const prefix = depPath.endsWith("/") ? depPath : depPath + "/";
    for (const f of changedFiles) {
      if (f.startsWith(prefix)) return true;
    }
    return false;
  };

  for (const docRel of docPaths) {
    const absDoc = join(REPO_ROOT, docRel);
    if (!existsSync(absDoc)) continue;

    const content = await readFile(absDoc, "utf8");
    const fm = parseFrontMatter(content);
    const deps = fm.dependent_paths;
    if (!Array.isArray(deps) || deps.length === 0) continue;

    const touchedDeps = deps.filter((d) => depTouched(d));
    if (touchedDeps.length === 0) continue;

    // PR touched covered code. Doc must be in the diff with a bumped last_verified.
    if (!changedFiles.has(docRel)) {
      err(
        docRel,
        `covered code changed without doc update. Touched by this PR: [${touchedDeps
          .slice(0, 3)
          .join(", ")}${touchedDeps.length > 3 ? ", ..." : ""}]. Re-read this doc, update anything that drifted, and bump last_verified.`
      );
      continue;
    }

    const headVerified = fm.last_verified;
    if (!headVerified || Array.isArray(headVerified)) {
      err(docRel, `doc was updated but has no last_verified — set it.`);
      continue;
    }

    const today = new Date().toISOString().slice(0, 10);
    if (headVerified < today) {
      err(
        docRel,
        `covered code changed but last_verified is ${headVerified} (before today). Re-read the doc against current code and set last_verified: ${today}.`
      );
    }
  }
}

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    json: { type: "boolean", default: false },
    drift: { type: "boolean", default: false },
    "pr-base": { type: "string" },
  },
});

await checkRouter();
await checkAgentDocs({ symbolDrift: values.drift });

// Preload root AGENTS.md once for the orphan check
const rootAgentsPath = join(REPO_ROOT, "AGENTS.md");
const rootAgentsContent = existsSync(rootAgentsPath)
  ? await readFile(rootAgentsPath, "utf8")
  : "";
await checkAppDocs({ symbolDrift: values.drift, rootAgentsContent });

// PR-only: enforce last_verified bump when covered code changed
if (values["pr-base"]) {
  await checkLastVerifiedBump(values["pr-base"]);
}

const errors = findings.filter((f) => f.severity === "error");
const warnings = findings.filter((f) => f.severity === "warn");

if (values.json) {
  console.log(
    JSON.stringify(
      { errors: errors.length, warnings: warnings.length, findings },
      null,
      2
    )
  );
} else {
  for (const f of findings) {
    const tag = f.severity === "error" ? "ERROR" : "WARN ";
    console.log(`${tag} ${f.file}: ${f.message}`);
  }
  console.log("");
  console.log(
    `doc-check: ${errors.length} error(s), ${warnings.length} warning(s)`
  );
}

// Errors fail CI. Warnings are informational.
process.exit(errors.length > 0 ? 1 : 0);
