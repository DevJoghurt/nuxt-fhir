import type { Route } from './types'

export const oauthRoutes: Route = {
  routePrefix: '/oauth2',
  folder: 'oauth',
  routes: [{
    path: '/authorize',
    method: 'GET',
    file: 'authorize.get',
  },{
    path: '/authorize',
    method: 'POST',
    file: 'authorize.post',
  },{
    path: '/token',
    method: 'POST',
    file: 'token',
  },{
    path: '/userinfo',
    method: 'GET',
    file: 'userinfo.get',
  },{
    path: '/userinfo',
    method: 'POST',
    file: 'userinfo.post',
  },{
    path: '/logout',
    method: 'GET',
    file: 'logout.get',
  },{
    path: '/logout',
    method: 'POST',
    file: 'logout.post',
  }]
}