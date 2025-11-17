import cn from 'clsx'
import { Image } from '~/components/image'
import { getCollectionProducts } from '~/integrations/shopify'
import type { Product as ProductType } from '~/integrations/shopify/types'
import { SizeAndBuy } from '../size-and-buy'
import s from './product.module.css'

export async function Product() {
  const data = await getCollectionProducts({ collection: 'satus' })
  const product = data?.find((product) => product.handle === 'darkroom-hoodie')

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center dr-gap-y-24',
        s.product
      )}
    >
      <div className="relative col-span-full aspect-[320/357] h-[40vh] dt:col-start-3 dt:-col-end-3">
        <Image
          src={product?.images[0].url as string}
          alt={product?.altText as string}
          aspectRatio={320 / 357}
          fill
        />
      </div>
      <aside className="flex flex-col text-center dr-gap-16 dt:dr-w-col-6">
        <h1>{product?.title}</h1>
        <p>{product?.description as string}</p>
      </aside>
      <SizeAndBuy product={product as ProductType} />
    </div>
  )
}
