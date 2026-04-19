# docs-scaffold installs

Known repos that have `docs-scaffold` installed. Used as a manual registry so
the maintainer can remember which projects track this template.

When you install docs-scaffold into a new repo, **add a row here** and commit
it upstream in the same batch as any template changes. `install.sh` prints a
reminder at the end of its run.

## Registry

| Repo | Default branch | Installed version | Notes |
|---|---|---|---|
| [conquest-solutions/conquest-hub](https://github.com/conquest-solutions/conquest-hub) | main | v1.4.0 | Primary proving ground. `ANTHROPIC_API_KEY` set. |
| [conquest-solutions/conquest-lpr](https://github.com/conquest-solutions/conquest-lpr) | main | v1.4.0 | `ANTHROPIC_API_KEY` set. |
| [trashtastic-hq/trashtastic-website-production](https://github.com/trashtastic-hq/trashtastic-website-production) | main | v1.4.0 | Local folder: `trashtastic-website-beta`. No `ANTHROPIC_API_KEY` — `sync-consumers.sh` auto-prefixes `[skip docs]` on this repo's PRs. |

## How updates propagate

After each docs-scaffold release, the maintainer runs
[`sync-consumers.sh`](./sync-consumers.sh) locally. It loops through the
repos listed above, runs `update.sh` in each, and opens a PR per repo.
Consumers review and merge normally — no cron, no secrets, no PATs.

**When you add a new consumer**, update two places:
1. Add a row to the registry above.
2. Add the local clone path to the `REPOS=(...)` list in `sync-consumers.sh`.

See [`UPDATE.md`](./UPDATE.md) for the ad-hoc manual update command if a
consumer needs to catch up between syncs.

## Verifying the registry is accurate

Run this to cross-check against GitHub code search:

```bash
gh search code 'filename:.docs-scaffold-version' --owner lanceretter --owner conquest-solutions --owner trashtastic-hq
```

Any repo that shows up in the search but isn't in the table above should be
added. Any row in the table that doesn't match a search result is either
private (expected — code search needs repo access) or has been uninstalled
(remove the row).
