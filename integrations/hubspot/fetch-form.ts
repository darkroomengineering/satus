import type { Client } from '@hubspot/api-client'
import { fetchWithTimeout } from '~/libs/fetch-with-timeout'

type HubspotFormResponse = Awaited<
  ReturnType<Client['marketing']['forms']['formsApi']['getById']>
>

interface HubSpotFormField {
  name: string
  label: string
  placeholder?: string
  required: boolean
  fieldType: string
  hidden?: boolean
  helpText?: string
  options?: Array<{ label: string; value: string }>
}

interface HubSpotLegalConsentOption {
  subscriptionTypeId: string
  label: string
}

interface HubSpotLegalConsentOptions {
  communicationsCheckboxes?: HubSpotLegalConsentOption[]
  privacyText?: string
  consentToProcessText?: string
}

export interface HubSpotParsedForm {
  portalId: string | undefined
  id: string | null
  inputs: Array<{
    name: string
    label: string
    placeholder: string
    required: boolean
    hubspotType: string
    type: string
    hidden: boolean | undefined
    helpText: string
    options: string[]
  }>
  submitButton: {
    text: string
  }
  legalConsent: {
    required: boolean
    subscriptionTypeId?: string
    label?: string
    disclaimer?: string[]
  }
  actions: {
    redirect: boolean
    redirectValue: string | null
  }
}

// Also export the result type from getForm
export interface HubSpotFormResult {
  form?: HubSpotParsedForm
  error?: string
}

// TODO: If only server side maybe use api-client
async function hubspotFormApi(id: string | null) {
  const resp = await fetchWithTimeout(
    `https://api.hubapi.com/marketing/v3/forms/${id}`,
    {
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
      },
      timeout: 8000, // 8 second timeout for HubSpot API
    }
  )
  if (!resp.ok) {
    throw new Error(`Failed to fetch form data: ${resp.status}`)
  }
  const response = (await resp.json()) as HubspotFormResponse
  return apiParser(id, response)
}

function apiParser(id: string | null, data: HubspotFormResponse) {
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

  // Fix: Use proper type assertion and optional chaining
  const legalConsentOptions =
    (data?.legalConsentOptions as HubSpotLegalConsentOptions)
      ?.communicationsCheckboxes || null

  const removeHTML = (htmlText: string) =>
    htmlText.replace('<p>', '').replace('</p>', '')

  return {
    portalId: process.env.NEXT_PUBLIC_HUBSPOT_PORTAL_ID,
    id: id,
    inputs: data.fieldGroups.map((item) => {
      const flatData = item.fields[0] as HubSpotFormField // Type assertion to handle incomplete types
      return {
        name: flatData?.name || '',
        label: flatData?.label || '',
        placeholder: flatData?.placeholder || 'placeHolder',
        required: flatData?.required,
        hubspotType: typeSetter(flatData.fieldType),
        type: flatData.fieldType || '',
        hidden: flatData.hidden,
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
            removeHTML(
              (data.legalConsentOptions as HubSpotLegalConsentOptions)
                .privacyText || ''
            ),
            removeHTML(
              (data.legalConsentOptions as HubSpotLegalConsentOptions)
                .consentToProcessText || ''
            ),
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
  handler = (async () => {
    // Default no-op handler
  }) as (form: { form: Awaited<ReturnType<typeof apiParser>> }) => Promise<void>
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
