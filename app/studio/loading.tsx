// Suspense boundary the deferred Studio page resolves under (Cache Components
// requires one above any request-time render). Must stay statically
// renderable and dependency-free — /studio inherits none of the app runtime.
export default function Loading() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center font-mono uppercase">
      <p>Loading Studio...</p>
    </div>
  )
}
