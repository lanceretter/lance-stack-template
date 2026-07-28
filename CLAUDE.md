# lance-stack-template

This repo is the canonical documentation set for Lance's personal stack:
how to set up a new Mac (`NEW-MACHINE-SETUP.md`), the full stack architecture
(`STACK.md`), the mobile pipeline (`MOBILE-APP.md`), auth conventions
(`BETTER-AUTH.md`), and the AI chat surface (`AI-CHAT.md`). It is a docs
repo — no source code lives here.

## Brand / logo assets

Canonical Conquest Solutions logo kit lives in **[`brand/`](./brand/)** —
true-vector SVGs + PNG renders + the print-master PDF, in every lockup
(horizontal / stacked / mark) and variant (color / white-knockout / all-black /
all-white). For ANY Conquest Solutions logo request, use these; do not pull
stale copies from old decks. See [`brand/README.md`](./brand/README.md) for the
index, color standard (`#CC0001`), and quick picks.

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore

## GBrain Search Guidance (configured by /sync-gbrain)
<!-- gstack-gbrain-search-guidance:start -->

GBrain is set up and synced on this machine. The local `.gbrain-source` pin
records intended source `gstack-docs-lance-stack-template`, but some read
commands can still return federated results. Prefer gbrain when the question is
semantic or when you do not know the exact identifier yet:

- `gbrain search "<query>"`
- `gbrain query "<question>"`

`gbrain code-def` and `gbrain code-refs` are useful for symbol lookup, but in
the current CLI path they are global across indexed code pages. Verify returned
file paths before treating them as repo-local.

For fast-moving provider APIs (AI voice/realtime, payments, auth, cloud
runtime knobs), do not rely on memory or old examples alone. Use gbrain to find
the repo's local decision docs, then verify current official provider docs
before changing behavior. When a provider-specific lesson is learned, update
the local docs and run `/sync-gbrain` so future agents retrieve the corrected
guidance instead of repeating stale assumptions.

Use `rg` for known exact strings, regex, multiline patterns, and file globs.
Run `/sync-gbrain` after meaningful doc changes; for ongoing auto-sync across
all worktrees, run `gbrain autopilot --install` once per machine.

<!-- gstack-gbrain-search-guidance:end -->
