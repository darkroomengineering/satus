'use client'

import cn from 'clsx'
import Script, { type ScriptProps } from 'next/script'
import { useEffect, useId, useRef, useSyncExternalStore } from 'react'

import s from './form.module.css'

type EmbedHubspotFormProps = {
  strategy?: ScriptProps['strategy']
  formId: string
  target?: string
  className?: string
  onSubmit?: () => void
}

type ScriptStatus = 'loading' | 'ready' | 'failed'

// Every embed shares one `<Script id="hubspotScript">`, and next/script only
// gives the first instance a real onLoad/onError, so the outcome lives here
// where every mounted embed can read it.
let scriptStatus: ScriptStatus = 'loading'
const scriptListeners = new Set<() => void>()

function setScriptStatus(next: ScriptStatus) {
  if (scriptStatus === next) return
  scriptStatus = next
  for (const listener of scriptListeners) listener()
}

function subscribeScriptStatus(listener: () => void) {
  scriptListeners.add(listener)
  return () => {
    scriptListeners.delete(listener)
  }
}

export function EmbedHubspotForm({
  strategy = 'afterInteractive',
  formId,
  target: targetProp,
  className,
  onSubmit,
}: EmbedHubspotFormProps) {
  // Per-instance id so two embeds never collide on the DOM id
  // `hbspt.forms.create` targets; useId()'s colons are invalid in a bare
  // `#id` selector, so they're stripped.
  const generatedId = useId().replace(/:/g, '')
  const target = targetProp ?? `hubspot-form-wrapper-${generatedId}`
  const formCreatedRef = useRef(false)
  const targetRef = useRef<HTMLDivElement>(null)
  const status = useSyncExternalStore(
    subscribeScriptStatus,
    () => scriptStatus,
    () => 'loading'
  )

  function createForm() {
    if (formCreatedRef.current) return

    // Read NEXT_PUBLIC_* directly so Next inlines it; the `env` object's
    // parse(process.env) is not reliably inlined client-side.
    const portalId = process.env.NEXT_PUBLIC_HUBSPOT_PORTAL_ID
    if (window.hbspt && portalId) {
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
    if (status !== 'ready') return
    createForm()
    return () => {
      // Only wipe markup HubSpot injected; React owns the wrapper otherwise.
      if (!formCreatedRef.current) return
      formCreatedRef.current = false
      // oxlint-disable-next-line react/exhaustive-deps -- ref is read in cleanup deliberately; the node is torn down with the effect
      if (targetRef.current) {
        // oxlint-disable-next-line react/exhaustive-deps -- ref is read in cleanup deliberately; the node is torn down with the effect
        targetRef.current.innerHTML = ''
      }
    }
    // oxlint-disable-next-line react/exhaustive-deps -- createForm is stable for the lifetime of the embed; React Compiler handles dependency tracking
  }, [status, formId, target, onSubmit])

  return (
    <div
      ref={targetRef}
      id={target}
      className={cn(s['hubspot-form'], className)}
    >
      {status === 'failed' && (
        <p role="status" className="dr-py-16 text-center text-pretty">
          This form could not load. If you use a content blocker, allow
          js.hsforms.net and reload.
        </p>
      )}
      <Script
        src="https://js.hsforms.net/forms/v2.js"
        id="hubspotScript"
        strategy={strategy}
        onLoad={() => {
          if (process.env.NODE_ENV === 'development') {
            console.log('Form script loaded')
          }
          // next/script hands later instances a promise that resolves even
          // when the script failed, so onLoad alone does not prove a load.
          setScriptStatus(window.hbspt ? 'ready' : 'failed')
        }}
        onError={(e) => {
          console.error('Form script error:', e)
          setScriptStatus('failed')
        }}
      />
    </div>
  )
}
