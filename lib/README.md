# Lib

Non-UI code: hooks, integrations, styles, and utilities.

> **Rule**: Renders UI → `components/` · Everything else → `lib/`

## Directories

| Directory                               | Purpose                                                     | Optional? |
| --------------------------------------- | ----------------------------------------------------------- | --------- |
| [hooks/](hooks/README.md)               | React hooks                                                 | ❌ Core   |
| [styles/](styles/README.md)             | CSS & Tailwind config                                       | ❌ Core   |
| [utils/](utils/README.md)               | Pure utilities (math, fetch, metadata, strings, validation) | ❌ Core   |
| `env.ts`                                | Typed environment variables (Zod-validated singleton)       | ❌ Core   |
| [features/](features/README.md)         | Optional runtime features (WebGL, dev tools)                | ✅ Yes    |
| [integrations/](integrations/README.md) | Sanity, Shopify, HubSpot                                    | ✅ Yes    |
| [webgl/](webgl/README.md)               | 3D graphics with R3F                                        | ✅ Yes    |
| [dev/](dev/README.md)                   | Debug tools (CMD+O)                                         | ✅ Yes    |

`bun run check:assets` (part of `bun run check`) fails on videos over 2MB or rasters over 2400px/1MB.
