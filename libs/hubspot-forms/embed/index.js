'use client'

import cn from 'clsx'
import Script from 'next/script'
import s from './form.module.scss'

export function EmbedHubspotForm({
  strategy = 'afterInteractive',
  formId,
  target = 'hubspot-form-wrapper',
  className,
}) {
  return (
    <div id={target} className={cn(s['hubspot-form'], className)}>
      <Script
        src="https://js.hsforms.net/forms/v2.js"
        id="hubspotScript"
        strategy={strategy}
        onLoad={() => {
          console.log('Form script loaded')
          window.hbspt.forms.create({
            portalId: process.env.NEXT_PUBLIC_HUSBPOT_PORTAL_ID,
            formId,
            target: '#' + target,
            submitButtonClass: s.submit,
            errorMessageClass: s.error,
            cssClass: s['custom-form'],
          })
        }}
        onError={(e) => {
          console.error('Form script error:', e)
        }}
      />
    </div>
  )
}
