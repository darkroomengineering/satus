'use client'

import cn from 'clsx'
import { Messages, SubmitButton, useFormContext } from '@/components/ui/form'
import type { HubSpotParsedForm } from '@/integrations/hubspot/fetch-form'

export const Subscribe = ({
  idx = 0,
  form,
  className,
}: {
  idx: number
  form: HubSpotParsedForm
  className?: string
}) => {
  const { errors, isActive, register } = useFormContext()

  const inputName = form?.inputs[idx]?.name || 'email'
  const inputType = form?.inputs[idx]?.type || 'email'
  const inputPlaceholder = form?.inputs[idx]?.placeholder || 'EMAIL'
  const submitText = form?.submitButton?.text || 'SUBMIT'

  return (
    <div
      className={cn(
        'dr-rounded-6 dt:dr-rounded-8 relative flex border-2 border-secondary',
        isActive[idx] && 'border-primary',
        errors[idx]?.state && 'border-contrast',
        className
      )}
    >
      <input
        type={inputType}
        id={inputName}
        name={inputName}
        autoComplete={inputType}
        aria-label={inputPlaceholder}
        aria-invalid={errors[idx]?.state ?? false}
        className="dr-px-19 dr-py-18 dr-text-14 dt:dr-px-18 dt:dr-py-15 dt:dr-text-16 grow bg-transparent outline-none placeholder:text-current/50"
        placeholder={inputPlaceholder}
        required
        {...register(idx)}
      />
      <SubmitButton
        className="dr-my-2 dr-mr-2 dr-rounded-4 dr-px-18 dt:dr-my-3 dt:dr-mr-3 dt:dr-rounded-6 dt:dr-px-24 shrink-0"
        defaultText={submitText}
      />
      <Messages className="dr-mt-8 absolute top-full left-0" />
    </div>
  )
}
