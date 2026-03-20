# Orchestra (Dev Tools)

Debug tools suite. Toggle with `Cmd/Ctrl + O`.

## Features

| Tool | Description |
|------|-------------|
| Theatre.js (⚙️) | Animation debugging |
| Stats (📈) | FPS and performance |
| Grid (🌐) | Layout grid overlay |
| Minimap (🗺️) | Page navigation |
| Dev Mode (🚧) | Development toggle |
| Screenshot (📸) | Clean UI captures |

## Usage

Automatically included via `OptionalFeatures` in `app/layout.tsx`. Only loads in development.

State persists in `localStorage` and syncs across tabs.

## Theatre.js

```tsx
import { SheetProvider, useTheatreValue } from '@/lib/dev/theatre'

function AnimatedComponent() {
  const opacity = useTheatreValue('opacity', 1)
  return <div style={{ opacity }}>...</div>
}
```

Production builds automatically exclude all dev tools.
