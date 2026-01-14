# Lib

Non-UI code: hooks, integrations, styles, and utilities.

> **Rule**: Renders UI → `components/` · Everything else → `lib/`

## Quick Imports

```tsx
// Hooks
import { useScrollTrigger } from '@/lib/hooks/use-scroll-trigger'
import { useDeviceDetection } from '@/lib/hooks/use-device-detection'
import { useStore } from '@/lib/hooks/use-store'

// Utilities - explicit imports for better tree-shaking
import { clamp, lerp } from '@/lib/utils/math'
import { slugify } from '@/lib/utils/strings'
import { fetchWithTimeout } from '@/lib/utils/fetch'

// Styles
import { colors, themes, breakpoints } from '@/lib/styles/config'

// Integrations
import { sanityFetch } from 'next-sanity/live'
import { Cart } from '@/lib/integrations/shopify/cart'

// WebGL
import { Canvas } from '@/lib/webgl/components/canvas'
import { WebGLTunnel } from '@/lib/webgl/components/tunnel'

// Dev tools
import { useOrchestra } from '@/lib/dev/orchestra'
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
