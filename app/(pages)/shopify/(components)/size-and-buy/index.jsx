'use client'

import cn from 'clsx'
import { useState } from 'react'
import { Dropdown } from '~/components/dropdown'
import { AddToCart } from '~/integrations/shopify/cart/add-to-cart'
import s from './size-and-buy.module.css'

export const SizeAndBuy = ({ product }) => {
  const [selectedVariant, setSelectedVariant] = useState(null)

  return (
    <>
      <Dropdown
        className={cn(
          s.size,
          'flex items-center justify-center dr-w-64 dt:dr-w-67'
        )}
        placeholder="size"
        options={
          product.options.find((option) => option.name === 'Size').values
        }
        onChange={(value) => {
          const selected = product.variants?.[value]?.title
          const variant = product?.variants.find((variant) =>
            variant.selectedOptions.every((option) => option.value === selected)
          )

          setSelectedVariant(variant)
        }}
      />
      <AddToCart
        product={product}
        variant={selectedVariant}
        className={cn(
          s.add,
          'relative col-span-full flex border-2 border-black dr-rounded-8 overflow-hidden cursor-pointer dt:col-start-4 dt:-col-end-4'
        )}
      />
    </>
  )
}
