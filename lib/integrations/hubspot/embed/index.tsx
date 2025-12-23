'use client'

import cn from 'clsx'
import Script, { type ScriptProps } from 'next/script'
import { useCallback, useEffect, useRef } from 'react'
import s from './form.module.css'

type EmbedHubspotFormProps = {
  strategy?: ScriptProps['strategy']
  formId: string
  target?: string
  className?: string
  onSubmit?: () => void
}

// Track script loading state globally
let isScriptLoaded = false

export function EmbedHubspotForm({
  strategy = 'afterInteractive',
  formId,
  target = 'hubspot-form-wrapper',
  className,
  onSubmit,
}: EmbedHubspotFormProps) {
  const formCreatedRef = useRef(false)

  const createForm = useCallback(() => {
    if (formCreatedRef.current) return

    if (window.hbspt && isScriptLoaded) {
      formCreatedRef.current = true
      window.hbspt.forms.create({
        portalId: process.env.NEXT_PUBLIC_HUBSPOT_PORTAL_ID,
        formId,
        target: `#${target}`,
        submitButtonClass: s.submit,
        errorMessageClass: s.error,
        cssClass: s['custom-form'],
        onFormReady: () => {
          console.log(`Form ${formId} ready in target ${target}`)
        },
        onFormSubmitted: onSubmit,
      })
    }
  }, [formId, target, onSubmit])

  useEffect(() => {
    createForm()
    // Reset the ref when component unmounts
    return () => {
      formCreatedRef.current = false
    }
  }, [createForm])

  return (
    <div id={target} className={cn(s['hubspot-form'], className)}>
      <Script
        src="https://js.hsforms.net/forms/v2.js"
        id="hubspotScript"
        strategy={strategy}
        onLoad={() => {
          console.log('Form script loaded')
          isScriptLoaded = true
          createForm()
        }}
        onError={(e) => {
          console.error('Form script error:', e)
        }}
      />
    </div>
  )
}
