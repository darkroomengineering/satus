import type { ReactNode } from 'react'

import s from './not-found-view.module.css'

interface NotFoundViewProps {
  /**
   * Element rendered in place of the default "Go Home" anchor. Pass the
   * project's `Link` (from '@/components/ui/link') when rendering inside the
   * router (e.g. app/(site)/not-found.tsx). Defaults to a raw `<a>`, which is
   * required in app/not-found.tsx since it renders under the bare root
   * layout, outside the (site) group's providers.
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
 * Shared 404 view used by both app/(site)/not-found.tsx and app/not-found.tsx.
 *
 * Uses no hooks and no app providers, so it stays server-renderable and is
 * safe to render both inside the (site) group (wrapped in Wrapper there) and
 * under the bare root layout, which has none of Wrapper's Lenis/Theme/Header/
 * Footer/Canvas machinery available.
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
