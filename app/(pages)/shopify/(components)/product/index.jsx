import cn from 'clsx'
import { Image } from '~/components/image'
import { getCollectionProducts } from '~/libs/shopify'
import { SizeAndBuy } from '../size-and-buy'
import s from './product.module.css'

export async function Product() {
  const data = await getCollectionProducts({ collection: 'satus' })
  const product = data?.find((product) => product.handle === 'boxy-hoodie')

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center sgap-y-24',
        s.product
      )}
    >
      <div className="relative col-span-full aspect-[320/357] h-[40vh] dt:col-start-3 dt:-col-end-3">
        <Image src={product?.images[0].url} alt={product?.altText} />
      </div>
      <aside className="flex flex-col text-center sgap-16 dt:w-col-6">
        <h1>{product?.title}</h1>
        <p>{product?.description}</p>
      </aside>
      <SizeAndBuy product={product} />
    </div>
  )
}
