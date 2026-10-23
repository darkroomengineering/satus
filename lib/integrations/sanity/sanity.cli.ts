import { defineCliConfig } from 'sanity/cli'

import { dataset, projectId } from './env'

export default defineCliConfig({
  api: { projectId, dataset },
  project: {
    basePath: '/studio',
  },
  // Read by `bun run sanity:typegen`.
  typegen: {
    path: './**/*.{ts,tsx}',
    schema: './schema.json',
    generates: './sanity.types.ts',
  },
  vite: {
    resolve: {
      alias: {
        '~': __dirname,
      },
    },
  },
})
