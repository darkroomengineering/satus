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
    for (const url of ['/about', '#section', '?tab=2']) {
      expect(urlForReference({ linkType: 'external', externalUrl: url })).toBe(
        url
      )
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
