import { Wrapper } from '~/components/layout/wrapper'
import { Form } from '~/components/ui/form'
import { NotConfigured } from '~/components/ui/not-configured'
import { isHubSpotConfigured } from '~/integrations/check-integration'
import { getForm } from '~/integrations/hubspot/fetch-form'
import { Subscribe } from './_components/subscribe'

export default async function HubspotPage() {
  // Show setup instructions if HubSpot is not configured
  if (!isHubSpotConfigured()) {
    return (
      <Wrapper theme="red">
        <NotConfigured integration="HubSpot" />
      </Wrapper>
    )
  }

  // @ts-expect-error Server Component
  const { form } = await getForm(process.env.NEXT_HUBSPOT_FORM_ID)

  return (
    <Wrapper theme="red" className="font-mono uppercase">
      <div className="max-dt:spx-16 flex grow flex-col items-center justify-center">
        <p className="dr-mb-19 dt:dr-mb-15">subscribe for more Satūs</p>
        <Form
          className="dr-mb-32 dr-px-15"
          formId={form?.id}
          action={'HubspotNewsletterAction'}
        >
          <Subscribe form={form} idx={0} />
        </Form>
      </div>
    </Wrapper>
  )
}
