/**
 * Bun test preload (wired via `[test] preload` in bunfig.toml).
 *
 * Registers happy-dom globals (document, window, HTMLInputElement, ...) so
 * component tests can render through @testing-library/react.
 *
 * happy-dom's registrator also swaps Bun's network globals (fetch, Request,
 * Response, ...) for its own browser emulations, which breaks tests that hit
 * a real local server (lib/utils/fetch.test.ts). Tests need the DOM, not the
 * emulated network stack — so the native implementations are captured before
 * registration and restored after.
 */

import { GlobalRegistrator } from '@happy-dom/global-registrator'

const native = {
  fetch: globalThis.fetch,
  Request: globalThis.Request,
  Response: globalThis.Response,
  Headers: globalThis.Headers,
  AbortController: globalThis.AbortController,
  AbortSignal: globalThis.AbortSignal,
  FormData: globalThis.FormData,
  Blob: globalThis.Blob,
  URL: globalThis.URL,
  URLSearchParams: globalThis.URLSearchParams,
}

GlobalRegistrator.register()

Object.assign(globalThis, native)

// Testing Library only enables React act() support when test hooks exist as
// true runtime globals; Bun injects them per test file instead, so opt in
// here to keep React from warning on state updates inside act().
const testGlobals = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
testGlobals.IS_REACT_ACT_ENVIRONMENT = true
