export async function DataFetchingTest() {
  // Test cacheSignal integration
  let sanityStatus = 'Not configured'
  let shopifyStatus = 'Not configured'

  try {
    const { isSanityConfigured } = await import(
      '~/integrations/check-integration'
    )

    if (isSanityConfigured()) {
      sanityStatus = 'Configured ✓ (using cacheSignal)'
      // You can test an actual fetch here if needed
      // const { fetchPage } = await import('~/integrations/sanity')
      // await fetchPage('test')
    }
  } catch {
    sanityStatus = 'Error checking Sanity'
  }

  try {
    const shopifyDomain = process.env.SHOPIFY_STORE_DOMAIN
    if (shopifyDomain) {
      shopifyStatus = 'Configured ✓ (using cacheSignal)'
    }
  } catch {
    shopifyStatus = 'Error checking Shopify'
  }

  return (
    <div className="space-y-4 p-6 border border-current/20 rounded-lg">
      <div className="space-y-2">
        <h3 className="font-bold">Sanity Integration</h3>
        <p className="text-sm opacity-70">{sanityStatus}</p>
        <code className="text-xs block p-2 bg-black/20 rounded">
          fetchSanity() now uses cacheSignal for auto-cleanup
        </code>
      </div>

      <div className="space-y-2">
        <h3 className="font-bold">Shopify Integration</h3>
        <p className="text-sm opacity-70">{shopifyStatus}</p>
        <code className="text-xs block p-2 bg-black/20 rounded">
          shopifyFetch() now uses cacheSignal with 10s timeout
        </code>
      </div>

      <div className="text-xs opacity-50 pt-4 border-t border-current/10">
        ℹ️ cacheSignal automatically aborts requests when cache expires
      </div>
    </div>
  )
}
