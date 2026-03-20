import { reactRouter } from '@react-router/dev/vite'
import { defineConfig } from 'vite'
import svgr from 'vite-plugin-svgr'

export default defineConfig({
  plugins: [reactRouter(), svgr()],
  envPrefix: 'PUBLIC_',
  resolve: {
    tsconfigPaths: true,
  },
})
