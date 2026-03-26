# Transition System — Architecture

Implementation guide for the transition system internals. For consumer-facing API docs, see [README.md](./README.md).

---

## File Map

```
context.ts              Types + React context definition
helpers.ts              wrapExit/wrapEnter + collectors (promise orchestration)
registry.ts             createRegistry — per-page and global callback storage
transition-router.tsx   Main component — state machine, effects, rendering
use-route-transition.ts Hook for page components (initial/exit/enter)
use-transition-event.ts Hook for persistent components (onExit/onEnter)
use-transition-state.ts Read-only observer hook
use-preserved-loader-data.ts  Freezes loader data at mount time
error-boundary.tsx      Catches errors in exiting pages
```

---

## State Machine

```
                    ┌─────────────────────────────────────────┐
                    │           rapid navigation              │
                    │  (cleanup + cancel RAF + restart)        │
                    ▼                                         │
idle ──[navigation]──> exiting ──[exits done]──>[1 RAF]──> entering ──[enters done]──> idle
```

**States:**

- `idle` — no transition in progress
- `exiting` — exit callbacks running on old page
- `entering` — enter callbacks running on new page (after 1-frame deferral)

**Transitions happen via two mechanisms:**

- Navigation detection: `useLayoutEffect` watching `location.key`
- Orchestration: `useEffect` triggered by `transitionGen` state change

---

## Core Data Flow

### 1. Navigation Detection (`useLayoutEffect`)

Triggers on `location.key` change. Runs synchronously after DOM commit.

```
location.key changes
  │
  ├─ Same pathname? → skip (React Router data update, not navigation)
  │
  ├─ preventTransition returns true? → SKIP_NAVIGATE dispatch, clear infoRef, done
  │
  ├─ Currently transitioning? → ABORT:
  │     • clearTimeout (safety timeout)
  │     • runCleanups (cancel animations)
  │     • clear ALL page registries
  │     • reset refs
  │
  └─ Start new transition:
        • enterTriggeredRef = false
        • isTransitioningRef = true
        • ctxRef = {} (fresh shared context)
        • Compute direction + trigger from navigationType
        • Set infoRef (from/to/direction)
        • navIdRef++ (unique page key)
        • dispatch(NAVIGATE) → reducer keeps old page (frozen) + adds new page
        • setPhase("exiting")
        • transitionGenRef++ → setTransitionGen (triggers orchestration effect)
```

**Why `useLayoutEffect`?** Children's `useLayoutEffect` registrations (exit/enter callbacks) fire during the synchronous flush after the layout effect's state updates cause a re-render. This guarantees registrations are complete before the orchestration `useEffect` fires.

### 2. Orchestration (`useEffect`)

