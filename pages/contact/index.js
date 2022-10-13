import cn from 'clsx'
import { FixedSlides } from 'components/fixed-slides'
import { Link } from 'components/link'
import { Layout } from 'layouts/default'
import s from './contact.module.scss'

export default function Contact({ fixedSlides }) {
  return (
    <Layout theme="dark">
      <section className={s.hero}>
        <Link href="/#kinesis">kinesis</Link>
      </section>
      <section>
        <FixedSlides length={fixedSlides.items.length}>
          {fixedSlides.items.map((item, key) => (
            <Slide key={`slide-${key}`} {...{ item, id: key }} />
          ))}
        </FixedSlides>
      </section>
    </Layout>
  )
}

function Slide({ item, index, id }) {
  return (
    <div className={cn(s.content, id === index && s.show)}>
      <h4 className={cn('h4', s.title)}>{item.title}</h4>
      <p className={cn('p', s.text)}>{item.text}</p>
    </div>
  )
}

export async function getStaticProps() {
  const fixedSlides = {
    items: [
      {
        title: 'fixed slide title 1',
        text: 'fixed slide text 1',
      },
      {
        title: 'fixed slide title 2',
        text: 'fixed slide text 2',
      },
      {
        title: 'fixed slide title 3',
        text: 'fixed slide text 3',
      },
      {
        title: 'fixed slide title 4',
        text: 'fixed slide text 4',
      },
    ],
  }

  return {
    props: {
      fixedSlides: fixedSlides,
      id: 'contact',
    }, // will be passed to the page component as props
  }
}
