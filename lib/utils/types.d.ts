// Type augmentations and module declarations

// React CSS custom properties support
import 'react'

declare module 'react' {
  interface CSSProperties {
    [key: `--${string}`]: string | number
  }
}

// SVGs are loaded as React components via @svgr/webpack (see next.config.ts)
declare module '*.svg' {
  import type { FC, SVGProps } from 'react'
  const content: FC<SVGProps<SVGSVGElement>>
  export default content
}

// Global window extensions
declare global {
  interface Window {
    hbspt?: {
      forms: {
        create: (options: {
          portalId?: string
          formId: string
          target: string
          submitButtonClass?: string
          errorMessageClass?: string
          cssClass?: string
          onFormReady?: () => void
          onFormSubmitted?: () => void
        }) => void
      }
    }
    THEATRE_PROJECT_ID?: string
  }
}
