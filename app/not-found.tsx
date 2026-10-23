import { NotFoundView } from '@/components/ui/not-found-view'

/**
 * Boundary for routes outside the (site) group (e.g. /studio). It renders
 * under the bare root layout, without the providers `app/(site)/layout.tsx`
 * mounts, so it must stay provider-free (same reason as `global-error.tsx`).
 * Routes inside (site) get the group-level 404.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center">
      <NotFoundView />
    </div>
  )
}
