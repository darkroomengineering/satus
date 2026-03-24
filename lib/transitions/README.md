# Transitions

Framework-agnostic page transition system for React Router. Inspired by Framer Motion's AnimatePresence but decoupled from any animation library — works with GSAP, CSS, WebGL, or anything that can call a callback.

## Quick Start

Wrap `<Outlet />` in your root layout:

```tsx
import { TransitionRouter } from "~/lib/transitions";

export default function App() {
  return (
    <TransitionRouter>
      <Outlet />
    </TransitionRouter>
  );
}
```

Add transitions to any page component:

```tsx
import { useRouteTransition } from "~/lib/transitions";

function Hero() {
  const ref = useRef<HTMLDivElement>(null);

  useRouteTransition({
    initial: () => gsap.set(ref.current, { opacity: 0, y: 50 }),
    exit: ({ done }) => {
      const tl = gsap.timeline({ onComplete: done });
      tl.to(ref.current, { opacity: 0, y: -40 });
      return () => {
        tl.reverse();
        return tl;
      };
    },
    enter: () => {
      const tl = gsap.timeline();
      tl.to(ref.current, { opacity: 1, y: 0 });
      return () => tl.revert();
    },
  });

  return <div ref={ref}>...</div>;
}
```

---

## Modes

### Wait Mode (default)

```tsx
<TransitionRouter mode="wait">
```

Uses `useBlocker` to hold navigation. Old page stays mounted as the **real, live React tree** while exit animations play. After all exits complete, navigation proceeds and enter animations run on the new page.

- Old page has correct data, working hooks, real DOM
- Sequential: exit finishes, then navigation, then enter
- Persistent components participate via `useTransitionEvent`

### Overlap Mode

```tsx
<TransitionRouter mode="overlap">
```

AnimatePresence-inspired page stack. Both old and new pages are **live React trees** in the DOM simultaneously. Old outlet is frozen via `useOutlet()` and positioned absolutely behind the entering page.

- Max 2 pages in the stack at once
- Exit and enter animations run in parallel
- Rapid navigation interrupts the oldest page (calls cleanup functions)
- Each page gets its own `TransitionContext` — no cross-contamination

**Known limitation:** The exiting page's outlet is a cached React element. Hooks that read from React Router's global context (`useLocation`, `useSearchParams`) will return the **new** route's values, not the old ones. Use `usePreservedLoaderData` for stable data. This does not affect GSAP animations since they target DOM refs directly.

---

## `<TransitionRouter>` Props

| Prop                | Type                       | Default  | Description                                               |
| ------------------- | -------------------------- | -------- | --------------------------------------------------------- |
| `mode`              | `"wait" \| "overlap"`      | `"wait"` | Sequential or parallel transitions                        |
| `timeout`           | `number`                   | `5000`   | Safety timeout (ms) — force-proceeds if animations hang   |
| `onTransition`      | `(ctx) => void \| Promise` | —        | Centralized orchestration (see below)                     |
| `preventTransition` | `(from, to) => boolean`    | —        | Return `true` to skip transition for specific navigations |
| `onExitStart`       | `(info) => void`           | —        | Fires when exit phase begins                              |
| `onExitComplete`    | `(info) => void`           | —        | Fires when all exits finish                               |
| `onEnterStart`      | `(info) => void`           | —        | Fires when enter phase begins                             |
| `onEnterComplete`   | `(info) => void`           | —        | Fires when all enters finish                              |

### `TransitionInfo`

All callbacks receive:

```tsx
interface TransitionInfo {
  from: string; // leaving pathname
  to: string; // arriving pathname
  direction: "push" | "pop" | "replace";
}
```

### `onTransition` — Centralized Orchestration

When provided, you control the full transition. Without it, exits and enters run automatically.

```tsx
<TransitionRouter
  onTransition={async (ctx) => {
    await ctx.runExits();     // run all registered exit animations
    await webglDissolve();    // custom work between phases
    ctx.next();               // proceed with navigation
  }}
>
```

Context:

