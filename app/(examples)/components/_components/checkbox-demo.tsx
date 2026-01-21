'use client'

import { useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'

export function CheckboxDemo() {
  const [terms, setTerms] = useState(false)
  const [marketing, setMarketing] = useState(true)
  const [updates, setUpdates] = useState(false)

  return (
    <div className="flex flex-wrap gap-x-8 gap-y-3">
      <Checkbox label="Terms" checked={terms} onCheckedChange={setTerms} />
      <Checkbox
        label="Marketing"
        checked={marketing}
        onCheckedChange={setMarketing}
      />
      <Checkbox
        label="Updates"
        checked={updates}
        onCheckedChange={setUpdates}
      />
      <Checkbox label="Disabled" disabled />
    </div>
  )
}
