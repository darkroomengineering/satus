'use client'

import cn from 'clsx'
import { Messages, SubmitButton, useFormContext } from '~/components/form'
import type { HubSpotParsedForm } from '~/integrations/hubspot/fetch-form'

export const Subscribe = ({
  idx = 0,
  form,
}: {
  idx: number
  form: HubSpotParsedForm
}) => {
  const { errors, isActive, register } = useFormContext()

  return (
    <div
      className={cn(
        'flex relative',
        isActive[idx] && '',
        errors[idx]?.state && ''
      )}
    >
      <input
        type={form?.inputs[idx]?.type}
        id={form?.inputs[idx]?.name}
        name={form?.inputs[idx]?.name}
        className={cn(
          'dr-w-303 dt:dr-w-400 dr-text-14 dt:dr-text-16 dt:aspect-[330/60]',
          'border-2 border-black dr-rounded-6 dt:dr-rounded-8',
          'dr-px-19 dr-py-18 dr-pr-136 dt:py-0 dt:dr-px-18 dt:dr-pr-115'
        )}
        placeholder={form?.inputs[idx]?.placeholder ?? 'email'}
        required
        {...register(idx)}
      />
      <SubmitButton
        className={cn(
          '!absolute -right-[5%] h-full',
          'border-2 border-black dr-rounded-6 dt:dr-rounded-8',
          'dr-px-18 dt:dr-px-24'
        )}
        defaultText={form?.submitButton?.text}
      />
      <Messages className="absolute -sbottom-20" />
    </div>
  )
}
