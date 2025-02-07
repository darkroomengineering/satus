# Utility Libraries

This directory contains utility functions, type definitions, and shared libraries used throughout the application.

## Files

- `utils.ts` - General utility functions for string manipulation, array handling, and object transformations
- `maths.ts` - Mathematical utility functions for calculations and transformations
- `store.ts` - State management utilities and store configurations
- `augment.d.ts` - TypeScript type augmentations
- `reset.d.ts` - TypeScript reset type definitions

## Features

### Utility Functions
- String manipulation (camelCase, slugify, etc.)
- Array and object transformations
- Number formatting and calculations
- Type checking and validation

### Mathematical Utilities
- Viewport calculations
- Mathematical transformations
- Numerical operations

### Type Definitions
- Global type augmentations
- Reset type definitions
- Enhanced type safety

## Usage

Import utilities directly from their respective files:

```typescript
import { slugify, numberWithCommas } from '~/libs/utils'
import { clamp, mapRange } from '~/libs/maths'
import { store } from '~/libs/store'
```
