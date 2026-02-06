# Code Patterns

Recurring patterns in this codebase. Read this before writing new code.

## 1. Compound Component Pattern

Used by: Accordion, AlertDialog, Menu, Select, Tabs, Toast, Tooltip, Checkbox, Switch.
All UI primitives wrap [Base UI](https://base-ui.com/) (`@base-ui/react`) with project styling.

**Pattern A -- Namespace + Named Exports** (Accordion, Tabs):

```tsx
'use client'
import { Collapsible } from '@base-ui/react/collapsible'
import cn from 'clsx'
import s from './accordion.module.css'

function Root({ children, className, ...props }: RootProps) {
  return (
    <Collapsible.Root className={cn(s.accordion, className)} {...props}>
      {children}
    </Collapsible.Root>
  )
}
function Button({ children, className, ...props }: HTMLAttributes<HTMLButtonElement>) {
  return <Collapsible.Trigger className={cn(s.button, className)} {...props}>{children}</Collapsible.Trigger>
}

export { Body, Button, Group, Root }                       // named exports for tree-shaking
export const Accordion = { Group, Root, Button, Body }     // namespace for <Accordion.Root>
```

**Pattern B -- Function Properties** (Tooltip, Checkbox, Switch):

```tsx
function Tooltip({ content, children, side = 'top', className }: TooltipProps) { /* simple API */ }

const Popup = ({ className, ...props }: ComponentProps<typeof BaseTooltip.Popup>) => (
  <BaseTooltip.Popup className={cn(s.popup, className)} {...props} />
)

Tooltip.Root = BaseTooltip.Root      // attach sub-components
Tooltip.Popup = Popup
export { Tooltip }
```

**Rules:**
- CSS Modules as `s`, merged via `cn()` from `clsx`
- Always pass `className` through: `cn(s.root, className)`
- Provide both simple API and compound API for customization
- Spread `{...props}` for extensibility

---

## 2. CSS Modules + Tailwind Hybrid

Tailwind for spacing/colors/typography (80%). CSS Modules for animations/layouts (20%).

```tsx
import s from './component.module.css'
import cn from 'clsx'

<div className="flex items-center gap-4 p-2">              {/* Tailwind only */}
<div className={s.animatedPanel}>                           {/* Module only */}
<div className={cn(s.root, 'p-4', className)}>             {/* Combined */}
<div className={cn(s.trigger, 'flex h-10 rounded-md border', className)}>
```

- File naming: `{component}.module.css` (not `index.module.css`)
- Always import as `s`
- Use `@apply` sparingly -- prefer direct Tailwind classes

---

## 3. Standard Context Pattern

Utility at `lib/utils/context.ts`. Shape is always `{ state, actions, meta? }`.

```tsx
import { createStandardContext, useStandardContext } from '@/utils/context'

interface MyState { count: number }
interface MyActions { increment: () => void }
interface MyMeta { id: string }

const MyContext = createStandardContext<MyState, MyActions, MyMeta>('MyComponent')

function MyProvider({ children }: PropsWithChildren) {
  const [count, setCount] = useState(0)
  return (
    <MyContext.Provider value={{
      state: { count },
      actions: { increment: () => setCount((c) => c + 1) },
      meta: { id: 'my-component' },
    }}>
      {children}
    </MyContext.Provider>
  )
}

function useMyComponent() {
  return useStandardContext(MyContext, 'useMyComponent')  // throws if outside provider
}
```

For component-scoped contexts, inline `createContext` + `useContext` is fine:

```tsx
const AccordionContext = createContext({} as { isOpen: boolean; toggle: () => void })
```

---

## 4. Server vs Client Component Decision

**Default to Server Components.** Add `'use client'` only when using:
- Hooks (`useState`, `useEffect`, `useRef`, etc.)
- Event handlers (`onClick`, `onChange`, etc.)
- Browser APIs (`window`, `document`, etc.)
- Context consumers (`useTheme`, `useLenis`, `useCanvas`, etc.)

```tsx
// product-page.tsx -- Server Component (default, no directive)
export default async function ProductPage({ params }: { params: { slug: string } }) {
  const data = await fetchProduct(params.slug)
  return <ProductView product={data} />       // serializable props only
}

// product-view.tsx -- Client Component
'use client'
export function ProductView({ product }: { product: Product }) {
  const [qty, setQty] = useState(1)
}
```

- `'use client'` on first line, before imports
- Server Components can import Client Components (not vice versa)
- All UI primitives in `components/ui/` are `'use client'`

---

## 5. Integration Optionality Pattern

All integrations are optional, self-contained in `lib/integrations/{name}/`.

```tsx
import { isSanityConfigured } from '@/integrations/check-integration'
import { NotConfigured } from '@/components/ui/not-configured'

export default async function SanityPage() {
  if (!isSanityConfigured()) {
    return <NotConfigured integration="Sanity" />   // renders setup instructions
  }
  // ... normal page logic
}
```

Available checks: `isSanityConfigured()`, `isShopifyConfigured()`, `isHubSpotConfigured()`, `isMailchimpConfigured()`, `isTurnstileConfigured()`.

#### Integration Registry

The integration registry (`lib/integrations/registry.ts`) centralizes integration metadata:

```ts
import { isConfigured, getConfigured } from '@/integrations/registry'

// Check specific integration
if (isConfigured('sanity')) { /* ... */ }

// List all configured
const active = getConfigured() // ['Sanity', 'Shopify', ...]
```

Adding a new integration: add its Zod schema to `@/utils/validation`, then add one entry to the registry. `check-integration.ts`, `doctor.ts`, and listing functions derive automatically.

`NotConfigured` auto-detects env vars and docs URL for known integrations. Pass custom props for new ones:

```tsx
<NotConfigured integration="Stripe" description="Payment processing"
  docsUrl="https://stripe.com/docs" envVars={['STRIPE_SECRET_KEY']} />
```

---

## 6. WebGL Element Lifecycle

DOM-synced WebGL via tunnel system. GlobalCanvas persists across routes.

```
Root Layout -> GlobalCanvas (WebGLTunnel.Out, DOMTunnel.Out)
Page -> Canvas (activates global canvas) -> WebGLTunnel.In (portals 3D content up)
```

**DOM side:**

```tsx
'use client'
import { useWebGLElement } from '@/webgl/hooks/use-webgl-element'
import { useCanvas } from '@/webgl/components/canvas'

function MyWebGLComponent({ className }: { className?: string }) {
  const { setRef, rect, isVisible } = useWebGLElement()
  const { WebGLTunnel } = useCanvas()

  return (
    <>
      <div ref={setRef} className={className} />
      <WebGLTunnel.In>
        <MyMesh rect={rect} visible={isVisible} />
      </WebGLTunnel.In>
    </>
  )
}
```

**WebGL side:**

```tsx
import { useWebGLRect } from '@/webgl/hooks/use-webgl-rect'

function MyMesh({ rect, visible }: { rect: Rect; visible: boolean }) {
  const meshRef = useRef<Mesh>(null)
  useWebGLRect(rect, ({ position, scale }) => {
    meshRef.current?.position.copy(position)
    meshRef.current?.scale.copy(scale)
  }, { visible })
  if (!visible) return null
  return <mesh ref={meshRef}>{/* geometry + material */}</mesh>
}
```

- `useWebGLElement` combines rect tracking + visibility detection
- `useWebGLRect` maps DOM rect to WebGL coordinates with scroll sync
- Always dispose GPU resources on unmount

---

## 7. useRef for Object Instantiation

React Compiler is enabled. **Do NOT use** `useMemo`, `useCallback`, or `React.memo`.

```tsx
// Persistent instances (compiler cannot optimize class instantiation)
const instanceRef = useRef<MyClass | null>(null)
if (!instanceRef.current) {
  instanceRef.current = new MyClass()
}

// Three.js objects with cleanup
const [material] = useState(() => new MeshBasicMaterial())
useEffect(() => () => material.dispose(), [material])

// Mutable values that should NOT trigger re-renders
const scrollRef = useRef(0)
const observerRef = useRef<IntersectionObserver | null>(null)
```

What the compiler handles automatically (no manual memoization needed):
```tsx
const value = compute(a, b)              // auto-memoized
const handler = () => doSomething()      // auto-stable
const filtered = items.filter(predicate) // auto-memoized
```

---

## 8. Import Conventions

```tsx
import { Image } from '@/components/ui/image'     // path aliases, not relative
import { Link } from '@/components/ui/link'        // wrapper components, not next/link
import s from './component.module.css'             // CSS Modules as 's'
import type { Metadata } from 'next'               // type-only imports (Biome enforced)
import { Tabs } from '@base-ui/react/tabs'         // specific sub-packages, not barrel
import cn from 'clsx'                              // default import
```

**Import order** (Biome enforced): React/framework -> third-party -> `@/` aliases -> relative -> CSS Module.

---

## Quick Reference

| Pattern | When to Use | Example File |
|---------|------------|--------------|
| Compound Component | UI primitive wrapping Base UI | `components/ui/tabs/index.tsx` |
| CSS Modules + Tailwind | Any styled component | `components/ui/select/index.tsx` |
| Standard Context | Shared state across tree | `components/ui/form/index.tsx` |
| Server/Client split | Pages with interactive parts | Any `app/` route |
| Integration optionality | New third-party service | `lib/integrations/check-integration.ts` |
| WebGL lifecycle | DOM-synced 3D elements | `lib/webgl/hooks/use-webgl-element.ts` |
| useRef instantiation | Persistent objects | Any WebGL or animation component |

---

*Built with [Satus](https://github.com/darkroomengineering/satus) by [darkroom.engineering](https://darkroom.engineering)*
