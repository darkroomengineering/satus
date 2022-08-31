import { Link } from 'components/link'
import { Layout } from 'layouts/default'
import s from './contact.module.scss'

export default function Contact() {
  return (
    <Layout theme="dark">
      <section className={s.hero}>
        <Link href="/#kinesis">kinesis</Link>
      </section>
    </Layout>
  )
}

export async function getStaticProps() {
  return {
    props: {
      id: 'contact',
    }, // will be passed to the page component as props
  }
}
