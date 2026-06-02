import type { Metadata } from 'next'
import { Wrapper } from '@/components/layout/wrapper'
import { TheatreProjectProvider } from '@/dev/theatre'
import { Box } from './_components/box'
import s from './r3f.module.css'

export const metadata: Metadata = {
  title: 'WebGL + R3F — Satūs',
  description:
    'React Three Fiber and Theatre.js demo: a scroll-driven 3D animation sequence showcasing WebGL integration in a Next.js App Router page.',
}

export default function R3FPage() {
  return (
    <TheatreProjectProvider id="Satus-R3f" config="/config/Satus-R3f.json">
      <Wrapper theme="red" className="font-mono uppercase" webgl>
        <div className={s.scene}>
          <div className={s.intro}>
            <div className={s.label}>Live Demo</div>
            <h1 className={s.title}>WebGL + R3F</h1>
            <p className={s.description}>
              React Three Fiber with Theatre.js animation.
              <br />
              Scroll to drive the sequence.
            </p>
            <div className={s.scrollHint} aria-hidden="true">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M12 5v14M19 12l-7 7-7-7" />
              </svg>
              <span>Scroll</span>
            </div>
          </div>
          <div className="grid min-h-[300vh] place-items-center">
            <div className="h-[50vh]" />
            <Box className="size-[250px]" />
            <div className="h-[50vh]" />
          </div>
        </div>
      </Wrapper>
    </TheatreProjectProvider>
  )
}