Triggers on `transitionGen` change. Fires after all layout effects (including children's registrations).

```
transitionGen changed
  │
  ├─ transitionGen === 0 or !isTransitioning? → skip
  ├─ pages.length < 2? → skip
  │
  ├─ Capture generation (stale check closure)
  ├─ Read exit/enter registries for exiting + entering pages
  ├─ Fire onExitStart callback
  ├─ Start safety timeout
  │
  ├─ onTransition provided? → hand full control to user (runExits/runEnters/next)
  │
  ├─ No exits registered? → triggerEnters() immediately
  │
  └─ Exits exist:
        • Pass enterCallback to runExits:
        │   stack mode: enterCallback = triggerEnters (early enter support)
        │   swap mode: enterCallback = no-op (enters wait for all exits)
        • Run page exits + global exits in parallel
        • Promise.all → triggerEnters()
```

### 3. Enter Trigger (`triggerEnters`)

Always deferred by 1 `requestAnimationFrame`. This is critical — without it, enter callbacks fire before `initial()`'s anime.js `duration:0` animations have applied (same frame as the effect), producing invisible animations.

```
triggerEnters() called
  │
  ├─ isStale() or already triggered? → bail
  ├─ enterTriggeredRef = true
  │
  └─ requestAnimationFrame:
        │
        ├─ isStale()? → bail (navigation happened during the 1-frame delay)
        ├─ Fire onExitComplete
        ├─ Swap mode: dispatch(REMOVE_PAGE) for exiting page
        ├─ setPhase("entering")
        ├─ Fire onEnterStart
        ├─ Run page enters + global enters
        └─ Promise.all → onEnterComplete → finishTransition (stack) or manual cleanup (swap)
```

### 4. Appear Flow (first-load enter)

Separate from the main orchestration. Triggers when both `appear` and `ready` props are true and no navigation has happened yet (`transitionGenRef === 0`).

```
appear effect fires (deps: [appear, ready])
  │
  ├─ transitionGenRef > 0? → skip (user already navigated)
  ├─ !appear or !ready? → skip
  │
  └─ Create synthetic TransitionInfo (from = to = pathname)
     • isTransitioningRef = true
     • requestAnimationFrame → run enters on initial page
     • Promise.all → cleanup, phase → idle
```

`initial()` fires on mount because `useRouteTransition` checks `context.appear` (which is `true` only when `transitionGenRef === 0`). Once any navigation happens, `appearActive` becomes `false` and subsequent mounts don't fire `initial()`.

---

## Registry System

Two-tier registry architecture:

```
TransitionRouter
  ├─ globalRegistry (1 instance, persistent)
  │     └─ useTransitionEvent hooks register here (header, footer, WebGL)
  │
  └─ pageRegistries Map<pageKey, Registry>
        ├─ page-0 registry → initial page's useRouteTransition hooks
        ├─ page-1 registry → second page's useRouteTransition hooks
        └─ ...created per navigation, cleaned up on transition completion
```

Each `Registry` contains:

- `exitMap` / `enterMap` — callbacks from `useRouteTransition`
- `eventMap` — callbacks from `useTransitionEvent`
- `exitResolvers` / `enterResolvers` — pending `done()` callbacks (for cancellation)

**Registration timing:** Components register in `useLayoutEffect` (before the orchestration `useEffect`). Unregistration happens on unmount, which also resolves any pending `done()` promises.

**Cleanup on interruption:** `registry.clear()` resolves all pending promises (settling stale `Promise.all` chains as no-ops via `isStale()`), then clears all maps.

---

## Page Stack

Managed by `useReducer` with three actions:

| Action          | Behavior                                                   |
| --------------- | ---------------------------------------------------------- |
| `NAVIGATE`      | Keep last page (frozen outlet), add new page. Max 2 pages. |
| `SKIP_NAVIGATE` | Replace entire stack with new page. No transition.         |
| `REMOVE_PAGE`   | Filter out page by key.                                    |

Pages are rendered with unique keys (`page-0`, `page-1`, ...) via `navIdRef`. Each page gets its own `TransitionContext.Provider` with a page-scoped registry. The top-level provider wraps everything (including children) with the global registry.

**Why unique keys instead of `location.key`?** Browser back-navigation reuses the original `location.key` for that history entry. If we used it as the React key, React would reconcile instead of remount — skipping `initial()` and breaking enter animations.

---

## Stale Transition Guard

Every async callback (Promise.then, RAF) captures a `generation` number and checks `isStale()` before proceeding:

```ts
const generation = transitionGenRef.current;
const isStale = () => transitionGenRef.current !== generation;
```

`transitionGenRef` is bumped synchronously in the layout effect (before any async work). All subsequent async callbacks from the old transition see a stale generation and bail. This prevents:

- Old exits calling `triggerEnters` after a new transition started
- Old enters calling `finishTransition` for the wrong page
- Old RAF callbacks from the 1-frame deferral firing after interruption

---

## Shared Context (`ctx`)

A plain `Record<string, unknown>` stored in `ctxRef`, reset to `{}` at the start of each transition. Threaded through the full call chain:

```
TransitionRouter (ctxRef.current)
  → registry.runExits(info, enter, ctx)
    → collectExits(... ctx)
      → wrapExit(... ctx)
        → exitCallback({ done, enter, info, ctx })  ← user writes to ctx

  → registry.runEnters(info, ctx)
    → collectEnters(... ctx)
      → wrapEnter(... ctx)
        → enterCallback({ done, info, ctx })  ← user reads from ctx
```

Same object reference throughout a single transition. Exits write, enters read.

---

## Mode Differences

| Behavior                             | Swap                                 | Stack                                |
| ------------------------------------ | ------------------------------------ | ------------------------------------ |
| Entering page visibility during exit | Hidden (`visibility: hidden`)        | Visible (behind exiting page)        |
| `enter()` from exit callbacks        | No-op                                | Triggers enters early                |
| Exiting page removal                 | Before enters start                  | After enters complete                |
| Exiting page position                | `position: relative` (drives layout) | `position: absolute` (floats behind) |

Both modes use the same state machine, registry system, and orchestration. The only branching points are:

1. `getPageStyle()` — 4 pre-allocated style constants
2. `enterCallback` — `triggerEnters` vs `() => {}`
3. `triggerEnters` — dispatches `REMOVE_PAGE` (swap) or not (stack)
4. Enter completion — calls `finishTransition` (stack) or inline cleanup (swap)

---

## Safety Mechanisms

| Mechanism                       | Purpose                                                        |
| ------------------------------- | -------------------------------------------------------------- |
| Safety timeout (5s)             | Force-proceeds if `done()` is never called                     |
| `done()` idempotency            | `resolved` flag prevents double-resolution                     |
| `isStale()` guard               | Prevents stale async callbacks from acting                     |
| `enterTriggeredRef`             | Prevents double-triggering of enters                           |
| RAF cancellation                | `cancelAnimationFrame` on cleanup                              |
| try/catch in wrapExit/wrapEnter | Animation errors don't hang the transition                     |
| Error boundary                  | Exiting page rendering errors don't crash the app              |
| Stale resolver cleanup          | `resolvers.get(id)?.()` before overwrite in wrapExit/wrapEnter |

---

## Effect Declaration Order

React fires layout effects and effects in declaration order within a component. The ordering in `TransitionRouter` is intentional:

```
useLayoutEffect [location.key]     ← Navigation detection (dispatches, bumps generation)
useLayoutEffect (no deps)          ← Outlet ref sync (MUST be after navigation detection)
useEffect [appear, ready]          ← Appear (first-load enter, before orchestration)
useEffect [transitionGen]          ← Orchestration (main transition logic)
useEffect [phase]                  ← Data attribute sync
```

Children's layout effects fire between the parent's layout effects and the parent's regular effects. This is why registrations (in children's `useLayoutEffect`) are guaranteed to be complete before the orchestration `useEffect` runs.
