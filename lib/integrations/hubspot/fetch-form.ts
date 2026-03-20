import type { Client } from '@hubspot/api-client'
import { fetchWithTimeout } from '@/utils/fetch'

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
  id: string
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

// NOTE: This uses raw fetch instead of @hubspot/api-client because the form
// endpoint is public and doesn't need the full SDK. If server-side form
// operations grow (e.g., creating forms, managing contacts), consider
// switching to the SDK which is already installed as a devDependency.
async function hubspotFormApi(id: string | null | undefined) {
  // Guard against null/undefined form ID
  if (!id) {
    throw new Error(
      'HubSpot form ID is not configured. Set NEXT_HUBSPOT_FORM_ID in your environment variables.'
    )
  }

  const accessToken = process.env.HUBSPOT_ACCESS_TOKEN
  if (!accessToken) {
    throw new Error(
      'HUBSPOT_ACCESS_TOKEN is not configured. Set it in your environment variables.'
    )
  }

  const resp = await fetchWithTimeout(
    `https://api.hubapi.com/marketing/v3/forms/${id}`,
    {
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${accessToken}`,
      },
      timeout: 8000, // 8 second timeout for HubSpot API
    }
  )
  if (!resp.ok) {
    throw new Error(`Failed to fetch form data: ${resp.status}`)
  }
  const response = (await resp.json()) as HubspotFormResponse

  if (!(response.fieldGroups && Array.isArray(response.fieldGroups))) {
    throw new Error(
      'Invalid HubSpot form response: missing fieldGroups property.'
    )
  }

  return apiParser(id, response)
}

function apiParser(id: string, data: HubspotFormResponse) {
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

  const removeHTML = (htmlText: string) => htmlText.replace(/<[^>]*>/g, '')

  return {
    portalId: process.env.NEXT_PUBLIC_HUBSPOT_PORTAL_ID,
    id: id,
    inputs: data.fieldGroups
      .filter((item) => item.fields[0] != null)
      .map((item) => {
        const flatData = item.fields[0] as HubSpotFormField
        return {
          name: flatData.name || '',
          label: flatData.label || '',
          placeholder: flatData.placeholder || '',
          required: flatData.required,
          hubspotType: typeSetter(flatData.fieldType),
          type: flatData.fieldType || '',
          hidden: flatData.hidden,
          helpText: flatData.helpText || '',
          options: flatData.options
            ? flatData.options.map((option) => option.label)
            : [],
        }
      }),
    submitButton: {
      text: data.displayOptions.submitButtonText || 'Submit',
    },
    legalConsent: legalConsentOptions?.[0]
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

type GetFormSuccess = { form: HubSpotParsedForm; error?: never }
type GetFormError = { form?: never; error: string }
type GetFormResult = GetFormSuccess | GetFormError

export async function getForm(
  formId: string | null | undefined = null
): Promise<GetFormResult> {
  try {
    const result: GetFormSuccess = {
      form: await hubspotFormApi(formId),
    }

    return result
  } catch (err) {
    if (err instanceof Error) {
      return { error: err.message }
    }
    return { error: 'Unknown error' }
  }
}
