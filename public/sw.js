if (!self.define) {
  let e,
    s = {}
  const c = (c, n) => (
    (c = new URL(c + '.js', n).href),
    s[c] ||
      new Promise((s) => {
        if ('document' in self) {
          const e = document.createElement('script')
          ;(e.src = c), (e.onload = s), document.head.appendChild(e)
        } else (e = c), importScripts(c), s()
      }).then(() => {
        let e = s[c]
        if (!e) throw new Error(`Module ${c} didn’t register its module`)
        return e
      })
  )
  self.define = (n, t) => {
    const a =
      e ||
      ('document' in self ? document.currentScript.src : '') ||
      location.href
    if (s[a]) return
    let i = {}
    const r = (e) => c(e, a),
      o = { module: { uri: a }, exports: i, require: r }
    s[a] = Promise.all(n.map((e) => o[e] || r(e))).then((e) => (t(...e), i))
  }
}
define(['./workbox-4d30eff7'], function (e) {
  'use strict'
  importScripts(),
    self.skipWaiting(),
    e.clientsClaim(),
    e.precacheAndRoute(
      [
        {
          url: '/_next/static/chunks/1-53e449e7ece7a05b.js',
          revision: '53e449e7ece7a05b',
        },
        {
          url: '/_next/static/chunks/139.88f6751da56da6be.js',
          revision: '88f6751da56da6be',
        },
        {
          url: '/_next/static/chunks/242.189223a4f66822b6.js',
          revision: '189223a4f66822b6',
        },
        {
          url: '/_next/static/chunks/478-73fe76e733ee6157.js',
          revision: '73fe76e733ee6157',
        },
        {
          url: '/_next/static/chunks/514-71358570cec9c691.js',
          revision: '71358570cec9c691',
        },
        {
          url: '/_next/static/chunks/framework-ba86d075c3365de8.js',
          revision: 'ba86d075c3365de8',
        },
        {
          url: '/_next/static/chunks/main-1c9cb541cda3d411.js',
          revision: '1c9cb541cda3d411',
        },
        {
          url: '/_next/static/chunks/pages/_app-1c6426e422acc83c.js',
          revision: '1c6426e422acc83c',
        },
        {
          url: '/_next/static/chunks/pages/_error-22dc68c62826c6eb.js',
          revision: '22dc68c62826c6eb',
        },
        {
          url: '/_next/static/chunks/pages/contact-bb53ac8ba672af7c.js',
          revision: 'bb53ac8ba672af7c',
        },
        {
          url: '/_next/static/chunks/pages/gsap-af8ac4ed02b95391.js',
          revision: 'af8ac4ed02b95391',
        },
        {
          url: '/_next/static/chunks/pages/home-dd52bd3076336f3e.js',
          revision: 'dd52bd3076336f3e',
        },
        {
          url: '/_next/static/chunks/pages/index-7c844b4492266861.js',
          revision: '7c844b4492266861',
        },
        {
          url: '/_next/static/chunks/polyfills-c67a75d1b6f99dc8.js',
          revision: '837c0df77fd5009c9e46d446188ecfd0',
        },
        {
          url: '/_next/static/chunks/webpack-7d0e9680a70baf0d.js',
          revision: '7d0e9680a70baf0d',
        },
        {
          url: '/_next/static/css/5efc076efb6a7ae8.css',
          revision: '5efc076efb6a7ae8',
        },
        {
          url: '/_next/static/css/694eaab704ad360c.css',
          revision: '694eaab704ad360c',
        },
        {
          url: '/_next/static/css/8a233b5df237aa85.css',
          revision: '8a233b5df237aa85',
        },
        {
          url: '/_next/static/css/9e2bb3521cdcedac.css',
          revision: '9e2bb3521cdcedac',
        },
        {
          url: '/_next/static/css/ec218f1f92bde0b2.css',
          revision: 'ec218f1f92bde0b2',
        },
        {
          url: '/_next/static/tdXj_-oepKc-L7FL6f7s9/_buildManifest.js',
          revision: '584ecdc49f6797d4409cbf122f32551f',
        },
        {
          url: '/_next/static/tdXj_-oepKc-L7FL6f7s9/_ssgManifest.js',
          revision: '5352cb582146311d1540f6075d1f265e',
        },
        { url: '/manifest.json', revision: 'ac60d15bb634ee76c322f7f291977353' },
        {
          url: '/site.webmanifest',
          revision: 'ac60d15bb634ee76c322f7f291977353',
        },
      ],
      { ignoreURLParametersMatching: [] }
    ),
    e.cleanupOutdatedCaches(),
    e.registerRoute(
      '/',
      new e.NetworkFirst({
        cacheName: 'start-url',
        plugins: [
          {
            cacheWillUpdate: async ({
              request: e,
              response: s,
              event: c,
              state: n,
            }) =>
              s && 'opaqueredirect' === s.type
                ? new Response(s.body, {
                    status: 200,
                    statusText: 'OK',
                    headers: s.headers,
                  })
                : s,
          },
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
      new e.CacheFirst({
        cacheName: 'google-fonts-webfonts',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 31536e3 }),
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,
      new e.StaleWhileRevalidate({
        cacheName: 'google-fonts-stylesheets',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 604800 }),
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
      new e.StaleWhileRevalidate({
        cacheName: 'static-font-assets',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 604800 }),
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
      new e.StaleWhileRevalidate({
        cacheName: 'static-image-assets',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 86400 }),
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /\/_next\/image\?url=.+$/i,
      new e.StaleWhileRevalidate({
        cacheName: 'next-image',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 86400 }),
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /\.(?:mp3|wav|ogg)$/i,
      new e.CacheFirst({
        cacheName: 'static-audio-assets',
        plugins: [
          new e.RangeRequestsPlugin(),
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /\.(?:mp4)$/i,
      new e.CacheFirst({
        cacheName: 'static-video-assets',
        plugins: [
          new e.RangeRequestsPlugin(),
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /\.(?:js)$/i,
      new e.StaleWhileRevalidate({
        cacheName: 'static-js-assets',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /\.(?:css|less)$/i,
      new e.StaleWhileRevalidate({
        cacheName: 'static-style-assets',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /\/_next\/data\/.+\/.+\.json$/i,
      new e.StaleWhileRevalidate({
        cacheName: 'next-data',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /\.(?:json|xml|csv)$/i,
      new e.NetworkFirst({
        cacheName: 'static-data-assets',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      ({ url: e }) => {
        if (!(self.origin === e.origin)) return !1
        const s = e.pathname
        return !s.startsWith('/api/auth/') && !!s.startsWith('/api/')
      },
      new e.NetworkFirst({
        cacheName: 'apis',
        networkTimeoutSeconds: 10,
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 16, maxAgeSeconds: 86400 }),
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      ({ url: e }) => {
        if (!(self.origin === e.origin)) return !1
        return !e.pathname.startsWith('/api/')
      },
      new e.NetworkFirst({
        cacheName: 'others',
        networkTimeoutSeconds: 10,
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      ({ url: e }) => !(self.origin === e.origin),
      new e.NetworkFirst({
        cacheName: 'cross-origin',
        networkTimeoutSeconds: 10,
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 3600 }),
        ],
      }),
      'GET'
    )
})
