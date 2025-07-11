## Fixed Violations

After enabling the rules, the following violations were found and fixed:

### Nested Ternary Violations Fixed:
1. **components/dropdown/index.tsx** (line 53)
   - Changed from nested ternary to IIFE with if/else
2. **integrations/shopify/cart/add-to-cart/index.js** (lines 13-17)
   - Extracted to `getButtonState()` function

## Prepared Plugin Files

The following GritQL plugin files have been created in the `biome-plugins/` directory and are now **active**:

### 1. `no-anchor-element.grit`
Enforces using Next.js `<Link>` component instead of HTML `<a>` elements.
- **Status**: ✅ Active
- **Current violations**: 0

### 2. `no-unnecessary-forwardref.grit`
Checks for unnecessary `forwardRef` usage in React 19 with the compiler.
- **Status**: ✅ Active
- **Current violations**: 0

### 3. `no-relative-parent-imports.grit`
Forbids relative parent imports (`../`) and encourages alias imports (`~/`).
- **Status**: ✅ Active
- **Current violations**: Multiple violations found and reported

## Plugin Configuration

The plugins are configured in `biome.json`:
```json
"plugins": [
  "./biome-plugins/no-anchor-element.grit",
  "./biome-plugins/no-unnecessary-forwardref.grit",
  "./biome-plugins/no-relative-parent-imports.grit"
]
``` 