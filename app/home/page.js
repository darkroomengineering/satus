import { Layout } from 'layouts/default'
import s from './home.module.scss'

export const metadata = {
  title: 'Home Title',
  description: 'Home Description',
}

export default function Home() {
  return (
    <Layout>
      <section className={s.content}>
        <h1 className={s.title}>Home</h1>
      </section>
    </Layout>
  )
}
