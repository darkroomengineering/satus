# Orchestra Debug Tools

Orchestra is a suite of debugging and development tools for Satūs. It provides visual aids, performance monitoring, and interactive tools to assist developers during the development process.

## Features

- **Theatre.js Integration**: Animation debugging and sequencing tools
- **Grid Debugger**: Visualize and debug layout grids
- **Stats**: Performance metrics and FPS monitoring
- **Minimap**: Navigation and viewport visualization
- **Command Center**: Quick access to debug features

## Components

- `grid/` - Layout grid visualization tools
- `minimap/` - Navigation and viewport visualization
- `stats/` - Performance metrics and monitoring
- `theatre/` - Theatre.js integration for animation debugging
- `toggle.tsx` - Toggle UI for enabling/disabling debug features
- `cmdo.tsx` - Command center for quick access to debug features
- `orchestra.ts` - Core orchestration module for debug tools

## Usage

Orchestra tools are accessible during development at the `/orchestra` route. You can toggle various debugging tools using the interface:

```tsx
import { Orchestra } from '~/orchestra'

// Enable specific debug tools
<Orchestra.Grid />
<Orchestra.Stats />
<Orchestra.Minimap />
<Orchestra.Theatre />
```

### Grid Debugger

Visualizes the layout grid system to assist with component positioning and alignment:

```tsx
import { Grid } from '~/orchestra/grid'

<Grid />
```

### Performance Monitoring

Monitor frame rates and performance metrics:

```tsx
import { Stats } from '~/orchestra/stats'

<Stats />
```

### Theatre.js Animation Tools

Access Theatre.js for animation debugging and sequencing:

```tsx
import { Theatre } from '~/orchestra/theatre'

<Theatre />
```

## Best Practices

1. Only use Orchestra tools in development environments
2. Disable debug tools before production builds
3. Use Theatre.js for complex animation sequences
4. Leverage the grid debugger for layout troubleshooting 