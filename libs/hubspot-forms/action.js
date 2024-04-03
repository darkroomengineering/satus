'use server'

export async function HubspotNewsletterAction(prevState, formData) {
  const portalId = process.env.NEXT_PUBLIC_HUSBPOT_PORTAL_ID
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
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to submit to husbpot: ${response.status}`)
    }

    return { status: 200, message: 'submitted to Hubspot succesfully' }
  } catch (error) {
    console.error('Error submiting to husbpot form:', formId + error)
    return { status: 500, message: 'Failed to submit to husbpot' }
  }
}
