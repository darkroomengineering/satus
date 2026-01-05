'use client'

import { useState } from 'react'
import { Checkbox } from '~/components/ui/checkbox'

export function CheckboxDemo() {
  const [terms, setTerms] = useState(false)
  const [marketing, setMarketing] = useState(true)
  const [updates, setUpdates] = useState(false)

  return (
    <div className="flex flex-col gap-4">
      <Checkbox
        label="I agree to the terms and conditions"
        checked={terms}
        onCheckedChange={setTerms}
      />
      <Checkbox
        label="Send me marketing emails"
        checked={marketing}
        onCheckedChange={setMarketing}
      />
      <Checkbox
        label="Notify me about updates"
        checked={updates}
        onCheckedChange={setUpdates}
      />
      <Checkbox label="Disabled checkbox" disabled />
    </div>
  )
}
