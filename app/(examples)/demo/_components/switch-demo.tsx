'use client'

import { useState } from 'react'
import { Switch } from '@/components/ui/switch'

export function SwitchDemo() {
  const [notifications, setNotifications] = useState(false)
  const [darkMode, setDarkMode] = useState(true)
  const [autoSave, setAutoSave] = useState(true)

  return (
    <div className="flex flex-col gap-4">
      <Switch
        label="Enable notifications"
        checked={notifications}
        onCheckedChange={setNotifications}
      />
      <Switch
        label="Dark mode"
        checked={darkMode}
        onCheckedChange={setDarkMode}
      />
      <Switch
        label="Auto-save"
        checked={autoSave}
        onCheckedChange={setAutoSave}
      />
      <Switch label="Disabled option" disabled />
    </div>
  )
}
