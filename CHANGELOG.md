# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Versioning

Satus is a starter template, so semver is read from the perspective of a project
that forked it:

- **MAJOR**: changes that break a fork on update. Removing or renaming a core
  primitive (`Image`, `Link`, `Wrapper`), restructuring directories or path
  aliases, dropping a built-in integration, or a Node.js / Next.js major bump.
- **MINOR**: additive capabilities. New components, hooks, utilities, or
  integrations.
- **PATCH**: bug fixes, dependency bumps, docs, and internal refactors with no
  consumer-visible API change.

There are no long-term support branches. Forks track upstream by rebasing onto the
latest tag; security fixes land on the latest release (see `SECURITY.md`).

## [Unreleased]

### Added

- `AGENTS.md` as the single source of truth for engineering standards; `CLAUDE.md`
  and `.cursor/rules` reduced to thin pointers (#175).
- `SECURITY.md` security policy with private vulnerability reporting (#174).
- This `CHANGELOG.md`, and `package.json` version synced to the release tag.

### Fixed

- Shopify cart `addItem` now validates input before creating a cart, so invalid
  requests no longer leave an orphaned cart and cookie behind (#173).

### Removed

- Dead code: orphaned WebGL GLSL utilities (`noise` / `blend` / `functions`) and
  unused `lib/utils` helpers (`normalize`, `isEmptyObject`, `twoDigits`,
  `numberWithCommas`) (#172).

## [2.0.1] - 2026-06-02

### Added

- Storybook 10 component sandbox (`@storybook/nextjs-vite` + MCP addon, wired for
  Tailwind v4) (#159).

### Changed

- Integration-removal transforms in `setup:project` rewritten from regex to
  ts-morph AST operations, resilient to formatting changes (#155).
- Client-handoff doc templates extracted from `prepare-handoff.ts` into editable
  template modules (#156).
- Dependency batch: `next` / `@next/bundle-analyzer` 16.2.7, `react` / `react-dom`
  19.2.7, `@types/react` 19.2.16, `ts-morph` 28, `@typescript/native-preview`
  snapshot (#171).
- `hamo` / `tempus` pinned to their current dev versions and excluded from
  Dependabot, since no stable v1 exists upstream (#157, #164).

## [2.0.0] - 2026-06-01

### Added

- New liquid-metal "drip" hero effect (TSL, screen-space, ~120 FPS).

### Changed

- WebGL layer migrated to TSL NodeMaterials on `WebGPURenderer`, with a WebGL2
  fallback for browsers without WebGPU (gradient, fluid sim, flowmap, R3F demo).
- Next.js 16 Cache Components fixes (`revalidateTag` cache profiles); next-sanity 13
  (`defineLive` / `defineQuery`).
- Shopify data layer split from a single 440-line module into focused files plus a
  shared `reshape.ts`.
- Base UI cleanup, server-rendered theme default (removed inline `<script>`), leaner
  `.env.example`, dependency bumps.

### Fixed

- Browsers without WebGPU now use the WebGL2 backend instead of the classic
  renderer, so TSL materials and animations work everywhere.

[Unreleased]: https://github.com/darkroomengineering/satus/compare/v2.0.1...HEAD
[2.0.1]: https://github.com/darkroomengineering/satus/compare/v2.0.0...v2.0.1
[2.0.0]: https://github.com/darkroomengineering/satus/releases/tag/v2.0.0
