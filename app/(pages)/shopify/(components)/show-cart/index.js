'use client'

import cn from 'clsx'
import { useCartModal } from 'libs/shopify/cart/modal'

export const ShowCart = ({ className }) => {
  const { openCart } = useCartModal()

  return (
    <button onClick={openCart} className={cn(className, 'link')}>
      Cart
    </button>
  )
}
