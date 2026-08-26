import { describe, expect, test } from 'bun:test'

import { getLinkAttributes, urlForReference } from './link'

describe('urlForReference — external scheme allowlist', () => {
  test('passes through safe schemes verbatim', () => {
    for (const url of [
      'https://example.com/path?q=1#frag',
      'http://example.com',
      'mailto:hello@example.com',
      'tel:+14155552671',
    ]) {
      expect(urlForReference({ linkType: 'external', externalUrl: url })).toBe(
        url
      )
    }
  })

  test('rejects dangerous schemes with an inert #', () => {
    for (const url of [
      'javascript:alert(document.cookie)',
      'JavaScript:alert(1)',
      '  javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'vbscript:msgbox(1)',
    ]) {
      expect(urlForReference({ linkType: 'external', externalUrl: url })).toBe(
        '#'
      )
    }
  })

  test('allows relative targets', () => {
    for (const url of ['/safe-path', '#hash', '?query']) {
      expect(urlForReference({ linkType: 'external', externalUrl: url })).toBe(
        url
      )
    }
  })

  test('rejects protocol-relative and backslash-prefixed external targets', () => {
    for (const url of ['//evil.example', '/\\evil.example']) {
      expect(urlForReference({ linkType: 'external', externalUrl: url })).toBe(
        '#'
      )
    }
  })
})

describe('urlForReference — internal document resolution', () => {
  test('a page slug maps to its own path, including `home` → /home', () => {
    for (const [slug, expected] of [
      ['about', '/about'],
      // `/` is the developer-owned starter page; the catch-all can't match
      // an empty segment, so `home` must not claim the root.
      ['home', '/home'],
    ] as const) {
      expect(
        urlForReference({
          linkType: 'internal',
          internalLink: { _type: 'page', slug: { current: slug } },
        })
      ).toBe(expected)
    }
  })

  test('articles resolve under /articles', () => {
    expect(
      urlForReference({
        linkType: 'internal',
        internalLink: { _type: 'article', slug: { current: 'hello' } },
      })
    ).toBe('/articles/hello')
  })

  test('rejects internal slugs that could escape the canonical route shape', () => {
    for (const slug of [
      '//evil.example',
      '\\evil.example',
      '../ai',
      'foo/bar',
      'foo?bar',
      'foo#bar',
      '.',
      '..',
      '%2f%2fevil.example',
      'invalid%encoding',
      'a'.repeat(97),
    ]) {
      expect(
        urlForReference({
          linkType: 'internal',
          internalLink: { _type: 'page', slug: { current: slug } },
        })
      ).toBe('#')
    }
  })

  test('preserves safe slugs instead of narrowing the CMS naming policy', () => {
    for (const slug of [
      'lowercase-kebab-slug',
      'release_notes',
      'café',
      'Uppercase',
    ]) {
      expect(
        urlForReference({
          linkType: 'internal',
          internalLink: { _type: 'page', slug: { current: slug } },
        })
      ).toBe(`/${slug}`)
    }
  })
})

describe('getLinkAttributes', () => {
  test('a rejected scheme yields href="#" and no new-tab attrs', () => {
    expect(
      getLinkAttributes({
        linkType: 'external',
        externalUrl: 'javascript:alert(1)',
        openInNewTab: true,
      })
    ).toEqual({ href: '#', target: '_blank', rel: 'noopener noreferrer' })
  })

  test('external new-tab link carries rel="noopener noreferrer"', () => {
    expect(
      getLinkAttributes({
        linkType: 'external',
        externalUrl: 'https://example.com',
        openInNewTab: true,
      })
    ).toEqual({
      href: 'https://example.com',
      target: '_blank',
      rel: 'noopener noreferrer',
    })
  })
})
