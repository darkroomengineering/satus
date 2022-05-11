import { useLayoutEffect } from '@studio-freight/hamo'
import { Parallax } from 'components/parallax'
import { Sticky } from 'components/sticky'
import { gsap } from 'gsap'
import { Layout } from 'layouts/default'
import { useRef } from 'react'
import s from './gsap.module.scss'

export default function Page() {
  const line1 = useRef()
  const line2 = useRef()
  const orange = useRef()
  const purpleContainer = useRef()
  const purple = useRef()

  // const squareContainer = useRef()
  // const square = useRef()

  useLayoutEffect(() => {
    // const parallaxTimeline = gsap.timeline({
    //   scrollTrigger: {
    //     id: 'parallax',
    //     trigger: squareContainer.current,
    //     scrub: true,
    //     start: 'top bottom',
    //     end: 'bottom top',
    //     onUpdate: (e) => {
    //       gsap.set(square.current, {
    //         y: -mapRange(0, 1, e.progress, -100, 100),
    //       })
    //     },
    //   },
    // })

    // --- RED PANEL ---
    const lineTimeline = gsap
      .timeline({
        scrollTrigger: {
          id: 'line',
          trigger: line1.current,
          scrub: true,
          start: 'top bottom',
          end: 'bottom top',
        },
      })
      .fromTo(
        line1.current,
        {
          scaleX: 0,
          transformOrigin: 'left center',
          ease: 'none',
        },
        {
          scaleX: 1,
        }
      )

    // // --- ORANGE PANEL ---
    // gsap.from(line2.current, {
    //   scrollTrigger: {
    //     trigger: orange.current,
    //     scrub: true,
    //     pin: true,
    //     start: 'top top',
    //     end: '+=100%',
    //   },
    //   scaleX: 0,
    //   transformOrigin: 'left center',
    //   ease: 'none',
    // })

    // --- PURPLE/GREEN PANEL ---
    // const purpleTimeline = gsap.timeline({
    //   scrollTrigger: {
    //     id: 'sticky',
    //     pinSpacer: purpleContainer.current, // specify pinSpacer to not change the html
    //     trigger: purple.current,
    //     scrub: true,
    //     pin: true,
    //     start: 'top top',
    //     end: '+=100%',
    //   },
    // })
    console.log('timeline')

    return () => {
      // parallaxTimeline.kill()
      lineTimeline.kill()
      // purpleTimeline.kill()
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
            <span className="line line-1" ref={line1}></span>This line's
            animation will begin when it enters the viewport and finish when its
            top edge hits the top of the viewport, staying perfectly in sync
            with the scrollbar because it has <code>scrub:&nbsp;true</code>
          </p>
        </section>

        <section className="panel orange" ref={orange}>
          <p>
            <span className="line line-2" ref={line2}></span>This orange panel
            gets pinned when its top edge hits the top of the viewport, then the
            line's animation is linked with the scroll position until it has
            traveled 100% of the viewport's height (<code>end: "+=100%"</code>),
            then the orange panel is unpinned and normal scrolling resumes.
            Padding is added automatically to push the rest of the content down
            so that it catches up with the scroll when it unpins.
          </p>
          <Parallax speed={1}>
            <div className="square"></div>
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
          <Sticky start="top top" end="+=200%">
            <div className="panel purple">
              <p>Sticky section</p>
            </div>
          </Sticky>
        </section>

        <section className="panel gray">DONE!</section>
      </div>
    </Layout>
  )
}
