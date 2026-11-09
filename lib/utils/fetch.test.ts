import { afterAll, beforeAll, describe, expect, it } from 'bun:test'

import { z } from 'zod'

import { fetchJSON, fetchWithTimeout } from './fetch'

// Local HTTP server so fetch behavior is tested without mocks.
let server: ReturnType<typeof Bun.serve>
let baseURL: string

beforeAll(() => {
  server = Bun.serve({
    port: 0, // random available port
    fetch(req) {
      const url = new URL(req.url)

      if (url.pathname === '/json') {
        return new Response(JSON.stringify({ message: 'hello', count: 42 }), {
          headers: { 'Content-Type': 'application/json' },
        })
      }

      if (url.pathname === '/slow') {
        return new Promise((resolve) =>
          setTimeout(
            () =>
              resolve(
                new Response(JSON.stringify({ delayed: true }), {
                  headers: { 'Content-Type': 'application/json' },
                })
              ),
            2000
          )
        )
      }

      // Headers and a first chunk arrive at once; the body never finishes.
      if (url.pathname === '/stalled-body') {
        return new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(new TextEncoder().encode('{"partial":'))
            },
          }),
          { headers: { 'Content-Type': 'application/json' } }
        )
      }

      if (url.pathname === '/error-500') {
        return new Response('Internal Server Error', {
          status: 500,
          statusText: 'Internal Server Error',
        })
      }

      if (url.pathname === '/echo-method') {
        return new Response(JSON.stringify({ method: req.method }), {
          headers: { 'Content-Type': 'application/json' },
        })
      }

      return new Response('Not Found', { status: 404 })
    },
  })

  baseURL = `http://localhost:${server.port}`
})

afterAll(() => {
  // `true` closes the stalled-body connection, which never ends on its own.
  void server.stop(true)
})

describe('fetchWithTimeout', () => {
  it('fetches within the default timeout and exposes the JSON body', async () => {
    const response = await fetchWithTimeout(`${baseURL}/json`)
    expect(response.ok).toBe(true)
    expect(response.status).toBe(200)
    const data = (await response.json()) as { message: string; count: number }
    expect(data.message).toBe('hello')
    expect(data.count).toBe(42)
  })

  it('should abort when timeout is exceeded', async () => {
    await expect(
      fetchWithTimeout(`${baseURL}/slow`, { timeout: 100 })
    ).rejects.toThrow()
  })

  it('times out a body that stalls after the headers arrive', async () => {
    const started = Date.now()
    const response = await fetchWithTimeout(`${baseURL}/stalled-body`, {
      timeout: 200,
    })
    expect(response.ok).toBe(true)

    // By name, not class: the test preload swaps in happy-dom's
    // DOMException, a different class from the one fetch rejects with.
    await expect(response.text()).rejects.toMatchObject({
      name: expect.stringMatching(/^(TimeoutError|AbortError)$/),
    })
    // By the deadline, with slack for a loaded CI runner.
    expect(Date.now() - started).toBeLessThan(2000)
  })

  it('should pass through fetch options like method', async () => {
    const response = await fetchWithTimeout(`${baseURL}/echo-method`, {
      method: 'POST',
    })
    const data = (await response.json()) as { method: string }
    expect(data.method).toBe('POST')
  })

  it('should respect an external AbortSignal that fires after creation', async () => {
    const controller = new AbortController()

    const promise = fetchWithTimeout(`${baseURL}/slow`, {
      signal: controller.signal,
      timeout: 30000, // long timeout so only the signal causes abort
    })

    // Abort shortly after the request starts
    setTimeout(() => controller.abort(), 50)

    await expect(promise).rejects.toThrow()
  })

  it('should abort immediately when passed an already-aborted signal', async () => {
    const controller = new AbortController()
    controller.abort()

    await expect(
      fetchWithTimeout(`${baseURL}/slow`, {
        signal: controller.signal,
        timeout: 30000,
      })
    ).rejects.toThrow()
  })

  it('should return non-ok responses without throwing', async () => {
    const response = await fetchWithTimeout(`${baseURL}/error-500`)
    expect(response.ok).toBe(false)
    expect(response.status).toBe(500)
  })
})

describe('fetchJSON — unvalidated overload (no schema)', () => {
  it('should return unknown and parse JSON response', async () => {
    const data = await fetchJSON(`${baseURL}/json`)
    // Without a schema the return type is unknown; narrow before use
    expect(data).toEqual({ message: 'hello', count: 42 })
  })

  it('should throw on non-ok HTTP status', async () => {
    await expect(fetchJSON(`${baseURL}/error-500`)).rejects.toThrow(
      'HTTP 500: Internal Server Error'
    )
  })

  it('should respect timeout option', async () => {
    await expect(
      fetchJSON(`${baseURL}/slow`, { timeout: 100 })
    ).rejects.toThrow()
  })

  it('should pass through fetch options', async () => {
    const data = await fetchJSON(`${baseURL}/echo-method`, { method: 'POST' })
    expect(data).toEqual({ method: 'POST' })
  })
})

describe('fetchJSON — validated overload (with schema)', () => {
  const ResponseSchema = z.object({
    message: z.string(),
    count: z.number(),
  })

  it('should return typed data when response matches schema', async () => {
    const data = await fetchJSON(`${baseURL}/json`, {}, ResponseSchema)
    // TypeScript knows data.message is string and data.count is number
    expect(data.message).toBe('hello')
    expect(data.count).toBe(42)
  })

  it('should throw a descriptive error when response does not match schema', async () => {
    const StrictSchema = z.object({
      nonExistentField: z.string(),
    })
    await expect(
      fetchJSON(`${baseURL}/json`, {}, StrictSchema)
    ).rejects.toThrow('Invalid API response')
  })

  it('should throw on non-ok HTTP status even with schema', async () => {
    await expect(
      fetchJSON(`${baseURL}/error-500`, {}, ResponseSchema)
    ).rejects.toThrow('HTTP 500: Internal Server Error')
  })
})
