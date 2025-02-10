# Custom React Hooks

This directory contains reusable React hooks that provide common functionality across the application.

## Available Hooks

- `use-scroll-trigger.ts` - Hook for detecting and responding to scroll-based triggers and animations
- `use-transform.tsx` - Hook for handling element transformations and animations
- `use-device-detection.ts` - Hook for detecting device type and characteristics

## Features

- Scroll-based animations and triggers
- Element transformations with GSAP integration
- Device detection and responsive behavior
- Type-safe implementations with TypeScript

## Usage

Import hooks directly from this directory:

```typescript
import { useScrollTrigger } from '~/hooks/use-scroll-trigger'
import { useTransform } from '~/hooks/use-transform'
import { useDeviceDetection } from '~/hooks/use-device-detection'
```
