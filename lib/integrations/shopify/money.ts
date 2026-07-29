import type { Money } from './types'

// Formatters are keyed on the (locale, currency) pair since both vary at
// call time; `new Intl.NumberFormat` is expensive to construct, so each
// unique pair is built once and reused.
const formatters = new Map<string, Intl.NumberFormat>()

/**
 * Format a Shopify `Money` object using its own `currencyCode`, instead of
 * assuming `$` and two decimals. Locale defaults to the runtime's locale.
 */
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
