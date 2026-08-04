# Docs Audit — 2026-08-04

Scope: every reader-facing surface, audited in full against `main` (`d57aacd2`) the evening after the 16.3-stable merge train (#259, #343–#345, #348–#351). Four parallel auditors: standards docs (AGENTS.md / CLAUDE.md / ARCHITECTURE.md), onboarding surfaces (README / app/README / SECURITY.md / .env.example / in-app manual), code-adjacent docs (every README under `lib/` and `components/`), and CHANGELOG Unreleased coherence. `docs/audits/*` snapshots and released CHANGELOG sections exempt. All CONFIRMED findings were verified against both the doc claim and the code reality.

## Summary

| ID   | Sev  | Surface                    | Issue                                                                                                                                                                            | Location                                                          | Status    |
| ---- | ---- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | --------- |
| D-B1 | High | SECURITY.md                | CSP described as Report-Only baseline forks must "promote to enforced" — it ships enforced + registry-composed since #349                                                        | SECURITY.md:52-58 vs next.config.ts:181 + lib/integrations/csp.ts | CONFIRMED |
| D-D1 | High | CHANGELOG                  | #267's Fixed bullet still claims "a report-only CSP baseline ships", contradicting #318's Unreleased entry in the same window                                                    | CHANGELOG.md:61 vs :27                                            | CONFIRMED |
| D-A1 | High | AGENTS.md                  | `bun run check` step list omits `check:assets`                                                                                                                                   | AGENTS.md:503 vs package.json:17                                  | CONFIRMED |
| D-A2 | High | ARCHITECTURE.md            | Same `check:assets` omission in the condensed command list                                                                                                                       | ARCHITECTURE.md:51                                                | CONFIRMED |
| D-C1 | Med  | lib/integrations/README.md | "Adding a New Integration" steps predate the `cspSources` contract — following them ships a silently CSP-blocked integration                                                     | README.md:110-115 vs registry.ts:59-77                            | CONFIRMED |
| D-C2 | Med  | sanity/README.md           | Caching section describes Shopify's model (`cacheSignal`, `revalidate: 3600`, `no-store`) — none exist under the Sanity integration                                              | sanity/README.md:159-165                                          | CONFIRMED |
| D-C3 | Med  | sanity/README.md           | Env table omits `SANITY_REVALIDATE_SECRET`; the webhook route 503s without it                                                                                                    | sanity/README.md:5-18 vs app/api/revalidate/route.ts:35-38        | CONFIRMED |
| D-B2 | Med  | README.md                  | `VERCEL_TOKEN` labeled "Required GitHub Secret" — the workflow treats it as optional and skips gracefully; `VERCEL_AUTOMATION_BYPASS_SECRET` unmentioned                         | README.md:150 vs lighthouse-to-slack.yml:6-15                     | CONFIRMED |
| D-B3 | Med  | in-app manual              | `cp .env.example .env` disagrees with README and .env.example itself (`.env.local`)                                                                                              | app/(site)/page.tsx:65                                            | CONFIRMED |
| D-D2 | Med  | CHANGELOG                  | Older bump entries imply `@typescript/native-preview` still exists; the TS7 entry says it's gone (it is)                                                                         | CHANGELOG.md:68-69 vs :65                                         | CONFIRMED |
| D-D3 | Low  | CHANGELOG                  | Unreleased repeats `### Changed`/`### Removed`/`### Fixed` headers (2×/3×/2×) — accumulation artifact vs the one-block-per-type convention every released section follows        | CHANGELOG.md:25-138                                               | CONFIRMED |
| D-C4 | Low  | image/README.md            | Props table omits `objectFit` — the one prop whose default mechanism changed today                                                                                               | components/ui/image/README.md:48-55                               | CONFIRMED |
| D-C5 | Low  | lib/README.md              | Scripts example list omits `check:assets`, now part of the merge gate                                                                                                            | lib/README.md:47-54                                               | CONFIRMED |
| D-B4 | Low  | app/README.md              | Structure tree omits root `app/not-found.tsx` (the bare-shell boundary parallel to layout/global-error); tree is non-exhaustive by design, so only that one line is worth adding | app/README.md:7-22                                                | PLAUSIBLE |

## Doc map — verdicts

- **AGENTS.md, ARCHITECTURE.md, CLAUDE.md** — accurate except the shared `check:assets` omission. Stack table, oxlint rule table, strict-flags list, path aliases, error-boundaries section, AI-SEO claims: all verified current.
- **README.md, .env.example, in-app manual** — newcomer-tested: every quickstart command exists; env example is deliberately minimal and says so. One wrong secret label, one inconsistent copy command.
- **SECURITY.md** — one high-severity stale claim (CSP posture); CodeQL/Dependabot/rate-limit/Zod claims all verified live.
- **lib/ + integration READMEs** — 12 of 15 surfaces fully accurate. Sanity README carries the one true copy-paste error (Shopify's caching model) and the missing webhook secret.
- **CHANGELOG Unreleased** — every substantive entry verified against code; not release-ready until the CSP contradiction and the two `@typescript/native-preview` mentions are reconciled and the duplicate headers consolidated. #351's absence confirmed correct per house convention.

## Drift-verification method

Every CONFIRMED finding lists both sides (doc claim file:line, code reality file:line) in the summary table; verifications included running `bun run manifest:check` (clean), checking every documented command against `package.json` scripts, diffing `.env.example` intent against `lib/env.ts`, and live-checking CodeQL via the API. Full per-auditor considered-and-rejected ledgers below.

## Considered & rejected (consolidated ledger — do not re-litigate)

- Next 16.3 flag claims, TS7 single-dep claims, cascade-contract claims, `:where(.img)` default, seo/BASE_URL claims — verified accurate everywhere they appear.
- `.env.example` minimalism — deliberate, self-documented.
- "TypeScript 6 in the stack table" CHANGELOG line — historical narration inside a Fixed bullet, not a forward claim.
- #351 has no changelog entry — correct per the house convention for copy/robustness tweaks.
- app/README tree omitting metadata routes and example routes — non-exhaustive by design.
- No `e2e/README` exists — nothing to drift; not worth creating for a three-spec suite.
- Shopify README caching section — accurate (it is the source D-C2's copy borrowed from).
- Lighthouse workflow secrets — self-documented in the workflow header; README only needed the "Required" label fixed (D-B2), not a new doc.

## Diagram backlog

None warranted by these findings — the fixes are all sentence-level truth corrections, and no audited doc explains a flow in prose that begs a diagram. (The strongest future candidate is a request-lifecycle diagram for the CSP composition in lib/integrations/README.md, noted, not drafted.)

## Open questions

None — every finding was resolvable against the code.
