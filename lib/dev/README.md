# Orchestra (Dev Tools)

Debug tools suite. Toggle with `Cmd/Ctrl + O`.

## Features

| Tool | Description |
|------|-------------|
| Grid (🌐) | Layout grid overlay |
| Theatre.js (⚙️) | Animation debugging |
| Stats (📈) | FPS and performance (stats-gl frame-time / GPU meter) |
| Dev Mode (🚧) | Development toggle |
| Minimap (🗺️) | ScrollTrigger navigation |
| WebGL (🧊) | Global WebGL canvas (on by default) |
| React Scan (🔬) | React re-render profiler — opt-in, off by default |
| Screenshot (📸) | Clean UI captures |

React Scan (`react-scan`) is mounted only while its toggle is on, so a normal
dev session carries no profiler overhead. It overlaps Stats only on the FPS
readout — Stats is a frame-time/GPU meter, React Scan is a re-render profiler.

## Usage

Automatically included via `OptionalFeatures` in `app/layout.tsx`. Only loads in development.

State persists in `localStorage` and syncs across tabs.

## Theatre.js

```tsx
import { useSheet, useTheatre } from '@/lib/dev/theatre'

function AnimatedComponent() {
  const sheet = useSheet('MySheet')
  const { values } = useTheatre(sheet, 'myObject', { opacity: 1 })
  return <div style={{ opacity: values.opacity }}>...</div>
}
```

Production builds automatically exclude all dev tools.
