import { z } from 'zod'

/**
 * Interchange schema for Figma → repo token sync.
 *
 * This is the contract between whatever pulls variables out of Figma (the
 * `use_figma` export snippet in `export.figma.js`, or a REST job on Enterprise)
 * and `import.ts`, which turns it into `colors.ts` / `layout.mjs`. Colors arrive
 * as Figma-native sRGB (0–1); the importer converts them to `oklch()`.
 */

const rgb = z.object({
  r: z.number().min(0).max(1),
  g: z.number().min(0).max(1),
  b: z.number().min(0).max(1),
})

const responsive = z.object({
  mobile: z.number(),
  desktop: z.number(),
  description: z.string().optional(),
})

/** A semantic color is either an alias to a primitive (by name) or a raw sRGB value. */
const semanticColor = z.union([
  z.object({ ref: z.string() }),
  z.object({ rgb }),
])

/**
 * One text-ramp style. font-size + line-height come from bound/named Typography
 * variables (per breakpoint); the rest are static properties of the text style.
 * `leadingTrim` maps to CSS `text-box-trim`; `fontFeatureSettings` to
 * `font-feature-settings` (null when no OpenType features are set).
 */
const typographyStyle = z.object({
  family: z.string(),
  weight: z.number(),
  fontStyle: z.string(),
  letterSpacing: z.string(),
  leadingTrim: z.enum(['NONE', 'CAP_HEIGHT']),
  fontFeatureSettings: z.string().nullable(),
  fontSize: z.object({ mobile: z.number(), desktop: z.number() }),
  lineHeight: z.object({ mobile: z.string(), desktop: z.string() }),
})

export const figmaTokensSchema = z.object({
  $generatedFrom: z.literal('figma').optional(),
  fileKey: z.string().optional(),
  /** Raw palette (Primitives collection). oklch is derived from these. */
  primitives: z.record(
    z.string(),
    rgb.extend({ description: z.string().optional() })
  ),
  /** Theme modes → semantic role → alias/raw (Color collection). */
  themes: z.record(z.string(), z.record(z.string(), semanticColor)),
  /** Grid tokens: columns/gap/safe, per breakpoint (Layout collection). */
  layout: z.record(z.string(), responsive),
  /** Reference device dimensions per breakpoint. */
  screens: z.record(
    z.string(),
    z.object({ width: z.number(), height: z.number() })
  ),
  /** Everything else in the Layout collection, e.g. header-height. */
  customSizes: z.record(z.string(), responsive),
  /** Text ramp (Typography collection + text styles). Keyed by style name. */
  typography: z.record(z.string(), typographyStyle),
  /** Motion durations in ms (Motion collection). */
  motion: z.record(z.string(), z.number()),
})

export type FigmaTokens = z.infer<typeof figmaTokensSchema>
