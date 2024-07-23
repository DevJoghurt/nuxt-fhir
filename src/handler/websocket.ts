import type { Route } from './types'

export const websocketRoutes: Route = {
  routePrefix: '',
  folder: 'websockets',
  routes: [{
    path: '/ws/*',
    file: 'handler',
  }]
}