'use client'

import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { Form } from 'libs/form'
import { getForm } from 'libs/hubspot-forms/fetch-form'
import { useContext, useEffect, useRef } from 'react'
import { TransitionContext } from '../(components)/page-transition/transition.context'
import { Wrapper } from '../(components)/wrapper'
import { Subscribe } from './(components)/subscribe'
import s from './hubspot.module.scss'

gsap.registerPlugin(useGSAP)

export default function Hubspot() {
  const { form } = getForm(process.env.NEXT_HUSBPOT_FORM_ID)
  const { timeline } = useContext(TransitionContext)
  const container = useRef(null)

  useGSAP(
    () => {
      const targets = gsap.utils.toArray(['p', 'form'])

      gsap.fromTo(
        targets,
        { x: 30, opacity: 0 },
        { x: 0, opacity: 1, stagger: 0.25 },
      )
      timeline.add(gsap.to(container.current, { opacity: 0 }))
    },
    { scope: container },
  )

  useEffect(() => {
    const currentContainer = container.current

    return () => {
      if (currentContainer) {
        timeline.to(currentContainer, { opacity: 0, duration: 0.5 })
      }
    }
  }, [timeline, container])

  return (
    <Wrapper ref={container} theme="red" className={s.page}>
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
