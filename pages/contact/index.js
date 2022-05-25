import { Layout } from 'layouts/default'
import s from './contact.module.scss'

export default function Contact() {
  return (
    <Layout theme="dark">
      <section data-scroll-section className={s.hero}></section>
    </Layout>
  )
}
