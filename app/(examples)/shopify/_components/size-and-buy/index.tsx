'use client'

import cn from 'clsx'
import { useState } from 'react'
import { Select } from '@/components/ui/select'
import { AddToCart } from '@/integrations/shopify/cart/add-to-cart'
import type { Product, ProductVariant } from '@/integrations/shopify/types'
import s from './size-and-buy.module.css'

export function SizeAndBuy({ product }: { product: Product }) {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    null
  )

  const sizeOptions = (
    product.options?.find((option) => option.name === 'Size')?.values ?? []
  ).map((size) => ({ value: size, label: size }))

  return (
    <>
      <Select
        className={cn(
          s.size,
          'dr-w-64 dt:dr-w-67 flex items-center justify-center'
        )}
        placeholder="size"
        options={sizeOptions}
        onValueChange={(value) => {
          const variant = product.variants?.find((variant) =>
            variant.selectedOptions.every((option) => option.value === value)
          ) as ProductVariant

          setSelectedVariant(variant)
        }}
      />
      <AddToCart
        product={product}
        {...(selectedVariant && { variant: selectedVariant })}
        className={cn(
          s.add,
          'dr-rounded-8 relative col-span-full dt:col-start-4 dt:-col-end-4 flex cursor-pointer overflow-hidden border-2 border-secondary'
        )}
      />
    </>
  )
}
