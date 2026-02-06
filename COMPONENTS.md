# Component & API Manifest

Quick-reference for every component, hook, and utility in the Satus starter kit. For detailed usage, see individual READMEs inside each directory.

---

## UI Components

| Component | Import | Type | Description |
|-----------|--------|------|-------------|
| Accordion | `@/components/ui/accordion` | Client, Compound | Collapsible sections with Base UI Collapsible + Activity |
| AlertDialog | `@/components/ui/alert-dialog` | Client, Compound | Confirmation dialogs for destructive actions |
| Checkbox | `@/components/ui/checkbox` | Client, Compound | Toggle checkbox with optional label |
| Dropdown | `@/components/ui/dropdown` | Client | Simple dropdown selector with Activity |
| Fold | `@/components/ui/fold` | Client | Scroll-driven parallax fold transitions |
| Form | `@/components/ui/form` | Client | Server action form with validation, auto-reset. Sub-imports: `@/components/ui/form/fields` |
| Image | `@/components/ui/image` | Client | Enhanced Next.js Image with responsive sizing. **Always use this instead of next/image** |
| Link | `@/components/ui/link` | Client | Smart link: Next Link for internal, `<a>` for external, `<button>` for onClick |
| Marquee | `@/components/ui/marquee` | Client | Infinite scrolling ticker synced with Lenis scroll velocity |
| Menu | `@/components/ui/menu` | Client, Compound | Dropdown menu with keyboard nav, radio/checkbox items |
| NotConfigured | `@/components/ui/not-configured` | Server | Setup instructions for unconfigured integrations |
| RealViewport | `@/components/ui/real-viewport` | Client | Sets CSS viewport custom properties (--vw, --dvh, etc.) |
| SanityImage | `@/components/ui/sanity-image` | Server | Sanity CMS image wrapper with auto dimensions |
| ScrollRestoration | `@/components/ui/scroll-restoration` | Client | Controls browser scroll restoration |
| Scrollbar | `@/components/ui/scrollbar` | Client | Custom scrollbar synced with Lenis |
| Select | `@/components/ui/select` | Client, Compound | Accessible dropdown select with Base UI |
| Switch | `@/components/ui/switch` | Client, Compound | Toggle switch with optional label |
| Tabs | `@/components/ui/tabs` | Client, Compound | Tabbed navigation with animated indicator |
| Toast | `@/components/ui/toast` | Client, Compound | Notification system with typed messages (success/error/info) |
| Tooltip | `@/components/ui/tooltip` | Client, Compound | Hover tooltip with positioning |

---

## Layout Components

| Component | Import | Type | Description |
|-----------|--------|------|-------------|
| Wrapper | `@/components/layout/wrapper` | Client | Page wrapper: theme + Lenis + WebGL. Includes Header/Footer |
| Header | `@/components/layout/header` | Client | Fixed navigation header |
| Footer | `@/components/layout/footer` | Server | Site footer |
| Lenis | `@/components/layout/lenis` | Client | Smooth scroll provider synced with Tempus |
| Theme | `@/components/layout/theme` | Client | Theme context provider (`useTheme` hook) |

---

## Effect Components

| Component | Import | Type | Description |
|-----------|--------|------|-------------|
| GSAPRuntime | `@/components/effects/gsap` | Client | Syncs GSAP ticker with Tempus frame loop |
| AnimatedGradient | `@/components/effects/animated-gradient` | Client | WebGL animated gradient with flowmap |
| SplitText | `@/components/effects/split-text` | Client | GSAP SplitText for line/word/char animation |
| ProgressText | `@/components/effects/progress-text` | Client | Scroll-driven word-by-word text reveal |

---

## Hooks

| Hook | Import | Signature | Description |
|------|--------|-----------|-------------|
| useStore | `@/hooks/store` | `() => { isNavOpened, setIsNavOpened }` | Global nav state (Zustand) |
| useDeviceDetection | `@/hooks/use-device-detection` | `() => DeviceInfo` | Mobile, GPU, browser, reduced motion detection |
| usePrefetch | `@/hooks/use-prefetch` | `(href) => ref` | Viewport-triggered route prefetch with network awareness |
| useScrollTrigger | `@/hooks/use-scroll-trigger` | `(options, deps?) => void` | Scroll-based animation trigger with position syntax |
| useMediaQuery | `@/hooks/use-sync-external` | `(query) => boolean` | CSS media query subscription |
| useOnlineStatus | `@/hooks/use-sync-external` | `() => boolean` | Network online/offline status |
| usePreferredColorScheme | `@/hooks/use-sync-external` | `() => 'light' \| 'dark'` | System theme preference |
| usePreferredReducedMotion | `@/hooks/use-sync-external` | `() => boolean` | Reduced motion preference |
| useDocumentVisibility | `@/hooks/use-sync-external` | `() => DocumentVisibilityState` | Tab visibility state |
| useTransform | `@/hooks/use-transform` | `(callback?, deps?) => () => Transform` | Hierarchical transform context |
| TransformProvider | `@/hooks/use-transform` | `{ children, ref? }` | Transform context provider component |
| useViewport | `@/components/ui/real-viewport` | `() => ViewportValues` or `(selector) => T` | Viewport dimensions (--vw, --dvh) |
| useTheme | `@/components/layout/theme` | `() => { state, actions }` | Theme state and setter |
| useFormContext | `@/components/ui/form` | `() => { state, actions, meta }` | Form state within Form component |
| useToast | `@/components/ui/toast` | `() => { toast }` | Imperative toast API |
| useFold | `@/components/ui/fold` | `() => boolean` | Whether inside a Fold component |
| useFlowmap | `@/webgl/components/flowmap-provider` | `(type?) => Fluid \| Flowmap` | Access fluid/flowmap simulation |
| useCanvas | `@/webgl/components/canvas` | `() => { WebGLTunnel, DOMTunnel }` | Canvas tunnel access |
| useWebGLElement | `@/webgl/hooks/use-webgl-element` | `(options?) => { setRef, rect, isVisible }` | Combined rect + visibility for WebGL |
| useWebGLRect | `@/webgl/hooks/use-webgl-rect` | `(rect, onUpdate?, options?) => () => Transform` | DOM-to-WebGL position mapping |

