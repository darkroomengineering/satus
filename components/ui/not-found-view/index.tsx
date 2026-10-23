import type { ReactNode } from 'react'

import s from './not-found-view.module.css'

interface NotFoundViewProps {
  /**
   * Replaces the default "Go Home" anchor. Pass `Link` (`@/components/ui/link`)
   * inside the router; the default raw `<a>` is required in app/not-found.tsx,
   * which renders under the bare root layout.
   */
  homeLink?: ReactNode
  /** Router-aware links when available; raw anchors keep the root variant safe. */
  recoveryLinks?: ReactNode
}

const DEFAULT_HOME_LINK = (
  // oxlint-disable-next-line react/forbid-elements, nextjs/no-html-link-for-pages -- root not-found renders under the bare root layout, outside the (site) group's router context, so the Link component cannot be used here
  <a href="/" className={s.cta}>
    Go Home
  </a>
)

const DEFAULT_RECOVERY_LINKS = (
  <>
    {/* oxlint-disable-next-line react/forbid-elements, nextjs/no-html-link-for-pages -- the root not-found variant cannot use the client Link component */}
    <a key="ai" href="/ai">
      Agent index
    </a>
    {' · '}
    {/* oxlint-disable-next-line react/forbid-elements, nextjs/no-html-link-for-pages -- machine-readable static endpoint */}
    <a key="llms" href="/llms.txt">
      llms.txt
    </a>
    {' · '}
    {/* oxlint-disable-next-line react/forbid-elements, nextjs/no-html-link-for-pages -- machine-readable static endpoint */}
    <a key="sitemap" href="/sitemap.xml">
      Sitemap
    </a>
  </>
)

/**
 * 404 view shared by app/(site)/not-found.tsx and app/not-found.tsx. No hooks
 * or providers, so it stays server-renderable and works under the bare root
 * layout, which has none of Wrapper's Lenis/Theme/Header/Footer/Canvas.
 */
export function NotFoundView({
  homeLink = DEFAULT_HOME_LINK,
  recoveryLinks = DEFAULT_RECOVERY_LINKS,
}: NotFoundViewProps) {
  return (
    <section className={s.section}>
      <div className={s.panel}>
        <div className={s.label}>Error</div>
        <h1 className={s.code}>404</h1>
        <p className={s.message}>Page not found</p>
        <p className={s.description}>
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
          <br />
          Try {recoveryLinks}.
        </p>
        {homeLink}
      </div>
    </section>
  )
}
