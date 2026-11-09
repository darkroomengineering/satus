import type { Instrumentation } from 'next'
import { z } from 'zod'

import { env } from '@/lib/env'
import { type FetchWithTimeoutOptions, fetchWithTimeout } from '@/utils/fetch'

interface ErrorReportTarget {
  url: string | undefined
  token?: string | undefined
  timeout?: number
}

interface RequestContext {
  get(): { waitUntil?: (promise: Promise<unknown>) => void } | undefined
}

// Where a host hands Next its `waitUntil`:
// https://nextjs.org/docs/app/api-reference/functions/after#platform-support
const REQUEST_CONTEXT = Symbol.for('@next/request-context')
// SAFETY: globalThis's declared type has no symbol-keyed index signature for
// the host's request context; a single-step assertion to the shape Next
// documents is the only way to read it.
const host = globalThis as Record<symbol, RequestContext | undefined>

/** Never rejects: a failed or slow delivery logs one warning and is dropped. */
async function deliver(url: string, init: FetchWithTimeoutOptions) {
  try {
    const response = await fetchWithTimeout(url, init)
    await response.body?.cancel()
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
  } catch (deliveryError) {
    console.warn(
      `[error-report] Could not deliver to ERROR_REPORT_URL: ${
        deliveryError instanceof Error
          ? deliveryError.message
          : String(deliveryError)
      }`
    )
  }
}

/**
 * Builds Next's `onRequestError` hook. Every server error logs one JSON line;
 * with a `url`, the same JSON is POSTed there. The report carries the error
 * message, stack and digest plus the route, never headers, cookies, the query string
 * or the body, since those hold session and webhook secrets.
 *
 * The hook returns as soon as delivery starts. Next awaits it before sending
 * the error response for a route handler or proxy error, so waiting for the
 * receiver here would hold that response. Delivery goes to the host's
 * `waitUntil`, which keeps a serverless function alive until it settles, at
 * most `timeout` (3 s) later. A failed or slow delivery logs one warning and
 * is dropped; nothing retries it.
 */
export function createOnRequestError({
  url,
  token,
  timeout = 3000,
}: ErrorReportTarget): Instrumentation.onRequestError {
  return (error, { path, method }, context) => {
    const report = {
      timestamp: new Date().toISOString(),
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      digest:
        error instanceof Error && 'digest' in error
          ? z.string().safeParse(error.digest).data
          : undefined,
      path: path.replace(/[?#].*$/s, ''),
      method,
      routerKind: context.routerKind,
      routePath: context.routePath,
      routeType: context.routeType,
      renderSource: context.renderSource,
      revalidateReason: context.revalidateReason,
    }
    const body = JSON.stringify(report)

    console.error(body)

    if (!url) return

    const headers = new Headers({ 'content-type': 'application/json' })
    if (token) headers.set('authorization', `Bearer ${token}`)

    const delivery = deliver(url, { method: 'POST', headers, body, timeout })

    // `after()` cannot schedule this: Next calls the hook outside the request
    // scope for a route handler error, where `after()` throws.
    //
    // SHORTCUT: with no host `waitUntil`, nothing holds the delivery open.
    // ceiling: `next start` keeps running and finishes it; a serverless host
    // that provides no `waitUntil` can freeze the function once the response
    // is sent and drop the report. upgrade: when such a host loses reports,
    // have it provide `waitUntil` through `@next/request-context`.
    host[REQUEST_CONTEXT]?.get()?.waitUntil?.(delivery)
  }
}

export const onRequestError = createOnRequestError({
  url: env.ERROR_REPORT_URL,
  token: env.ERROR_REPORT_TOKEN,
})
