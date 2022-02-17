import { useStore } from 'lib/store'
import { useEffect, useState } from 'react'

const useCart = () => {
  const [checkout, setCheckout] = useState()
  const setDebouncing = useStore((state) => state.setIsDebouncing)

  useEffect(() => {
    const fetchCartId = async () => {
      const res = await fetch('/api/checkout')
      const { cart } = await res.json()
      localStorage.setItem(
        process.env.NEXT_PUBLIC_LOCAL_STORAGE_CHECKOUT_ID,
        cart.id
      )
      setCheckout(
        localStorage.getItem(process.env.NEXT_PUBLIC_LOCAL_STORAGE_CHECKOUT_ID)
      )
    }
    if (
      !localStorage.getItem(process.env.NEXT_PUBLIC_LOCAL_STORAGE_CHECKOUT_ID)
    ) {
      fetchCartId()
    }
    setCheckout(
      checkout
        ? checkout
        : localStorage.getItem(
            process.env.NEXT_PUBLIC_LOCAL_STORAGE_CHECKOUT_ID
          )
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
      setDebouncing(true)
      t = setTimeout(() => {
        fn.apply(this, arguments)
        setDebouncing(false)
      }, wait)
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
