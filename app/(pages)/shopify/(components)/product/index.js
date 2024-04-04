import cn from 'clsx'
import { Image } from 'components/image'
import { getCollectionProducts } from 'libs/shopify'
import { AddToCart } from 'libs/shopify/cart/add-to-cart'
import s from './product.module.scss'

export async function Product() {
  const data = await getCollectionProducts({ collection: 'satus' })
  const product = data?.find((product) => product.handle === 'darkroom-board')

  return (
    <div className={cn('layout-grid-inner', s.product)}>
      <div className={s.media}>
        <Image src={product?.images[0].url} alt={product?.altText} />
      </div>
      <aside className={s.details}>
        <h1>{product?.title}</h1>
        <p>{product?.description}</p>
      </aside>
      <AddToCart variants={product?.variants} className={s.add} />
    </div>
  )
}
