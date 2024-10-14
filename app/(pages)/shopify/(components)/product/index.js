import { Image } from 'components/image'
import { getCollectionProducts } from 'libs/shopify'
import { SizeAndBuy } from '../size-and-buy'
import s from './product.module.scss'

export async function Product() {
  const data = await getCollectionProducts({ collection: 'satus' })
  const product = data?.find((product) => product.handle === 'boxy-hoodie')

  return (
    <div className={s.product}>
      <div className={s.media}>
        <Image src={product?.images[0].url} alt={product?.altText} />
      </div>
      <aside className={s.details}>
        <h1>{product?.title}</h1>
        <p>{product?.description}</p>
      </aside>
      <SizeAndBuy product={product} />
    </div>
  )
}
