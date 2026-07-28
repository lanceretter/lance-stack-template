# Conquest Solutions — Brand / Logo Kit

Canonical Conquest Solutions logo assets. Sourced from the original 2007
vector master (`CS logo 0707 187 red.pdf`, Bob Wilson, CorelDRAW). All SVGs
are **true vector** — no tracing, no grain. Use these for any Conquest
Solutions logo request instead of pulling stale copies from old decks.

> Full provenance + color history is in **[BRAND-NOTES.txt](./BRAND-NOTES.txt)**
> (Pantone lineage, per-variant purpose, wordmark font).

## Colors

| | Hex | Notes |
|---|---|---|
| Red | `#CC0001` | Working standard — matches 18 years of produced collateral. |
| Black | `#000000` | |

The 2007 source specified Pantone 187 (`#BF2F37`), but every file ever sent to
vendors used `#CC0001`, so `#CC0001` is the standard (owner decision 2026-07-21).
For **new** print jobs offering Pantone matching, **PMS 186 C** is the closest
match to `#CC0001`.

Wordmark font: **Bank Gothic** — CONQUEST in Medium/Bold, SOLUTIONS in Light/Medium.

## Lockups

- **horizontal** — mark + wordmark side-by-side (CONQUEST over SOLUTIONS to the right of the mark). Headers, navbars, banners.
- **stacked** — mark above the wordmark. Vertical/square spaces.
- **mark** — the CS monogram only (black C + red S). Favicons, avatars, app icons, tight spaces.

## Variants (per lockup)

| Suffix | What | Use on |
|---|---|---|
| `-color` | full color (black + red `#CC0001`), transparent | light backgrounds (primary) |
| `-white-knockout` | white C/wordmark + red S | dark backgrounds |
| `-all-black` | one-color black | fax / engraving / single-color print |
| `-all-white` | one-color white | dark single-color uses |

## Formats

- `*.svg` — true vector, transparent. **Prefer for web/UI.**
- `*-2000w.png` / `*-600w.png` — transparent raster renders (large / small).
- `CS logo 0707 187 red.pdf` — **print master.** Send this when a vendor asks for vector/EPS (every modern print shop accepts PDF).

## Quick picks

- Web app on a light chrome → `conquest-horizontal-color.svg`
- Web app on a dark chrome → `conquest-horizontal-white-knockout.svg`
- Favicon / app icon → `conquest-mark-color.svg` (or `-white-knockout` on a dark tile)
- Vendor / print job → `CS logo 0707 187 red.pdf`

_First shipped into Conquest Hub 2026-07-28 (`Logo.tsx` renders the horizontal + mark, light/dark aware)._
