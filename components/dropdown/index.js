'use client'

import cn from 'clsx'
import PropTypes from 'prop-types'
import { useEffect, useState } from 'react'
import s from './dropdown.module.scss'

export function Dropdown({
  className,
  placeholder = 'Select Option',
  defaultValue,
  options = [],
  onChange,
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
      {isOpened && (
        <div className={s.options} aria-hidden={isOpened ? undefined : true}>
          {options.map((value, i) => (
            <button
              className={s.option}
              onClick={() => {
                setSelected(i)
                setIsOpened(false)
                onChange?.(i)
              }}
              key={i}
            >
              {value}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

Dropdown.propTypes = {
  placeholder: PropTypes.string,
  defaultValue: PropTypes.string,
  options: PropTypes.array,
  onChange: PropTypes.func,
}

Dropdown.defaultProps = {
  placeholder: 'Select Option',
  defaultValue: null,
  options: [],
  onChange: null,
}
