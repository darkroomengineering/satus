# Optional Features

`OptionalFeatures` is mounted in `app/(site)/layout.tsx` and loads heavy features only when they apply. React `lazy()` keeps code splitting; `use(browser())` keeps their rendering in the browser. It does not by itself reduce bundle size.

| Feature      | Trigger                          | Description                                             |
| ------------ | -------------------------------- | ------------------------------------------------------- |
| WebGL Canvas | Always mounted (shared strategy) | Persistent Three.js canvas (no-op on non-WebGL devices) |
| Dev Tools    | Development mode                 | Orchestra debug panel (`Cmd/Ctrl + O`)                  |

## WebGL

`OptionalFeatures` mounts the shared root canvas (`<Canvas root />`) so the
WebGL context persists across navigation; pages portal content into it with
`<WebGLTunnel>`, no per-page setup. The per-page alternative is
`<Wrapper webgl>`; pick one (see `lib/webgl/README.md`). Either way:

1. The canvas mounts only on WebGL-capable devices; the capability probe and the canvas module still load
2. GPU capability is detected via a WebGL 2 context probe on a desktop
   viewport that is not touch-only (`useDeviceDetection().isWebGL`)
3. With the shared strategy, the context persists across navigation
4. GPU boot still waits for `window.load` through `useAfterLoad`; `browser()` does not replace that scheduling gate

## How It Works

1. Renders a null Suspense fallback on the server because `BrowserFeatures` calls `use(browser())`
2. Renders `BrowserFeatures` in the browser, where `browser()` does not suspend
3. Loads each enabled feature through `lazy()` inside its own null Suspense boundary, so one pending chunk does not hold up the other features
4. Preserves the WebGL device and load gates inside the canvas component

A new feature goes in `lib/features/index.tsx` the same way: a `lazy()` import rendered inside `BrowserFeatures` in its own `<Suspense fallback={null}>`, only when enabled.