```tsx
interface TransitionOrchestratorContext {
  from: string;
  to: string;
  direction: "push" | "pop" | "replace";
  fromElement?: HTMLElement; // exiting page container (overlap only)
  toElement?: HTMLElement; // entering page container (overlap only)
  runExits(): Promise<void>;
  runEnters(): Promise<void>;
  next(): void; // proceed (wait mode) / finalize (overlap mode)
}
```

---

## `useRouteTransition(config)`

For components that mount/unmount with the page.

```tsx
interface RouteTransitionConfig {
  initial?: (info: TransitionInfo) => void;
  exit?: (ctx: ExitContext) => void | Thenable | CleanupFunction;
  enter?: (ctx: EnterContext) => void | Thenable | CleanupFunction;
}
```

### `initial`

Sets the element's state **before first paint** when mounting as the entering page. Runs in `useLayoutEffect` — never on cold page load, only during transitions. Safe for SSR (never fires without JS).

```tsx
initial: (info) => {
  gsap.set(ref.current, { opacity: 0, y: 50 });
};
```

Use this in overlap mode to hide the entering page while it renders under the exiting one.

### `exit`

Receives an object with `{ done, enter, info }`. Destructure what you need:

```tsx
// Simple — just done()
exit: ({ done }) => {
  gsap.to(ref.current, { opacity: 0, onComplete: done });
};

// Auto-done — return thenable, ignore the arg entirely
exit: () => gsap.to(ref.current, { opacity: 0 });

// With cleanup (for interruption on rapid navigation)
exit: ({ done }) => {
  const tl = gsap.timeline({ onComplete: done });
  tl.to(ref.current, { opacity: 0 });
  return () => {
    tl.reverse();
    return tl; // wait for reversal
  };
};

// Trigger the next page's enter mid-exit
exit: ({ done, enter }) => {
  const tl = gsap.timeline({ onComplete: done });
  tl.to(hero, { opacity: 0, duration: 0.5 });
  tl.call(() => enter()); // new page starts entering here
  tl.to(bg, { opacity: 0, duration: 1.0 }); // still animating
};

// Route-aware exit
exit: ({ done, info }) => {
  if (info.to === "/gallery") {
    /* special animation */
  }
  gsap.to(ref.current, { opacity: 0, onComplete: done });
};
```

**`ExitContext`:**

| Field   | Type             | Description                                                                 |
| ------- | ---------------- | --------------------------------------------------------------------------- |
| `done`  | `() => void`     | Signal exit completion                                                      |
| `enter` | `() => void`     | Start the entering page's animations early (idempotent, no-op in wait mode) |
| `info`  | `TransitionInfo` | Navigation info: `from`, `to`, `direction`                                  |

**Return value** is discriminated by type:

- **`void`** — manual `done()`, no cleanup
- **`Thenable`** (object with `.then()`) — auto-done when resolved
- **`function`** — cleanup handler, called on interruption

**Sequencing:** In overlap mode, enters wait for exits to call `done()` by default. Call `enter()` from within exit to start enters early (while exit is still running).

### `enter`

Receives `{ info }`. Only runs after a transition — not on initial page load. In overlap mode, runs after the exiting page calls `done()` (or `enter()`).

```tsx
// Simple
enter: () => {
  gsap.to(ref.current, { opacity: 1, y: 0, duration: 0.6 });
};

// With info
enter: ({ info }) => {
  if (info.from === "/splash") {
    /* special entrance */
  }
  gsap.to(ref.current, { opacity: 1, y: 0, duration: 0.6 });
};

// With cleanup (interrupted if user navigates away mid-enter)
enter: () => {
  const tl = gsap.timeline();
  tl.to(ref.current, { opacity: 1, y: 0, duration: 0.6 });
  return () => tl.revert();
};
```

### Return value

```tsx
const { phase, isExiting, isEntering } = useRouteTransition({ ... });
```

- `phase`: `"idle"` | `"exiting"` | `"entering"`
- `isExiting` / `isEntering`: convenience booleans

---

## `useTransitionEvent(config)`

For **persistent components** (header, footer, WebGL canvas) that stay mounted across navigations.

