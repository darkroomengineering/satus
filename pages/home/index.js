import cn from 'clsx'
import { Layout } from 'layouts/default'
import Shopify from 'lib/shopify'
import Image from 'next/image'
import s from './home.module.scss'

export default function Home({ productsArray }) {
  return (
    <Layout>
      <div className={s.pageHome}>
        <h1 className={s.title}>Shopify Starter</h1>
        <div className={cn('grid', s['product-grid'])}>
          {productsArray.map((product, key) => (
            <a key={`product-${key}`} href={`/${product.slug}`}>
              <div className={s.image}>
                <Image
                  src={product.images[0].src}
                  alt=""
                  layout="fill"
                  priority
                />
              </div>
              <p className={s['product-name']}>{product.name}</p>
            </a>
          ))}
        </div>
      </div>
    </Layout>
  )
}

export const getStaticProps = async () => {
  const store = new Shopify()
  const productsArray = await store.getAllProducts()

  return {
    props: {
      productsArray: [
        ...productsArray,
        ...productsArray,
        ...productsArray,
        ...productsArray,
      ],
    },
    revalidate: 1,
  }
}
