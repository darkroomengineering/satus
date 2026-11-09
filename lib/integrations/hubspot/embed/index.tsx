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

const SCRIPT_SRC = 'https://js.hsforms.net/forms/v2.js'

interface ScriptState {
  status: 'loading' | 'ready' | 'failed'
  attempt: number
}

// Every embed shares one `<Script>`, and next/script only gives the first
// instance a real onLoad/onError, so the outcome lives here where every
// mounted embed can read it.
const initialScriptState: ScriptState = { status: 'loading', attempt: 0 }
let scriptState = initialScriptState
const scriptListeners = new Set<() => void>()

function setScriptState(next: ScriptState) {
  scriptState = next
  for (const listener of scriptListeners) listener()
}

// Callbacks from an earlier attempt's `<Script>` still fire after a retry
// starts; only the current attempt may settle the status.
function settleScript(attempt: number, status: 'ready' | 'failed') {
  if (attempt !== scriptState.attempt || scriptState.status === status) return
  setScriptState({ status, attempt })
}

// A mount after a failure retries once. next/script keeps a failed load in
// its id and src caches for the page session, so a retry needs a new id and
// src or it would never inject the script again.
function retryScriptAfterFailure() {
  if (scriptState.status !== 'failed') return
  setScriptState({ status: 'loading', attempt: scriptState.attempt + 1 })
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
  // Read NEXT_PUBLIC_* directly so Next inlines it; the `env` object's
  // parse(process.env) is not reliably inlined client-side.
  const portalId = process.env.NEXT_PUBLIC_HUBSPOT_PORTAL_ID
  const script = useSyncExternalStore(
    subscribeScriptStatus,
    () => scriptState,
    () => initialScriptState
  )
  // Without a portal id HubSpot has nothing to render, so the script is not
  // loaded and the embed shows the fallback.
  const status = portalId ? script.status : 'unconfigured'

  useEffect(() => {
    if (portalId) retryScriptAfterFailure()
  }, [portalId])

  function createForm() {
    if (formCreatedRef.current) return

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
      {status === 'unconfigured' && (
        <p role="status" className="dr-py-16 text-center text-pretty">
          This form could not load.
        </p>
      )}
      {status !== 'unconfigured' && (
        <Script
          key={script.attempt}
          src={
            script.attempt === 0
              ? SCRIPT_SRC
              : `${SCRIPT_SRC}?retry=${script.attempt}`
          }
          id={
            script.attempt === 0
              ? 'hubspotScript'
              : `hubspotScript-retry-${script.attempt}`
          }
          strategy={strategy}
          onLoad={() => {
            if (process.env.NODE_ENV === 'development') {
              console.log('Form script loaded')
            }
            // next/script hands later instances a promise that resolves even
            // when the script failed, so onLoad alone does not prove a load.
            settleScript(script.attempt, window.hbspt ? 'ready' : 'failed')
          }}
          onError={(e) => {
            console.error('Form script error:', e)
            settleScript(script.attempt, 'failed')
          }}
        />
      )}
    </div>
  )
}
