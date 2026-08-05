/**
 * Unit tests for the shared server-environment guard (issue #396).
 *
 * `@/lib/env` and `@/integrations/registry` both validate the whole
 * `process.env` object at module scope, which only holds real values on the
 * server — a client bundle sees the browser `process` polyfill's
 * permanently empty `{}`. Both modules delegate to `assertServerEnvironment`
 * so a bundled-for-browser import throws instead of every field silently
 * resolving to `undefined`.
 */

import { describe, expect, it } from 'bun:test'

import { assertServerEnvironment } from './assert-server-environment'

describe('assertServerEnvironment', () => {
  it('throws when window exists and process.env is empty (bundled-for-browser shape)', () => {
    const originalEnv = process.env
    // Simulate the browser `process` polyfill: `window` exists (happy-dom's
    // preload registers it for every test), `process.env` does not.
    // biome-ignore lint: test-only reassignment of a Node global
    process.env = {} as NodeJS.ProcessEnv
    try {
      expect(() => assertServerEnvironment('@/test-module')).toThrow(
        /@\/test-module reads process\.env and cannot run in the browser/
      )
    } finally {
      process.env = originalEnv
    }
  })

  it('does not throw with a real process.env, even though window exists (the test environment shape)', () => {
    expect(typeof window).toBe('object')
    expect(Object.keys(process.env).length).toBeGreaterThan(0)
    expect(() => assertServerEnvironment('@/test-module')).not.toThrow()
  })
})

describe('lib/env.ts calls the shared guard before parsing process.env', () => {
  it('calls assertServerEnvironment ahead of envSchema.safeParse', async () => {
    const source = await Bun.file('lib/env.ts').text()
    const guardIndex = source.indexOf('assertServerEnvironment(')
    const parseIndex = source.indexOf('envSchema.safeParse(process.env)')

    expect(
      guardIndex,
      'lib/env.ts must call assertServerEnvironment'
    ).toBeGreaterThan(-1)
    expect(
      guardIndex,
      'assertServerEnvironment must run before envSchema.safeParse(process.env), ' +
        'otherwise a bundled-for-browser import silently parses {} instead of throwing'
    ).toBeLessThan(parseIndex)
  })
})
