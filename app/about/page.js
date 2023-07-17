import { Layout } from 'layouts/default'
import s from './about.module.scss'

export const metadata = {
  title: 'About Title',
  description: 'About Description',
}

export default function About() {
  return (
    <Layout>
      <section className={s.content}>
        <h1 className={s.title}>ABOUT</h1>
      </section>
    </Layout>
  )
}
