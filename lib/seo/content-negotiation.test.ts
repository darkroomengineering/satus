import { describe, expect, it } from 'bun:test'

import {
  acceptsMediaType,
  HTML_MEDIA_TYPE,
  MARKDOWN_MEDIA_TYPE,
  mergeVary,
  negotiateDocumentType,
} from './content-negotiation'

describe('negotiateDocumentType', () => {
  it('keeps ordinary browser navigation on HTML when Accept is absent or empty', () => {
    expect(negotiateDocumentType(null)).toBe(HTML_MEDIA_TYPE)
    expect(negotiateDocumentType('')).toBe(HTML_MEDIA_TYPE)
    expect(negotiateDocumentType(' , ; ')).toBe(HTML_MEDIA_TYPE)
  })

  it('serves the representation with the highest acceptable quality', () => {
    expect(negotiateDocumentType('text/markdown')).toBe(MARKDOWN_MEDIA_TYPE)
    expect(negotiateDocumentType('text/html;q=0.4, text/markdown;q=0.9')).toBe(
      MARKDOWN_MEDIA_TYPE
    )
    expect(negotiateDocumentType('text/html;q=0.9, text/markdown;q=0.4')).toBe(
      HTML_MEDIA_TYPE
    )
  })

  it('uses client order to break equal-quality ties', () => {
    expect(negotiateDocumentType('text/markdown, text/html')).toBe(
      MARKDOWN_MEDIA_TYPE
    )
    expect(negotiateDocumentType('text/html, text/markdown')).toBe(
      HTML_MEDIA_TYPE
    )
  })

  it('matches type and global wildcards while preserving the server HTML default', () => {
    expect(negotiateDocumentType('text/*')).toBe(HTML_MEDIA_TYPE)
    expect(negotiateDocumentType('*/*')).toBe(HTML_MEDIA_TYPE)
  })

  it('lets a more-specific rejection override an acceptable wildcard', () => {
    expect(negotiateDocumentType('text/*;q=0.8, text/html;q=0')).toBe(
      MARKDOWN_MEDIA_TYPE
    )
    expect(negotiateDocumentType('*/*;q=1, text/markdown;q=0')).toBe(
      HTML_MEDIA_TYPE
    )
  })

  it('returns null when the client accepts only unsupported or rejected types', () => {
    expect(negotiateDocumentType('application/json')).toBeNull()
    expect(negotiateDocumentType('text/html;q=0, text/markdown;q=0')).toBeNull()
  })

  it('never treats invalid or out-of-range qualities as acceptable', () => {
    expect(negotiateDocumentType('text/markdown;q=wat')).toBeNull()
    expect(negotiateDocumentType('text/markdown;q=2')).toBeNull()
    expect(negotiateDocumentType('text/markdown;q=-1')).toBeNull()
  })
})

describe('acceptsMediaType', () => {
  it('treats html as acceptable when Accept is absent, empty, or unparseable', () => {
    expect(acceptsMediaType(null, HTML_MEDIA_TYPE)).toBe(true)
    expect(acceptsMediaType('', HTML_MEDIA_TYPE)).toBe(true)
    expect(acceptsMediaType(' , ; ', HTML_MEDIA_TYPE)).toBe(true)
  })

  it('stays true for html even when markdown is the preferred representation', () => {
    expect(
      acceptsMediaType('text/html;q=0.3, text/markdown;q=0.9', HTML_MEDIA_TYPE)
    ).toBe(true)
  })

  it('is false when the client explicitly rejects the representation', () => {
    expect(acceptsMediaType('text/html;q=0', HTML_MEDIA_TYPE)).toBe(false)
    expect(
      acceptsMediaType('text/markdown, text/html;q=0', HTML_MEDIA_TYPE)
    ).toBe(false)
  })

  it('is false when the representation was never offered at all', () => {
    expect(acceptsMediaType('application/json', HTML_MEDIA_TYPE)).toBe(false)
  })
})

describe('mergeVary', () => {
  it('creates Vary when the response does not have one', () => {
    expect(mergeVary(null, 'Accept')).toBe('Accept')
  })

  it('preserves Next router cache keys when adding content negotiation', () => {
    expect(mergeVary('RSC, Next-Router-State-Tree', 'Accept')).toBe(
      'RSC, Next-Router-State-Tree, Accept'
    )
  })

  it('does not duplicate an existing field with different casing', () => {
    expect(mergeVary('RSC, accept', 'Accept')).toBe('RSC, accept')
  })

  it('preserves the wildcard because it already varies on every field', () => {
    expect(mergeVary('*', 'Accept')).toBe('*')
  })
})
