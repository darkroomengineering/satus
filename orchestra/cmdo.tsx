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
        <Dialog.Backdrop className="fixed inset-0 bg-secondary/20 backdrop-blur-[2px] transition-all duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 z-40" />
        <Dialog.Popup className="z-99999 fixed top-1/2 left-1/2 -translate-1/2 rounded-lg bg-primary p-6 pt-20 text-gray-900 outline outline-gray-200 transition-all duration-150 data-[ending-style]:scale-90 data-[ending-style]:opacity-0 data-[starting-style]:scale-90 data-[starting-style]:opacity-0 z-50">
          <div className="flex gap-4 rounded-lg [&_button]:size-full [&_button]:grid [&_button]:place-items-center">
            <OrchestraToggle
              id="grid"
              className="bg-contrast/10 grid place-items-center size-20 srounded-10"
            >
              🌐
            </OrchestraToggle>
            <OrchestraToggle
              id="studio"
              className="bg-contrast/10 grid place-items-center size-20 srounded-10"
            >
              ⚙️
            </OrchestraToggle>
            <OrchestraToggle
              id="stats"
              className="bg-contrast/10 grid place-items-center size-20 srounded-10"
            >
              📈
            </OrchestraToggle>
            <OrchestraToggle
              id="dev"
              className="bg-contrast/10 grid place-items-center size-20 srounded-10"
            >
              🚧
            </OrchestraToggle>
            <OrchestraToggle
              id="minimap"
              className="bg-contrast/10 grid place-items-center size-20 srounded-10"
            >
              🗺️
            </OrchestraToggle>
            <OrchestraToggle
              id="webgl"
              className="bg-contrast/10 grid place-items-center size-20 srounded-10"
              defaultValue={true}
            >
              🧊
            </OrchestraToggle>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
