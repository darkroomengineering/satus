'use client'

import cn from 'clsx'
import { Messages, SubmitButton, useFormContext } from 'libs/form'
import s from './subscribe.module.scss'

export const Subscribe = ({ idx = 0, form }) => {
  const { errors, isActive, register } = useFormContext()

  return (
    <div
      className={cn(
        s.fields,
        isActive[idx] && s.active,
        errors[idx]?.state && s.error,
      )}
    >
      <input
        type={form?.inputs[idx]?.type}
        id={form?.inputs[idx]?.name}
        name={form?.inputs[idx]?.name}
        className={cn(s.input, 'h4')}
        placeholder={form?.inputs[idx]?.placeHolder ?? 'email'}
        required
        {...register(idx)}
      />
      <SubmitButton
        className={s.submit}
        defaultText={form?.submitButton?.text}
      />
      <Messages className={s.messages} />
    </div>
  )
}
