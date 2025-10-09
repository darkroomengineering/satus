import { Wrapper } from '~/app/(pages)/(components)/wrapper'
import { Form } from '~/components/form'
import { getForm } from '~/integrations/hubspot/fetch-form'
import { Subscribe } from './(components)/subscribe'

export default async function Hubspot() {
  // @ts-expect-error Server Component
  const { form } = await getForm(process.env.NEXT_HUBSPOT_FORM_ID)

  return (
    <Wrapper theme="red" className="font-mono uppercase">
      <div className="flex flex-col items-center justify-center flex-grow max-dt:spx-16">
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
