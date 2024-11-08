'use client'
import OrchestraPage from 'app/debug/orchestra/page'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import s from './cmdk.module.scss'

export const CMDKDebug = () => {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function handleKeyDown(e) {
      if (
        ((navigator?.platform?.toLowerCase().includes('mac')
          ? e.metaKey
          : e.ctrlKey) &&
          e.key === 'k') ||
        (open && e.key === 'Escape')
      ) {
        e.preventDefault()
        e.stopPropagation()

        setOpen((currentValue) => {
          return !currentValue
        })
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div className={s.cmdkContainer}>
      <div className={s.overlay} />
      <OrchestraPage />
    </div>,
    document.body,
  )
}
