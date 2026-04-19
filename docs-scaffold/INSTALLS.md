# docs-scaffold installs

Known repos that have `docs-scaffold` installed. Used as a manual registry so
the maintainer can remember which projects track this template.

When you install docs-scaffold into a new repo, **add a row here** and commit
it upstream in the same batch as any template changes. `install.sh` prints a
reminder at the end of its run.

## Registry

| Repo | Default branch | Installed version | Notes |
|---|---|---|---|
| [conquest-solutions/conquest-hub](https://github.com/conquest-solutions/conquest-hub) | main | v1.3.0 | Primary proving ground — most template changes land here first. |
| [conquest-solutions/conquest-lpr](https://github.com/conquest-solutions/conquest-lpr) | main | v1.3.0 | |
| [trashtastic-hq/trashtastic-website-production](https://github.com/trashtastic-hq/trashtastic-website-production) | main | v1.3.0 | Local folder name: `trashtastic-website-beta`. No `ANTHROPIC_API_KEY` set — `doc-auto-update.yml` will fail loud on merges until secret is added or `skip-docs` label is used. |

## How updates propagate

Each consumer runs `.github/workflows/docs-scaffold-update.yml` weekly (Monday
14:00 UTC). That workflow compares the consumer's `.docs-scaffold-version`
against upstream and opens a PR if there's a newer release. The maintainer
reviews + merges.

See [`UPDATE.md`](./UPDATE.md) for manual update commands when you need to
pull a new version faster than the cron.

## Verifying the registry is accurate

Run this to cross-check against GitHub code search:

```bash
gh search code 'filename:.docs-scaffold-version' --owner lanceretter --owner conquest-solutions --owner trashtastic-hq
```

Any repo that shows up in the search but isn't in the table above should be
added. Any row in the table that doesn't match a search result is either
private (expected — code search needs repo access) or has been uninstalled
(remove the row).
