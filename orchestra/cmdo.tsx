'use client'

import { Dialog } from '@base-ui-components/react/dialog'
import { useEffect, useState } from 'react'
import Orchestra from './orchestra'
import { OrchestraToggle } from './toggle'

export function Cmdo() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'o' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }

      // Toggle grid
      if (e.key === 'G' && e.shiftKey) {
        e.preventDefault()
        Orchestra.setState((state) => ({
          grid: !state.grid,
        }))
      }

      if (e.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal keepMounted>
        <div id="orchestra">
          <Dialog.Backdrop className="fixed inset-0 bg-secondary/20 backdrop-blur-[2px] transition-all duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 z-40" />
          <Dialog.Popup className="z-99999 fixed top-1/2 left-1/2 -translate-1/2 rounded-lg bg-primary text-gray-900 outline outline-gray-200 transition-all duration-150 data-[ending-style]:scale-90 data-[ending-style]:opacity-0 data-[starting-style]:scale-90 data-[starting-style]:opacity-0 rounded-[12px]">
            <div className="flex gap-4 rounded-lg [&_button]:size-full [&_button]:grid [&_button]:place-items-center p-[4px] gap-[4px]">
              <OrchestraToggle id="grid">🌐</OrchestraToggle>
              <OrchestraToggle id="studio">⚙️</OrchestraToggle>
              <OrchestraToggle id="stats">📈</OrchestraToggle>
              <OrchestraToggle id="dev">🚧</OrchestraToggle>
              <OrchestraToggle id="minimap">🗺️</OrchestraToggle>
              <OrchestraToggle id="webgl" defaultValue={true}>
                🧊
              </OrchestraToggle>
              <OrchestraToggle id="screenshot">📸</OrchestraToggle>
            </div>
          </Dialog.Popup>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
