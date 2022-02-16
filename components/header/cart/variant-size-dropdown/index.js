import cn from 'clsx'
import { useEffect, useState } from 'react'
import s from './variant-size-dropdown.module.scss'

export const SizesDropdown = ({
  product,
  variants = [],
  onChange = () => {},
}) => {
  const [currentValue, setCurrentValue] = useState(product.options)
  const [opened, setOpened] = useState(false)

  useEffect(() => {
    if (product.options.id !== currentValue.id) {
      onChange(product, currentValue)
    }
  }, [currentValue])

  useEffect(() => {
    const onClick = () => {
      setOpened(false)
    }
    window.addEventListener('click', onClick)

    return () => {
      window.removeEventListener('click', onClick)
    }
  }, [])

  useEffect(() => {
    setCurrentValue(product.options)
  }, [product])

  return (
    <div className={cn('p', s.dropdown, opened && s.opened)}>
      <button
        className={s.button}
        onClick={(e) => {
          e.stopPropagation()
          setOpened(!opened)
        }}
      >
        {currentValue.option}
        <DropdownArrow className="icon" />
      </button>
      {opened && (
        <div
          className={s.options}
          onWheel={(e) => {
            e.stopPropagation()
          }}
        >
          {variants.map((variant, key) => (
            <button
              key={key}
              onClick={(e) => {
                e.stopPropagation()
                setCurrentValue(variant.options)
                setOpened(false)
              }}
            >
              {variant.options.option}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const DropdownArrow = () => {
  return (
    <svg fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 5">
      <path d="M0 0h10L4.996 5" fill="#FFFDDF" />
    </svg>
  )
}
