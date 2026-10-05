// The page awaits `connection()` so the Studio renders at request time, which
// Next's instant-navigation check reports as a blocking route. That's the
// intent here: the Studio is its own app, entered by full page load, so it
// opts out of the check. Cost: a client-side navigation into /studio waits
// on the server instead of showing an instant shell.
export const instant = false

export const metadata = {
  title: 'Sanity Studio',
  robots: { index: false, follow: false },
}

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
