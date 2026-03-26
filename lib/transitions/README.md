# Transitions

Framework-agnostic page transition system for React Router. Inspired by Framer Motion's AnimatePresence but decoupled from any animation library — works with anime.js, CSS, WebGL, or anything that can call a callback.

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
import { animate, createTimeline } from "animejs";
import { useRouteTransition } from "~/lib/transitions";

function Hero() {
  const ref = useRef<HTMLDivElement>(null);

  useRouteTransition({
    initial: () => animate(ref.current, { opacity: 0, y: 50, duration: 0 }),
    exit: ({ done }) => {
      const tl = createTimeline({ onComplete: done });
      tl.add(ref.current, { opacity: 0, y: -40, duration: 500 });
      return () => tl.revert();
    },
    enter: ({ done }) => {
      const tl = createTimeline({ onComplete: done });
      tl.add(ref.current, { opacity: 1, y: 0, duration: 600 });
      return () => tl.revert();
    },
  });

  return <div ref={ref}>...</div>;
}
```

---

## Architecture

Both modes use the same underlying page-stack mechanism:

1. Navigation happens → new page mounts alongside old page (max 2 in stack)
2. Exit animations run on the old page
3. Enter animations run on the new page
4. Old page is removed from the stack

The `mode` prop controls **when** things are visible and **when** enters can start.

---

## Modes

### Wait Mode (default)

```tsx
<TransitionRouter mode="wait">
```

Sequential: exit → enter. The entering page is in the DOM during exits (for hook registration and `initial()`) but hidden. Only becomes visible after all exits complete. The `enter()` callback from exit functions is a no-op.

### Overlap Mode

```tsx
<TransitionRouter mode="overlap">
```

Both old and new pages visible simultaneously. Old outlet is frozen via `useOutlet()` and positioned behind the entering page.

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

Sets element state **before first paint** when mounting as the entering page. Only fires during transitions, never on cold page load. SSR-safe. Receives the correct `direction` (`"push"`, `"pop"`, or `"replace"`) for directional animations.

```tsx
initial: (info) => {
  const dir = info.direction === "pop" ? 1 : -1;
  animate(ref.current, { opacity: 0, x: dir * 100, duration: 0 });
};
```

#### `exit({ done, enter, info })`

Animate out. **Call `done()` when finished.** The system waits for all registered exits to call `done()` before proceeding.

```tsx
// Simple
exit: ({ done }) => {
  animate(ref.current, { opacity: 0, duration: 500, onComplete: done });
};

// Timeline
exit: ({ done }) => {
  const tl = createTimeline({ onComplete: done });
  tl.add(title, { opacity: 0, y: -40, duration: 500 });
  tl.add(content, { opacity: 0, duration: 400 }, 100);
  return () => tl.revert(); // cleanup on interruption
};

// Trigger entering page mid-exit (overlap mode only)
exit: ({ done, enter }) => {
  const tl = createTimeline({ onComplete: done });
  tl.add(hero, { opacity: 0, duration: 500 });
  tl.call(() => enter()); // new page starts entering here
  tl.add(bg, { opacity: 0, duration: 1000 }); // still animating
};

// Route-aware
exit: ({ done, info }) => {
  if (info.to === "/gallery") {
    /* special animation */
  }
  animate(ref.current, { opacity: 0, duration: 500, onComplete: done });
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
  animate(ref.current, { opacity: 1, y: 0, duration: 600, onComplete: done });
};

// Timeline with cleanup
enter: ({ done }) => {
  const tl = createTimeline({ onComplete: done });
  tl.add(circle, { opacity: 1, scale: 1, duration: 1500 });
  tl.add(title, { opacity: 1, y: 0, duration: 800 }, 200);
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
    const tl = createTimeline({ onComplete: done });
    tl.add(menuRef.current, { y: "-100%", duration: 400 });
    return () => tl.revert();
  },
  onEnter: ({ done }) => {
    const tl = createTimeline({ onComplete: done });
    tl.add(menuRef.current, { y: "0%", duration: 400 });
    return () => tl.revert();
  },
});
```

---

### `useTransitionState()`

Read-only observer. Returns the full picture:

```tsx
const { phase, from, to, direction, mode, pages, isTransitioning } = useTransitionState();
```

Each page in `pages` has `{ key, pathname, phase }`. Useful for debug panels or any UI that needs to react to transitions.

---

### `usePreservedLoaderData<T>()`

Returns loader data frozen at mount time. Use instead of `useLoaderData()` in components participating in transitions — prevents data from going stale during exit animations.

---

## Sequencing

**Default (both modes):** enter waits for exit.

```
exit starts → exit calls done() → [1 frame] → enter starts → enter calls done() → cleanup
```

**Early enter (overlap mode only):** call `enter()` from within exit to overlap.

```
exit starts → enter() called mid-exit → [1 frame] → enter starts → exit calls done() → enter calls done() → cleanup
```

**No transitions registered:** page appears after 1 frame. No waiting.

### 1-frame enter deferral

Enter animations are always deferred by one `requestAnimationFrame` after exits complete (or immediately if there are no exits). This ensures `initial()`'s animation-library calls (e.g., `animate(el, { opacity: 0, duration: 0 })`) have time to apply before enter callbacks fire. Without this, enter animations can start before the initial state is set, producing invisible animations. This matches Vue/Nuxt's internal approach of inserting a frame between initial state and animation start.

---

## Interruption

When a user navigates during an active transition:

1. Max 2 pages — oldest exiting page is evicted
2. Cleanup functions from exit/enter are called synchronously
3. Pending RAF for deferred enters is cancelled
4. New transition starts from scratch

Return cleanup functions from `exit`/`enter`:

```tsx
exit: ({ done }) => {
  const tl = createTimeline({ onComplete: done });
  tl.add(ref.current, { opacity: 0, duration: 1500 });
  return () => tl.revert(); // called on interruption
};
```

**Tip:** For smoother interruption during enters, consider returning `() => tl.pause()` instead of `() => tl.revert()`. Pausing freezes the element at its current state (e.g., opacity 0.5) while the new page enters on top, rather than snapping back to the initial state.

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
- Error boundary wraps exiting pages
- Rapid navigation properly cleans up in-progress transitions via generation counter
