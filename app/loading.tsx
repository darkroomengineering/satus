// No <Wrapper> here: with cacheComponents, the root loading fallback must be
// statically renderable — Wrapper mounts <Theme>, which reads uncached data
// and fails prerendering (e.g. /studio). Keep this fallback dependency-free.
export default function Loading() {
  return (
    <div
      role="status"
      aria-busy="true"
      className="flex min-h-dvh flex-col items-center justify-center gap-3 font-mono"
    >
      <span className="sr-only">Loading</span>
      <div className="w-40 animate-pulse space-y-2">
        <div className="h-2 rounded bg-current opacity-20" />
        <div className="h-2 w-3/4 rounded bg-current opacity-20" />
        <div className="h-2 w-1/2 rounded bg-current opacity-10" />
      </div>
    </div>
  )
}
