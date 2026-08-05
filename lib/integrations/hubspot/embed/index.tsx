'use client'

import cn from 'clsx'
import Script, { type ScriptProps } from 'next/script'
import { useEffect, useId, useRef } from 'react'

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
  target: targetProp,
  className,
  onSubmit,
}: EmbedHubspotFormProps) {
  // Default to a per-instance id so two embeds on the same page never collide
  // on the DOM id `window.hbspt.forms.create` targets — useId()'s colons
  // aren't valid in a bare `#id` CSS selector, so they're stripped.
  const generatedId = useId().replace(/:/g, '')
  const target = targetProp ?? `hubspot-form-wrapper-${generatedId}`
  const formCreatedRef = useRef(false)
  const targetRef = useRef<HTMLDivElement>(null)

  function createForm() {
    if (formCreatedRef.current) return

    // Client component: read NEXT_PUBLIC_* directly so Next inlines it into the
    // browser bundle. The `env` object's parse(process.env) access is not
    // reliably inlined client-side and can be undefined at runtime.
    const portalId = process.env.NEXT_PUBLIC_HUBSPOT_PORTAL_ID
    if (window.hbspt && isScriptLoaded && portalId) {
      formCreatedRef.current = true
      window.hbspt.forms.create({
        portalId,
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

  useEffect(() => {
    createForm()
    // Clean up on unmount
    return () => {
      formCreatedRef.current = false
      // oxlint-disable-next-line react/exhaustive-deps -- ref is read in cleanup deliberately; the node is torn down with the effect
      if (targetRef.current) {
        // oxlint-disable-next-line react/exhaustive-deps -- ref is read in cleanup deliberately; the node is torn down with the effect
        targetRef.current.innerHTML = ''
      }
    }
    // oxlint-disable-next-line react/exhaustive-deps -- createForm is stable for the lifetime of the embed; React Compiler handles dependency tracking
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
