# Optional Features

Conditionally loaded features for the root layout.

## Overview

`OptionalFeatures` is mounted in `app/layout.tsx` and conditionally loads heavy dependencies based on environment configuration. This prevents unused features from bloating the client bundle.

## Features

| Feature | Env Variable | Default | Description |
|---------|--------------|---------|-------------|
| GSAP Runtime | Always loaded | - | Syncs GSAP with Tempus RAF |
| WebGL Canvas | `NEXT_PUBLIC_ENABLE_WEBGL` | `false` | Global Three.js canvas |
| Dev Tools | `NODE_ENV` | dev only | Orchestra debug panel |

## Configuration

### Enable WebGL

```bash
# .env.local
NEXT_PUBLIC_ENABLE_WEBGL=true
```

### Dev Tools

Automatically enabled in development. Access with `Cmd/Ctrl + O`.

## How It Works

```tsx
// app/layout.tsx - already configured
<OptionalFeatures />
```

The component:
1. Waits for client-side hydration
2. Checks environment variables
3. Dynamically imports only needed features
4. Renders them with `ssr: false` to avoid hydration issues

## Adding Custom Features

```tsx
// lib/features/index.tsx

const MyFeature = dynamic(
  () => import('@/components/my-feature').then((mod) => mod.MyFeature),
  { ssr: false }
)

// Then conditionally render based on env var
{process.env.NEXT_PUBLIC_MY_FEATURE === 'true' && <MyFeature />}
```

## Architecture Note

This pattern keeps the root layout clean while allowing opt-in features. Features are code-split and only downloaded when enabled.