```tsx
useTransitionEvent({
  onExit: ({ done, info }) => {
    gsap.to(menuRef.current, { y: "-100%", onComplete: done });
    return () => {
      /* cleanup */
    };
  },
  onEnter: ({ info }) => {
    gsap.from(menuRef.current, { y: "-100%" });
  },
});
```

Same completion patterns as `useRouteTransition` — `done()` callback, thenable return, or cleanup function return.

**Note:** In overlap mode, persistent components are outside the per-page contexts. They register on whichever `TransitionContext` wraps them in the tree. Place them inside the `TransitionRouter` to participate.

---

## `useTransitionState()`

Read-only observer for the current transition state.

```tsx
const { phase, from, to, isTransitioning } = useTransitionState();
```

Useful for:

- Disabling UI during transitions
- Conditional rendering based on transition state
- Debug panels

---

## `usePreservedLoaderData<T>()`

Returns loader data frozen at mount time. Prevents data from going stale during exit animations.

```tsx
// In a route component
const data = usePreservedLoaderData<typeof loader>();
```

Use this instead of `useLoaderData()` in components that participate in overlap transitions. The preserved version captures data on first render and never updates — even if React Router's context changes underneath.

Also available: `usePreservedRouteLoaderData<T>(routeId)` for specific route data.

---

## `useTransitionDebug()`

Subscribe to internal transition state from anywhere. Uses `useSyncExternalStore` — no context dependency.

```tsx
const { mode, pages, info, isTransitioning } = useTransitionDebug();
```

Each page in the `pages` array has `{ key, pathname, phase }`. Useful for building debug panels.

---

## CSS Hooks

`TransitionRouter` sets `data-transition-phase` on `<html>`:

```css
/* Disable links during transitions */
[data-transition-phase="exiting"] a {
  pointer-events: none;
}
```

In overlap mode, each page wrapper has `data-transition-page="present"` or `data-transition-page="exiting"`.

---

## Interruption & Rapid Navigation

When a user navigates during an active transition:

**Wait mode:** Navigation is ignored while blocked (useBlocker holds it).

**Overlap mode:**

1. Max 2 pages in the stack — oldest exiting page is evicted
2. All cleanup functions from the evicted page's exit/enter are called
3. If cleanup returns a thenable (e.g., `tl.reverse()`), the system waits for it
4. Then the new transition starts

Return cleanup functions from `exit`/`enter` to handle interruption gracefully:

```tsx
exit: ({ done }) => {
  const tl = gsap.timeline({ onComplete: done });
  tl.to(ref.current, { opacity: 0, duration: 1.5 });

  // Called if user navigates before exit completes
  return () => {
    tl.reverse();
    return tl; // wait for reversal to finish
  };
};
```

If no cleanup is provided, the page is removed immediately on eviction.

---

## Safety

- `done()` is idempotent — calling twice is safe
- Thenable returns auto-call `done()` — GSAP tweens just work
- Errors in exit/enter/cleanup are caught — transitions never get stuck
- Configurable timeout force-proceeds if animations hang (default 5s)
- Component unmount auto-unregisters pending exits
- Zero registered animations = instant transition
- Error boundary wraps exiting pages in overlap mode — stale context errors are caught gracefully

---

## Architecture

```
TransitionRouter
├── Wait Mode
│   ├── useBlocker intercepts navigation
│   ├── Phase: idle → exiting → [navigation] → entering → idle
│   ├── Single TransitionContext for the whole tree
│   └── Old page is the real current route (fully live)
│
└── Overlap Mode
    ├── Detects location change during render
    ├── Freezes old outlet via useOutlet() ref
    ├── Renders page stack: [exiting, entering]
    ├── Each page wrapped in PresencePage with own context
    ├── Max 2 pages, evicts oldest on rapid navigation
    └── PresencePage exposes interrupt() for cleanup
```

Each `PresencePage` (overlap mode) manages its own:

- Registration maps (exit/enter/event callbacks)
- Exit lifecycle (timeout, completion tracking)
- Enter lifecycle (deferred to allow effect registration)
- Cleanup function storage (for interruption)
- Error boundary (catches stale context in exiting pages)
