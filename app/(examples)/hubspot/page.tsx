import type { Metadata } from 'next'
import { Wrapper } from '@/components/layout/wrapper'
import { Form } from '@/components/ui/form'
import { NotConfigured } from '@/components/ui/not-configured'
import { HubspotNewsletterAction } from '@/integrations/hubspot/action'
import { getForm } from '@/integrations/hubspot/fetch-form'
import { isConfigured } from '@/integrations/registry'
import { Subscribe } from './_components/subscribe'

export const metadata: Metadata = {
  title: 'HubSpot Integration — Satūs',
  description:
    'Example HubSpot Forms integration: server-validated newsletter subscription with Zod and Next.js server actions.',
}

export default async function HubspotPage() {
  // Show setup instructions if HubSpot is not configured
  if (!isConfigured('hubspot')) {
    return (
      <Wrapper theme="dark">
        <NotConfigured integration="HubSpot" />
      </Wrapper>
    )
  }

  const result = await getForm(process.env.NEXT_HUBSPOT_FORM_ID)

  if ('error' in result) {
    return (
      <Wrapper theme="dark">
        <NotConfigured integration="HubSpot" />
      </Wrapper>
    )
  }

  const { form } = result

  return (
    <Wrapper theme="dark" className="font-mono uppercase">
      <div className="max-dt:spx-16 flex grow flex-col items-center justify-center">
        <p className="dr-mb-19 dt:dr-mb-15">subscribe for more Satūs</p>
        <Form
          className="dr-mb-32 dr-px-15"
          {...(form.id && { formId: form.id })}
          action={HubspotNewsletterAction}
        >
          <Subscribe form={form} idx={0} />
        </Form>
      </div>
    </Wrapper>
  )
}
