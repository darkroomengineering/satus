/**
 * Bun test preload (`[test] preload` in bunfig.toml): registers happy-dom
 * globals. Its registrator also swaps Bun's network globals (fetch, Request,
 * ...) for browser emulations, which breaks tests that hit a real local server
 * (lib/utils/fetch.test.ts), so the native ones are restored after.
 */

import { AsyncLocalStorage } from 'node:async_hooks'

import { GlobalRegistrator } from '@happy-dom/global-registrator'

// Next's server puts AsyncLocalStorage on globalThis before loading anything
// else; without it Next's request stores are stubs that throw on `run()`. Must
// happen in this preload, before any test imports `next/*`: each store is
// created on first import, so a test file would only work when it loads first.
Object.assign(globalThis, { AsyncLocalStorage })

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
