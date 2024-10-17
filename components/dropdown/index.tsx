'use client'

import cn from 'clsx'
import { useEffect, useState } from 'react'
import s from './dropdown.module.css'

type DropdownProps = {
  className?: string
  placeholder?: string
  defaultValue?: number
  options?: string[]
  onChange?: (value: number) => void
}

export function Dropdown({
  className,
  placeholder = 'Select Option',
  defaultValue,
  options = [],
  onChange,
}: DropdownProps) {
  const [isOpened, setIsOpened] = useState(false)
  const [selected, setSelected] = useState(defaultValue)

  useEffect(() => {
    function onClick() {
      setIsOpened(false)
    }

    window.addEventListener('click', onClick, false)

    return () => {
      window.removeEventListener('click', onClick, false)
    }
  }, [])

  return (
    <div
      className={cn(s.dropdown, isOpened && s.isOpened, className)}
      onClick={(e) => {
        e.stopPropagation()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          setIsOpened(false)
        }
      }}
    >
      <button
        type="button"
        className={s.trigger}
        onClick={() => {
          setIsOpened(!isOpened)
        }}
      >
        <span>
          {isOpened ? placeholder : selected ? options[selected] : placeholder}
        </span>
      </button>
      {isOpened && (
        <div className={s.options} aria-hidden={isOpened ? undefined : true}>
          {options.map((value, i) => (
            <button
              type="button"
              className={s.option}
              onClick={() => {
                setSelected(i)
                setIsOpened(false)
                onChange?.(i)
              }}
              key={`option-${value}`}
            >
              {value}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
