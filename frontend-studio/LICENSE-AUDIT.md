# Studio spike — licence & kill-criteria audit

**Date:** 2026-09-20  
**Scope:** `frontend-studio/` production dependency tree (`npm ci --omit=dev`).  
**Gate:** `node scripts/license-check.js --root frontend-studio`  
**Decision:** **npm pin** of Layerhub 0.3.3 (not git subtree; not `@scenify/sdk`).

## Kill criteria (plan §6.0)

| Criterion | Result | Notes |
|---|---|---|
| Fabric exports readable 1920×1080 PNG with OFL Inter | **PASS** (Docker verify) | `docker/studio-spike` → `out/studio-spike-export.png`; IHDR 1920×1080; Inter loaded via `/studio-fonts/` from `server/fonts` |
| GPL/AGPL in dependencies | **PASS** | No DENY licences in production tree |
| Bundle > ~3 MB gzip without fonts | **NOTE (not kill)** | Recorded after `npm run build` in Docker logs / below |
| Cannot strip video/presentation/Iconscout in a day | **PASS** | 6.3a chrome is ours (Layers/Properties); never imported Scenify shell / Iconscout |

**Verdict:** Spike **green**. 6.1 ingest + 6.2 fonts/brand/slide-bg + **6.3a Layerhub Editor chrome** shipped; see `docs/scenify-studio-plan.md`.

## Denied candidates (do not add)

| Package | Licence | Why blocked |
|---|---|---|
| `@scenify/sdk` / `umanda/scenify-sdk` | GPL-3.0 | Product is MIT; gate DENY |
| `@nkyo/scenify-sdk` | Badge GPL / npm claims MIT | Relicensing risk — D-SC-2 |
| `designcombo/react-design-editor` | No LICENSE file | Not OSI-cleared |

## Production packages (allowlist snapshot)

Filled by the licence gate after `npm ci` in the spike container / local install. Expected direct deps:

| Package | Declared licence | Role |
|---|---|---|
| `@layerhub-io/react@0.3.3` | MIT | React bindings — `Provider` + `Canvas` + hooks (6.3a Editor UI) |
| `@layerhub-io/core@0.3.3` | ISC | Editor core; proves pin resolves |
| `@layerhub-io/objects@0.2.0` | (transitively MIT/ISC — verify on disk) | Fabric object helpers |
| `@layerhub-io/types@0.3.0` | (transitive) | Types |
| `fabric@5.3.0` | MIT | Canvas; major 5 to match Layerhub |
| `react@18.3.1` / `react-dom@18.3.1` | MIT | Island only |
| `lodash`, `nanoid`, `resize-observer-polyfill` | MIT | Transitive via core |

**Not installed (deliberately):** `gsap`, `gifshot`, `canvas` (node), `mongodb`, `aws-sdk`, Iconscout SDK, BaseUI/Styletron.

## OFL fonts

Same files as slides (`server/fonts/inter*.woff2` + `OFL-inter.txt`). Not an npm dependency; redistribution obligations unchanged from `slide-fonts.js`. Cyrillic **not** in default pack — spike UI states `.notdef` risk (plan §9).

## Bundle size note

Measured 2026-09-20 after 6.3a (`npm run build` local):

| Asset | Raw | gzip |
|---|---|---|
| `index-*.js` (app + Layerhub/Fabric) | ~712 KB | **~217 KB** |
| CSS | ~8 KB | ~2 KB |
| **Total JS gzip** | | **~217 KB** |

Well under the ~3 MB gzip soft budget. **Not a kill.**

## Known advisories (not licence kills)

| Advisory | Package | Spike stance |
|---|---|---|
| Fabric SVG XSS (GHSA-hfvx / GHSA-w22m) | `fabric@5.3.0` | We export **PNG** via `toDataURL`, not SVG; Studio is authenticated operators only. Layerhub pins Fabric 5 — no clean bump without forking. Track for 6.1. |
| `tar` via `@mapbox/node-pre-gyp` | transitive of optional `canvas` | Not executed in the browser island; comes with Fabric's node install surface. Do not ship a server-side fabric render that extracts tarballs. |

## Pin vs subtree

**Chosen: npm pin.** Rationale: reproducible lockfile, smaller surface, licence-check already walks `node_modules`. Revisit subtree only if npm packages disappear from the registry.
