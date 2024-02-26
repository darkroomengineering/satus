import { defineConfig } from 'tinacms'
import { deployButton } from './content/custom-components/deploy-button'
import { globalFooterCollection } from './content/global/footer.js'
import { globalHeaderCollection } from './content/global/header.js'
import { globalModalsCollection } from './content/global/modals.js'
import { homeCollection } from './content/pages/home/index.js'
import { templatesCollection } from './content/pages/templates'

const branch = process.env.VERCEL_GIT_COMMIT_REF || 'main' // change this to your currrent branch

// const cloudinaryConfig = {
//   loadCustomStore: async () => {
//     const pack = await import('next-tinacms-cloudinary')
//     return pack.TinaCloudCloudinaryMediaStore
//   },
// }

export default defineConfig({
  branch,
  clientId: process.env.NEXT_PUBLIC_TINA_CLIENT_ID,
  token: process.env.TINA_TOKEN,
  search: {
    tina: {
      indexerToken: process.env.TINA_SEARCH_TOKEN,
      stopwordLanguages: ['eng'],
    },
    indexBatchSize: 300,
    maxSearchIndexFieldLength: 300,
  },
  build: {
    outputFolder: 'admin',
    publicFolder: 'public',
  },
  media: {
    tina: {
      mediaRoot: 'cms',
      publicFolder: 'public',
    },
  },
  // media: {
  //   ...cloudinaryConfig,
  // },
  schema: {
    collections: [
      homeCollection,
      templatesCollection,
      globalHeaderCollection,
      globalFooterCollection,
      globalModalsCollection,
    ],
  },
  cmsCallback: deployButton,
})
