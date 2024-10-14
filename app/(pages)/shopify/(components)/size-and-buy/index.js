'use client'

import { Dropdown } from 'components/dropdown'
import { AddToCart } from 'libs/shopify/cart/add-to-cart'
import { useState } from 'react'
import s from './size-and-buy.module.scss'

export const SizeAndBuy = ({ product }) => {
  const [selectedVariant, setSelectedVariant] = useState(null)

  return (
    <>
      <Dropdown
        className={s.size}
        placeholder="size"
        options={
          product.options.find((option) => option.name === 'Size').values
        }
        onChange={(value) => {
          const selected = product.variants?.[value]?.title
          const variant = product?.variants.find((variant) =>
            variant.selectedOptions.every(
              (option) => option.value === selected,
            ),
          )

          setSelectedVariant(variant)
        }}
      />
      <AddToCart
        product={product}
        variant={selectedVariant}
        className={s.add}
      />
    </>
  )
}
