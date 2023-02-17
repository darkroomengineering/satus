import { useProgress } from '@react-three/drei'
import { SheetProvider } from '@theatre/r3f'
import cn from 'clsx'
import dynamic from 'next/dynamic'
import { project } from 'pages/_app'
import { Suspense, useEffect, useRef } from 'react'
import s from './hero.module.scss'

const UseCanvas = dynamic(
  () => import('@14islands/r3f-scroll-rig').then(({ UseCanvas }) => UseCanvas),
  {
    ssr: false,
  }
)
const ScrollScene = dynamic(
  () =>
    import('@14islands/r3f-scroll-rig').then(({ ScrollScene }) => ScrollScene),
  {
    ssr: false,
  }
)
const Demo = dynamic(
  () => import('components/webgl').then(({ Demo }) => Demo),
  {
    ssr: false,
  }
)

// https://docs.pmnd.rs/

const sheet = project.sheet('WebGL')

export function Hero({ onLoad = () => {} }) {
  const ref = useRef()
  const { progress } = useProgress()

  useEffect(() => {
    if (progress === 100) {
      onLoad()
    }
  }, [progress])

  useEffect(() => {
    project.ready.then(() => {
      sheet.sequence.play({ iterationCount: Infinity })
    })
  }, [])

  return (
    <section className={cn(s.hero, 'theme-dark')}>
      <div className={s.hero__content} ref={ref}></div>

      <UseCanvas>
        <SheetProvider sheet={sheet}>
          <ScrollScene track={ref}>
            {(props) => (
              <Suspense>
                <Demo {...props} />
              </Suspense>
            )}
          </ScrollScene>
        </SheetProvider>
      </UseCanvas>
    </section>
  )
}
