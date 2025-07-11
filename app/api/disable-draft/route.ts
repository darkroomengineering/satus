import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug') || '/'

  // Disable draft mode
  ;(await draftMode()).disable()

  // Redirect back to the page
  redirect(slug)
}
