import type { Money } from './types'

// `Intl.NumberFormat` is expensive to construct; build once per
// (locale, currency) pair.
const formatters = new Map<string, Intl.NumberFormat>()

/** Formats with the money's own `currencyCode`; locale defaults to the runtime's. */
export function formatMoney(money: Money, locale?: string): string {
  const key = JSON.stringify([locale, money.currencyCode])
  let formatter = formatters.get(key)
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: money.currencyCode,
    })
    formatters.set(key, formatter)
  }
  return formatter.format(Number(money.amount))
}
