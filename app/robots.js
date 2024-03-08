export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/private/', '/debug/'],
    },
    sitemap: `${process.env.WEBSITE_URL}/sitemap.xml`,
  }
}
