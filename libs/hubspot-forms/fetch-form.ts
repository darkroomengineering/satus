import type { Client } from '@hubspot/api-client'

// TODO: If only server side maybe use api-client
async function hubspotFormApi(id: string | null) {
  const resp = await fetch(`https://api.hubapi.com/marketing/v3/forms/${id}`, {
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
    },
  })
  if (!resp.ok) {
    throw new Error(`Failed to fetch form data: ${resp.status}`)
  }
  const response = await resp.json()
  return apiParser(id, response)
}

function apiParser(
  id: string | null,
  data: Awaited<ReturnType<Client['marketing']['forms']['formsApi']['getById']>>
) {
  const typeSetter = (type: string) => {
    switch (type) {
      case 'phone':
        return 'single_line_text'
      case 'email':
        return 'single_line_text'
      default:
        return type
    }
  }

  const legalConsentOptions =
    data?.legalConsentOptions?.communicationsCheckboxes || null

  const removeHTML = (htmlText: string) =>
    htmlText.replace('<p>', '').replace('</p>', '')

  return {
    portalId: process.env.NEXT_PUBLIC_HUSBPOT_PORTAL_ID,
    id: id,
    inputs: data.fieldGroups.map((item) => {
      const flatData = item.fields[0]
      return {
        name: flatData?.name || '',
        label: flatData?.label || '',
        placeholder: flatData?.placeholder || 'placeHolder',
        required: flatData?.required || false,
        hubspotType: typeSetter(flatData.fieldType),
        type: flatData.fieldType || '',
        hidden: flatData.hidden || false,
        // TODO: Check if helpText does exist or type is wrong
        // @ts-ignore
        helpText: flatData?.helpText || '',
        options: flatData.options
          ? flatData.options.map((option) => option.label)
          : [],
      }
    }),
    submitButton: {
      text: data.displayOptions.submitButtonText || 'LFG',
    },
    legalConsent: legalConsentOptions
      ? {
          required: true,
          subscriptionTypeId: legalConsentOptions[0].subscriptionTypeId,
          label: removeHTML(legalConsentOptions[0].label),
          disclaimer: [
            removeHTML(data.legalConsentOptions.privacyText),
            removeHTML(data.legalConsentOptions.consentToProcessText || ''),
          ],
        }
      : { required: false },
    actions: {
      redirect: data.configuration.postSubmitAction.type === 'redirect_url',
      redirectValue: data.configuration.postSubmitAction.value,
    },
  }
}

export async function getForm(
  formId = null,
  handler = (async () => {}) as (form: {
    form: Awaited<ReturnType<typeof apiParser>>
  }) => Promise<void>
) {
  try {
    const form = {
      form: await hubspotFormApi(formId),
    }

    await handler(form)
    return form
  } catch (err) {
    if (err instanceof Error) {
      return { error: err.message }
    }
    return { error: 'Unknown error' }
  }
}
