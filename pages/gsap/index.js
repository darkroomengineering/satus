import { useLayoutEffect } from '@studio-freight/hamo'
import { Link } from 'components/link'
import { Parallax } from 'components/parallax'
import { Sticky } from 'components/sticky'
import { gsap } from 'gsap'
import { Layout } from 'layouts/default'
import { useRef } from 'react'
import s from './gsap.module.scss'

export default function Page() {
  const line = useRef()

  useLayoutEffect(() => {
    // --- RED PANEL ---
    const lineTimeline = gsap
      .timeline({
        scrollTrigger: {
          id: 'line',
          trigger: line.current,
          scrub: true,
          start: 'top bottom',
          end: 'bottom top',
        },
      })
      .fromTo(
        line.current,
        {
          scaleX: 0,
          transformOrigin: 'left center',
          ease: 'none',
        },
        {
          scaleX: 1,
        }
      )

    return () => {
      lineTimeline.kill()
    }
  }, [])

  return (
    <Layout className={s.page}>
      <div className="smooth-scroll">
        <div className="description panel blue">
          <div>
            <h1>Lenis + ScrollTrigger</h1>
            <p>
              Demonstrates how ScrollTrigger can be used with a smooth scrolling
              library like Lenis, including scrubbing and pinning.
            </p>
            <div className="scroll-down">
              Scroll down<div className="arrow"></div>
            </div>
          </div>
        </div>

        <section className="panel red">
          <p>
            <span className="line line-1" ref={line}></span>This line's
            animation will begin when it enters the viewport and finish when its
            top edge hits the top of the viewport, staying perfectly in sync
            with the scrollbar because it has <code>scrub:&nbsp;true</code>
          </p>
        </section>

        <section className="panel orange">
          <Parallax speed={1}>
            <div className="square">parallax</div>
          </Parallax>
        </section>

        {/* <section ref={purpleContainer}>
          <div className="panel purple" ref={purple}>
            <p>
              <span className="line line-3"></span>This panel gets pinned in a
              similar way, and has a more involved animation that's wrapped in a
              timeline, fading the background color and animating the transforms
              of the paragraph in addition to the line, all synced with the
              scroll position perfectly.
            </p>
          </div>
        </section> */}

        <section>
          <Sticky
            start="0"
            end="0"
            wrapperClass={s.sticky}
            className="panel purple"
          >
            <p>Sticky section</p>
          </Sticky>
        </section>

        <section className="panel gray">DONE!</section>
      </div>
      <Link href={'/#kinesis'}>scroll to kinesis</Link>
    </Layout>
  )
}
