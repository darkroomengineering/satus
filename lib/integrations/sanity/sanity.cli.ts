/**
 * This configuration file lets you run `$ sanity [command]` in this folder
 * Go to https://www.sanity.io/docs/cli to learn more.
 **/
import { defineCliConfig } from 'sanity/cli'

import { dataset, projectId } from './env'

export default defineCliConfig({
  api: { projectId, dataset },
  project: {
    basePath: '/studio',
  },
  // `bun run sanity:typegen`. Replaces the separate `sanity-typegen.json`,
  // which the Sanity CLI deprecated.
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
