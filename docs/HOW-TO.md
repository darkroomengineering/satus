# Quick How-To Guide

## Project Setup

### Fonts
Add fonts to load in app/fonts.js
```ts
// Example in app/fonts.js
import localFont from 'next/font/local'

export const fonts = {
  mono: localFont({
    src: '../public/fonts/ServerMono/ServerMono-Regular.woff2',
    variable: '--font-mono',
  }),
}
```

## Style System
Run `bun setup:styles` to generate style configuration files after modifying:
- typography.ts
- colors.ts
- layout.mjs

The generated files will be:
- styles/css/tailwind.css
- styles/css/root.css

## Debug Tools

### Orchestra Panel
Navigate to /debug/orchestra page to access:
- Theatre.js Studio (⚙️)
- Performance Stats (📈)
- Grid Debug (🌐)
- Development Mode (🚧)
- Minimap (🗺️)
- WebGL Debug (🧊)

### Usage
Each tool can be toggled independently and their state persists across page reloads.
The tools are only available in development mode.