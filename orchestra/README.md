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

Toggle the command panel with `Cmd/Ctrl + O`. You can enable/disable tools from there. Tools are dynamically imported and state is persisted in `localStorage` and synchronized across tabs.

```tsx
import { OrchestraTools } from '~/orchestra'

// Add once in app/layout.tsx inside <body>
<OrchestraTools />
```

### Grid Debugger

Visualizes the layout grid system to assist with component positioning and alignment.

### Performance Monitoring

Monitor frame rates and performance metrics.

### Theatre.js Animation Tools

Access Theatre.js for animation debugging and sequencing.

## Best Practices

1. Only use Orchestra tools in development environments
2. Disable debug tools before production builds
3. Use Theatre.js for complex animation sequences
4. Leverage the grid debugger for layout troubleshooting 