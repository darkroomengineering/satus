import { describe, expect, it } from 'bun:test'

import { markdownPathForRoute, routePathFromMarkdown } from './markdown-path'

describe('Markdown route aliases', () => {
  it('maps the homepage to the conventional index.md alias in both directions', () => {
    expect(markdownPathForRoute('/')).toBe('/index.md')
    expect(routePathFromMarkdown('/index.md')).toBe('/')
  })

  it('maps nested page paths without losing their hierarchy', () => {
    expect(markdownPathForRoute('/docs/getting-started')).toBe(
      '/docs/getting-started.md'
    )
    expect(routePathFromMarkdown('/docs/getting-started.md')).toBe(
      '/docs/getting-started'
    )
  })

  it('normalizes a trailing slash before adding the Markdown suffix', () => {
    expect(markdownPathForRoute('/ai/')).toBe('/ai.md')
  })

  it('does not mistake an ordinary route for a Markdown alias', () => {
    expect(routePathFromMarkdown('/ai')).toBeNull()
  })
})
