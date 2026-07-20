import type { Money } from './types'

/**
 * Format a Shopify `Money` object using its own `currencyCode`, instead of
 * assuming `$` and two decimals. Locale defaults to the runtime's locale.
 */
export function formatMoney(money: Money, locale?: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: money.currencyCode,
  }).format(Number(money.amount))
}
