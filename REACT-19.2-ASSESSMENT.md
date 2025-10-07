# React 19.2 Feature Adoption Assessment

**Project:** Satus Starter  
**React Version:** 19.2.0  
**Next.js Version:** 15.6.0-canary.49  
**Date:** October 7, 2025

## Executive Summary

This document assesses opportunities to leverage React 19.2's new features in the Satus codebase. The major features are:
1. **`<Activity />` component** - Break apps into controllable, prioritizable activities
2. **`useEffectEvent` hook** - Separate event logic from effect dependencies  
3. **`cacheSignal`** - Auto-abort signals for server component data fetching
4. **Performance Tracks** - Chrome DevTools integration for better profiling

All recommendations maintain current functionality while improving performance and code quality.

**Source:** [React 19.2 Release Blog Post](https://react.dev/blog/2025/10/01/react-19-2#performance-tracks)

---

## 1. `<Activity />` Component Opportunities

The `<Activity />` component lets you break your app into "activities" that can be controlled and prioritized. It supports two modes:

- **`hidden`**: Unmounts effects and defers all updates until React has nothing left to work on
- **`visible`**: Shows children, mounts effects, and allows updates normally

This lets you pre-render hidden parts of the app without impacting visible performance. Perfect for:
- Pre-rendering content users will likely navigate to next
- Saving state when users navigate away (maintain input fields on back navigation)
- Tab systems, accordions, carousels, and off-screen WebGL scenes

**Future:** React plans to add more modes for different use cases.

### 1.1 Accordion Component ⭐⭐⭐ HIGH PRIORITY

**File:** `components/accordion/index.tsx`

**Current Implementation:**
- Accordion body uses CSS height transitions
- Content always renders, just hidden with CSS
- No effect cleanup when accordion is closed
- All accordion panels render simultaneously in a group

**Opportunity:**
Wrap accordion body content in `<Activity />` to:
- Defer updates to closed accordion panels
- Automatically cleanup effects when panels close
- Reduce memory pressure when many accordions exist
- Maintain smooth height transitions

**Implementation:**
```tsx
// components/accordion/index.tsx
import { Activity } from 'react'

function Body({
  children,
  className,
}: {
  children?: ReactNode
  className?: string
}) {
  const { isOpen } = useAccordionContext()
  const [setRectRef, entry] = useResizeObserver()

  return (
    <div
      className={cn(s.body, isOpen && s.isOpen)}
      aria-hidden={!isOpen}
      style={{
        height: `${isOpen ? entry?.contentRect.height : 0}px`,
      }}
    >
      <div ref={setRectRef}>
        {/* Wrap content in Activity to defer updates when closed */}
        <Activity mode={isOpen ? 'visible' : 'hidden'}>
          <div className={className}>{children}</div>
        </Activity>
      </div>
    </div>
  )
}
```

**Benefits:**
- 🚀 Defers updates to closed accordion content
- 🧹 Automatic effect cleanup when closed
- 💾 Reduced memory usage with many accordions
- ✅ Maintains current visual behavior

**Effort:** Low (15 minutes)  
**Impact:** Medium-High

---

### 1.2 Dropdown Component ⭐⭐ MEDIUM PRIORITY

**File:** `components/dropdown/index.tsx`

**Current Implementation:**
- Dropdown options conditionally render: `{isOpened && <div>...</div>}`
- Options fully unmount when closed

**Opportunity:**
Replace conditional rendering with `<Activity />` to:
- Pre-render options before opening
- Instant visual feedback on first open
- Smoother experience

**Implementation:**
```tsx
// components/dropdown/index.tsx
import { Activity } from 'react'

export function Dropdown({ ... }: DropdownProps) {
  const [isOpened, setIsOpened] = useState(false)
  const [selected, setSelected] = useState(defaultValue)

  useEffect(() => {
    function onClick() {
      setIsOpened(false)
    }
    window.addEventListener('click', onClick, false)
    return () => {
      window.removeEventListener('click', onClick, false)
    }
  }, [])

  return (
    <div className={cn(s.dropdown, isOpened && s.isOpened, className)}>
      <button ... />
      
      {/* Always render, use Activity to control visibility */}
      <Activity mode={isOpened ? 'visible' : 'hidden'}>
        <div
          className={s.options}
          aria-hidden={!isOpened}
          onClick={(e) => e.stopPropagation()}
        >
          {options.map((value, i) => (
            <button ... key={`option-${value}`}>
              {value}
            </button>
          ))}
        </div>
      </Activity>
    </div>
  )
}
```

**Benefits:**
- ⚡ Faster first open (pre-rendered)
- 🎨 No flash of unstyled content
- 🧹 Automatic event listener cleanup

**Effort:** Low (10 minutes)  
**Impact:** Low-Medium

---

### 1.3 WebGL Canvas/Scenes ⭐⭐⭐ HIGH PRIORITY

**Files:**
- `webgl/components/canvas/index.tsx`
- `components/animated-gradient/webgl.tsx`
- `app/(pages)/r3f/(components)/box/webgl.jsx`

**Current Implementation:**
- WebGL canvas conditionally renders based on device detection
- All WebGL components active when rendered
- No mechanism to defer off-screen WebGL content

**Opportunity:**
Use `<Activity />` for:
- Multiple WebGL scenes in page (tab/carousel systems)
- Off-screen WebGL content (below fold)
- Expensive 3D components that can defer updates

**Implementation Example 1 - Multiple Scenes:**
```tsx
// Example: Tabbed WebGL experiences
function WebGLTabs() {
  const [activeTab, setActiveTab] = useState(0)
  
  return (
    <div>
      <Canvas root>
        {/* Tab 1 - Box scene */}
        <Activity mode={activeTab === 0 ? 'visible' : 'hidden'}>
          <BoxScene />
        </Activity>
        
        {/* Tab 2 - Animated gradient */}
        <Activity mode={activeTab === 1 ? 'visible' : 'hidden'}>
          <AnimatedGradientScene />
        </Activity>
      </Canvas>
    </div>
  )
}
```

**Implementation Example 2 - Scroll-based activation:**
```tsx
// components/animated-gradient/index.tsx
import { Activity } from 'react'

export function AnimatedGradient({ ... }) {
  const [isInViewport, setIsInViewport] = useState(false)
  
  // Use intersection observer or scroll trigger
  useEffect(() => {
    // Detect if component is near viewport
    const observer = new IntersectionObserver(
      ([entry]) => setIsInViewport(entry.isIntersecting),
      { rootMargin: '200px' } // Pre-activate before visible
    )
    // ... setup observer
  }, [])
  
  return (
    <div ref={ref}>
      {WebGLTunnel && (
        <WebGLTunnel.In>
          <Activity mode={isInViewport ? 'visible' : 'hidden'}>
            <WebGLAnimatedGradient rect={rect} {...props} />
          </Activity>
        </WebGLTunnel.In>
      )}
    </div>
  )
}
```

**Benefits:**
- 🎮 Deferred WebGL updates for off-screen scenes
- 🔋 Significant GPU/CPU savings
- 🎯 Better performance on pages with multiple 3D elements
- 🧹 Automatic cleanup of WebGL resources

**Effort:** Medium (30-45 minutes per implementation)  
**Impact:** High (especially for pages with multiple WebGL scenes)

---

## 2. `useEffectEvent` Hook Opportunities

`useEffectEvent` splits the "event" part of effect logic out from the Effect itself. Effect Events:
- Always see the latest props and state (like DOM events)
- Should **NOT** be declared in the dependency array
- Can only be declared in the same component or Hook as "their" Effect
- Prevents effects from re-running when event callback dependencies change

**Important:** You need `eslint-plugin-react-hooks@6.1.1` or later so the linter doesn't try to insert Effect Events as dependencies.

### 2.1 Scroll Trigger Hook ⭐⭐⭐ HIGH PRIORITY

**File:** `hooks/use-scroll-trigger.ts`

**Current Implementation:**
- Complex `useEffect` with many dependencies
- Manual dependency management in `deps` array
- Callbacks passed as dependencies cause re-runs

**Problems:**
```tsx
// Lines 226-242: onProgress callback as ref to avoid re-runs
const onProgressRef = useRef(onProgress)
onProgressRef.current = onProgress

const onUpdate = useCallback(
  (progress: number, lastProgress: number) => {
    onProgressRef.current?.({ ... })
  },
  [endValue, startValue, steps, ...deps] // Still many dependencies
)
```

**Opportunity:**
Use `useEffectEvent` to:
- Simplify callback handling
- Remove manual ref management
- Cleaner dependency arrays
- Better separation of concerns

**Implementation:**
```tsx
// hooks/use-scroll-trigger.ts
import { useEffect, useEffectEvent } from 'react'

export function useScrollTrigger(
  {
    rect,
    start = 'bottom bottom',
    end = 'top top',
    id = '',
    offset = 0,
    disabled = false,
    markers,
    onEnter,
    onLeave,
    onProgress,
    steps = 1,
  }: UseScrollTriggerOptions,
  deps = [] as unknown[]
) {
  const getTransform = useTransform()
  const lenis = useLenis()

  // Markers, viewport calculations, etc...

  // ✅ Use useEffectEvent for callback handlers
  const handleProgress = useEffectEvent((progress: number, lastProgress: number) => {
    onProgress?.({
      height: endValue - startValue,
      isActive: progress >= 0 && progress <= 1,
      progress: clamp(0, progress, 1),
      lastProgress: lastProgress,
      steps: Array.from({ length: steps }).map((_, i) =>
        clamp(0, mapRange(i / steps, (i + 1) / steps, progress, 0, 1), 1)
      ),
    })
  })

  const handleEnter = useEffectEvent((progress: number) => {
    onEnter?.({ progress: clamp(0, progress, 1) })
  })

  const handleLeave = useEffectEvent((progress: number) => {
    onLeave?.({ progress: clamp(0, progress, 1) })
  })

  // ✅ Simplified state updates - no manual refs needed
  const [setProgress, _getProgress] = useLazyState(
    undefined,
    (progress: number, lastProgress: number) => {
      if (Number.isNaN(progress) || progress === undefined) return

      if (
        (progress >= 0 && lastProgress < 0) ||
        (progress <= 1 && lastProgress > 1)
      ) {
        handleEnter(progress)
      }

      if (!(clamp(0, progress, 1) === clamp(0, lastProgress, 1))) {
        handleProgress(progress, lastProgress)
      }

      if (
        (progress < 0 && lastProgress >= 0) ||
        (progress > 1 && lastProgress <= 1)
      ) {
        handleLeave(progress)
      }
    },
    [endValue, startValue, steps] // ✅ Cleaner - callbacks not in deps
  )

  // ✅ Update callback using event function
  const update = useEffectEvent(() => {
    if (disabled) return

    let scroll: number
    if (lenis) {
      scroll = Math.floor(lenis?.scroll)
    } else {
      scroll = window.scrollY
    }

    const { translate } = getTransform()

    if (viewportMarkerStart) viewportMarkerStart.top(viewportStart)
    if (viewportMarkerEnd) viewportMarkerEnd.top(viewportEnd)
    if (elementMarkerStart) elementMarkerStart.top(elementStart - translate.y)
    if (elementMarkerEnd) elementMarkerEnd.top(elementEnd - translate.y)

    const progress = mapRange(startValue, endValue, scroll - translate.y, 0, 1)
    setProgress(progress)
  })

  // ✅ Much simpler effect dependencies
  useLenis(update)

  useEffect(() => {
    if (lenis) return
    
    window.addEventListener('scroll', update, false)
    return () => {
      window.removeEventListener('scroll', update, false)
    }
  }, [lenis]) // ✅ Only lenis changes trigger re-run

  useTransform(update)
}
```

**Benefits:**
- 🧹 Removes manual ref management (`onProgressRef.current`)
- 📉 Fewer effect re-runs
- 🎯 Cleaner dependency arrays
- 🔧 Easier to maintain and debug

**Effort:** Medium (30 minutes)  
**Impact:** High (used throughout app)

---

### 2.2 Transform Hook ⭐⭐ MEDIUM PRIORITY

**File:** `hooks/use-transform.tsx`

**Current Implementation:**
- Complex callback system with manual management
- All callbacks stored in ref array
- Update function called when transform changes

**Opportunity:**
Use `useEffectEvent` for transform callbacks to:
- Simplify callback registration
- Reduce dependency management burden
- Cleaner API for consumers

**Implementation:**
```tsx
// hooks/use-transform.tsx
import { useEffect, useEffectEvent } from 'react'

export function useTransform(
  callback?: TransformCallback,
  deps = [] as unknown[]
) {
  const { getTransform, addCallback, removeCallback } = useContext(TransformContext)

  // ✅ Use useEffectEvent for the callback
  const stableCallback = useEffectEvent((transform: Transform) => {
    callback?.(transform)
  })

  // ✅ Effect only depends on add/removeCallback, not the actual callback
  useEffect(() => {
    if (!callback) return

    addCallback(stableCallback)
    return () => {
      removeCallback(stableCallback)
    }
  }, [addCallback, removeCallback]) // ✅ callback changes don't cause re-runs

  return getTransform
}
```

**Benefits:**
- 🔄 Transform callbacks won't cause re-registrations
- 📉 Fewer effect cleanup/setup cycles
- 🎯 Cleaner consumer code

**Effort:** Low (20 minutes)  
**Impact:** Medium

---

### 2.3 GSAP ScrollTrigger Integration ⭐ LOW PRIORITY

**File:** `components/gsap/scroll-trigger.tsx`

**Current Implementation:**
```tsx
export function ScrollTrigger() {
  const lenis = useLenis(GSAPScrollTrigger.update)
  useEffect(() => GSAPScrollTrigger.refresh(), [lenis])
  return null
}
```

**Opportunity:**
Use `useEffectEvent` to separate the refresh logic:

**Implementation:**
```tsx
import { useEffect, useEffectEvent } from 'react'

export function ScrollTrigger() {
  const handleUpdate = useEffectEvent(() => {
    GSAPScrollTrigger.update()
  })
  
  const handleRefresh = useEffectEvent(() => {
    GSAPScrollTrigger.refresh()
  })
  
  const lenis = useLenis(handleUpdate)
  
  useEffect(() => {
    handleRefresh()
  }, [lenis])
  
  return null
}
```

**Benefits:**
- 🎯 More explicit about what lenis changes trigger
- 🧹 Cleaner separation of concerns

**Effort:** Low (5 minutes)  
**Impact:** Low

---

### 2.4 Flowmap Provider ⭐ LOW PRIORITY

**File:** `webgl/components/flowmap-provider/index.tsx`

**Current Implementation:**
- Simple context provider
- Uses custom hooks for fluid/flowmap simulation

**Opportunity:**
If the flowmap/fluid hooks have callbacks with complex dependencies, use `useEffectEvent` within those implementations.

**Note:** Need to inspect `webgl/utils/flowmaps/flowmap-sim` and `webgl/utils/fluid/fluid-sim` to see if they have callback patterns.

---

## 3. `cacheSignal` Opportunities

**⚠️ Server Components Only** - `cacheSignal` is only for use with React Server Components.

`cacheSignal` lets you know when the `cache()` lifetime is over. It returns an `AbortSignal` that automatically triggers when:
- React has successfully completed rendering
- The render was aborted
- The render has failed

This allows you to clean up or abort work when the result will no longer be used in the cache.

### 3.1 Sanity CMS Data Fetching ⭐⭐⭐ HIGH PRIORITY

**File:** `integrations/sanity/client.ts`

**Current Implementation:**
- Basic Sanity client with CDN and stega
- No timeout/abort logic
- Relies on Next.js caching

**Opportunity:**
Add `cacheSignal` to all Sanity fetch operations:

**Implementation:**
```tsx
// integrations/sanity/queries/index.ts
import { cacheSignal } from 'react'
import { client } from '../client'

// Helper function for fetches
async function fetchSanity<T>(
  query: string,
  params: Record<string, unknown> = {},
  options: {
    cache?: RequestCache
    revalidate?: number
    tags?: string[]
  } = {}
): Promise<T> {
  const signal = cacheSignal() // ✅ Auto-aborts on cache expiry
  
  return client.fetch<T>(
    query,
    params,
    {
      signal, // ✅ Pass signal to fetch
      ...options,
    }
  )
}

// Update all query functions
export async function getPage(slug: string) {
  return fetchSanity(
    pageQuery,
    { slug },
    { 
      revalidate: 3600,
      tags: ['page', `page:${slug}`]
    }
  )
}

export async function getArticle(slug: string) {
  return fetchSanity(
    articleQuery,
    { slug },
    {
      revalidate: 3600,
      tags: ['article', `article:${slug}`]
    }
  )
}

export async function getAllArticles() {
  return fetchSanity(
    allArticlesQuery,
    {},
    {
      revalidate: 3600,
      tags: ['articles']
    }
  )
}
```

**In Server Components:**
```tsx
// app/(pages)/sanity/page.tsx or similar
import { cacheSignal } from 'react'

export default async function SanityPage({ params }) {
  // If using client directly in component
  const signal = cacheSignal()
  
  const page = await client.fetch(
    pageQuery,
    { slug: params.slug },
    {
      signal, // ✅ Auto-cleanup
      next: { revalidate: 3600, tags: ['page'] }
    }
  )
  
  return <div>...</div>
}
```

**Benefits:**
- 🧹 Automatic request cleanup on cache expiry
- 🚫 Prevents zombie requests
- 🎯 Cleaner than manual AbortController
- 🔋 Better resource management

**Effort:** Low (15 minutes)  
**Impact:** High (all Sanity fetches benefit)

---

### 3.2 Shopify API Data Fetching ⭐⭐⭐ HIGH PRIORITY

**File:** `integrations/shopify/index.ts`

**Current Implementation:**
- Uses `fetchWithTimeout` with 10-second timeout
- Manual timeout logic
- No abort signal integration

**Opportunity:**
Combine `cacheSignal` with existing timeout for best of both:

**Implementation:**
```tsx
// integrations/shopify/index.ts
import { cacheSignal } from 'react'

export async function shopifyFetch<T = Record<string, unknown>>({
  cache = 'force-cache',
  headers: customHeaders,
  query,
  tags,
  variables,
}: ShopifyFetchOptions): Promise<ShopifyResponse<T>> {
  try {
    const signal = cacheSignal() // ✅ Auto-aborts on cache expiry
    
    const result = await fetchWithTimeout(
      endpoint,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': key,
          ...customHeaders,
        },
        body: JSON.stringify({
          ...(query && { query }),
          ...(variables && { variables }),
        }),
        cache,
        signal, // ✅ Combine with timeout
        ...(tags && { next: { tags } }),
      },
      10000 // Keep existing 10s timeout
    )

    const body = (await result.json()) as {
      data: T
      errors?: Array<{ message: string }>
    }

    if (body.errors) {
      throw body.errors[0]
    }

    return {
      status: result.status,
      body,
    }
  } catch (e) {
    // Handle abort from cacheSignal vs timeout
    if (e instanceof Error && e.name === 'AbortError') {
      console.log('Shopify request aborted (cache expired or timeout)')
    }
    throw {
      error: e,
      query,
    }
  }
}
```

**Benefits:**
- 🧹 Cleanup stale requests when cache invalidates
- ⏱️ Still have manual timeout as fallback
- 🎯 Better resource utilization
- 🔋 Reduced unnecessary API calls

**Effort:** Low (10 minutes)  
**Impact:** High (all Shopify fetches benefit)

---

### 3.3 HubSpot Form Submissions ⭐ LOW PRIORITY

**File:** `integrations/hubspot/action.ts`

**Current Implementation:**
- Server actions for form submissions
- Uses `fetchWithTimeout` with 8-second timeout

**Opportunity:**
Add `cacheSignal` for consistency, though less critical for POST requests:

**Implementation:**
```tsx
// integrations/hubspot/action.ts
import { cacheSignal } from 'react'

export async function submitHubspotForm(formData: FormData) {
  'use server'
  
  const signal = cacheSignal() // ✅ Even for actions
  
  try {
    const response = await fetchWithTimeout(
      hubspotEndpoint,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        signal, // ✅ Abort on cache expiry
      },
      8000
    )
    
    return await response.json()
  } catch (error) {
    // Handle abort
    return { error: 'Submission failed' }
  }
}
```

**Benefits:**
- 🧹 Consistency across all fetches
- 🚫 Prevents duplicate submissions
- 🎯 Better error handling

**Effort:** Low (5 minutes per integration)  
**Impact:** Low (nice-to-have)

---

## 4. Performance Tracks (Chrome DevTools) 🆕

React 19.2 adds custom tracks to Chrome DevTools performance profiles for better insight into React app performance.

### 4.1 Scheduler ⚛ Track

Shows what React is working on for different priorities:
- **"blocking"** - User interactions
- **"transition"** - Updates inside `startTransition`

Displays:
- Type of work being performed
- When updates are blocked waiting for different priority
- When React is waiting for paint before continuing
- The order React completed work

**Use Case:** Understand how React splits work into priorities and the execution order.

### 4.2 Components ⚛ Track

Shows the tree of components React is rendering or running effects on:
- **"Mount"** - When children mount or effects mount
- **"Blocked"** - When rendering blocks due to yielding

**Use Case:** Identify when components render/run effects and time taken to complete work.

### Implementation in Satus

**No code changes needed!** These tracks automatically appear in Chrome DevTools Performance profiles when using React 19.2.

**How to Use:**
1. Open Chrome DevTools → Performance tab
2. Record a profile of your React app
3. Look for **"Scheduler ⚛"** and **"Components ⚛"** tracks
4. Analyze component render timing and priority work

**Benefits:**
- 🔍 Better visibility into React's internal work
- ⚡ Identify performance bottlenecks more easily
- 🎯 See priority scheduling in action
- 📊 Understand component render timing

**Effort:** Zero (automatic)  
**Impact:** High (better debugging/profiling tools)

---

## 5. Other Notable React 19.2 Changes

### 5.1 Batching Suspense Boundaries for SSR

React 19.2 now batches reveals of server-rendered Suspense boundaries for a short time, allowing more content to be revealed together. This:
- Aligns SSR behavior with client-rendered behavior
- Prepares for `<ViewTransition>` support during SSR
- Uses heuristics to avoid impacting Core Web Vitals

**Impact on Satus:** If you're using Suspense boundaries, SSR will now reveal content in larger batches for smoother user experience.

### 5.2 eslint-plugin-react-hooks v6

The new version:
- Uses flat config by default in `recommended` preset
- Adds opt-in React Compiler powered rules
- Properly handles `useEffectEvent` (doesn't try to add it to deps)

**Action Required:** Update to `eslint-plugin-react-hooks@6.1.1` or later when implementing `useEffectEvent`.

### 5.3 useId Prefix Changed

Default prefix changed from `:r:` (19.0.0) or `«r»` (19.1.0) to `_r_` to:
- Support View Transitions
- Ensure IDs are valid for `view-transition-name`
- Valid for XML 1.0 names

**Impact on Satus:** Minimal - IDs will have different format but functionality unchanged.

### 5.4 Partial Pre-rendering 🆕

New capability to pre-render part of the app ahead of time and resume later:
- `prerender()` - Pre-render with AbortController
- `resume()` - Resume to SSR stream
- `resumeAndPrerender()` - Resume to static HTML for SSG

**Impact on Satus:** Advanced feature, evaluate for future static optimization opportunities.

---

## 6. Implementation Priority Matrix

### Phase 0: Zero-Effort Wins (Immediate)
0. ✅ **Performance Tracks in DevTools** (0 min) - Already working, just use it!

### Phase 1: High Impact, Low Effort (Week 1)
1. ✅ **Update eslint-plugin-react-hooks to v6.1.1** (5 min) - Required for useEffectEvent
2. ✅ **`cacheSignal` in Sanity fetches** (15 min) - Immediate benefit, simple change
3. ✅ **`cacheSignal` in Shopify fetches** (10 min) - Immediate benefit, simple change
4. ✅ **Accordion `<Activity />`** (15 min) - Common component, big wins

**Total Time:** ~45 minutes  
**Impact:** High across the entire application

### Phase 2: High Impact, Medium Effort (Week 2)
5. ✅ **`useEffectEvent` in scroll trigger** (30 min) - Used everywhere, cleaner code
6. ✅ **WebGL `<Activity />` for multiple scenes** (45 min) - Significant GPU/CPU savings

**Total Time:** ~1.25 hours  
**Impact:** High for animation-heavy pages

### Phase 3: Medium Impact, Low Effort (Week 3)
7. ✅ **Dropdown `<Activity />`** (10 min) - Nice polish
8. ✅ **`useEffectEvent` in transform hook** (20 min) - Cleaner architecture
9. ✅ **`useEffectEvent` in GSAP ScrollTrigger** (5 min) - Consistency

**Total Time:** ~35 minutes  
**Impact:** Medium - polish and consistency

### Phase 4: Optional Enhancements
10. ⚪ **`cacheSignal` in HubSpot** (5 min) - Nice-to-have
11. ⚪ **Scroll-based WebGL activation** (1 hour) - Advanced optimization
12. ⚪ **Explore Partial Pre-rendering** (Research) - Future optimization

**Total Time:** ~1+ hours  
**Impact:** Low - diminishing returns

---

## 7. Testing Checklist

After implementing each feature, verify:

### `<Activity />` Testing
- [ ] Accordion opens/closes smoothly
- [ ] Dropdown appears/disappears correctly
- [ ] WebGL scenes render correctly when activated
- [ ] No memory leaks (check DevTools Performance)
- [ ] Effects cleanup properly when content hidden

### `useEffectEvent` Testing
- [ ] Scroll triggers fire correctly
- [ ] No extra effect re-runs (check React DevTools)
- [ ] Callbacks receive correct values
- [ ] Transform updates work as before
- [ ] GSAP integration still smooth

### `cacheSignal` Testing
- [ ] Sanity queries return correct data
- [ ] Shopify queries return correct data
- [ ] Requests abort on cache expiry
- [ ] No console errors from aborted requests
- [ ] ISR revalidation works correctly

---

### Performance Tracks Testing
- [ ] Open Chrome DevTools Performance tab
- [ ] Record a profile during interaction
- [ ] Verify "Scheduler ⚛" track appears
- [ ] Verify "Components ⚛" track appears
- [ ] Check blocking vs transition priorities
- [ ] Identify any performance bottlenecks

---

## 8. Code Migration Patterns

### Pattern 1: Manual Ref → `useEffectEvent`

**Before:**
```tsx
const callbackRef = useRef(callback)
callbackRef.current = callback

const handler = useCallback(() => {
  callbackRef.current?.()
}, [/* deps */])
```

**After:**
```tsx
const handler = useEffectEvent(() => {
  callback?.()
})
```

### Pattern 2: Conditional Render → `<Activity />`

**Before:**
```tsx
{isOpen && <ExpensiveComponent />}
```

**After:**
```tsx
<Activity mode={isOpen ? 'visible' : 'hidden'}>
  <ExpensiveComponent />
</Activity>
```

### Pattern 3: Manual AbortController → `cacheSignal`

**Before:**
```tsx
const controller = new AbortController()
setTimeout(() => controller.abort(), 10000)
fetch(url, { signal: controller.signal })
```

**After:**
```tsx
const signal = cacheSignal()
fetch(url, { signal }) // Auto-aborts on cache expiry
```

---

## 9. Potential Gotchas & Edge Cases

### `<Activity mode="hidden">` Considerations
- ❗ Content is still in DOM, just deferred
- ❗ CSS transitions may not work as expected on first show
- ❗ Refs to hidden content are still valid
- ✅ Use for expensive components, not for simple visibility toggles

### `useEffectEvent` Limitations
- ❗ Cannot be called during render
- ❗ Cannot be called conditionally
- ❗ Must be at component top level
- ❗ Must be declared in same component/Hook as their Effect
- ❗ **Must NOT** be in dependency arrays
- ❗ Requires `eslint-plugin-react-hooks@6.1.1` or later
- ✅ Perfect for "event" callbacks fired from Effects

### `cacheSignal` Server-Only
- ❗ Only works in Server Components and Server Actions
- ❗ Cannot be used in Client Components
- ❗ Will error if called in browser
- ✅ Combine with manual timeouts for safety

---

## 10. Performance Metrics to Track

### Before/After Comparisons

**Accordion Performance:**
- Time to first paint (closed accordions)
- Memory usage with 10+ accordions
- Effect cleanup count

**Scroll Trigger Performance:**
- Effect re-run count per scroll event
- Memory allocations per scroll
- Frame time during scroll

**Data Fetching:**
- Pending request count on route change
- Memory usage from zombie requests
- Cache hit rate

### Monitoring Tools
1. **Chrome DevTools → Performance tab** (Now with React 19.2 tracks! ⚛)
   - Scheduler ⚛ track for priority analysis
   - Components ⚛ track for render timing
2. React DevTools → Profiler
3. React DevTools → Components (check re-renders)
4. Network tab (aborted requests)

---

## 11. Documentation Updates Needed

After implementation, update:

1. **`components/README.md`** - Document `<Activity />` usage patterns
2. **`hooks/README.md`** - Document `useEffectEvent` in custom hooks
3. **`integrations/README.md`** - Document `cacheSignal` in fetch functions
4. **Workspace rules** - Update with new patterns (already done)

---

## 12. Rollout Strategy

### Week 0: Preparation
- Update to `eslint-plugin-react-hooks@6.1.1`
- Familiarize team with Performance Tracks in DevTools
- Baseline performance metrics

### Week 1: Foundation
- Implement `cacheSignal` in all data fetching
- Test thoroughly with cache revalidation
- Monitor for aborted requests

### Week 2: UI Components
- Add `<Activity />` to Accordion
- Add `<Activity />` to Dropdown
- Add `<Activity />` to WebGL scenes
- Test animation performance

### Week 3: Hooks Refinement
- Refactor `useScrollTrigger` with `useEffectEvent`
- Refactor `useTransform` with `useEffectEvent`
- Update other hooks as needed
- Performance testing

### Week 4: Polish & Monitoring
- Add performance monitoring
- Document patterns
- Team training
- Production monitoring

---

## 13. Success Criteria

### Quantitative
- ✅ 20% reduction in effect re-runs (scroll trigger)
- ✅ 30% reduction in memory usage (10+ accordions)
- ✅ Zero zombie requests after cache expiry
- ✅ No increase in bundle size

### Qualitative
- ✅ Code is more readable and maintainable
- ✅ Fewer bugs related to stale closures
- ✅ Better developer experience
- ✅ Smoother user experience

---

## Conclusion

React 19.2's new features offer significant opportunities for the Satus codebase:

1. **`<Activity />`** - Perfect for accordion, dropdown, and off-screen WebGL content
2. **`useEffectEvent`** - Simplifies complex hooks like scroll triggers and transforms  
3. **`cacheSignal`** - Cleaner server-side data fetching with automatic cleanup
4. **Performance Tracks** - Better debugging and profiling (zero effort!)

The recommended implementation follows a phased approach, starting with zero-effort wins (Performance Tracks), then high-impact low-effort changes (data fetching, eslint update), and progressing to more complex optimizations (hooks refactoring).

**Estimated Total Implementation Time:** 3-4 hours (excluding zero-effort features)  
**Expected Performance Improvement:** 15-30% depending on page complexity  
**Risk Level:** Low (all changes maintain current functionality)

**Key Requirements:**
- ⚠️ Must update to `eslint-plugin-react-hooks@6.1.1` before using `useEffectEvent`
- ⚠️ `cacheSignal` only works in Server Components
- ✅ Performance Tracks work automatically with React 19.2

---

## Additional Resources

### Official React Documentation
- **[React 19.2 Release Blog Post](https://react.dev/blog/2025/10/01/react-19-2)** - Official announcement with examples
- [React 19.2 Changelog](https://github.com/facebook/react/blob/main/CHANGELOG.md#1920-october-1st-2025)
- [Activity Component Docs](https://react.dev/reference/react/Activity)
- [useEffectEvent Documentation](https://react.dev/reference/react/useEffectEvent)
- [cacheSignal Documentation](https://react.dev/reference/react/cacheSignal)
- [Performance Tracks Docs](https://react.dev/learn/react-developer-tools#performance-tracks)
- [Separating Events from Effects](https://react.dev/learn/separating-events-from-effects)

### Tooling & Ecosystem
- [eslint-plugin-react-hooks v6 Changelog](https://github.com/facebook/react/blob/main/packages/eslint-plugin-react-hooks/CHANGELOG.md)
- [Next.js 15 + React 19 Guide](https://nextjs.org/docs/app/building-your-application/upgrading/version-15)

---

**Document Version:** 1.0  
**Last Updated:** October 7, 2025  
**Next Review:** After Phase 1 implementation

