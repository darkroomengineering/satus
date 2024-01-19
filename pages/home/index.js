import { SplitText } from 'components/split-text'
import { colors } from 'config/variables'
import gsap from 'gsap'
import { Layout } from 'layouts/default'
import { useEffect, useState } from 'react'
import s from './home.module.scss'

export default function Home() {
  const [titleSplitted, setTitleSplitted] = useState()

  useEffect(() => {
    const words = titleSplitted?.words

    if (!words) return

    words.forEach((word) => {
      word.addEventListener(
        'mouseenter',
        () => {
          gsap.fromTo(
            word,
            {
              color: colors.green,
            },
            {
              color: colors.white,
              duration: 4,
              ease: 'expo.out',
            },
          )
        },
        false,
      )
    })
  }, [titleSplitted])

  return (
    <Layout theme="dark" className={s.home}>
      <section className={s.content}>
        <h1 className={s.title}>
          <SplitText
            ref={(node) => {
              if (node) setTitleSplitted(node)
            }}
            type="words"
          >
            Inceptum pulchrum, iterum incipiamus amici, Res novas aggrediamur,
            virtute superbi. Aurora nova luce, spes nobis enitescat, Sicut sol
            oriens, ex tenebris emergat. Ingenium nostrum flamma lucida flagret,
            Consilium firmum, studium nos agitet. Labor et laboris fructus nobis
            faveant, Perseverantia vincat, ita crescamus ameant. Principium est
            fundamentum, quod nobis est datum, Inceptum pulchrum, munus magnum,
            probatum. Manus ad aratrum, cor ad caelum dirigamus, Opus magnum
            faciamus, vitam renovemus. Spes in pectore, etiam si nox obscurat,
            Perseverando vincemus, quodcunque laborat. Inceptum pulchrum,
            studium nostrum lucidum, Fama et gloria nobis, sic sit perpetuum.
          </SplitText>
        </h1>
      </section>
    </Layout>
  )
}

export async function getStaticProps() {
  return {
    props: {
      id: 'home',
    }, // will be passed to the page component as props
  }
}
