'use client'

import { useState } from 'react'
import { Select } from '@/components/ui/select'

const fruits = [
  { value: 'apple', label: '🍎 Apple' },
  { value: 'banana', label: '🍌 Banana' },
  { value: 'orange', label: '🍊 Orange' },
  { value: 'grape', label: '🍇 Grape' },
  { value: 'strawberry', label: '🍓 Strawberry' },
]

export function SelectDemo() {
  const [value, setValue] = useState<string>()

  return (
    <div className="flex flex-col gap-4">
      <Select
        options={fruits}
        value={value ?? ''}
        onValueChange={setValue}
        placeholder="Choose a fruit..."
      />
      {value && <p className="text-sm opacity-70">Selected: {value}</p>}
    </div>
  )
}
