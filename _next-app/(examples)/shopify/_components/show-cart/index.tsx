'use client'

import cn from 'clsx'
import { useCartContext } from '@/integrations/shopify/cart/cart-context'
import { useCartModal } from '@/integrations/shopify/cart/modal'

export const ShowCart = ({ className }: { className: string }) => {
  const { openCart } = useCartModal()
  const { meta } = useCartContext()

  return (
    <button type="button" onClick={openCart} className={cn(className, 'link')}>
      Cart ({meta?.totalQuantity()})
    </button>
  )
}
