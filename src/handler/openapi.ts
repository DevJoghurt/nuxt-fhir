import type { Route } from './types'

export const openapiRoutes: Route = {
  routePrefix: '',
  folder: 'openapi',
  routes: [{
    path: '/openapi.json',
    file: 'handler',
  }]
}