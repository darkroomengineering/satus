'use client'

import { Field } from '@base-ui/react/field'
import cn from 'clsx'
import { useId, useState } from 'react'

import { Checkbox } from '@/components/ui/checkbox'

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
}: InputFieldProps) {
  const { state, actions } = useFormContext()
  const { errors, isActive } = state
  const { register } = actions
  // Use name (or id as fallback) as the registration key — matches the input's name attribute
  const fieldName = name ?? id
  const error = errors[fieldName]

  return (
    <Field.Root
      className={cn(
        s.field,
        isActive[fieldName] && s.active,
        error?.state && s.error,
        className
      )}
      disabled={disabled}
    >
      {label && (
        <Field.Label htmlFor={id} className={cn(s.label)}>
          {label}
          {required && <span aria-hidden="true"> *</span>}
        </Field.Label>
      )}
      <Field.Control
        type={type}
        id={id}
        name={fieldName}
        required={required}
        placeholder={placeholder}
        className={cn(s.input)}
        // `label` is optional, and without it no <Field.Label> is rendered, so
        // the control would otherwise reach screen readers with no accessible
        // name. Fall back to the placeholder, then to the field name, so there
        // is always one. Deliberately NOT set when a visible label exists:
        // aria-label would override it, and the announced name could then
        // drift from the text on screen. Spread rather than passing
        // `undefined`, which `exactOptionalPropertyTypes` rejects.
        //
        {...(label ? {} : { 'aria-label': placeholder ?? fieldName })}
        {...register(fieldName)}
        // The finding lands on this inner element. Base UI merges id, name and
        // the aria-label above onto it at runtime, so a static read of this
        // line sees an unlabelled input that never reaches the DOM.
        // react-doctor-disable-next-line react-doctor/control-has-associated-label
        render={<input />}
      />
      {error?.state && error.message && (
        <Field.Error className={cn(s.errorMessage)}>
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
}: TextareaFieldProps) {
  const { state, actions } = useFormContext()
  const { errors, isActive } = state
  const { register } = actions
  const fieldName = name ?? id
  const error = errors[fieldName]
  const reg = register(fieldName)

  return (
    <Field.Root
      className={cn(
        s.field,
        isActive[fieldName] && s.active,
        error?.state && s.error,
        className
      )}
      disabled={disabled}
    >
      {label && (
        <Field.Label htmlFor={id} className={cn(s.label)}>
          {label}
          {required && <span aria-hidden="true"> *</span>}
        </Field.Label>
      )}
      <Field.Control
        id={id}
        name={fieldName}
        required={required}
        placeholder={placeholder}
        className={s.textarea}
        // Same as InputField: no `label` means no <Field.Label>, so fall back
        // to the placeholder and then the field name.
        {...(label ? {} : { 'aria-label': placeholder ?? fieldName })}
        {...reg}
        // Same as InputField: Base UI merges the real attributes onto this
        // element at runtime.
        // react-doctor-disable-next-line react-doctor/control-has-associated-label
        render={<textarea rows={rows} />}
      />
      {error?.state && error.message && (
        <Field.Error className={cn(s.errorMessage)}>
          {error.message}
        </Field.Error>
      )}
    </Field.Root>
  )
}

type CheckboxesFieldProps = {
  className?: string
  options: { label: string; value: string }[]
  name?: string
  label?: string
}

export function CheckboxesField({
  className,
  options,
  name = 'interests',
  label = 'Select topics of interest',
}: CheckboxesFieldProps) {
  const { actions } = useFormContext()
  const { register } = actions
  const [selected, setSelected] = useState<string[]>([])
  const hiddenInputId = useId()

  const handleToggle = (value: string) => {
    setSelected((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    )
  }

  const reg = register(name)

  return (
    <Field.Root className={cn(s.field, s.checkboxGroup, className)}>
      {label && <Field.Label className={cn(s.groupLabel)}>{label}</Field.Label>}
      <input
        type="hidden"
        name={name}
        id={hiddenInputId}
        value={JSON.stringify(selected)}
        // Spread rather than picking `ref` off: only `ref` is live here (the
        // value is React-state-driven and a hidden input never fires change
        // or blur), but naming `reg.ref` in JSX reads as a render-time ref
        // access to the React Compiler lint and fails the build. The unused
        // handlers are inert.
        {...reg}
      />
      <div className={s.options}>
        {options.map(({ label: optionLabel, value }) => (
          <label
            key={value}
            className={cn(s.option, selected.includes(value) && s.selected)}
          >
            <Checkbox.Root
              checked={selected.includes(value)}
              onCheckedChange={() => handleToggle(value)}
            >
              <Checkbox.Indicator />
            </Checkbox.Root>
            <span>{optionLabel}</span>
          </label>
        ))}
      </div>
    </Field.Root>
  )
}
