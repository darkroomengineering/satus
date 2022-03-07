import cn from 'clsx'
import { Layout } from 'layouts/default'
import Shopify from 'lib/shopify'
import { useStore } from 'lib/store'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import s from './home.module.scss'

export default function Home({ productsArray, categories }) {
  const locomotive = useStore((state) => state.locomotive)
  const [categoryFilter, setCategoryFilter] = useState('shop all')

  useEffect(() => {
    if (locomotive) {
      try {
        locomotive.update()
      } catch (err) {
        console.log('update method of scroll not found', err)
      }
    }
  }, [categoryFilter, locomotive])

  return (
    <Layout>
      <section className={s.hero} data-scroll-section>
        <h1 className={s.title}>Shopify Starter</h1>
        <p className="text-decorative text-uppercase text-left">Sort By:</p>
        <div className={s.categories}>
          {categories.map((category, key) => (
            <h3 className="h3" key={`category-${key}`}>
              <button
                onClick={() => setCategoryFilter(category.value)}
                className={cn({
                  [s.active]: categoryFilter === category.value,
                })}
              >
                {category.label}
              </button>
            </h3>
          ))}
        </div>
      </section>
      <section data-scroll-section>
        <div className={cn('layout-grid', s['product-grid'])}>
          {productsArray
            .filter((product) => product.tags.includes(categoryFilter))
            .map((product, key) => (
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
      </section>
    </Layout>
  )
}

export const getStaticProps = async () => {
  const store = new Shopify()
  const productsArray = await store.getAllProducts()

  productsArray.map((product) => product.tags.push('shop all'))

  const categoriesSet = [
    ...new Set(
      productsArray.flatMap((product) => product.tags.map((tag) => tag))
    ),
  ]

  const categories = categoriesSet
    .map((category, key) => ({
      label:
        key !== categoriesSet.length - 1
          ? `${category}\u00a0•\u00a0`
          : `${category}`,
      value: category,
    }))
    .sort((a) => (a.value === 'shop all' ? -1 : 1))

  return {
    props: {
      productsArray: [
        ...productsArray,
        ...productsArray,
        ...productsArray,
        ...productsArray,
      ],
      categories,
    },
    revalidate: 1,
  }
}
