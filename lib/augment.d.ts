import 'react'

declare module 'react' {
  interface CSSProperties {
    [key: `--${string}`]: string | number
  }
}

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
