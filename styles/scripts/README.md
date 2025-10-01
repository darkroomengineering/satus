# Style Generation Scripts

Scripts for generating and managing the styling system.

## Scripts

**`setup-styles.ts`** - Main style generation
- Generates `css/root.css` with CSS custom properties
- Creates Tailwind configuration
- Runs all generation scripts

**`generate-root.ts`** - CSS variables
- Creates CSS custom properties from TypeScript config
- Outputs to `css/root.css`

**`generate-tailwind.ts`** - Tailwind config
- Generates Tailwind configuration from style config
- Creates theme tokens and utilities

**`generate-scale.ts`** - Scale utilities
- Generates responsive scale utilities
- Creates viewport unit helpers

**`postcss-functions.mjs`** - PostCSS functions
- Implements `mobile-vw()`, `desktop-vw()` functions
- Implements `mobile-vh()`, `desktop-vh()` functions
- Implements `columns()` grid function

**`utils.ts`** - Shared utilities
- Helper functions for script generation
- Common parsing and formatting

## Usage

```bash
# Generate all styles once
bun setup:styles

# Watch for changes and regenerate
bun watch:styles
```

## How It Works

1. **Source**: TypeScript config files (`colors.ts`, `typography.ts`, `layout.mjs`, etc.)
2. **Generation**: Scripts read config and generate CSS/Tailwind
3. **Output**: `css/root.css` and Tailwind configuration
4. **Build**: PostCSS processes with custom functions

## Custom PostCSS Functions

### Viewport Units

```css
.element {
  width: mobile-vw(375);    /* 375px at mobile viewport */
  height: desktop-vh(100);  /* 100px at desktop viewport */
}
```

### Grid Columns

```css
.element {
  width: columns(3);         /* Spans 3 columns + gaps */
  margin-left: columns(1);   /* Offset by 1 column */
}
```

## Configuration Files

Located in `styles/`:
- `colors.ts` - Color palettes and themes
- `typography.ts` - Font sizes, line heights, weights
- `layout.mjs` - Grid, breakpoints, spacing
- `easings.ts` - Animation easing functions
- `fonts.ts` - Font loading and configuration

## Customization

To modify styles:

1. Edit config files in `styles/`
2. Run `bun setup:styles` to regenerate
3. Styles are automatically applied

## Build Process

```
TypeScript Config → Generation Scripts → CSS Variables → PostCSS → Output
```

1. Edit `colors.ts`, `typography.ts`, etc.
2. Run generation scripts
3. PostCSS processes custom functions
4. Final CSS output to `styles/css/`

## Best Practices

- Always run `setup:styles` after changing config
- Use `watch:styles` during active development
- Don't manually edit generated files
- Keep config in TypeScript for type safety
- Use viewport functions for responsive values

## Related Documentation

- [Styling System](../README.md)
- [PostCSS Configuration](../../postcss.config.mjs)
- [Tailwind Configuration](../../next.config.ts)