---

## Utilities

### Math (`@/utils/math`)

| Function | Signature | Description |
|----------|-----------|-------------|
| clamp | `(min, input, max) => number` | Constrain value between bounds |
| lerp | `(start, end, amount) => number` | Linear interpolation |
| mapRange | `(inMin, inMax, input, outMin, outMax, clamp?) => number` | Map value between ranges |
| truncate | `(value, decimals) => number` | Truncate to decimal places |
| modulo | `(n, d) => number` | True modulo (handles negatives) |
| roundTo | `(value, multiple) => number` | Round to nearest multiple |
| degToRad | `(degrees) => number` | Degrees to radians |
| radToDeg | `(radians) => number` | Radians to degrees |
| distance | `(x1, y1, x2, y2) => number` | 2D point distance |
| normalize | `(min, max, value) => number` | Normalize to 0-1 range |

### Strings (`@/utils/strings`)

| Function | Signature | Description |
|----------|-----------|-------------|
| slugify | `(text) => string` | URL-friendly slug |
| convertToCamelCase | `(str) => string` | Lowercase first character |
| capitalizeFirstLetter | `(str) => string` | Uppercase first character |
| twoDigits | `(n) => string` | Zero-padded two-digit string |
| numberWithCommas | `(x) => string` | Thousands separator formatting |
| isEmptyObject | `(obj) => boolean` | Check for empty object |
| isEmptyArray | `(arr) => boolean` | Check for empty array |

### Animation (`@/utils/animation`)

| Function | Signature | Description |
|----------|-----------|-------------|
| stagger | `(index, total, progress, amount) => number` | Staggered progress for sequences |
| ease | `(progress, easeName) => number` | Apply easing to progress value |
| fromTo | `(entries, from, to, progress, options?) => void` | Declarative progress-based animation |
| spring | `(current, target, velocity, stiffness?, damping?, dt?) => { value, velocity }` | Spring physics animation |

Re-exports: `clamp`, `lerp`, `mapRange`, `modulo`, `truncate` from math; `easings`, `EasingName` from easings; `measure`, `mutate`, `batch` from raf; `desktopVW`, `mobileVW`, `desktopVH`, `mobileVH` from viewport.

### Easings (`@/utils/easings`)

| Export | Description |
|--------|-------------|
| `easings` | Object with 31 easing functions (linear, quad, cubic, quart, quint, sine, expo, circ, back, elastic, bounce -- each with in/out/inOut variants) |
| `EasingName` | Union type of all easing function names |
| `EasingFunction` | `(progress: number) => number` type |

### Fetch (`@/utils/fetch`)

| Function | Signature | Description |
|----------|-----------|-------------|
| fetchWithTimeout | `(url, options?) => Promise<Response>` | Fetch with AbortController timeout (default 10s) |
| fetchJSON | `<T>(url, options?) => Promise<T>` | Fetch + JSON parse with timeout |

### RAF (`@/utils/raf`)

| Function | Signature | Description |
|----------|-----------|-------------|
| measure | `<T>(fn) => Promise<T>` | Queue DOM read to prevent layout thrashing |
| mutate | `<T>(fn) => Promise<T>` | Queue DOM write to prevent layout thrashing |
| batch | `(reads, write) => Promise<void>` | Batch multiple reads then write |

### Viewport (`@/utils/viewport`)

| Function | Signature | Description |
|----------|-----------|-------------|
| desktopVW | `(value, width) => number` | Scale px relative to desktop design width (1728px) |
| mobileVW | `(value, width) => number` | Scale px relative to mobile design width (375px) |
| desktopVH | `(value, height) => number` | Scale px relative to desktop design height |
| mobileVH | `(value, height) => number` | Scale px relative to mobile design height |

