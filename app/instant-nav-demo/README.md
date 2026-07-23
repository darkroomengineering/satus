# instant-nav-demo — throwaway

These routes exist ONLY on the `next/16.3-preview` branch to exercise Next.js
16.3 Instant Navigations (`partialPrefetching`) on a real deploy. They are NOT
starter content and must never merge to `main`.

- `page.tsx` — hub linking to the demo routes (prefetch fires on hover/viewport)
- `fast/` — synchronous route, the prefetched shell is the whole page
- `slow/` — shell paints immediately; an inner `<Suspense>` panel streams in
  after a delay (`connection()` + artificial wait) — partial prerendering
- `[item]/` — dynamic route that suspends at the top level, so its `loading.tsx`
  shell is shown on the way in and reused identically for every param value
  (`/instant-nav-demo/alpha`, `/instant-nav-demo/bravo`,
  `/instant-nav-demo/charlie`)

Reach it on the preview at `/instant-nav-demo`. Delete this whole folder before
adopting anything from this branch.
