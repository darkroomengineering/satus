# Transitions

Framework-agnostic page transition system for React Router. Inspired by Framer Motion's AnimatePresence, but decoupled from any animation library — works with GSAP, CSS, WebGL, or anything that can call a callback.

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
    exit: (done) => gsap.to(ref.current, { opacity: 0, onComplete: done }),
    enter: () => gsap.from(ref.current, { opacity: 0 }),
  });

  return <div ref={ref}>...</div>;
}
```

## API

### `<TransitionRouter>`

Wraps `<Outlet />` and orchestrates page transitions.

| Prop                | Type                             | Default  | Description                                              |
| ------------------- | -------------------------------- | -------- | -------------------------------------------------------- |
| `mode`              | `"wait" \| "overlap"`            | `"wait"` | Sequential or parallel page transitions                  |
| `timeout`           | `number`                         | `5000`   | Safety timeout in ms — force-proceeds if animations hang |
| `onTransition`      | `(ctx) => void \| Promise<void>` | —        | Centralized orchestration handler                        |
| `preventTransition` | `(from, to) => boolean`          | —        | Skip transitions for specific navigations                |
| `onExitStart`       | `(info) => void`                 | —        | Fires when exit phase begins                             |
| `onExitComplete`    | `(info) => void`                 | —        | Fires when all exits finish                              |
| `onEnterStart`      | `(info) => void`                 | —        | Fires when enter phase begins                            |
| `onEnterComplete`   | `(info) => void`                 | —        | Fires when all enters finish                             |

#### Modes

**`wait`** (default) — Uses `useBlocker` to hold navigation. Old page stays mounted (real DOM, real data) while exit animations play. After all exits complete, navigation proceeds and enter animations run.

**`overlap`** — Clones the old page's DOM before navigation. Both old (clone) and new (real) pages are in the DOM simultaneously. Use `onTransition` to choreograph the crossfade.

#### Orchestration Context (`onTransition`)

```tsx
interface TransitionOrchestratorContext {
  from: string; // leaving pathname
  to: string; // arriving pathname
  direction: "push" | "pop" | "replace";
  fromElement?: HTMLElement; // cloned DOM (overlap mode only)
  toElement?: HTMLElement; // new page container (overlap mode only)
  runExits(): Promise<void>; // run all registered exits
  runEnters(): Promise<void>; // run all registered enters
  next(): void; // proceed with navigation
}
```

### `useRouteTransition(config)`

Register exit/enter animations for components that unmount with the page.

```tsx
useRouteTransition({
  exit: (done) => {
    /* animate out, call done() */
  },
  enter: () => {
    /* animate in */
  },
});
```

**Exit completion** — three patterns:

```tsx
// 1. Manual callback
exit: (done) => gsap.to(el, { opacity: 0, onComplete: done });

// 2. Return thenable (auto-done)
exit: () => gsap.to(el, { opacity: 0 });

// 3. Return Promise
exit: () => new Promise((resolve) => setTimeout(resolve, 500));
```

**Enter** only runs after a transition, not on initial page load.

**Returns** `{ phase, isExiting, isEntering }` for conditional rendering.

### `useTransitionEvent(config)`

Participate in transitions from persistent components (header, footer, WebGL canvas).

```tsx
useTransitionEvent({
  onExit: (done) => {
    /* close menu, call done() */
  },
  onEnter: () => {
    /* reopen menu */
  },
});
```

### `useTransitionState()`

Read-only observer for the current transition state.

```tsx
const { phase, from, to, isTransitioning } = useTransitionState();
```

### `usePreservedLoaderData<T>()`

Returns loader data frozen at mount time. Prevents stale data during exit animations.

```tsx
const data = usePreservedLoaderData<typeof loader>();
```

## CSS Hooks

`TransitionRouter` sets `data-transition-phase` on `<html>`:

```css
/* Disable links during transitions */
[data-transition-phase="exiting"] a {
  pointer-events: none;
}

/* Hide new page until enter animation starts */
[data-transition-phase="entering"] [data-transition-content] {
  opacity: 0;
}
```

## Safety

- `done()` is idempotent — calling twice is safe
- Thenable returns auto-call `done()` — GSAP tweens just work
- Errors in animations are caught — transitions never get stuck
- Timeout force-proceeds if something hangs (default 5s)
- Component unmount auto-unregisters pending exits
- Zero registered animations = instant navigation

## Architecture

```
TransitionRouter (root.tsx, wraps Outlet)
  ├── Uses useBlocker to intercept navigation (wait mode)
  ├── Or clones DOM before navigation (overlap mode)
  ├── Provides TransitionContext to the tree
  │
  ├── Page Components → useRouteTransition()
  │     Each registers exit/enter, calls done() independently
  │     Router waits for ALL registered exits before proceeding
  │
  └── Persistent Components → useTransitionEvent()
        Header, footer, WebGL — participate without unmounting
```
