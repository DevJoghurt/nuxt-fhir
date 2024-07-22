import type { Route } from './types'

export const adminRoutes: Route = {
  routePrefix: '/admin',
  folder: 'admin',
  routes: [{
    path: '/projects/setpassword',
    method: 'POST',
    file: 'projects/setpassword',
  },{
    path: '/projects/:projectId/bot',
    method: 'POST',
    file: 'projects/bot',
  },{
    path: '/projects/:projectId/invite',
    method: 'POST',
    file: 'projects/invite',
  },{
    path: '/projects/:projectId/client',
    method: 'POST',
    file: 'projects/client',
  },{
    path: '/projects/:projectId/members/:membershipId',
    method: 'GET',
    file: 'projects/members.get',
  },{
    path: '/projects/:projectId/members/:membershipId',
    method: 'POST',
    file: 'projects/members.post',
  },{
    path: '/projects/:projectId/members/:membershipId',
    method: 'DELETE',
    file: 'projects/members.delete',
  },{
    path: '/projects/:projectId/secrets',
    method: 'POST',
    file: 'projects/secrets',
  },{
    path: '/projects/:projectId/sites',
    method: 'POST',
    file: 'projects/sites',
  },{
    path: '/projects/:projectId',
    method: 'GET',
    file: 'projects/project',
  },{
    path: '/super/valuesets',
    method: 'POST',
    file: 'super/valuesets',
  },{
    path: '/super/structuredefinitions',
    method: 'POST',
    file: 'super/structuredefinitions',
  },{
    path: '/super/searchparameters',
    method: 'POST',
    file: 'super/searchparameters',
  },{
    path: '/super/reindex',
    method: 'POST',
    file: 'super/reindex',
  },{
    path: '/super/setpassword',
    method: 'POST',
    file: 'super/setpassword',
  },{
    path: '/super/purge',
    method: 'POST',
    file: 'super/purge',
  },{
    path: '/super/removebotidjobsfromqueue',
    method: 'POST',
    file: 'super/removebotidjobsfromqueue',
  },{
    path: '/super/rebuildprojectid',
    method: 'POST',
    file: 'super/rebuildprojectid',
  },{
    path: '/super/migrate',
    method: 'POST',
    file: 'super/migrate',
  }]
}