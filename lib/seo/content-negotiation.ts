export const HTML_MEDIA_TYPE = 'text/html'
export const MARKDOWN_MEDIA_TYPE = 'text/markdown'

/**
 * Query param `proxy.ts` honors as a one-shot negotiation override: skip
 * `negotiateDocumentType` entirely and serve HTML regardless of Accept. The
 * markdown handler issues the redirect that carries this param — see
 * `lib/seo/markdown-document.ts` — closing the loop where a client whose
 * Accept still prefers `text/markdown` would otherwise bounce back into the
 * same 406/redirect on every request.
 */
export const HTML_FORMAT_OVERRIDE_PARAM = 'format'
export const HTML_FORMAT_OVERRIDE_VALUE = 'html'

export type DocumentMediaType =
  | typeof HTML_MEDIA_TYPE
  | typeof MARKDOWN_MEDIA_TYPE

interface MediaRange {
  type: string
  subtype: string
  quality: number
  order: number
}

interface Preference {
  mediaType: DocumentMediaType
  quality: number
  order: number
  offerOrder: number
}

const OFFERS: readonly DocumentMediaType[] = [
  HTML_MEDIA_TYPE,
  MARKDOWN_MEDIA_TYPE,
]

function parseQuality(parameter: string): number | null {
  const [name, rawValue] = parameter.split('=', 2)
  if (name?.trim().toLowerCase() !== 'q' || rawValue === undefined) return null

  const value = Number(rawValue.trim())
  if (!Number.isFinite(value) || value < 0 || value > 1) return 0
  return value
}

function parseMediaRanges(accept: string): MediaRange[] {
  const ranges: MediaRange[] = []

  for (const [order, item] of accept.split(',').entries()) {
    const [rawMediaType, ...parameters] = item.split(';')
    const [type, subtype, ...extra] =
      rawMediaType?.trim().toLowerCase().split('/') ?? []

    if (!type || !subtype || extra.length > 0) continue

    let quality = 1
    for (const parameter of parameters) {
      const parsedQuality = parseQuality(parameter)
      if (parsedQuality !== null) {
        quality = parsedQuality
        break
      }
    }

    ranges.push({ type, subtype, quality, order })
  }

  return ranges
}

function matchSpecificity(
  range: MediaRange,
  mediaType: DocumentMediaType
): number {
  const [type, subtype] = mediaType.split('/')

  if (range.type === type && range.subtype === subtype) return 2
  if (range.type === type && range.subtype === '*') return 1
  if (range.type === '*' && range.subtype === '*') return 0
  return -1
}

function preferenceFor(
  mediaType: DocumentMediaType,
  ranges: readonly MediaRange[],
  offerOrder: number
): Preference | null {
  const matches = ranges
    .map((range) => ({
      range,
      specificity: matchSpecificity(range, mediaType),
    }))
    .filter((match) => match.specificity >= 0)

  if (matches.length === 0) return null

  const specificity = Math.max(...matches.map((match) => match.specificity))
  const selected = matches
    .filter((match) => match.specificity === specificity)
    .sort((left, right) => left.range.order - right.range.order)[0]

  if (!selected || selected.range.quality === 0) return null

  return {
    mediaType,
    quality: selected.range.quality,
    order: selected.range.order,
    offerOrder,
  }
}

/**
 * Selects the HTML or Markdown representation using RFC 9110 media-range
 * precedence. A more-specific range controls a representation even when a
 * wildcard carries a higher quality, including an explicit q=0 rejection.
 */
export function negotiateDocumentType(
  accept: string | null
): DocumentMediaType | null {
  if (!accept || accept.trim() === '') return HTML_MEDIA_TYPE

  const ranges = parseMediaRanges(accept)
  if (ranges.length === 0) return HTML_MEDIA_TYPE

  const preferences = OFFERS.map((mediaType, offerOrder) =>
    preferenceFor(mediaType, ranges, offerOrder)
  )
    .filter((preference) => preference !== null)
    .sort(
      (left, right) =>
        right.quality - left.quality ||
        left.order - right.order ||
        left.offerOrder - right.offerOrder
    )

  return preferences[0]?.mediaType ?? null
}

/**
 * True when `mediaType` has any acceptable (q>0) match in the Accept header,
 * independent of which representation `negotiateDocumentType` would prefer.
 * Distinguishes "the client ranked markdown above html" (html still on offer,
 * a 406 would be wrong) from "the client never offered html at all" (a 406
 * is correct) — `negotiateDocumentType` alone collapses both into one
 * "markdown won" result and loses that distinction.
 */
export function acceptsMediaType(
  accept: string | null,
  mediaType: DocumentMediaType
): boolean {
  if (!accept || accept.trim() === '') return true

  const ranges = parseMediaRanges(accept)
  if (ranges.length === 0) return true

  return preferenceFor(mediaType, ranges, 0) !== null
}

/** Adds one field name to Vary without losing or duplicating existing fields. */
export function mergeVary(vary: string | null, fieldName: string): string {
  if (!vary) return fieldName

  const fields = vary
    .split(',')
    .map((field) => field.trim())
    .filter(Boolean)

  if (fields.includes('*')) return '*'
  if (fields.some((field) => field.toLowerCase() === fieldName.toLowerCase())) {
    return fields.join(', ')
  }

  return [...fields, fieldName].join(', ')
}
