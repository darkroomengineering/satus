// https://nextjs.org/docs/app/building-your-application/configuring/draft-mode

import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'

export async function GET(request) {
  // Parse query string parameters
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')
  const slug = searchParams.get('slug')

  // Check the secret and next parameters
  // This secret should only be known to this route handler and the CMS
  if (secret !== process.env.DRAFT_MODE_TOKEN || !slug) {
    return new Response(`Invalid token`, {
      status: 401,
    })
  }

  const params = request.url.split(`&slug=${slug}&`).at(-1)

  // Enable Draft Mode by setting the cookie
  draftMode().enable()

  // Redirect to the path from the fetched post
  // We don't redirect to searchParams.slug as that might lead to open redirect vulnerabilities
  redirect(`${slug}?${params}`)
}
