import { expect, test } from '@playwright/test'

const DEVELOPER_RESOURCE_URL = 'https://github.com/darkroomengineering/satus'
const NEXT_VARY_FIELDS = [
  'rsc',
  'next-router-state-tree',
  'next-router-prefetch',
  'next-router-segment-prefetch',
]

function varyFields(response: { headers(): Record<string, string> }): string[] {
  return (response.headers().vary ?? '')
    .split(',')
    .map((field) => field.trim().toLowerCase())
    .filter(Boolean)
}

function readableText(html: string): string {
  return html
    .replace(/<(script|style|template)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(?:nbsp|#160);/gi, ' ')
    .replace(/&(?:amp|#38);/gi, '&')
    .replace(/&(?:lt|#60);/gi, '<')
    .replace(/&(?:gt|#62);/gi, '>')
    .replace(/&(?:quot|#34);/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

test.describe('agent-readable HTML', () => {
  test('the initial homepage response carries substantive, structured content', async ({
    request,
  }) => {
    const response = await request.get('/', {
      headers: { Accept: 'text/html' },
    })
    const html = await response.text()

    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toContain('text/html')

    const headings = [...html.matchAll(/<h([1-6])\b[^>]*>/gi)].map((match) =>
      Number(match[1])
    )
    expect(headings.filter((level) => level === 1)).toHaveLength(1)
    expect(headings[0]).toBe(1)

    for (const [index, level] of headings.entries()) {
      if (index === 0) continue
      expect(
        level,
        `heading ${index + 1} skips from h${headings[index - 1]} to h${level}`
      ).toBeLessThanOrEqual((headings[index - 1] ?? 1) + 1)
    }

    expect(readableText(html).length).toBeGreaterThanOrEqual(500)
  })

  test('the homepage remains useful when JavaScript is disabled', async ({
    browser,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false })
    const page = await context.newPage()

    try {
      const response = await page.goto('/')
      expect(response?.status()).toBe(200)
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
      await expect(page.getByRole('heading', { level: 1 })).toContainText(
        'Satūs'
      )
      expect(
        (await page.locator('body').innerText()).trim().length
      ).toBeGreaterThanOrEqual(500)
    } finally {
      await context.close()
    }
  })
})

test.describe('Markdown content negotiation', () => {
  test('serves the homepage as Markdown with guidance and resource discovery', async ({
    request,
  }) => {
    const htmlResponse = await request.get('/', {
      headers: { Accept: 'text/html' },
    })
    const response = await request.get('/', {
      headers: { Accept: 'text/markdown' },
    })
    const body = await response.text()
    const htmlVary = varyFields(htmlResponse)
    const markdownVary = varyFields(response)

    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toBe(
      'text/markdown; charset=utf-8'
    )
    expect(markdownVary).toContain('accept')
    for (const field of NEXT_VARY_FIELDS) {
      if (htmlVary.includes(field)) expect(markdownVary).toContain(field)
    }

    expect(body).toMatch(/^# Home \| Satūs/m)
    expect(body).toContain('## When to use')
    expect(body).toContain('## How to use')
    expect(body).toContain('## Developer resources')
    expect(body).toContain(DEVELOPER_RESOURCE_URL)
  })

  test('honors qualities and rejects requests for unsupported representations', async ({
    request,
  }) => {
    const htmlPreferred = await request.get('/', {
      headers: { Accept: 'text/html;q=0.9, text/markdown;q=0.3' },
    })
    const markdownPreferred = await request.get('/', {
      headers: { Accept: 'text/html;q=0.3, text/markdown;q=0.9' },
    })
    const unsupported = await request.get('/', {
      headers: { Accept: 'application/json' },
    })

    expect(htmlPreferred.headers()['content-type']).toContain('text/html')
    expect(markdownPreferred.headers()['content-type']).toBe(
      'text/markdown; charset=utf-8'
    )
    expect(unsupported.status()).toBe(406)
    expect(varyFields(unsupported)).toContain('accept')
    await expect(unsupported.text()).resolves.toContain(
      'text/html, text/markdown'
    )
  })

  test('never 406s a route mixed Accept ranks Markdown-first when it has no Markdown representation — a genuinely absent route still 404s truthfully', async ({
    request,
  }) => {
    const response = await request.get('/missing-agent-page', {
      headers: { Accept: 'text/html;q=0.5, text/markdown;q=0.9' },
    })
    const body = await response.text()

    expect(response.status()).toBe(404)
    expect(body).toContain('/ai')
  })

  test('the HTML format override wins even when Accept still prefers Markdown, breaking the negotiation loop', async ({
    request,
  }) => {
    const response = await request.get('/?format=html', {
      headers: { Accept: 'text/markdown' },
    })

    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toContain('text/html')
  })

  test('HEAD advertises the Markdown representation without sending a body', async ({
    request,
  }) => {
    const response = await request.head('/', {
      headers: { Accept: 'text/markdown' },
    })

    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toBe(
      'text/markdown; charset=utf-8'
    )
    expect(varyFields(response)).toContain('accept')
    expect(await response.body()).toHaveLength(0)
  })

  test('supports explicit Markdown aliases without an Accept header', async ({
    request,
  }) => {
    for (const path of ['/index.md', '/ai.md']) {
      const response = await request.get(path)
      expect(response.status(), path).toBe(200)
      expect(response.headers()['content-type'], path).toBe(
        'text/markdown; charset=utf-8'
      )
      expect(await response.text(), path).toMatch(/^# .+ \| Satūs/m)
    }
  })

  test('unknown Markdown documents return a recoverable real 404', async ({
    request,
  }) => {
    const responses = [
      await request.get('/missing.md'),
      await request.get('/missing-agent-page', {
        headers: { Accept: 'text/markdown' },
      }),
    ]

    for (const response of responses) {
      const body = await response.text()
      expect(response.status()).toBe(404)
      expect(response.headers()['content-type']).toBe(
        'text/markdown; charset=utf-8'
      )
      expect(body).toContain('/ai')
      expect(body).toContain('/llms.txt')
      expect(body).toContain('/sitemap.xml')
    }
  })

  test('does not expose the internal Markdown handler through a forged header', async ({
    request,
  }) => {
    const response = await request.get('/agent-content', {
      headers: { 'x-satus-markdown-source-path': '/' },
    })

    expect(response.status()).toBe(404)
    expect(response.headers()['content-type']).toContain('text/plain')
  })

  test('does not negotiate router requests or public assets as page documents', async ({
    request,
  }) => {
    const routerResponse = await request.get('/', {
      headers: { Accept: 'application/json', Purpose: 'prefetch' },
    })
    expect(routerResponse.status()).not.toBe(406)

    const assetResponse = await request.get('/icon.png', {
      headers: { Accept: 'text/markdown' },
    })
    expect(assetResponse.status()).toBe(200)
    expect(assetResponse.headers()['content-type']).toContain('image/png')
  })
})

test.describe('machine-readable discovery files', () => {
  test('publishes the agent index, policy, sitemap, and instructions', async ({
    request,
  }) => {
    const llms = await request.get('/llms.txt')
    const llmsBody = await llms.text()
    expect(llms.status()).toBe(200)
    expect(llms.headers()['content-type']).toContain('text/plain')
    expect(llmsBody).toContain('# Satūs')
    expect(llmsBody).toContain('## When to use')
    expect(llmsBody).toContain('## How to use')
    expect(llmsBody).toContain(DEVELOPER_RESOURCE_URL)

    const ai = await request.get('/ai')
    const aiBody = await ai.text()
    expect(ai.status()).toBe(200)
    expect(ai.headers()['content-type']).toContain('text/html')
    expect(aiBody).toContain('When to use')
    expect(aiBody).toContain('How to use')
    expect(aiBody).toContain(DEVELOPER_RESOURCE_URL)

    const sitemap = await request.get('/sitemap.xml')
    const sitemapBody = await sitemap.text()
    expect(sitemap.status()).toBe(200)
    expect(sitemap.headers()['content-type']).toContain('application/xml')
    expect(sitemapBody).toContain('<urlset')
    expect(sitemapBody).toContain('/ai</loc>')

    const robots = await request.get('/robots.txt')
    const robotsBody = await robots.text()
    expect(robots.status()).toBe(200)
    expect(robots.headers()['content-type']).toContain('text/plain')
    expect(robotsBody).toContain('User-Agent: GPTBot')
    expect(robotsBody).toContain('Sitemap:')
  })
})
