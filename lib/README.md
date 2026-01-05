# Lib

Non-UI code: hooks, integrations, styles, and utilities.

> **Rule**: Renders UI → `components/` · Everything else → `lib/`

## Quick Imports

```tsx
// Hooks
import { useScrollTrigger, useDeviceDetection, useStore } from '~/hooks'

// Utilities
import { clamp, lerp, slugify, fetchWithTimeout } from '~/utils'

// Styles
import { colors, themes, breakpoints } from '~/styles'

// Integrations
import { sanityFetch } from '~/integrations/sanity'
import { Cart } from '~/integrations/shopify/cart'

// WebGL
import { Canvas, WebGLTunnel } from '~/webgl'

// Dev tools
import { useOrchestra } from '~/dev'
```

## Directories

| Directory | Purpose | Optional? |
|-----------|---------|-----------|
| [hooks/](hooks/README.md) | React hooks + Zustand store | ❌ Core |
| [styles/](styles/README.md) | CSS & Tailwind config | ❌ Core |
| [utils/](utils/README.md) | Pure utility functions | ❌ Core |
| [integrations/](integrations/README.md) | Sanity, Shopify, HubSpot | ✅ Yes |
| [webgl/](webgl/README.md) | 3D graphics with R3F | ✅ Yes |
| [dev/](dev/README.md) | Debug tools (CMD+O) | ✅ Yes |

## Scripts

```bash
bun dev              # Start dev server
bun run generate     # Generate pages/components
bun run setup:project  # Configure integrations
bun setup:styles     # Regenerate CSS
```
