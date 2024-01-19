import { Layout } from 'layouts/default'
import s from './home.module.scss'

import { SplitText } from './split-text'

export const metadata = {
  title: 'Home Title',
  description: 'Home Description',
}

export default function Home() {
  return (
    <Layout theme="dark" className={s.home}>
      <section className={s.content}>
        <h1 className={s.title}>
          <SplitText>
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
