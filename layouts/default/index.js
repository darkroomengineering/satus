// import { Scroll } from 'components/scroll'
import { Footer } from 'components/footer'
import s from './layout.module.scss'
import dynamic from 'next/dynamic'
import { useMemo } from 'react'

const Scroll = dynamic(
  () => import('components/scroll').then((mod) => mod.Scroll),
  {
    ssr: false,
  }
)

export function Layout({ children }) {
  const content = useMemo(() => {
    return (
      <>
        <main className={s.main}>{children}</main>
        <Footer />
      </>
    )
  }, [children])

  return (
    <>{typeof window !== 'undefined' ? <Scroll>{content}</Scroll> : content}</>
  )
}
