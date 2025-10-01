'use server'

import { fetchWithTimeout } from '~/libs/fetch-with-timeout'

export async function HubspotNewsletterAction(_: unknown, formData: FormData) {
  const portalId = process.env.NEXT_PUBLIC_HUBSPOT_PORTAL_ID
  const formId = formData.get('formId')

  const body = {
    fields: [
      {
        name: 'email',
        value: formData.get('email'),
      },
    ],
  }

  const url = `https://api.hsforms.com/submissions/v3/integration/submit/${portalId}/${formId}`

  try {
    const response = await fetchWithTimeout(url, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 8000, // 8 second timeout for HubSpot API
    })

    if (!response.ok) {
      throw new Error(`Failed to submit to hubspot: ${response.status}`)
    }

    return { status: 200, message: 'submitted to Hubspot successfully' }
  } catch (error) {
    console.error(`Error submitting to hubspot form: ${formId}`, error)
    return { status: 500, message: 'Failed to submit to hubspot' }
  }
}
