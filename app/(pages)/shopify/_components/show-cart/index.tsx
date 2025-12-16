'use client'

import cn from 'clsx'
import { useCartModal } from '~/integrations/shopify/cart/modal'

export const ShowCart = ({ className }: { className: string }) => {
  const { openCart } = useCartModal()

  return (
    <button type="button" onClick={openCart} className={cn(className, 'link')}>
      Cart
    </button>
  )
}
