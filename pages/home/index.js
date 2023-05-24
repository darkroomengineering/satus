import { Layout } from 'layouts/default'
import s from './home.module.scss'

export default function Home() {
  return (
    <Layout theme="light">
      <section className={s.content}>
        <h1 className={s.title}>satus</h1>
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