### Metadata (`@/utils/metadata`)

| Function | Signature | Description |
|----------|-----------|-------------|
| generatePageMetadata | `(options) => Metadata` | Complete Next.js metadata with OG/Twitter cards |
| generateSanityMetadata | `({ document, url?, type? }) => Metadata` | Metadata from Sanity CMS documents |

### Rate Limit (`@/utils/rate-limit`)

| Function | Signature | Description |
|----------|-----------|-------------|
| rateLimit | `(identifier, config) => RateLimitResult` | In-memory rate limiter |
| getClientIP | `(request) => string` | Extract client IP from headers (Vercel/Cloudflare/proxy) |
| rateLimiters | `{ strict, standard, relaxed }` | Pre-configured limit configs |

### Context (`@/utils/context`)

| Function | Signature | Description |
|----------|-----------|-------------|
| createStandardContext | `<S, A, M?>(displayName?) => Context` | Create typed context with `{ state, actions, meta }` shape |
| useStandardContext | `(Context, hookName) => { state, actions, meta? }` | Consume standard context with error boundary |
| StandardContext | `interface { state: S, actions: A, meta?: M }` | Standard context type interface |

### Validation (`@/utils/validation`)

| Export | Type | Description |
|--------|------|-------------|
| sanityEnvSchema | `ZodObject` | Validates Sanity env vars |
| shopifyEnvSchema | `ZodObject` | Validates Shopify env vars |
| hubspotEnvSchema | `ZodObject` | Validates HubSpot env vars (either token or portal ID) |
| mailchimpEnvSchema | `ZodObject` | Validates Mailchimp env vars |
| turnstileEnvSchema | `ZodObject` | Validates Turnstile env vars |
| analyticsEnvSchema | `ZodObject` | Validates Analytics env vars (either GA or GTM) |
| coreEnvSchema | `ZodObject` | Validates core env vars (BASE_URL as valid URL) |
| emailSchema | `ZodEmail` | Zod 4 email validator |
| phoneSchema | `ZodString` | E.164 phone number validator |
| parseFormData | `(schema, formData) => FormState \| { success, data }` | Parse and validate FormData with Zod schema |
| zodToValidator | `(schema) => (value: string) => boolean` | Bridge Zod schemas to form hook client validators |

### Environment (`@/lib/env`)

| Export | Type | Description |
|--------|------|-------------|
| env | `Env` | Typed, validated environment variables (parsed once at import) |

### Integration Registry (`@/integrations/registry`)

| Export | Type | Description |
|--------|------|-------------|
| integrations | `Record<IntegrationId, IntegrationEntry>` | All available integrations with name, schema, docs URL |
| isConfigured | `(id: IntegrationId) => boolean` | Check if a specific integration is configured |
| getConfigured | `() => string[]` | Get names of all configured integrations |
| getUnconfigured | `() => string[]` | Get names of all unconfigured integrations |

---

## WebGL Components

| Component | Import | Description |
|-----------|--------|-------------|
| Canvas | `@/webgl/components/canvas` | WebGL context + tunnel system. Use `root` prop to activate |
| GlobalCanvas | `@/webgl/components/global-canvas` | Persistent singleton WebGPU/WebGL canvas (mount in root layout) |
| WebGLTunnel / DOMTunnel | `@/webgl/components/tunnel` | Portals into R3F canvas / DOM overlay |
| WebGLImage | `@/webgl/components/image` | GPU-rendered image with visibility culling |
| PostProcessing | `@/webgl/components/postprocessing` | EffectComposer pipeline |
| FlowmapProvider | `@/webgl/components/flowmap-provider` | Fluid + flowmap simulation context |
| Preload | `@/webgl/components/preload` | GPU shader/texture pre-compilation |
| RAF | `@/webgl/components/raf` | R3F frame loop via Tempus |

---

## Compound Component Pattern

Components marked **Compound** support both simple and compound APIs:

```tsx
// Simple API (recommended for common cases)
<Select options={[...]} onValueChange={...} />

// Compound API (for full customization)
<Select.Root>
  <Select.Trigger><Select.Value /></Select.Trigger>
  <Select.Portal><Select.Positioner>
    <Select.Popup>{items}</Select.Popup>
  </Select.Positioner></Select.Portal>
</Select.Root>
```

Compound components: Accordion, AlertDialog, Checkbox, Menu, Select, Switch, Tabs, Toast, Tooltip.

---

## Import Path Aliases

| Alias | Maps To |
|-------|---------|
| `@/*` | `./*` |
| `@/components/*` | `./components/*` |
| `@/hooks/*` | `./lib/hooks/*` |
| `@/utils/*` | `./lib/utils/*` |
| `@/webgl/*` | `./lib/webgl/*` |
| `@/styles/*` | `./lib/styles/*` |
| `@/integrations/*` | `./lib/integrations/*` |
| `@/lib/*` | `./lib/*` |

---

*Built with [Satus](https://github.com/darkroomengineering/satus) by [darkroom.engineering](https://darkroom.engineering)*
