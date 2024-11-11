import { isEmptyArray } from '~/libs/utils'

export function cartReconciler(state, action) {
  const currentCart = state || createEmptyCart()
  const reconcilingAction = reconcilingActions[action.type]

  if (reconcilingAction) {
    return reconcilingAction(currentCart, action)
  }

  return currentCart
}

function createEmptyCart() {
  return {
    id: undefined,
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

const reconcilingActions = {
  UPDATE_ITEM: (state, action) => updateItem(state, action),
  ADD_ITEM: (state, action) => addItem(state, action),
}

function updateItem(state, action) {
  const { merchandiseId, updateType } = action.payload
  const updatedLines = state.lines
    .map((item) =>
      item.merchandise.id === merchandiseId
        ? updateCartItem(item, updateType)
        : item
    )
    .filter(Boolean)

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

function addItem(state, action) {
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

const quantityAction = {
  minus: -1,
  plus: 1,
}

function updateCartItem(item, updateType) {
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

function createOrUpdateCartItem(existingItem, variant, product, newQuantity) {
  const quantity = existingItem
    ? existingItem.quantity + newQuantity
    : newQuantity
  const totalAmount = calculateItemCost(quantity, variant.price.amount)

  return {
    id: existingItem?.id,
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
        featuredImage: product.featuredImage,
      },
    },
  }
}

function calculateItemCost(quantity, price) {
  return (Number(price) * quantity).toString()
}

function updateCartTotals(lines) {
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
