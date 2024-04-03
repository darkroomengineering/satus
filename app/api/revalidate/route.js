// https://nextjs.org/docs/app/api-reference/functions/revalidatePath

import { revalidatePath } from 'next/cache'

export async function POST() {
  revalidatePath('/', 'layout')

  return Response.json({
    revalidated: true,
    now: Date.now(),
  })
}
