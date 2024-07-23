import type { Route } from './types'

export const binaryRoutes: Route = {
  routePrefix: '/fhir/R4/Binary',
  folder: 'binary',
  routes: [{
    path: '/',
    method: 'POST',
    file: 'binary.post',
  },{
    path: '/:id',
    method: 'PUT',
    file: 'binary.put',
  },{
    path: '/:id',
    method: 'GET',
    file: 'binary.get',
  }]
}