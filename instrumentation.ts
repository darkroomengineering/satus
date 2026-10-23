import type { Instrumentation } from 'next'
import { z } from 'zod'

import { env } from '@/lib/env'
import { fetchWithTimeout } from '@/utils/fetch'

interface ErrorReportTarget {
  url: string | undefined
  token?: string | undefined
  timeout?: number
}

/**
 * Builds Next's `onRequestError` hook. Every server error logs one JSON line;
 * with a `url`, the same JSON is POSTed there. The report carries the error
 * message, stack and digest plus the route, never headers, cookies, the query string
 * or the body, since those hold session and webhook secrets.
 *
 * Next awaits this hook, so delivery holds the response for at most `timeout`
 * (3 s). A failed or slow delivery logs one warning and is dropped; nothing
 * retries it.
 */
export function createOnRequestError({
  url,
  token,
  timeout = 3000,
}: ErrorReportTarget): Instrumentation.onRequestError {
  return async (error, { path, method }, context) => {
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

    try {
      const response = await fetchWithTimeout(url, {
        method: 'POST',
        headers,
        body,
        timeout,
      })
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
}

export const onRequestError = createOnRequestError({
  url: env.ERROR_REPORT_URL,
  token: env.ERROR_REPORT_TOKEN,
})
