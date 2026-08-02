import { NotFoundView } from '@/components/ui/not-found-view'

/**
 * Boundary for routes OUTSIDE the (site) group (e.g. /studio). It renders
 * under the bare root layout, with none of the providers app/(site)/layout.tsx
 * mounts (Lenis, Theme, Header, Footer, WebGL Canvas), so it must stay
 * provider-free — same reasoning app/global-error.tsx documents for dropping
 * Wrapper. Routes inside (site) get the richer group-level 404 instead.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center">
      <NotFoundView />
    </div>
  )
}
