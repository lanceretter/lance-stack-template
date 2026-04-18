#!/usr/bin/env bun
/**
 * doc-check.ts — verifies docs/agent/*.md coherence with the code.
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
 *
 * Drift mode (--drift) adds:
 *   5. For each .ts file in dependent_paths, extract exported symbols and
 *      warn if any aren't mentioned in the doc's prose. Noisy on purpose.
 *      Filters out Drizzle-internal patterns (*Relations, table exports
 *      already covered by the table name).
 *
 * Usage:
 *   bun run scripts/doc-check.ts            # PR gate: router + paths + front-matter
 *   bun run scripts/doc-check.ts --drift    # add symbol drift (for weekly cron)
 *   bun run scripts/doc-check.ts --json     # machine-readable JSON
 */

import { readdir, readFile } from "node:fs/promises";
import { existsSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { parseArgs } from "node:util";

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

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    json: { type: "boolean", default: false },
    drift: { type: "boolean", default: false },
  },
});

await checkRouter();
await checkAgentDocs({ symbolDrift: values.drift });

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
