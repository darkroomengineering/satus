import cn from 'clsx'
import { Image } from '@/components/ui/image'
import { getCollectionProducts } from '@/integrations/shopify'
import type { Product as ProductType } from '@/integrations/shopify/types'
import { SizeAndBuy } from '../size-and-buy'
import s from './product.module.css'

export async function Product() {
  const data = await getCollectionProducts({ collection: 'satus' })
  const product = data?.find((product) => product.handle === 'darkroom-hoodie')

  return (
    <div
      className={cn(
        'dr-gap-y-24 flex flex-col items-center justify-center',
        s.product
      )}
    >
      <div className="relative col-span-full dt:col-start-3 dt:-col-end-3 aspect-320/357 h-[40vh]">
        <Image
          src={product?.images[0]?.url ?? ''}
          alt={product?.images[0]?.altText ?? ''}
          fill
        />
      </div>
      <aside className="dr-gap-16 dt:dr-w-col-6 flex flex-col text-center">
        <h1>{product?.title}</h1>
        <p>{product?.description as string}</p>
      </aside>
      <SizeAndBuy product={product as ProductType} />
    </div>
  )
}
