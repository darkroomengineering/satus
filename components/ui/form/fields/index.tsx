'use client'

import { Field } from '@base-ui/react/field'
import cn from 'clsx'
import { useState } from 'react'
import { useFormContext } from '..'
import s from './fields.module.css'

/**
 * Form field components built on Base UI Field for accessibility.
 *
 * @example
 * ```tsx
 * <Form action={myAction}>
 *   <InputField
 *     id="email"
 *     type="email"
 *     label="Email address"
 *     placeholder="you@example.com"
 *     required
 *   />
 *   <TextareaField
 *     id="message"
 *     label="Message"
 *     rows={4}
 *   />
 *   <SubmitButton>Send</SubmitButton>
 * </Form>
 * ```
 */

type InputFieldProps = {
  className?: string
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search'
  id: string
  name?: string
  label?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  idx: number
}

export function InputField({
  className,
  type = 'text',
  id,
  name,
  label,
  placeholder,
  required = false,
  disabled = false,
  idx,
}: InputFieldProps) {
  const { errors, isActive, register } = useFormContext()
  const error = errors[idx]

  return (
    <Field.Root
      className={cn(
        s.field,
        isActive[idx] && s.active,
        error?.state && s.error,
        className
      )}
      disabled={disabled}
    >
      {label && (
        <Field.Label {...(s.label && { className: s.label })}>
          {label}
          {required && <span aria-hidden="true"> *</span>}
        </Field.Label>
      )}
      <Field.Control
        type={type}
        id={id}
        name={name ?? id}
        required={required}
        placeholder={placeholder}
        {...(s.input && { className: s.input })}
        {...register(idx)}
        render={<input />}
      />
      {error?.state && error.message && (
        <Field.Error {...(s.errorMessage && { className: s.errorMessage })}>
          {error.message}
        </Field.Error>
      )}
    </Field.Root>
  )
}

type TextareaFieldProps = {
  className?: string
  id: string
  name?: string
  label?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  rows?: number
  idx: number
}

export function TextareaField({
  className,
  id,
  name,
  label,
  placeholder,
  required = false,
  disabled = false,
  rows = 4,
  idx,
}: TextareaFieldProps) {
  const { errors, isActive, register } = useFormContext()
  const error = errors[idx]
  const reg = register(idx)

  return (
    <Field.Root
      className={cn(
        s.field,
        isActive[idx] && s.active,
        error?.state && s.error,
        className
      )}
      disabled={disabled}
    >
      {label && (
        <Field.Label {...(s.label && { className: s.label })}>
          {label}
          {required && <span aria-hidden="true"> *</span>}
        </Field.Label>
      )}
      <textarea
        id={id}
        name={name ?? id}
        required={required}
        placeholder={placeholder}
        rows={rows}
        className={s.textarea}
        ref={reg.ref}
        onChange={reg.onChange}
        onBlur={reg.onBlur}
      />
      {error?.state && error.message && (
        <Field.Error {...(s.errorMessage && { className: s.errorMessage })}>
          {error.message}
        </Field.Error>
      )}
    </Field.Root>
  )
}

type CheckboxesFieldProps = {
  className?: string
  options: { label: string; value: string }[]
  idx: number
  name?: string
  label?: string
}

export function CheckboxesField({
  className,
  options,
  idx,
  name = 'interests',
  label = 'Select topics of interest',
}: CheckboxesFieldProps) {
  const { register } = useFormContext()
  const [selected, setSelected] = useState<string[]>(['all'])

  const handleToggle = (value: string) => {
    setSelected((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    )
  }

  const reg = register(idx)

  return (
    <Field.Root
      {...(cn(s.field, s.checkboxGroup, className) && {
        className: cn(s.field, s.checkboxGroup, className),
      })}
    >
      {label && (
        <Field.Label {...(s.groupLabel && { className: s.groupLabel })}>
          {label}
        </Field.Label>
      )}
      <input
        type="hidden"
        name={name}
        id="hidden"
        value={JSON.stringify(selected)}
        ref={reg.ref}
      />
      <div className={s.options}>
        {options.map(({ label, value }) => (
          <button
            key={value}
            className={cn(s.option, selected.includes(value) && s.selected)}
            type="button"
            onClick={() => handleToggle(value)}
          >
            <span>{label}</span>
          </button>
        ))}
      </div>
    </Field.Root>
  )
}

// For backward compatibility
export const InputSelector = {
  inputType: ({
    props,
    className,
    idx,
  }: {
    props: Omit<InputFieldProps, 'className' | 'idx'>
    className?: string
    idx: number
  }) => {
    return (
      <InputField {...props} idx={idx} key={idx} className={className ?? ''} />
    )
  },
  multipleOption: ({
    props,
    className,
    idx,
  }: {
    props: Omit<CheckboxesFieldProps, 'className' | 'idx'>
    className?: string
    idx: number
  }) => {
    return (
      <CheckboxesField
        {...props}
        idx={idx}
        key={idx}
        className={className ?? ''}
      />
    )
  },
}
