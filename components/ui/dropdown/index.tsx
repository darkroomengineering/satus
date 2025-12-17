'use client'

import cn from 'clsx'
import { Activity, useEffect, useState } from 'react'
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
    <div className={cn(s.dropdown, isOpened && s.isOpened, className)}>
      <button
        type="button"
        className={s.trigger}
        onClick={(e) => {
          e.stopPropagation()
          setIsOpened(!isOpened)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setIsOpened(false)
          }
        }}
      >
        <span>{selected && !isOpened ? options[selected] : placeholder}</span>
      </button>
      {/* Activity pre-renders options for instant first open */}
      <Activity mode={isOpened ? 'visible' : 'hidden'}>
        <div
          className={s.options}
          aria-hidden={!isOpened}
          onClick={(e) => e.stopPropagation()}
        >
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
      </Activity>
    </div>
  )
}
