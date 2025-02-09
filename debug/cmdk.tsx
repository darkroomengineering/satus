'use client'

import dynamic from 'next/dynamic'
import { type ReactNode, useEffect, useState } from 'react'

const OrchestraToggle = dynamic(
  () => import('./react').then((mod) => mod.OrchestraToggle),
  { ssr: false }
)

export function Cmdk() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }

      console.log(e.key)

      if (e.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="flex flex-col gap-4 bg-contrast p-4 rounded-lg">
        <OrchestraToggle id="studio" className="">
          Studio
        </OrchestraToggle>
        <OrchestraToggle id="stats" className="">
          Stats
        </OrchestraToggle>
        <OrchestraToggle id="grid" className="">
          Grid
        </OrchestraToggle>
        <OrchestraToggle id="dev" className="">
          Dev
        </OrchestraToggle>
        <OrchestraToggle id="minimap" className="">
          Minimap
        </OrchestraToggle>
        <OrchestraToggle id="webgl" className="">
          WebGL
        </OrchestraToggle>
      </div>
    </div>
  )
}

type CmdkToggleProps = {
  shortcut: {
    displayName: string
    keys: string[]
  }
  children?: ReactNode
}

function CmdkToggle({ shortcut, children }: CmdkToggleProps) {
  useEffect(() => {}, [])

  return (
    <li className="flex items-center gap-2">
      {children}
      <span className="text-sm text-muted-foreground">
        {shortcut.displayName}
      </span>
    </li>
  )
}
