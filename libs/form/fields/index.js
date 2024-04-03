import cn from 'clsx'
import { useCallback, useRef, useState } from 'react'
import { useFormContext } from '..'
import s from './fields.module.scss'

export const InputSelector = {
  inputType: function inputType({ props, className, idx }) {
    return <InputField {...props} idx={idx} key={idx} className={className} />
  },
  multipleOption: function multipleOption({ props, className, idx }) {
    return (
      <CheckboxesField {...props} idx={idx} key={idx} className={className} />
    )
  },
}

export function InputField({
  className,
  type,
  id,
  placeholder,
  required = true,
  idx,
}) {
  const { errors, isActive, register } = useFormContext()

  return (
    <div
      className={cn(
        s.field,
        s.single,
        isActive[idx] && s.active,
        errors[idx]?.state && s.error,
        className,
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

export function CheckboxesField({ className, options, idx }) {
  const { register } = useFormContext()
  const optionsRef = useRef(null)
  const [inputs, setInputs] = useState(JSON.stringify(['all']))

  const handleList = useCallback((value) => {
    let update = []
    const tmp = JSON.parse(optionsRef.current.value)

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
      {options.map(({ label, value }, idx) => (
        <button
          key={idx}
          className={cn(s.option, 'label', value === 'all' && s.selected)}
          type="button"
          onClick={({ target }) => {
            handleList(value)
            target.classList.toggle(s.selected)
          }}
        >
          <span>{label}</span>
        </button>
      ))}
    </div>
  )
}
