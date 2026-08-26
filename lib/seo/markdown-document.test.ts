import { describe, expect, it } from 'bun:test'

import { absoluteSiteUrl } from './agent-content'
import {
  buildMarkdownDocument,
  buildMarkdownDocumentFromRoutes,
  type MarkdownDocument,
} from './markdown-document'

/** Narrows away the redirect/degraded branches for tests asserting on a document body. */
function assertDocumentBody(
  document: MarkdownDocument
): asserts document is Extract<MarkdownDocument, { status: 200 | 404 | 406 }> {
  if (document.status === 303 || document.status === 503) {
    throw new Error(`expected a document body, got status ${document.status}`)
  }
}

describe('buildMarkdownDocument', () => {
  it('returns the advertised Markdown representation for a static route', async () => {
    const document = await buildMarkdownDocument('/')
    assertDocumentBody(document)

    expect(document.status).toBe(200)
    expect(document.contentType).toBe('text/markdown; charset=utf-8')
    expect(document.body).toMatch(/^# Home \| Satūs/m)
    expect(document.body).toContain('## When to use')
    expect(document.body).toContain('## Developer resources')
  })

  it('returns a recoverable Markdown 404 for a path outside static and CMS routes', async () => {
    const document = await buildMarkdownDocument('/missing/nested-route')
    assertDocumentBody(document)

    expect(document.status).toBe(404)
    expect(document.contentType).toBe('text/markdown; charset=utf-8')
    expect(document.body).toContain('/ai')
    expect(document.body).toContain('/llms.txt')
    expect(document.body).toContain('/sitemap.xml')
  })

  it('points agents to the canonical HTML URL with a 406 when the client accepts only Markdown', () => {
    const document = buildMarkdownDocumentFromRoutes(
      '/about',
      [
        {
          path: '/about',
          label: 'About',
          lastModified: new Date('2026-01-01T00:00:00.000Z'),
        },
      ],
      { htmlAcceptable: false }
    )
    assertDocumentBody(document)

    expect(document.status).toBe(406)
    expect(document.contentType).toBe('text/plain; charset=utf-8')
    expect(document.body).toContain(absoluteSiteUrl('/about'))
    expect(document.body).toContain('Request text/html')
  })

  it('redirects to the HTML document instead of 406ing when the client also accepts text/html', () => {
    const document = buildMarkdownDocumentFromRoutes(
      '/about',
      [
        {
          path: '/about',
          label: 'About',
          lastModified: new Date('2026-01-01T00:00:00.000Z'),
        },
      ],
      { htmlAcceptable: true }
    )

    expect(document.status).toBe(303)
    expect(document.status === 303 && document.location).toBe(
      '/about?format=html'
    )
  })

  it('preserves the original query string in the HTML-fallback redirect alongside format=html', () => {
    const document = buildMarkdownDocumentFromRoutes(
      '/about',
      [
        {
          path: '/about',
          label: 'About',
          lastModified: new Date('2026-01-01T00:00:00.000Z'),
        },
      ],
      { htmlAcceptable: true, search: '?variant=x' }
    )

    expect(document.status).toBe(303)
    expect(document.status === 303 && document.location).toBe(
      '/about?variant=x&format=html'
    )
  })

  it('defaults to html-acceptable when the caller does not specify — never 406s without confirming the client rejected html', () => {
    const document = buildMarkdownDocumentFromRoutes('/about', [
      {
        path: '/about',
        label: 'About',
        lastModified: new Date('2026-01-01T00:00:00.000Z'),
      },
    ])

    expect(document.status).toBe(303)
  })

  it('returns a 503 with a retry hint when the CMS catalog is degraded rather than confirmed empty', () => {
    const document = buildMarkdownDocumentFromRoutes('/outage-only-route', [], {
      catalogDegraded: true,
    })

    expect(document.status).toBe(503)
    expect(document.status === 503 && document.retryAfterSeconds).toBe(60)
    expect(document.status === 503 && document.body).toContain('transient')
  })

  it('still returns 200 for a static route even when the CMS catalog is degraded — static routes never depend on it', () => {
    const document = buildMarkdownDocumentFromRoutes('/', [], {
      catalogDegraded: true,
    })

    expect(document.status).toBe(200)
  })
})
