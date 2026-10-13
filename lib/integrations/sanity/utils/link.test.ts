/**
 * Ways the link resolver can fail, written before the tests below:
 *
 * 1. Stega markers from draft mode reach an `href` (the link points nowhere).
 * 2. A `javascript:`, `data:` or protocol-relative URL written outside the
 *    Studio becomes a live `href`.
 * 3. An internal slug escapes its route (`../ai`, `foo/bar`, encoded slashes).
 * 4. An empty or half-filled link renders a real `href` instead of `#`.
 * 5. "Open in new window" is ignored either way: switched off but the
 *    external URL still opens a new tab, or switched on but it does not.
 * 6. A rejected link still carries `target="_blank"`.
 * 7. Parameters and anchor double their `?` or `#`, or attach to `#`.
 * 8. A link saved in the old hand-rolled shape resolves to a guessed `href`.
 */
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
      expect(urlForReference({ type: 'external', url })).toBe(url)
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
      expect(urlForReference({ type: 'external', url })).toBe('#')
    }
  })

  test('allows relative targets', () => {
    for (const url of ['/safe-path', '#hash', '?query']) {
      expect(urlForReference({ type: 'external', url })).toBe(url)
    }
  })

  test('rejects protocol-relative and backslash-prefixed external targets', () => {
    for (const url of ['//evil.example', '/\\evil.example']) {
      expect(urlForReference({ type: 'external', url })).toBe('#')
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
          type: 'internal',
          internalLink: { _type: 'page', slug: { current: slug } },
        })
      ).toBe(expected)
    }
  })

  test('articles resolve under /articles', () => {
    expect(
      urlForReference({
        type: 'internal',
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
          type: 'internal',
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
          type: 'internal',
          internalLink: { _type: 'page', slug: { current: slug } },
        })
      ).toBe(`/${slug}`)
    }
  })
})

describe('getLinkAttributes: new tab', () => {
  test('a rejected scheme yields href="#" and no new-tab attrs', () => {
    expect(
      getLinkAttributes({
        type: 'external',
        url: 'javascript:alert(1)',
        blank: true,
      })
    ).toEqual({ href: '#', target: undefined, rel: undefined })
  })

  test('an empty link yields href="#" and no new-tab attrs', () => {
    for (const link of [null, {}, { type: 'internal' }, { type: 'external' }]) {
      expect(getLinkAttributes(link)).toEqual({
        href: '#',
        target: undefined,
        rel: undefined,
      })
    }
  })

  test('blank set to true opens a new tab, even for an internal link', () => {
    expect(
      getLinkAttributes({
        type: 'internal',
        internalLink: { _type: 'page', slug: { current: 'about' } },
        blank: true,
      })
    ).toEqual({ href: '/about', target: '_blank', rel: 'noopener noreferrer' })
  })

  test('blank set to false keeps an external URL in the same tab', () => {
    expect(
      getLinkAttributes({
        type: 'external',
        url: 'https://example.com',
        blank: false,
      })
    ).toEqual({
      href: 'https://example.com',
      target: undefined,
      rel: undefined,
    })
  })

  test('blank unset opens an external host in a new tab', () => {
    for (const link of [
      { type: 'external', url: 'https://example.com' },
      { type: 'external', url: 'https://example.com', blank: null },
    ]) {
      expect(getLinkAttributes(link)).toEqual({
        href: 'https://example.com',
        target: '_blank',
        rel: 'noopener noreferrer',
      })
    }
  })

  test('blank unset keeps internal, relative, email and phone links in the same tab', () => {
    for (const link of [
      {
        type: 'internal',
        internalLink: { _type: 'page', slug: { current: 'about' } },
      },
      { type: 'external', url: '/about' },
      { type: 'email', email: 'hello@example.com' },
      { type: 'phone', phone: '+1 415 555 2671' },
    ]) {
      expect(getLinkAttributes(link).target).toBeUndefined()
    }
  })
})

describe('urlForReference: email, phone, parameters and anchors', () => {
  test('email and phone get their scheme; phone numbers lose their spaces', () => {
    expect(
      urlForReference({ type: 'email', email: ' hello@example.com ' })
    ).toBe('mailto:hello@example.com')
    expect(urlForReference({ type: 'phone', phone: '+1 415 555 2671' })).toBe(
      'tel:+14155552671'
    )
  })

  test('an empty email or phone resolves to an inert #', () => {
    expect(urlForReference({ type: 'email', email: '' })).toBe('#')
    expect(urlForReference({ type: 'phone' })).toBe('#')
  })

  test('parameters and anchor follow the path, with one ? and one #', () => {
    expect(
      urlForReference({
        type: 'internal',
        internalLink: { _type: 'page', slug: { current: 'about' } },
        parameters: '?utm_source=menu',
        anchor: '#team',
      })
    ).toBe('/about?utm_source=menu#team')
  })

  test('parameters join an existing query and land before an existing hash', () => {
    expect(
      urlForReference({
        type: 'external',
        url: 'https://example.com/a?x=1#top',
        parameters: 'y=2',
      })
    ).toBe('https://example.com/a?x=1&y=2#top')
  })

  test('an inert # never gets a suffix', () => {
    expect(
      urlForReference({
        type: 'external',
        url: 'javascript:alert(1)',
        anchor: 'team',
      })
    ).toBe('#')
  })
})

describe('urlForReference: links in the old hand-rolled shape', () => {
  // What a fork's unmigrated content looks like: it must stay inert rather
  // than guess, and `migrations/link-plugin-fields` is the fix.
  test('resolve to an inert #', () => {
    // Passed through a variable so the old `linkType` field type-checks as
    // an extra property instead of an excess-property error.
    const saved = {
      linkType: 'internal',
      internalLink: { _type: 'page', slug: { current: 'about' } },
    }
    expect(urlForReference(saved)).toBe('#')
  })
})

describe('stega markers', () => {
  // A run of the zero-width characters Presentation's stega encoding appends
  // in draft mode; `stegaClean` strips any run of four or more.
  const markers = '​‌‍﻿'.repeat(4)

  test('never reach an external href', () => {
    expect(
      urlForReference({
        type: 'external',
        url: `#pricing${markers}`,
      })
    ).toBe('#pricing')
  })

  test('never reach an internal href', () => {
    expect(
      urlForReference({
        type: 'internal',
        internalLink: { _type: 'page', slug: { current: `about${markers}` } },
      })
    ).toBe('/about')
  })

  test('are cleaned by getLinkAttributes too', () => {
    expect(
      getLinkAttributes({
        type: 'external',
        url: `?ref=nav${markers}`,
      }).href
    ).toBe('?ref=nav')
  })
})
