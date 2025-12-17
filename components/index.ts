// Components - Single source of truth for all UI
//
// Categories:
// - ui/      → Primitives (reusable across any project)
// - layout/  → Site chrome (navigation, footer, wrapper)
// - effects/ → Animation & visual enhancements
//
// Usage:
//   import { Image, Link } from '~/components/ui'
//   import { Wrapper, Navigation } from '~/components/layout'
//   import { Marquee, GSAPRuntime } from '~/components/effects'
//
// Or import directly:
//   import { Image } from '~/components/ui/image'
//   import { Wrapper } from '~/components/layout/wrapper'

export * from './effects'
export * from './layout'
// Re-export all for convenience (optional usage)
export * from './ui'
