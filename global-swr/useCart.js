import { useEffect, useState } from 'react'

const useCart = () => {
  const [checkout, setCheckout] = useState()

  useEffect(() => {
    const fetchCartId = async () => {
      const res = await fetch('/api/checkout')
      const { cart } = await res.json()
      localStorage.setItem('SF-starter-checkout-id', cart.id)
      setCheckout(localStorage.getItem('SF-starter-checkout-id'))
    }
    if (!localStorage.getItem('SF-starter-checkout-id')) {
      fetchCartId()
    }
    setCheckout(
      checkout ? checkout : localStorage.getItem('SF-starter-checkout-id')
    )
  }, [checkout])

  const cartFetcher = async (...args) => {
    const res = await fetch(...args)
    const { checkout } = await res.json()
    return checkout
  }

  const updateItem = async (quantity, variantId, lineItemId) => {
    await fetch(`/api/checkout/${checkout}`, {
      method: 'PUT',
      body: JSON.stringify({
        lineItemId,
        variantId,
        quantity,
        putAction: 'update',
      }),
      headers: {
        'content-type': 'application/json',
      },
    })
  }

  const addItem = async (quantity, variantId) => {
    await fetch(`/api/checkout/${checkout}`, {
      method: 'POST',
      body: JSON.stringify({
        variantId,
        quantity,
      }),
      headers: {
        'content-type': 'application/json',
      },
    })
  }

  const removeItem = async (lineItemId) => {
    await fetch(`/api/checkout/${checkout}`, {
      method: 'PUT',
      body: JSON.stringify({ lineItemId, putAction: 'remove' }),
      headers: {
        'content-type': 'application/json',
      },
    })
  }

  const debounce = (fn, wait) => {
    let t
    return function () {
      clearTimeout(t)
      t = setTimeout(() => fn.apply(this, arguments), wait)
    }
  }

  return {
    checkoutId: checkout,
    cartFetcher,
    updateItem,
    addItem,
    removeItem,
    debounce,
  }
}

export default useCart
