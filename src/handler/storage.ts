import type { Route } from './types'

export const storageRoutes: Route = {
  routePrefix: '/storage',
  folder: 'storage',
  routes: [{
    path: '/:id/:versionId?',
    file: 'storage',
  }]
}