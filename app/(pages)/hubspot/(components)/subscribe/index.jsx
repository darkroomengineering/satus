'use client'

import cn from 'clsx'
import { Messages, SubmitButton, useFormContext } from '~/libs/form'

export const Subscribe = ({ idx = 0, form }) => {
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
          'sw-303 dt:sw-400 stext-14 dt:stext-16 dt:aspect-[330/60]',
          'border-2 border-black srounded-6 dt:srounded-8',
          'spx-19 spy-18 spr-136 dt:py-0 dt:spx-18 dt:spr-115'
        )}
        placeholder={form?.inputs[idx]?.placeHolder ?? 'email'}
        required
        {...register(idx)}
      />
      <SubmitButton
        className={cn(
          '!absolute -right-[5%] h-full',
          'border-2 border-black srounded-6 dt:srounded-8',
          'spx-18 dt:spx-24'
        )}
        defaultText={form?.submitButton?.text}
      />
      <Messages className="absolute -sbottom-20" />
    </div>
  )
}
