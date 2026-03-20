import { index, type RouteConfig, route } from '@react-router/dev/routes'

export default [
  index('routes/home.tsx'),
  route('components', 'routes/components.tsx'),
  route('sanity', 'routes/sanity.tsx'),
  route('*', 'routes/catchall.tsx'),
] satisfies RouteConfig
