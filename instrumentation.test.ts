/**
 * Server error reporting (`onRequestError` in instrumentation.ts). E2E runs
 * without a receiver, so the configured path is tested here.
 *
 * Ways it can fail:
 * 1. URL unset, yet a request goes out anyway.
 * 2. URL set, yet nothing (or more than one request) is sent.
 * 3. The report leaks a secret: the query string, request headers, cookies.
 * 4. The token is dropped, or sent when none is configured.
 * 5. A rejected or non-2xx delivery throws into Next instead of warning once.
 * 6. A hung receiver holds the response past the timeout.
 * 7. The log line is skipped, or is not one parseable JSON line.
 */

import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test'

import { createOnRequestError } from './instrumentation'

type Handler = ReturnType<typeof createOnRequestError>

const originalFetch = globalThis.fetch
const calls: { url: string; init: RequestInit | undefined }[] = []

function stubFetch(
  respond: (init: RequestInit | undefined) => Promise<Response>
) {
  const stub = async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init })
    return respond(init)
  }
  globalThis.fetch = Object.assign(stub, {
    preconnect: originalFetch.preconnect,
  })
}

const digestError = Object.assign(new Error('boom'), { digest: '12345' })

function trigger(handler: Handler) {
  return handler(
    digestError,
    {
      path: '/blog/post?token=secret-query#frag',
      method: 'GET',
      headers: {
        cookie: 'session=secret-cookie',
        authorization: 'Bearer user',
      },
    },
    {
      routerKind: 'App Router',
      routePath: '/blog/[slug]',
      routeType: 'render',
      renderSource: 'react-server-components',
      revalidateReason: undefined,
    }
  )
}

let errorSpy: ReturnType<typeof spyOn>
let warnSpy: ReturnType<typeof spyOn>

beforeEach(() => {
  calls.length = 0
  errorSpy = spyOn(console, 'error').mockImplementation(() => undefined)
  warnSpy = spyOn(console, 'warn').mockImplementation(() => undefined)
})

afterEach(() => {
  globalThis.fetch = originalFetch
  errorSpy.mockRestore()
  warnSpy.mockRestore()
})

describe('onRequestError', () => {
  it('logs one JSON line and sends nothing when no URL is set', async () => {
    stubFetch(async () => new Response(null))

    await trigger(createOnRequestError({ url: undefined }))

    expect(calls).toHaveLength(0)
    expect(errorSpy).toHaveBeenCalledTimes(1)
    const line = String(errorSpy.mock.calls[0]?.[0])
    expect(JSON.parse(line)).toMatchObject({
      message: 'boom',
      stack: expect.stringContaining('Error: boom'),
      digest: '12345',
      path: '/blog/post',
      method: 'GET',
      routerKind: 'App Router',
      routePath: '/blog/[slug]',
      routeType: 'render',
      renderSource: 'react-server-components',
    })
  })

  it('POSTs the same JSON once, with no query string or request headers', async () => {
    stubFetch(async () => new Response(null, { status: 202 }))

    await trigger(
      createOnRequestError({ url: 'https://ingest.example.com/errors' })
    )

    expect(calls).toHaveLength(1)
    const [call] = calls
    expect(call?.url).toBe('https://ingest.example.com/errors')
    expect(call?.init?.method).toBe('POST')
    const body = String(call?.init?.body)
    expect(body).toBe(String(errorSpy.mock.calls[0]?.[0]))
    expect(body).not.toContain('secret')
    expect(body).not.toContain('frag')
    const headers = new Headers(call?.init?.headers)
    expect([...headers.keys()]).toEqual(['content-type'])
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('sends the token as a bearer header only when one is set', async () => {
    stubFetch(async () => new Response(null))

    await trigger(
      createOnRequestError({
        url: 'https://ingest.example.com/errors',
        token: 'ingest-token',
      })
    )

    const headers = new Headers(calls[0]?.init?.headers)
    expect(headers.get('authorization')).toBe('Bearer ingest-token')
  })

  it('warns once instead of throwing when delivery rejects', async () => {
    stubFetch(async () => {
      throw new TypeError('connection refused')
    })

    await trigger(createOnRequestError({ url: 'https://ingest.example.com' }))

    expect(warnSpy).toHaveBeenCalledTimes(1)
    expect(String(warnSpy.mock.calls[0]?.[0])).toContain('connection refused')
  })

  it('warns once on a non-2xx response', async () => {
    stubFetch(async () => new Response(null, { status: 500 }))

    await trigger(createOnRequestError({ url: 'https://ingest.example.com' }))

    expect(warnSpy).toHaveBeenCalledTimes(1)
    expect(String(warnSpy.mock.calls[0]?.[0])).toContain('HTTP 500')
  })

  it('gives up on a hung receiver after the timeout', async () => {
    stubFetch(
      (init) =>
        new Promise((_, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('aborted', 'AbortError'))
          )
        })
    )

    const started = performance.now()
    await trigger(
      createOnRequestError({ url: 'https://ingest.example.com', timeout: 50 })
    )

    expect(performance.now() - started).toBeLessThan(1000)
    expect(warnSpy).toHaveBeenCalledTimes(1)
  })
})
