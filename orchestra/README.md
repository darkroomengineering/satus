# Orchestra

Debug and development tools suite for Satūs.

## Features

Toggle with `Cmd/Ctrl + O`:

- **Theatre.js Studio** (⚙️) - Animation debugging and sequencing
- **Stats** (📈) - FPS and performance metrics
- **Grid** (🌐) - Layout grid visualization
- **Minimap** (🗺️) - Page navigation overview
- **Dev Mode** (🚧) - Development mode toggle
- **Screenshot Mode** (📸) - Clean screenshots without UI

## Components

- `cmdo.tsx` - Command center (Cmd+O)
- `grid/` - Layout grid debugger
- `minimap/` - Viewport minimap
- `stats/` - Performance monitoring
- `theatre/` - Theatre.js integration
- `toggle.tsx` - Tool toggles
- `orchestra.ts` - Core module

## Usage

```tsx
import { OrchestraTools } from '~/orchestra'

// Add to app/layout.tsx inside <body>
<OrchestraTools />
```

Tool state persists in `localStorage` and syncs across tabs.

## Theatre.js Integration

Use Theatre.js for complex animation sequences:

```tsx
import { SheetProvider } from '~/orchestra/theatre'
import { useTheatreValue } from '~/orchestra/theatre/hooks/use-theatre-value'

function AnimatedComponent() {
  const opacity = useTheatreValue('opacity', 1)
  
  return (
    <SheetProvider id="scene">
      <div style={{ opacity }}>Animated content</div>
    </SheetProvider>
  )
}
```

## Best Practices

- Orchestra tools are excluded from production builds
- Use Theatre.js for complex animation choreography
- Enable Grid for layout debugging
- Monitor Stats for performance issues
- Use Minimap for long pages

## Related Documentation

- [Theatre.js](https://www.theatrejs.com/)
- [Components](../components/README.md)
