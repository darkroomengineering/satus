import { z } from 'zod'
import { fetchWithTimeout } from '@/utils/fetch'
import { stripHtmlTags } from '@/utils/strings'
import { parseApiResponse } from '@/utils/validation'

// ---------------------------------------------------------------------------
// Zod schemas for the HubSpot forms API response
// ---------------------------------------------------------------------------

const hubspotFieldSchema = z.object({
  name: z.string(),
  label: z.string(),
  placeholder: z.string().optional(),
  required: z.boolean(),
  fieldType: z.string(),
  hidden: z.boolean().optional(),
  helpText: z.string().optional(),
  options: z
    .array(z.object({ label: z.string(), value: z.string() }))
    .optional(),
})

const hubspotLegalConsentOptionsSchema = z.object({
  communicationsCheckboxes: z
    .array(
      z.object({
        subscriptionTypeId: z.string(),
        label: z.string(),
      })
    )
    .optional(),
  privacyText: z.string().optional(),
  consentToProcessText: z.string().optional(),
})

const hubspotFormResponseSchema = z.object({
  fieldGroups: z.array(
    z.object({
      fields: z.array(hubspotFieldSchema),
    })
  ),
  legalConsentOptions: hubspotLegalConsentOptionsSchema.optional(),
  displayOptions: z.object({
    submitButtonText: z.string().optional(),
  }),
  configuration: z.object({
    postSubmitAction: z.object({
      type: z.string(),
      value: z.string().nullable(),
    }),
  }),
})

type HubspotFormResponse = z.infer<typeof hubspotFormResponseSchema>

export interface HubSpotParsedForm {
  portalId: string | undefined
  id: string
  inputs: Array<{
    name: string
    label: string
    placeholder: string
    required: boolean
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
async function hubspotFormApi(id: string) {
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

  const json: unknown = await resp.json()
  const response = parseApiResponse(
    hubspotFormResponseSchema,
    json,
    'HubSpot forms API'
  )

  return apiParser(id, response)
}

function apiParser(id: string, data: HubspotFormResponse) {
  const communicationsCheckboxes =
    data.legalConsentOptions?.communicationsCheckboxes ?? null
  const firstCheckbox = communicationsCheckboxes?.[0] ?? null

  return {
    portalId: process.env.NEXT_PUBLIC_HUBSPOT_PORTAL_ID,
    id: id,
    inputs: data.fieldGroups
      .flatMap((item) => (item.fields[0] != null ? [item.fields[0]] : []))
      .map((flatData) => {
        return {
          name: flatData.name || '',
          label: flatData.label || '',
          placeholder: flatData.placeholder || '',
          required: flatData.required,
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
    legalConsent: firstCheckbox
      ? {
          required: true,
          subscriptionTypeId: firstCheckbox.subscriptionTypeId,
          label: stripHtmlTags(firstCheckbox.label),
          disclaimer: [
            stripHtmlTags(data.legalConsentOptions?.privacyText || ''),
            stripHtmlTags(data.legalConsentOptions?.consentToProcessText || ''),
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
  // Null-guard in the public wrapper; internal hubspotFormApi only accepts string
  if (!formId) {
    return {
      error:
        'HubSpot form ID is not configured. Set NEXT_HUBSPOT_FORM_ID in your environment variables.',
    }
  }

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
