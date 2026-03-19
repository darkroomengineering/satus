import {
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from 'react-router'

// TODO Phase 2: import styles
// import '@/styles/css/index.css'

// TODO Phase 4: import providers
// import { RealViewport } from '@/components/real-viewport'
// import { TransformProvider } from '@/hooks/use-transform'

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

export default function App() {
  // TODO Phase 4: wrap with RealViewport + TransformProvider
  return <Outlet />
}

export function ErrorBoundary() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'monospace',
        flexDirection: 'column',
        gap: '1rem',
      }}
    >
      <h1>Something went wrong</h1>
      <Link to="/">Go Home</Link>
    </div>
  )
}
