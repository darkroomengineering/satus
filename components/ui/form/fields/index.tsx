import cn from 'clsx'
import { useCallback, useRef, useState } from 'react'
import { useFormContext } from '..'
import s from './fields.module.css'

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
    return <InputField {...props} idx={idx} key={idx} className={className} />
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
      <CheckboxesField {...props} idx={idx} key={idx} className={className} />
    )
  },
}

type InputFieldProps = {
  className?: string
  type: string
  id: string
  placeholder?: string
  required?: boolean
  idx: number
}

export function InputField({
  className,
  type,
  id,
  placeholder,
  required = true,
  idx,
}: InputFieldProps) {
  const { errors, isActive, register } = useFormContext()

  return (
    <div
      className={cn(
        s.field,
        s.single,
        isActive[idx] && s.active,
        errors[idx]?.state && s.error,
        className
      )}
    >
      <input
        type={type}
        id={id}
        name={id}
        required={required}
        placeholder={placeholder}
        className="label"
        {...register(idx)}
      />
    </div>
  )
}

type CheckboxesFieldProps = {
  className?: string
  options: CheckboxesFieldOption[]
  idx: number
}

type CheckboxesFieldOption = {
  label: string
  value: string
}

export function CheckboxesField({
  className,
  options,
  idx,
}: CheckboxesFieldProps) {
  const { register } = useFormContext()
  const optionsRef = useRef<HTMLInputElement | null>(null)
  const [inputs, setInputs] = useState(JSON.stringify(['all']))

  const handleList = useCallback((value: string) => {
    if (!optionsRef.current) return
    let update = ''
    const tmp = JSON.parse(optionsRef.current.value) as string[]

    if (tmp.includes(value)) {
      const rm = tmp.filter((item) => item !== value)
      update = JSON.stringify([...rm])
    } else {
      update = JSON.stringify([...tmp, value])
    }

    optionsRef.current.value = update
    setInputs(update)
  }, [])

  return (
    <div className={cn(s.field, s.multiple, className)}>
      <p className={cn('label', s.header)}>select topics of interest</p>
      <input
        type="hidden"
        name="interests"
        id="hidden"
        value={inputs}
        {...register(idx)}
        ref={(node) => {
          register(idx).ref(node)
          optionsRef.current = node
        }}
      />
      {options.map(({ label, value }) => (
        <button
          key={value}
          className={cn(s.option, 'label', value === 'all' && s.selected)}
          type="button"
          onClick={({ currentTarget }) => {
            handleList(value)
            currentTarget.classList.toggle(s.selected)
          }}
        >
          <span>{label}</span>
        </button>
      ))}
    </div>
  )
}
