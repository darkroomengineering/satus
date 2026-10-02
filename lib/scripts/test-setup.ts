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
declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

// Base UI waits for an exiting element's animations to finish before it
// unmounts or hides it, polling through animation frames. happy-dom runs no
// CSS animations, so that wait only adds latency: about 700 ms per tab switch,
// enough to push the Tabs tests past bun's 5 s timeout on a loaded CI runner.
// This switch makes exits complete immediately. Cost: unit tests never
// exercise Base UI's wait-for-animations path; only a real browser (e2e)
// covers that timing.
declare global {
  var BASE_UI_ANIMATIONS_DISABLED: boolean
}
globalThis.BASE_UI_ANIMATIONS_DISABLED = true
