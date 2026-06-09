import type {
  Cart,
  Product,
  ProductVariant,
} from '@/integrations/shopify/types'
import { isEmptyArray } from '@/utils/strings'

type CartLine = Pick<
  Cart['lines'][number],
  'id' | 'quantity' | 'cost' | 'merchandise'
>

interface UpdateItemAction {
  type: 'UPDATE_ITEM'
  payload: {
    merchandiseId: string
    updateType: 'plus' | 'minus' | 'delete'
  }
}

interface AddItemAction {
  type: 'ADD_ITEM'
  payload: {
    variant: ProductVariant
    product: Product
    quantity: number
  }
}

export type CartAction = UpdateItemAction | AddItemAction

export function cartReconciler(
  state: Cart | undefined,
  action: CartAction
): Cart {
  const currentCart = state ?? createEmptyCart()

  switch (action.type) {
    case 'UPDATE_ITEM':
      return updateItem(currentCart, action)
    case 'ADD_ITEM':
      return addItem(currentCart, action)
  }
}

function createEmptyCart(): Cart {
  return {
    id: '',
    checkoutUrl: '',
    totalQuantity: 0,
    lines: [],
    cost: {
      subtotalAmount: { amount: '0', currencyCode: 'USD' },
      totalAmount: { amount: '0', currencyCode: 'USD' },
      totalTaxAmount: { amount: '0', currencyCode: 'USD' },
    },
  }
}

function updateItem(state: Cart, action: UpdateItemAction): Cart {
  const { merchandiseId, updateType } = action.payload
  const updatedLines = state.lines.flatMap((item): CartLine[] => {
    const updated =
      item.merchandise.id === merchandiseId
        ? updateCartItem(item, updateType)
        : item
    return updated ? [updated] : []
  })

  if (isEmptyArray(updatedLines)) {
    return {
      ...state,
      lines: [],
      totalQuantity: 0,
      cost: {
        ...state.cost,
        totalAmount: { ...state.cost.totalAmount, amount: '0' },
      },
    }
  }

  return { ...state, ...updateCartTotals(updatedLines), lines: updatedLines }
}

function addItem(state: Cart, action: AddItemAction): Cart {
  const { variant, product, quantity } = action.payload
  const existingItem = state.lines.find(
    (item) => item.merchandise.id === variant.id
  )
  const updatedItem = createOrUpdateCartItem(
    existingItem,
    variant,
    product,
    quantity
  )

  const updatedLines = existingItem
    ? state.lines.map((item) =>
        item.merchandise.id === variant.id ? updatedItem : item
      )
    : [...state.lines, updatedItem]

  return {
    ...state,
    ...updateCartTotals(updatedLines),
    lines: updatedLines,
  }
}

export const quantityAction: Record<'minus' | 'plus', number> = {
  minus: -1,
  plus: 1,
}

function updateCartItem(
  item: CartLine,
  updateType: 'plus' | 'minus' | 'delete'
): CartLine | null {
  if (updateType === 'delete') return null

  const newQuantity = Math.max(1, item.quantity + quantityAction[updateType])

  const singleItemAmount = Number(item.cost.totalAmount.amount) / item.quantity
  const newTotalAmount = calculateItemCost(
    newQuantity,
    singleItemAmount.toString()
  )

  return {
    ...item,
    quantity: newQuantity,
    cost: {
      ...item.cost,
      totalAmount: {
        ...item.cost.totalAmount,
        amount: newTotalAmount,
      },
    },
  }
}

function createOrUpdateCartItem(
  existingItem: CartLine | undefined,
  variant: ProductVariant,
  product: Product,
  newQuantity: number
): CartLine {
  const quantity = existingItem
    ? existingItem.quantity + newQuantity
    : newQuantity
  const totalAmount = calculateItemCost(quantity, variant.price.amount)

  return {
    ...(existingItem?.id && { id: existingItem.id }),
    quantity,
    cost: {
      totalAmount: {
        amount: totalAmount,
        currencyCode: variant.price.currencyCode,
      },
    },
    merchandise: {
      id: variant.id,
      title: variant.title,
      selectedOptions: variant.selectedOptions,
      product: {
        id: product.id,
        handle: product.handle,
        title: product.title,
        featuredImage: product.featuredImage ?? null,
      },
    },
  }
}

function calculateItemCost(quantity: number, price: string): string {
  return (Number(price) * quantity).toString()
}

function updateCartTotals(lines: CartLine[]): Partial<Cart> {
  const totalQuantity = lines.reduce((sum, item) => sum + item.quantity, 0)
  const totalAmount = lines.reduce(
    (sum, item) => sum + Number(item.cost.totalAmount.amount),
    0
  )
  const currencyCode = lines[0]?.cost.totalAmount.currencyCode ?? 'USD'

  return {
    totalQuantity,
    cost: {
      subtotalAmount: { amount: totalAmount.toString(), currencyCode },
      totalAmount: { amount: totalAmount.toString(), currencyCode },
      totalTaxAmount: { amount: '0', currencyCode },
    },
  }
}
