// No <Wrapper> here: with cacheComponents, the root loading fallback must be
// statically renderable — Wrapper mounts <Theme>, which reads uncached data
// and fails prerendering (e.g. /studio). Keep this fallback dependency-free.
export default function Loading() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center font-mono uppercase">
      <p>Cooking...</p>
    </div>
  )
}
