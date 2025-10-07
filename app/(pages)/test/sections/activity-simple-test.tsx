'use client'

import { Activity, useState } from 'react'

export function ActivitySimpleTest() {
  const [isVisible, setIsVisible] = useState(true)

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => setIsVisible(!isVisible)}
        className="px-4 py-2 bg-contrast text-primary rounded"
      >
        Toggle Activity: {isVisible ? 'Visible' : 'Hidden'}
      </button>

      <div className="p-6 border border-secondary/20 rounded">
        <Activity mode={isVisible ? 'visible' : 'hidden'}>
          <div className="space-y-2">
            <h4 className="font-bold">Activity Test Content</h4>
            <p className="text-sm">
              This content is wrapped in Activity mode="
              {isVisible ? 'visible' : 'hidden'}"
            </p>
            <div className="text-xs opacity-50">
              If you see this, Activity is working!
            </div>
          </div>
        </Activity>
      </div>
    </div>
  )
}
