# Transitions

Framework-agnostic page transition system for React Router. Inspired by Framer Motion's AnimatePresence but decoupled from any animation library — works with GSAP, CSS, WebGL, or anything that can call a callback.

## Quick Start

Wrap your root layout — no `<Outlet />` needed, the router handles it internally:

```tsx
import { TransitionRouter } from "~/lib/transitions";

export default function App() {
  return (
    <TransitionRouter>
      <MyDebugPanel /> {/* optional extras */}
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
      gsap.to(ref.current, { opacity: 0, y: -40, onComplete: done });
    },
    enter: ({ done }) => {
      gsap.to(ref.current, { opacity: 1, y: 0, onComplete: done });
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

Uses `useBlocker` to hold navigation. Old page stays mounted as the **real, live React tree** while exit animations play. Sequential: exit → navigation → enter.

### Overlap Mode

```tsx
<TransitionRouter mode="overlap">
```

AnimatePresence-inspired page stack. Both old and new pages are in the DOM simultaneously. Old outlet is frozen via `useOutlet()` and positioned behind the entering page.

- Max 2 pages in the stack
- Exit and enter sequenced by default (enter waits for exit `done()`)
- Call `enter()` from within exit to overlap them manually
- Rapid navigation calls cleanup functions and evicts oldest page
- Pages with no registered transitions are removed instantly

---

## API

### `<TransitionRouter>` Props

| Prop                | Type                       | Default  | Description                                                      |
| ------------------- | -------------------------- | -------- | ---------------------------------------------------------------- |
| `mode`              | `"wait" \| "overlap"`      | `"wait"` | Sequential or parallel transitions                               |
| `timeout`           | `number`                   | `5000`   | Safety timeout (ms) — force-proceeds if `done()` is never called |
| `onTransition`      | `(ctx) => void \| Promise` | —        | Centralized orchestration                                        |
| `preventTransition` | `(from, to) => boolean`    | —        | Skip transition for specific navigations                         |
| `onExitStart`       | `(info) => void`           | —        | Fires when exit phase begins                                     |
| `onExitComplete`    | `(info) => void`           | —        | Fires when all exits finish                                      |
| `onEnterStart`      | `(info) => void`           | —        | Fires when enter phase begins                                    |
| `onEnterComplete`   | `(info) => void`           | —        | Fires when all enters finish                                     |

The router renders the outlet internally via `useOutlet()`. Children are rendered alongside for extras (debug panels, persistent UI).

---

### `useRouteTransition(config)`

For components that mount/unmount with the page.

```tsx
interface RouteTransitionConfig {
  initial?: (info: TransitionInfo) => void;
  exit?: (ctx: ExitContext) => void | CleanupFunction;
  enter?: (ctx: EnterContext) => void | CleanupFunction;
}
```

#### `initial(info)`

Sets element state **before first paint** when mounting as the entering page. Only fires during transitions, never on cold page load. SSR-safe.

```tsx
initial: (info) => {
  gsap.set(ref.current, { opacity: 0, y: 50 });
};
```

#### `exit({ done, enter, info })`

Animate out. **Call `done()` when finished.** The system waits for all registered exits to call `done()` before proceeding.

```tsx
// Simple
exit: ({ done }) => {
  gsap.to(ref.current, { opacity: 0, onComplete: done });
};

// Timeline
exit: ({ done }) => {
  const tl = gsap.timeline({ onComplete: done });
  tl.to(title, { opacity: 0, y: -40 });
  tl.to(content, { opacity: 0 }, 0.1);
  return () => tl.revert(); // cleanup on interruption
};

// Trigger entering page mid-exit
exit: ({ done, enter }) => {
  const tl = gsap.timeline({ onComplete: done });
  tl.to(hero, { opacity: 0, duration: 0.5 });
  tl.call(() => enter()); // new page starts entering here
  tl.to(bg, { opacity: 0, duration: 1.0 }); // still animating
};

