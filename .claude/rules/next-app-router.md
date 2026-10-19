---
paths:
  - 'app/**/*.{ts,tsx}'
  - 'components/**/*.tsx'
  - 'lib/**/*.tsx'
  - 'proxy.ts'
  - 'next.config.ts'
---

# Next.js App Router

Next.js rules that AGENTS.md does not carry. AGENTS.md owns Server Components by default, Caching, Sanity, the Request Proxy, and Error boundaries.

## Server and client boundary

- Compose routes in `app/**/page.tsx` as Server Components. A page-level `'use client'` component under `components/` that is all `page.tsx` renders is a smell: move the ref or state that forced it into the component that renders the element.
- No `useState`, `useEffect`, or refs in a Server Component. The Server Component fetches, a Client Component owns interaction:

```tsx
async function Page() {
  const data = await fetchData()
  return <PageClient data={data} />
}
```

```tsx
'use client'
function PageClient({ data }: { data: Data }) {
  const [open, setOpen] = useState(false)
  return <Modal open={open} data={data} />
}
```

- Never make a Client Component `async`: only Server Components can await. If a `'use client'` file needs `await`, the fetch belongs one boundary up; pass the result down as a prop.
- Client-side fetching is for post-mount state (autocomplete, polling, mutations). Data the user sees on first paint comes from Server Components or Route Handlers.
- `params` and `searchParams` are Promises: `const { slug } = await params`.
- Prefer Server Actions over Route Handlers for mutations. Route Handlers stay for webhooks and external callers.
- Show markup per breakpoint with the `desktop-only` / `mobile-only` classes, never `useMediaQuery`. They need no JavaScript and match the server render; the hook has no value until mount. Behavior that differs by breakpoint can still use JavaScript (`useDeviceDetection`).

## Performance

- Browser-only libraries load through `next/dynamic` with `ssr: false`, or `lazy` + `<Suspense>` as in `lib/features`. Never static-import heavy libraries (`gsap`, analytics, editors) into the initial bundle.
- Add icon and utility packages to `experimental.optimizePackageImports` in `next.config.ts` instead of writing deep imports by hand.
- `cache()` from `react` deduplicates a read within one request. Caching across requests is explicit per fetch (AGENTS.md § Caching).
- Compose siblings so each child fetches in parallel instead of nesting awaits. Defer an `await` past early exits (`if (!id) return` before `await getUser(id)`).
- Stream with a Server Component and `<Suspense fallback>` around an async child. Keep Suspense below any `notFound()` check (AGENTS.md § Error boundaries).
- LCP image: `<Image preload>` from `@/components/ui/image` (it also sets `loading="eager"`). Below-fold media stays lazy.
