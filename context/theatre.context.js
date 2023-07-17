'use client'

import { ProjectProvider, RafDriverProvider } from 'libs/theatre'

export function TheatreProvider({ children }) {
  return (
    <ProjectProvider id="Satus" config="/config/Satus-2023-04-17T12_55_21.json">
      <RafDriverProvider id="default">{children}</RafDriverProvider>
    </ProjectProvider>
  )
}
