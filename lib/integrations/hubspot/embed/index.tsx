'use client'

import cn from 'clsx'
import Script, { type ScriptProps } from 'next/script'
import { useEffect, useRef } from 'react'
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
  const targetRef = useRef<HTMLDivElement>(null)

  function createForm() {
    if (formCreatedRef.current) return

    if (
      window.hbspt &&
      isScriptLoaded &&
      process.env.NEXT_PUBLIC_HUBSPOT_PORTAL_ID
    ) {
      formCreatedRef.current = true
      window.hbspt.forms.create({
        portalId: process.env.NEXT_PUBLIC_HUBSPOT_PORTAL_ID,
        formId,
        target: `#${target}`,
        ...(s.submit && { submitButtonClass: s.submit }),
        ...(s.error && { errorMessageClass: s.error }),
        ...(s['custom-form'] && { cssClass: s['custom-form'] }),
        onFormReady: () => {
          if (process.env.NODE_ENV === 'development') {
            console.log(`Form ${formId} ready in target ${target}`)
          }
        },
        ...(onSubmit && { onFormSubmitted: onSubmit }),
      })
    }
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: React Compiler handles dependency tracking
  useEffect(() => {
    createForm()
    // Clean up on unmount
    return () => {
      formCreatedRef.current = false
      if (targetRef.current) {
        targetRef.current.innerHTML = ''
      }
    }
  }, [formId, target, onSubmit])

  return (
    <div
      ref={targetRef}
      id={target}
      className={cn(s['hubspot-form'], className)}
    >
      <Script
        src="https://js.hsforms.net/forms/v2.js"
        id="hubspotScript"
        strategy={strategy}
        onLoad={() => {
          if (process.env.NODE_ENV === 'development') {
            console.log('Form script loaded')
          }
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
