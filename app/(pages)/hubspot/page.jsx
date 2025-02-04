import { Wrapper } from '~/app/(pages)/(components)/wrapper'
import { Form } from '~/libs/form'
import { getForm } from '~/libs/hubspot-forms/fetch-form'
import { Subscribe } from './(components)/subscribe'

export default async function Hubspot() {
  // @ts-expect-error Server Component
  const { form } = await getForm(process.env.NEXT_HUSBPOT_FORM_ID)

  return (
    <Wrapper theme="red" className="font-mono uppercase">
      <div className="flex flex-col items-center justify-center flex-grow max-dt:spx-16">
        <p className="smb-19 dt:smb-15">subscribe for more Satūs</p>
        <Form
          className="smb-32 spx-15"
          formId={form?.id}
          action={'HubspotNewsletterAction'}
        >
          <Subscribe form={form} />
        </Form>
      </div>
    </Wrapper>
  )
}
