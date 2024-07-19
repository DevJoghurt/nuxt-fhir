import type { Route } from './types'

export const fhirRoutes: Route = {
  routePrefix: '/fhir/R4',
  folder: 'fhir',
  routes: [{
    path: '/metadata',
    method: 'GET',
    file: 'metadata'
  },{
    path: '/$versions',
    method: 'GET',
    file: 'versions'
  },{
    path: '/.well-known/smart-configuration',
    method: 'GET',
    file: 'smart-configuration'
  },{
    path: '/.well-known/smart-styles.json',
    method: 'GET',
    file: 'smart-styles'
  },{
    path: '/:resourceType/$csv',
    method: 'GET',
    file: 'csv'
  },{
    path: '/Agent/$push',
    method: 'POST',
    file: 'agent'
  },{
    path: '/Agent/:id/$push',
    method: 'POST',
    file: 'agent'
  },{
    path: '/Bot/$execute',
    method: 'GET',
    file: 'bot'
  },{
    path: '/Bot/:id/$execute',
    method: 'GET',
    file: 'bot'
  },{
    path: '/Bot/$execute/*',
    method: 'GET',
    file: 'bot'
  },{
    path: '/Bot/:id/$execute/*',
    method: 'GET',
    file: 'bot'
  },{
    path: '/Bot/$execute',
    method: 'POST',
    file: 'bot'
  },{
    path: '/Bot/:id/$execute',
    method: 'POST',
    file: 'bot'
  },{
    path: '/Bot/$execute/*',
    method: 'POST',
    file: 'bot'
  },{
    path: '/Bot/:id/$execute/*',
    method: 'POST',
    file: 'bot'
  },{
    path: '/bulkdata',
    method: 'GET',
    file: 'bulkData.get'
  },{
    path: '/bulkdata',
    method: 'DELETE',
    file: 'bulkData.delete'
  },{
    path: '/job',
    method: 'GET',
    file: 'job.get'
  },{
    path: '/job',
    method: 'DELETE',
    file: 'job.delete'
  },{
    path: '/**',
    file: 'fhir'
  }]
}