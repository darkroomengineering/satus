import { Form } from 'libs/form'
import { getForm } from 'libs/hubspot-forms/fetch-form'
import { Wrapper } from '../(components)/wrapper'
import { Subscribe } from './(components)/subscribe'
import s from './hubspot.module.scss'

export default async function Hubspot() {
  const { form } = await getForm(process.env.NEXT_HUSBPOT_FORM_ID)

  return (
    <Wrapper theme="red" className={s.page}>
      <div className={s.inner}>
        <p className={s.title}>subscribe for more Satūs</p>
        <Form
          className={s.subscribe}
          formId={form?.id}
          action={'HubspotNewsletterAction'}
        >
          <Subscribe form={form} />
        </Form>
      </div>
    </Wrapper>
  )
}
