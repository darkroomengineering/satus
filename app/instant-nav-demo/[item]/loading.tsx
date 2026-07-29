export default function Loading() {
  return (
    // <output> has an implicit role="status"; `flex` overrides its default
    // inline display, so the layout is unchanged.
    <output
      aria-busy="true"
      className="gap-3 flex min-h-dvh flex-col items-center justify-center font-mono"
    >
      <span className="sr-only">Loading item</span>
      <div className="w-40 animate-pulse space-y-2">
        <div className="h-2 rounded bg-current opacity-20" />
        <div className="h-2 rounded w-3/4 bg-current opacity-20" />
        <div className="h-2 rounded w-1/2 bg-current opacity-10" />
      </div>
    </output>
  )
}
