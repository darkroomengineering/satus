import cn from 'clsx'
import { Image } from '@/components/ui/image'
import { getCollectionProducts } from '@/integrations/shopify'
import type { Product as ProductType } from '@/integrations/shopify/types'
import { SizeAndBuy } from '../size-and-buy'
import s from './product.module.css'

export async function Product() {
  let data: ProductType[] | undefined
  let error: string | null = null

  try {
    data = await getCollectionProducts({ collection: 'satus' })
  } catch (e) {
    error =
      'Failed to fetch products. Please verify your Shopify credentials and store configuration.'
    console.error('Shopify fetch error:', e)
  }

  const product = data?.find((product) => product.handle === 'darkroom-hoodie')

  // Show error state
  if (error) {
    return (
      <div
        className={cn('flex flex-col items-center justify-center', s.product)}
      >
        <div className="dr-gap-16 flex max-w-md flex-col text-center">
          <h1 className="text-xl">Connection Error</h1>
          <p className="opacity-60">{error}</p>
        </div>
      </div>
    )
  }

  // Show empty state if no product found
  if (!product) {
    return (
      <div
        className={cn('flex flex-col items-center justify-center', s.product)}
      >
        <div className="dr-gap-16 flex max-w-md flex-col text-center">
          <h1 className="text-xl">Product Not Found</h1>
          <p className="opacity-60">
            The example requires a Shopify store with a collection named "satus"
            containing a product with handle "darkroom-hoodie".
          </p>
          <p className="text-sm opacity-40">
            You can modify this component to use your own collection and product
            handles.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'dr-gap-y-24 flex flex-col items-center justify-center',
        s.product
      )}
    >
      <div className="relative col-span-full dt:col-start-3 dt:-col-end-3 aspect-320/357 h-[40vh]">
        <Image
          src={product.images[0]?.url ?? ''}
          alt={product.images[0]?.altText ?? ''}
          fill
        />
      </div>
      <aside className="dr-gap-16 dt:dr-w-col-6 flex flex-col text-center">
        <h1>{product.title}</h1>
        <p>{product.description as string}</p>
      </aside>
      <SizeAndBuy product={product} />
    </div>
  )
}
