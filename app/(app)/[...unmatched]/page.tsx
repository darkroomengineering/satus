import { notFound } from 'next/navigation'

/**
 * Routes every unmatched URL into the (app) group so the 404 renders with the
 * app providers and site chrome ((app)/not-found.tsx) instead of the bare root
 * layout. /studio and /api resolve first — static segments win over catch-alls.
 */
export default function Unmatched() {
  notFound()
}