// Route-aware
exit: ({ done, info }) => {
  if (info.to === "/gallery") {
    /* special animation */
  }
  gsap.to(ref.current, { opacity: 0, onComplete: done });
};
```

**`ExitContext`:**

| Field   | Type             | Description                                                |
| ------- | ---------------- | ---------------------------------------------------------- |
| `done`  | `() => void`     | Signal exit completion. Must be called.                    |
| `enter` | `() => void`     | Start entering page early (idempotent, no-op in wait mode) |
| `info`  | `TransitionInfo` | `{ from, to, direction }`                                  |

**Return value:** optionally return a cleanup function, called on interruption (rapid navigation). Same pattern as `useEffect`.

#### `enter({ done, info })`

Animate in. **Call `done()` when finished.** Only runs after the exiting page calls `done()` (or `enter()` for early start). Not called on initial page load.

```tsx
// Simple
enter: ({ done }) => {
  gsap.to(ref.current, { opacity: 1, y: 0, onComplete: done });
};

// Timeline with cleanup
enter: ({ done }) => {
  const tl = gsap.timeline({ onComplete: done });
  tl.to(circle, { opacity: 1, scale: 1, duration: 1.5 });
  tl.to(title, { opacity: 1, y: 0 }, 0.2);
  return () => tl.revert();
};
```

**`EnterContext`:**

| Field  | Type             | Description                              |
| ------ | ---------------- | ---------------------------------------- |
| `done` | `() => void`     | Signal enter completion. Must be called. |
| `info` | `TransitionInfo` | `{ from, to, direction }`                |

#### Return value

```tsx
const { phase, isExiting, isEntering } = useRouteTransition({ ... });
```

---

### `useTransitionEvent(config)`

For **persistent components** (header, footer, WebGL canvas) that stay mounted across navigations. Same `{ done }` API:

```tsx
useTransitionEvent({
  onExit: ({ done }) => {
    gsap.to(menuRef.current, { y: "-100%", onComplete: done });
  },
  onEnter: ({ done }) => {
    gsap.from(menuRef.current, { y: "-100%", onComplete: done });
  },
});
```

---

### `useTransitionState()`

Read-only observer. Returns the full picture:

```tsx
const { phase, from, to, mode, pages, isTransitioning } = useTransitionState();
```

Each page in `pages` has `{ key, pathname, phase }`. Useful for debug panels or any UI that needs to react to transitions.

---

### `usePreservedLoaderData<T>()`

Returns loader data frozen at mount time. Use instead of `useLoaderData()` in components participating in overlap transitions.

---

## Sequencing

**Default (overlap mode):** enter waits for exit.

```
exit starts → exit calls done() → enter starts → enter calls done() → cleanup
```

**Early enter:** call `enter()` from within exit to overlap.

```
exit starts → enter() called mid-exit → enter starts → exit calls done() → enter calls done() → cleanup
```

**No transitions registered:** page is removed instantly. No waiting.

---

## Interruption

When a user navigates during an active transition (overlap mode):

1. Max 2 pages — oldest exiting page is evicted
2. Cleanup functions from exit/enter are called synchronously
3. New transition starts

Return cleanup functions from `exit`/`enter`:

```tsx
exit: ({ done }) => {
  const tl = gsap.timeline({ onComplete: done });
  tl.to(ref.current, { opacity: 0, duration: 1.5 });
  return () => tl.revert(); // called on interruption
};
```

---

## CSS Hooks

`data-transition-phase` on `<html>`: `"idle"` | `"exiting"` | `"entering"`

```css
[data-transition-phase="exiting"] a {
  pointer-events: none;
}
```

Per-page: `data-transition-page="present"` or `data-transition-page="exiting"`

---

## Safety

- `done()` is idempotent — calling twice is safe
- Timeout force-proceeds if `done()` is never called (default 5s)
- Errors in exit/enter are caught — transitions never get stuck
- Component unmount auto-resolves pending `done()` calls
- Zero registered animations = instant transition (no waiting)
- Error boundary wraps exiting pages in overlap mode
