'use client'

import cn from 'clsx'
import { useEffect, useState } from 'react'
import s from './dropdown.module.scss'

export function Dropdown({
  className,
  placeholder = 'Content Type',
  defaultValue,
  options = [],
  onClick = () => {},
}) {
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
    >
      <button
        className={s.trigger}
        onClick={() => {
          setIsOpened(!isOpened)
        }}
      >
        <span>{isOpened ? placeholder : options[selected] || placeholder}</span>
      </button>
      <ul className={s.options} aria-hidden={isOpened ? undefined : true}>
        {options.map((value, i) => (
          <button
            className={s.option}
            onClick={() => {
              setSelected(i)
              setIsOpened(false)
              onClick?.(value)
            }}
            key={i}
          >
            {value}
          </button>
        ))}
      </ul>
    </div>
  )
}
