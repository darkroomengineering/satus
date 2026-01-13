'use client'

import cn from 'clsx'
import { useCartContext } from '@/integrations/shopify/cart/cart-context'
import { useCartModal } from '@/integrations/shopify/cart/modal'

export const ShowCart = ({ className }: { className: string }) => {
  const { openCart } = useCartModal()
  const { totalQuantity } = useCartContext()

  return (
    <button type="button" onClick={openCart} className={cn(className, 'link')}>
      Cart ({totalQuantity()})
    </button>
  )
}
